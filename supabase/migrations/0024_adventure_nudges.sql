-- 0024_adventure_nudges.sql — consent purposes and server-authorized nearby nudges (Phase 2)
--
-- WHY: Adventure mode lets the OS notice when a signed-in, opted-in person is
-- near an eligible quest. The phone may only show a local notification after
-- the server agrees: fresh eligibility, separate consent, the account-wide cap
-- across devices, and quiet hours. See docs/product/LOCATION_DISCOVERY.md §3–§5.
--
-- What changes (additive):
--   1. consent_type gains separate purposes: location_foreground,
--      location_background, notifications, sponsored_notifications,
--      partner_marketing. The existing 'location' value keeps its meaning (a
--      one-time GPS verification input) — no consent is migrated or widened.
--      consent_events gains policy_version and installation_id.
--   2. nudge_settings (account): cap 0–2, quiet hours, IANA timezone,
--      event-window override, pause.
--   3. nudge_installations (user + installation): Adventure enabled / paused.
--   4. nudge_claims: the minimal reservation/result record that enforces the
--      cap and suppression. No coordinates, no region-entry log, no client
--      table access, 30-day retention via purge_nudge_records().
--   5. app_feature_flags: nudge_delivery (emergency stop) and sponsored_nudges,
--      both off.
--   6. record_consent(), get_geofence_bundle(), claim_nudge(),
--      record_nudge_result(), purge_nudge_records().
--
-- A claim is never proof of attendance, an impression, or a reason to award
-- XP/Points. Nothing here touches completions or the points ledger.
--
-- Depends on 0023_location_discovery.sql. Idempotent. The enum additions run
-- before the transaction because a new enum value cannot be used in the
-- transaction that adds it.
--
-- Deploy order: apply after 0023. Delivery stays off until
-- `update app_feature_flags set enabled = true where key = 'nudge_delivery'`
-- is run deliberately after the release gates (LOCATION_DISCOVERY.md §9).

alter type public.consent_type add value if not exists 'location_foreground';
alter type public.consent_type add value if not exists 'location_background';
alter type public.consent_type add value if not exists 'notifications';
alter type public.consent_type add value if not exists 'sponsored_notifications';
alter type public.consent_type add value if not exists 'partner_marketing';

begin;

-- ===========================================================================
-- 1. Consent ledger: purpose + policy version + installation
-- ===========================================================================
alter table public.consent_events add column if not exists policy_version  text;
alter table public.consent_events add column if not exists installation_id uuid;
create index if not exists idx_consent_events_user_type_time
  on public.consent_events (user_id, consent_type, "timestamp" desc);

comment on column public.consent_events.policy_version is
  'Privacy Policy version the person saw when granting/withdrawing (e.g. "1.1.0").';
comment on column public.consent_events.installation_id is
  'App installation for device-scoped purposes (background location, notifications). Not a hardware id.';

create or replace function public.record_consent(
  p_purpose public.consent_type,
  p_granted boolean,
  p_policy_version text,
  p_installation_id uuid default null,
  p_source text default 'mobile_app'
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare uid uuid := auth.uid(); v_id uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_purpose is null or p_granted is null
     or p_policy_version is null or length(trim(p_policy_version)) not between 1 and 32
     or p_source is null or length(trim(p_source)) not between 1 and 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  -- clock_timestamp(): two decisions in one transaction must still order.
  insert into public.consent_events (user_id, consent_type, granted, source, policy_version,
                                     installation_id, "timestamp")
  values (uid, p_purpose, p_granted, trim(p_source), trim(p_policy_version), p_installation_id,
          clock_timestamp())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'consentId', v_id);
end $$;

revoke all on function public.record_consent(public.consent_type, boolean, text, uuid, text) from public, anon;
grant execute on function public.record_consent(public.consent_type, boolean, text, uuid, text) to authenticated;

-- Latest decision per purpose wins (append-only ledger).
create or replace function public.has_current_consent(p_user uuid, p_purpose public.consent_type)
returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select coalesce((
    select e.granted from public.consent_events e
     where e.user_id = p_user and e.consent_type = p_purpose
     order by e."timestamp" desc, e.id desc
     limit 1), false)
$$;
revoke all on function public.has_current_consent(uuid, public.consent_type) from public, anon, authenticated;

-- ===========================================================================
-- 2. Account-level nudge settings
-- ===========================================================================
create table if not exists public.nudge_settings (
  user_id             uuid primary key default auth.uid() references public.users(id) on delete cascade,
  max_per_day         smallint not null default 2 check (max_per_day between 0 and 2),
  quiet_start         time not null default '21:00',
  quiet_end           time not null default '10:00',
  timezone            text,
  allow_event_windows boolean not null default false,
  adventure_paused    boolean not null default false,
  updated_at          timestamptz not null default now()
);

comment on table public.nudge_settings is
  'Account-wide nearby-alert preferences. max_per_day can only be lowered (hard cap 2). '
  'NULL timezone = no nudges (never assume Miami time).';
comment on column public.nudge_settings.allow_event_windows is
  'Opt-in: an explicitly time-boxed quest may nudge during quiet hours. Never bypasses the cap or consent.';

create or replace function public.nudge_settings_validate() returns trigger
language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if new.timezone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists nudge_settings_validate on public.nudge_settings;
create trigger nudge_settings_validate before insert or update on public.nudge_settings
  for each row execute function public.nudge_settings_validate();

alter table public.nudge_settings enable row level security;
drop policy if exists nudge_settings_self_read   on public.nudge_settings;
drop policy if exists nudge_settings_self_insert on public.nudge_settings;
drop policy if exists nudge_settings_self_update on public.nudge_settings;
create policy nudge_settings_self_read on public.nudge_settings for select using (user_id = auth.uid());
create policy nudge_settings_self_insert on public.nudge_settings for insert with check (user_id = auth.uid());
create policy nudge_settings_self_update on public.nudge_settings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.nudge_settings from public, anon, authenticated;
grant select, insert, update on public.nudge_settings to authenticated;

-- ===========================================================================
-- 3. Per-installation Adventure state
-- ===========================================================================
create table if not exists public.nudge_installations (
  user_id                uuid not null default auth.uid() references public.users(id) on delete cascade,
  installation_id        uuid not null,
  adventure_enabled      boolean not null default false,
  paused                 boolean not null default false,
  consent_policy_version text,
  updated_at             timestamptz not null default now(),
  primary key (user_id, installation_id)
);

comment on table public.nudge_installations is
  'Server copy of a device''s Adventure choice, so claims honor a pause made on that device. '
  'Holds no coordinates and no OS permission state (a device fact, never trusted server-side).';

alter table public.nudge_installations enable row level security;
drop policy if exists nudge_installations_self on public.nudge_installations;
create policy nudge_installations_self on public.nudge_installations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.nudge_installations from public, anon, authenticated;
grant select, insert, update, delete on public.nudge_installations to authenticated;

-- ===========================================================================
-- 4. Feature flags (server-side kill switches)
-- ===========================================================================
create table if not exists public.app_feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  updated_at  timestamptz not null default now()
);
insert into public.app_feature_flags (key, enabled, description) values
  ('nudge_delivery',   false, 'claim_nudge() may allow nearby alerts. Off = emergency stop for new online claims.'),
  ('sponsored_nudges', false, 'Sponsored quests may be nudged (also needs sponsored_notifications consent). Off for v1.')
on conflict (key) do nothing;

alter table public.app_feature_flags enable row level security;
drop policy if exists app_feature_flags_public_read on public.app_feature_flags;
create policy app_feature_flags_public_read on public.app_feature_flags for select using (true);
revoke all on public.app_feature_flags from public, anon, authenticated;
grant select on public.app_feature_flags to anon, authenticated;

-- ===========================================================================
-- 5. Claims (minimal, server-only)
-- ===========================================================================
create table if not exists public.nudge_claims (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  installation_id uuid not null,
  idempotency_key text not null,
  quest_id        uuid not null references public.quests(id) on delete cascade,
  venue_id        uuid references public.venues(id) on delete set null,
  region_id       text not null,
  catalog_version text,
  policy_version  text,
  outcome         text not null default 'reserved'
                    check (outcome in ('reserved', 'scheduled', 'schedule_failed', 'opened')),
  claimed_at      timestamptz not null default now(),
  result_at       timestamptz,
  constraint nudge_claims_idempotency unique (user_id, idempotency_key)
);
create index if not exists idx_nudge_claims_user_time on public.nudge_claims (user_id, claimed_at desc);

comment on table public.nudge_claims is
  'One row per allowed nearby-alert reservation. Sensitive (venue + time ⇒ location): no client access, '
  'no partner export, 30-day retention. "scheduled" is not "seen"; a claim is not a visit.';

alter table public.nudge_claims enable row level security;
revoke all on public.nudge_claims from public, anon, authenticated;

-- ===========================================================================
-- 6. Geofence bundle
-- ===========================================================================
-- Region key shared by bundle and claim: colocated quests share their venue's
-- region; a quest with its own location override gets its own region.
create or replace function public.nudge_region_id(p_quest_id uuid, p_venue_id uuid, p_has_override boolean)
returns text language sql immutable set search_path = public, extensions, pg_temp as $$
  select case when p_has_override then 'q:' || p_quest_id::text
              when p_venue_id is not null then 'v:' || p_venue_id::text end
$$;

-- p_origin must be an actual device sample (never a browsed map/area origin).
-- Returns at most 15 regions within 10 km plus one refresh region anchored to
-- the nearest public discovery area (sized to contain the device, 2–5 km).
create or replace function public.get_geofence_bundle(
  p_origin_lat double precision,
  p_origin_lng double precision,
  p_installation_id uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = public, extensions, pg_temp as $$
declare
  uid       uuid := auth.uid();
  v_now     timestamptz := now();
  v_origin  extensions.geography;
  v_reach   constant integer := 10000;
  v_area    public.discovery_areas;
  v_area_d  double precision;
  v_refresh jsonb;
  v_regions jsonb;
  v_cands   jsonb;
  v_hidden  uuid[] := '{}';
  v_muted   uuid[] := '{}';
  v_done_ids uuid[] := '{}';
  v_done_at  timestamptz[] := '{}';
  v_delivery boolean;
  v_sponsored boolean;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_origin_lat is null or p_origin_lng is null
     or not (p_origin_lat between -90 and 90) or not (p_origin_lng between -180 and 180) then
    return jsonb_build_object('ok', false, 'error', 'invalid_origin');
  end if;
  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_origin_lng, p_origin_lat), 4326)::extensions.geography;

  select coalesce((select enabled from public.app_feature_flags where key = 'nudge_delivery'), false),
         coalesce((select enabled from public.app_feature_flags where key = 'sponsored_nudges'), false)
    into v_delivery, v_sponsored;
  -- Sponsored quests need the flag AND the person's latest sponsored-alert consent.
  v_sponsored := v_sponsored and coalesce((
    select e.granted from public.consent_events e
     where e.user_id = uid and e.consent_type = 'sponsored_notifications'
     order by e."timestamp" desc, e.id desc limit 1), false);

  select coalesce(array_agg(quest_id) filter (where kind = 'hide'), '{}'),
         coalesce(array_agg(venue_id) filter (where kind = 'mute_venue'), '{}')
    into v_hidden, v_muted
    from public.quest_feedback where user_id = uid;
  select coalesce(array_agg(quest_id), '{}'), coalesce(array_agg(last_at), '{}')
    into v_done_ids, v_done_at
    from (select c.quest_id, max(c.completed_at) as last_at
            from public.quest_completions c where c.user_id = uid group by c.quest_id) d;

  select a.* into v_area from public.discovery_areas a
   order by a.geog operator(extensions.<->) v_origin limit 1;
  if found then
    v_area_d := extensions.st_distance(v_area.geog, v_origin);
    if v_area_d <= 4500 then
      v_refresh := jsonb_build_object(
        'id', 'refresh:' || v_area.id, 'latitude', v_area.latitude, 'longitude', v_area.longitude,
        'radiusM', greatest(2000, least(5000, (ceil((v_area_d + 500) / 100) * 100)::int)));
    end if;
  end if;

  with cand as (
    select q.id as quest_id, q.location_geog as geog
      from public.quests q
     where q.location_geog is not null and q.status = 'active' and q.nudge_eligible
       and extensions.st_dwithin(q.location_geog, v_origin, v_reach)
    union all
    select q.id, v.geog
      from public.venues v join public.quests q on q.venue_id = v.id
     where q.location_latitude is null and q.status = 'active' and q.nudge_eligible
       and v.geog is not null
       and extensions.st_dwithin(v.geog, v_origin, v_reach)
  ),
  done as (select * from unnest(v_done_ids, v_done_at) as d(quest_id, last_at)),
  elig as (
    select q.id as quest_id, q.title, q.category, q.xp_reward, q.points_reward,
           q.estimated_minutes, q.venue_id, q.nudge_radius_m, c.geog,
           public.nudge_region_id(q.id, q.venue_id, q.location_latitude is not null) as region_id,
           extensions.st_distance(c.geog, v_origin) as dist
      from cand c
      join public.quests q on q.id = c.quest_id
      left join public.venues v on v.id = q.venue_id
      left join done d on d.quest_id = q.id
     where (q.start_date is null or q.start_date <= v_now + interval '24 hours')
       and (q.end_date is null or q.end_date > v_now)
       and (q.venue_id is null or v.status = 'active')
       and q.estimated_minutes is not null
       and ((v.opening_hours is not null and v.timezone is not null)
            or (q.start_date is not null and q.end_date is not null))
       and (not q.is_sponsored or v_sponsored)
       and not (q.id = any (v_hidden))
       and (q.venue_id is null or not (q.venue_id = any (v_muted)))
       and (d.last_at is null
            or (q.repeat_cooldown_days is not null
                and d.last_at + make_interval(days => q.repeat_cooldown_days) <= v_now))
  ),
  regions as (
    select e.region_id,
           min(e.dist) as dist,
           max(e.nudge_radius_m) as radius_m,
           (array_agg(e.geog order by e.quest_id))[1] as geog,
           array_agg(e.quest_id order by e.quest_id) as quest_ids
      from elig e
     group by e.region_id
     order by min(e.dist), e.region_id
     limit 15
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.region_id,
           'latitude', extensions.st_y(r.geog::extensions.geometry),
           'longitude', extensions.st_x(r.geog::extensions.geometry),
           'radiusM', r.radius_m,
           'questIds', to_jsonb(r.quest_ids)) order by r.dist, r.region_id), '[]'::jsonb),
         coalesce((select jsonb_agg(jsonb_build_object(
             'questId', e.quest_id, 'regionId', e.region_id, 'title', e.title, 'category', e.category,
             'xpReward', e.xp_reward, 'pointsReward', e.points_reward,
             'estimatedMinutes', e.estimated_minutes, 'venueId', e.venue_id) order by e.dist, e.quest_id)
            from elig e where e.region_id in (select region_id from regions)), '[]'::jsonb)
    into v_regions, v_cands
    from regions r;

  return jsonb_build_object(
    'ok', true,
    'version', 'b1:' || to_char(v_now at time zone 'UTC', 'YYYYMMDDHH24MISS') || ':'
               || left(md5(v_regions::text || v_cands::text), 12),
    'serverTime', v_now,
    'expiresAt', v_now + interval '24 hours',
    'deliveryEnabled', v_delivery,
    'coverage', case when v_refresh is null then null
                     else jsonb_build_object('areaId', v_area.id, 'label', v_area.label) end,
    'refreshRegion', v_refresh,
    'regions', v_regions,
    'candidates', v_cands
  );
end $$;

revoke all on function public.get_geofence_bundle(double precision, double precision, uuid) from public, anon;
grant execute on function public.get_geofence_bundle(double precision, double precision, uuid) to authenticated;

-- ===========================================================================
-- 7. claim_nudge — atomic, idempotent authorization of one local notification
-- ===========================================================================
create or replace function public.claim_nudge(
  p_installation_id uuid,
  p_idempotency_key text,
  p_quest_id uuid,
  p_region_id text,
  p_catalog_version text default null,
  p_policy_version text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  uid        uuid := auth.uid();
  v_now      timestamptz := now();
  q          public.quests;
  v          public.venues;
  s          public.nudge_settings;
  inst       public.nudge_installations;
  v_prev     public.nudge_claims;
  v_claim_id uuid;
  v_avail    jsonb;
  v_local    time;
  v_quiet    boolean;
  v_event    boolean;
  v_last_at  timestamptz;
  v_max      integer;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_installation_id is null or p_quest_id is null or p_region_id is null
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128
     or length(p_region_id) > 80 or length(coalesce(p_catalog_version, '')) > 80
     or length(coalesce(p_policy_version, '')) > 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  -- One claim decision at a time per account, across all of its devices.
  perform pg_advisory_xact_lock(hashtextextended('nudge:' || uid::text, 0));

  -- Gates that must hold even for a replay (a pause after the first claim wins).
  if not coalesce((select enabled from public.app_feature_flags where key = 'nudge_delivery'), false) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'delivery_disabled');
  end if;
  if not (public.has_current_consent(uid, 'location_background')
          and public.has_current_consent(uid, 'notifications')) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'consent_missing');
  end if;
  select * into inst from public.nudge_installations
   where user_id = uid and installation_id = p_installation_id;
  select * into s from public.nudge_settings where user_id = uid;
  if inst.user_id is null or not inst.adventure_enabled or inst.paused
     or coalesce(s.adventure_paused, false) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'paused');
  end if;

  select * into v_prev from public.nudge_claims
   where user_id = uid and idempotency_key = p_idempotency_key;
  if found then
    select * into q from public.quests where id = v_prev.quest_id;
    return jsonb_build_object('ok', true, 'allow', true, 'claimId', v_prev.id, 'replay', true,
      'quest', jsonb_build_object('id', q.id, 'title', q.title, 'category', q.category,
                                  'xpReward', q.xp_reward, 'pointsReward', q.points_reward));
  end if;

  v_max := coalesce(s.max_per_day, 2);
  if v_max <= 0 then return jsonb_build_object('ok', true, 'allow', false, 'reason', 'cap_reached'); end if;
  if s.timezone is null then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'timezone_unknown');
  end if;

  -- Fresh eligibility (the cached bundle may be up to 24 h old).
  select * into q from public.quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', true, 'allow', false, 'reason', 'not_eligible'); end if;
  if q.venue_id is not null then select * into v from public.venues where id = q.venue_id; end if;
  if public.nudge_region_id(q.id, q.venue_id, q.location_latitude is not null) is distinct from p_region_id then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'invalid_candidate');
  end if;
  if q.status <> 'active' or not q.nudge_eligible
     or (q.start_date is not null and q.start_date > v_now)
     or (q.end_date is not null and q.end_date <= v_now)
     or (q.venue_id is not null and (v.id is null or v.status <> 'active'))
     or (q.is_sponsored and not (
           coalesce((select enabled from public.app_feature_flags where key = 'sponsored_nudges'), false)
           and public.has_current_consent(uid, 'sponsored_notifications')))
     or exists (select 1 from public.quest_feedback f where f.user_id = uid
                 and ((f.kind = 'hide' and f.quest_id = q.id)
                      or (f.kind = 'mute_venue' and f.venue_id = q.venue_id)))
     or exists (select 1 from public.quest_attempts a where a.user_id = uid and a.quest_id = q.id
                 and a.status = 'in_progress') then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'not_eligible');
  end if;
  select max(completed_at) into v_last_at from public.quest_completions where user_id = uid and quest_id = q.id;
  if v_last_at is not null and (q.repeat_cooldown_days is null
       or v_last_at + make_interval(days => q.repeat_cooldown_days) > v_now) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'not_eligible');
  end if;

  -- Availability: trusted hours with time to finish, or an explicit event window.
  if q.estimated_minutes is null then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'availability_unknown');
  end if;
  v_event := q.start_date is not null and q.end_date is not null;
  v_avail := public.venue_open_state(v.opening_hours, v.timezone, v_now);
  if v_avail ->> 'state' = 'open' then
    if (v_avail ->> 'closesAt')::timestamptz < v_now + make_interval(mins => q.estimated_minutes + 10) then
      return jsonb_build_object('ok', true, 'allow', false, 'reason', 'closed');
    end if;
  elsif v_avail ->> 'state' = 'closed' then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'closed');
  elsif not v_event then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'availability_unknown');
  end if;
  if v_event and q.end_date < v_now + make_interval(mins => q.estimated_minutes + 10) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'closed');
  end if;

  -- Quiet hours in the person's configured timezone (wraps midnight when start > end).
  v_local := (v_now at time zone s.timezone)::time;
  v_quiet := case
    when s.quiet_start = s.quiet_end then false
    when s.quiet_start < s.quiet_end then v_local >= s.quiet_start and v_local < s.quiet_end
    else v_local >= s.quiet_start or v_local < s.quiet_end end;
  if v_quiet and not (s.allow_event_windows and v_event) then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'quiet_hours');
  end if;

  -- Cadence. Every reservation counts, even if scheduling later failed.
  if (select count(*) from public.nudge_claims
       where user_id = uid and claimed_at > v_now - interval '24 hours') >= v_max then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'cap_reached');
  end if;
  if exists (select 1 from public.nudge_claims
              where user_id = uid and claimed_at > v_now - interval '3 hours') then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'min_gap');
  end if;
  if exists (select 1 from public.nudge_claims
              where user_id = uid and quest_id = q.id and claimed_at > v_now - interval '7 days') then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'quest_suppressed');
  end if;
  if q.venue_id is not null and exists (select 1 from public.nudge_claims
              where user_id = uid and venue_id = q.venue_id and claimed_at > v_now - interval '24 hours') then
    return jsonb_build_object('ok', true, 'allow', false, 'reason', 'venue_suppressed');
  end if;

  insert into public.nudge_claims (user_id, installation_id, idempotency_key, quest_id, venue_id,
                                   region_id, catalog_version, policy_version, claimed_at)
  values (uid, p_installation_id, p_idempotency_key, q.id, q.venue_id,
          p_region_id, p_catalog_version, p_policy_version, v_now)
  returning id into v_claim_id;

  return jsonb_build_object('ok', true, 'allow', true, 'claimId', v_claim_id, 'replay', false,
    'quest', jsonb_build_object('id', q.id, 'title', q.title, 'category', q.category,
                                'xpReward', q.xp_reward, 'pointsReward', q.points_reward));
end $$;

revoke all on function public.claim_nudge(uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.claim_nudge(uuid, text, uuid, text, text, text) to authenticated;

-- ===========================================================================
-- 8. record_nudge_result — allowlisted outcome transitions on your own claim
-- ===========================================================================
create or replace function public.record_nudge_result(p_claim_id uuid, p_outcome text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare uid uuid := auth.uid(); c public.nudge_claims;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_claim_id is null or p_outcome is null or p_outcome not in ('scheduled', 'schedule_failed', 'opened') then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  select * into c from public.nudge_claims where id = p_claim_id and user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if c.outcome = p_outcome then
    return jsonb_build_object('ok', true, 'outcome', c.outcome);
  end if;
  if not ((c.outcome = 'reserved' and p_outcome in ('scheduled', 'schedule_failed'))
          or (c.outcome = 'scheduled' and p_outcome = 'opened')) then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition');
  end if;
  update public.nudge_claims set outcome = p_outcome, result_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'outcome', p_outcome);
end $$;

revoke all on function public.record_nudge_result(uuid, text) from public, anon;
grant execute on function public.record_nudge_result(uuid, text) to authenticated;

-- ===========================================================================
-- 9. Retention
-- ===========================================================================
-- Run daily (pg_cron, if enabled, or a scheduled SQL job) as service_role:
--   select public.purge_nudge_records();
create or replace function public.purge_nudge_records()
returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare n integer;
begin
  delete from public.nudge_claims where claimed_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.purge_nudge_records() from public, anon, authenticated;
grant execute on function public.purge_nudge_records() to service_role;

commit;

-- Verification (run after applying):
--   select key, enabled from public.app_feature_flags;                       -- both false
--   select has_table_privilege('authenticated', 'public.nudge_claims', 'SELECT');  -- false
--   select has_function_privilege('anon', 'public.claim_nudge(uuid,text,uuid,text,text,text)', 'EXECUTE'); -- false
--   As a signed-in tester with consent + settings: get_geofence_bundle(...) then claim_nudge(...).
--
-- Rollback (enum values cannot be dropped; they stay unused):
--   begin;
--   drop function if exists public.purge_nudge_records();
--   drop function if exists public.record_nudge_result(uuid, text);
--   drop function if exists public.claim_nudge(uuid, text, uuid, text, text, text);
--   drop function if exists public.get_geofence_bundle(double precision, double precision, uuid);
--   drop function if exists public.nudge_region_id(uuid, uuid, boolean);
--   drop function if exists public.has_current_consent(uuid, public.consent_type);
--   drop function if exists public.record_consent(public.consent_type, boolean, text, uuid, text);
--   drop table if exists public.nudge_claims, public.app_feature_flags,
--     public.nudge_installations, public.nudge_settings;
--   drop function if exists public.nudge_settings_validate();
--   alter table public.consent_events drop column if exists policy_version,
--     drop column if exists installation_id;
--   commit;
