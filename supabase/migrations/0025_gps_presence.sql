-- 0025_gps_presence.sql — server-computed GPS presence for GPS quests
--
-- WHY (SYSTEM_STATE blocker 10): complete_quest() marks verification_type
-- 'gps' as verified with no check at all, so any signed-in caller could
-- complete a GPS quest from anywhere. Live data has no GPS quests (all are
-- QR), so enforcing this now disrupts nobody.
--
-- What changes
--   1. presence_challenges: short-lived (2 min) nonce bound to user + quest.
--   2. presence_checks: the minimized outcome (inside / outside / uncertain)
--      and a reason category. Coordinates are used in memory and discarded.
--   3. create_presence_challenge(), verify_gps_presence():
--        inside    if distance + accuracy <= radius
--        outside   if distance - accuracy >  radius
--        uncertain otherwise, or for a stale (> 30 s), future, low-accuracy
--                  (> 50 m) or invalid sample.
--      A heuristic, not proof: uncertain means retry or use QR/staff — never
--      a penalty and never a wider radius.
--   4. complete_quest(): new optional p_presence_check_id. GPS quests need an
--      unused 'inside' check by this user for this quest from the last 15
--      minutes (else 'presence_required'); one completion per check. QR/NFC,
--      venue-code and staff paths are unchanged. Geofence events and nudges
--      are never accepted as presence.
--   5. quest_completions.source_presence_check_id (+ partial unique index).
--   6. purge_presence_records() for retention.
--
-- Depends on 0018 (complete_quest body) and 0023 (location columns).
-- Callers using 4 or 5 named arguments keep resolving to the new function.
-- Idempotent; one transaction.

begin;

-- ===========================================================================
-- 1. Challenges and checks (server-only tables)
-- ===========================================================================
create table if not exists public.presence_challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  quest_id    uuid not null references public.quests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '2 minutes',
  consumed_at timestamptz
);
create index if not exists idx_presence_challenges_user_time
  on public.presence_challenges (user_id, created_at desc);

create table if not exists public.presence_checks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  quest_id     uuid not null references public.quests(id) on delete cascade,
  challenge_id uuid not null unique references public.presence_challenges(id) on delete cascade,
  outcome      text not null check (outcome in ('inside', 'outside', 'uncertain')),
  reason       text not null check (reason in ('ok', 'outside_radius', 'ambiguous', 'stale_sample',
                                               'low_accuracy', 'invalid_sample')),
  checked_at   timestamptz not null default now()
);
create index if not exists idx_presence_checks_user_quest
  on public.presence_checks (user_id, quest_id, checked_at desc);

comment on table public.presence_checks is
  'GPS presence outcome only. The device coordinates and accuracy are never stored.';

alter table public.presence_challenges enable row level security;
alter table public.presence_checks     enable row level security;
revoke all on public.presence_challenges from public, anon, authenticated;
revoke all on public.presence_checks     from public, anon, authenticated;

alter table public.quest_completions
  add column if not exists source_presence_check_id uuid
    references public.presence_checks(id) on delete set null;
create unique index if not exists quest_completions_presence_check_once
  on public.quest_completions (source_presence_check_id) where source_presence_check_id is not null;

-- ===========================================================================
-- 2. Challenge
-- ===========================================================================
create or replace function public.create_presence_challenge(p_quest_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare uid uuid := auth.uid(); q public.quests; v_geog extensions.geography; c public.presence_challenges;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select * into q from public.quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if q.status <> 'active' or (q.start_date is not null and now() < q.start_date)
     or (q.end_date is not null and now() > q.end_date) then
    return jsonb_build_object('ok', false, 'error', 'quest_inactive');
  end if;
  if q.verification_type <> 'gps' then
    return jsonb_build_object('ok', false, 'error', 'not_gps_quest');
  end if;
  v_geog := case when q.location_latitude is not null then q.location_geog
                 else (select geog from public.venues where id = q.venue_id) end;
  if v_geog is null then return jsonb_build_object('ok', false, 'error', 'location_unavailable'); end if;
  if (select count(*) from public.presence_challenges
       where user_id = uid and created_at > now() - interval '10 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.presence_challenges (user_id, quest_id) values (uid, q.id) returning * into c;
  return jsonb_build_object('ok', true, 'challengeId', c.id, 'expiresAt', c.expires_at);
end $$;

revoke all on function public.create_presence_challenge(uuid) from public, anon;
grant execute on function public.create_presence_challenge(uuid) to authenticated;

-- ===========================================================================
-- 3. Verify one ephemeral sample against the challenge
-- ===========================================================================
create or replace function public.verify_gps_presence(
  p_challenge_id uuid,
  p_latitude     double precision,
  p_longitude    double precision,
  p_accuracy_m   double precision,
  p_captured_at  timestamptz
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  uid      uuid := auth.uid();
  v_now    timestamptz := now();
  c        public.presence_challenges;
  q        public.quests;
  v_geog   extensions.geography;
  v_radius integer;
  v_dist   double precision;
  v_outcome text;
  v_reason  text;
  v_check_id uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;

  select * into c from public.presence_challenges
   where id = p_challenge_id and user_id = uid
   for update;
  if not found or c.consumed_at is not null or c.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'challenge_invalid');
  end if;
  update public.presence_challenges set consumed_at = v_now where id = c.id;

  select * into q from public.quests where id = c.quest_id;
  v_geog := case when q.location_latitude is not null then q.location_geog
                 else (select geog from public.venues where id = q.venue_id) end;
  v_radius := coalesce(q.verification_radius_m, 100);

  if p_latitude is null or p_longitude is null or p_accuracy_m is null or p_captured_at is null
     or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180)
     or not (p_accuracy_m > 0 and p_accuracy_m <= 5000)
     or p_captured_at > v_now + interval '30 seconds'
     or v_geog is null then
    v_outcome := 'uncertain'; v_reason := 'invalid_sample';
  elsif p_captured_at < v_now - interval '30 seconds'
     or p_captured_at < c.created_at - interval '5 seconds' then
    v_outcome := 'uncertain'; v_reason := 'stale_sample';
  elsif p_accuracy_m > 50 then
    v_outcome := 'uncertain'; v_reason := 'low_accuracy';
  else
    v_dist := extensions.st_distance(
      v_geog, extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography);
    if v_dist + p_accuracy_m <= v_radius then
      v_outcome := 'inside'; v_reason := 'ok';
    elsif v_dist - p_accuracy_m > v_radius then
      v_outcome := 'outside'; v_reason := 'outside_radius';
    else
      v_outcome := 'uncertain'; v_reason := 'ambiguous';
    end if;
  end if;

  insert into public.presence_checks (user_id, quest_id, challenge_id, outcome, reason)
  values (uid, q.id, c.id, v_outcome, v_reason)
  returning id into v_check_id;

  return jsonb_build_object('ok', true, 'outcome', v_outcome, 'reason', v_reason, 'checkId', v_check_id);
end $$;

revoke all on function public.verify_gps_presence(uuid, double precision, double precision, double precision, timestamptz)
  from public, anon;
grant execute on function public.verify_gps_presence(uuid, double precision, double precision, double precision, timestamptz)
  to authenticated;

-- ===========================================================================
-- 4. complete_quest: GPS quests require a fresh 'inside' presence check
-- ===========================================================================
-- Adding a defaulted parameter would create an ambiguous overload, so the
-- 5-argument version is dropped first; named 4/5-argument calls still resolve.
drop function if exists public.complete_quest(uuid, verification_type, text, uuid, uuid);
create or replace function public.complete_quest(
  p_quest_id uuid,
  p_verification_method verification_type,
  p_venue_code text,
  p_source_scan_id uuid,
  p_instance_id uuid default null,
  p_presence_check_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q quests; uid uuid := auth.uid();
  v_completion quest_completions; v_profile user_profiles;
  prev_level integer; new_level integer; verified boolean;
  v_secret text;
  v_last_at timestamptz; v_available_at timestamptz;
  v_inst quest_instances; v_xp integer; v_points integer;
  v_scan scan_events;
  v_check presence_checks;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- 0017: serialise completions per user+quest, then apply the repeat rule.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || q.id::text, 0));
  select max(completed_at) into v_last_at
    from quest_completions where user_id = uid and quest_id = q.id;
  if v_last_at is not null then
    if q.repeat_cooldown_days is null then
      return jsonb_build_object('ok', false, 'error', 'already_completed');
    end if;
    v_available_at := v_last_at + make_interval(days => q.repeat_cooldown_days);
    if v_available_at > now() then
      return jsonb_build_object('ok', false, 'error', 'cooldown', 'availableAt', v_available_at);
    end if;
  end if;
  if q.status <> 'active' or (q.start_date is not null and now() < q.start_date) then
    return jsonb_build_object('ok', false, 'error', 'quest_inactive');
  end if;
  if q.end_date is not null and now() > q.end_date then
    return jsonb_build_object('ok', false, 'error', 'quest_expired');
  end if;

  -- 0017: a generated instance (if any) fixes this completion's rewards.
  v_xp := q.xp_reward; v_points := q.points_reward;
  if p_instance_id is not null then
    select * into v_inst from quest_instances
     where id = p_instance_id and user_id = uid and quest_id = q.id and completed_at is null
     for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'instance_invalid');
    end if;
    v_xp := v_inst.xp_reward; v_points := v_inst.points_reward;
  end if;

  -- 0018: QR/NFC quests need a recent, unused, code-verified scan.
  if q.verification_type in ('qr', 'nfc') then
    select * into v_scan from scan_events
     where id = p_source_scan_id
       and quest_id = q.id
       and code_verified
       and (user_id = uid or user_id is null)
       and "timestamp" > now() - interval '2 hours'
     for update;
    if not found
       or exists (select 1 from quest_completions where source_scan_id = v_scan.id) then
      return jsonb_build_object('ok', false, 'error', 'scan_required');
    end if;
    if v_scan.user_id is null then
      update scan_events set user_id = uid where id = v_scan.id;
    end if;
  end if;

  -- 0025: GPS quests need this user's own unused 'inside' presence check for
  -- this quest from the last 15 minutes (computed server-side by
  -- verify_gps_presence). Geofence/nudge events are never accepted here.
  if q.verification_type = 'gps' then
    select * into v_check from presence_checks
     where id = p_presence_check_id
       and user_id = uid
       and quest_id = q.id
       and outcome = 'inside'
       and checked_at > now() - interval '15 minutes'
     for update;
    if not found
       or exists (select 1 from quest_completions where source_presence_check_id = v_check.id) then
      return jsonb_build_object('ok', false, 'error', 'presence_required');
    end if;
  end if;

  -- 0016: the venue code lives in quest_secrets.
  if q.verification_type = 'venue_code' then
    select s.verification_secret into v_secret from quest_secrets s where s.quest_id = q.id;
  end if;
  verified := case q.verification_type
    when 'venue_code' then (p_venue_code is not null and v_secret is not null
                            and upper(trim(p_venue_code)) = upper(v_secret))
    else true end;
  if not verified then
    update quest_attempts set status='failed', failure_reason='verification_failed',
           verification_method=p_verification_method
     where user_id=uid and quest_id=q.id and status='in_progress';
    return jsonb_build_object('ok', false, 'error', 'verification_failed');
  end if;

  insert into quest_completions(user_id, quest_id, venue_id, partner_id,
                                xp_awarded, points_awarded, source_scan_id, instance_id,
                                source_presence_check_id)
  values (uid, q.id, q.venue_id, q.partner_id, v_xp, v_points,
          p_source_scan_id, v_inst.id, v_check.id)
  returning * into v_completion;

  if v_inst.id is not null then
    update quest_instances set completed_at = now() where id = v_inst.id;
  end if;

  insert into points_ledger(user_id, transaction_type, source, points_amount,
                            xp_amount, quest_id, partner_id, metadata)
  values (uid, 'earn', 'quest_completion', v_points, v_xp, q.id, q.partner_id,
          jsonb_build_object('verification', p_verification_method, 'instance_id', v_inst.id,
                             'presence_check_id', v_check.id));

  update quest_attempts set status='completed', completed_at=now(),
         verification_method=p_verification_method
   where user_id=uid and quest_id=q.id and status='in_progress';

  if p_source_scan_id is not null then
    update scan_events set conversion_state='completed' where id = p_source_scan_id;
  end if;

  select * into v_profile from user_profiles where user_id = uid for update;
  prev_level := v_profile.level;
  new_level := level_for_xp(v_profile.xp + v_xp);
  update user_profiles set
    xp = xp + v_xp,
    points_balance_cache = points_balance_cache + v_points,
    lifetime_points = lifetime_points + v_points,
    completed_quests_count = completed_quests_count + 1,
    level = new_level
  where user_id = uid;

  insert into audit_logs(actor_id, action, entity_type, entity_id)
  values (uid, 'quest.completed', 'quest', q.id::text);

  return jsonb_build_object(
    'ok', true,
    'completion', to_jsonb(v_completion),
    'xpAwarded', v_xp,
    'pointsAwarded', v_points,
    'newLevel', new_level,
    'leveledUp', new_level > prev_level,
    'instanceId', v_inst.id
  );
end $$;

revoke all on function public.complete_quest(uuid, verification_type, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.complete_quest(uuid, verification_type, text, uuid, uuid, uuid) to authenticated;

-- ===========================================================================
-- 5. Retention
-- ===========================================================================
-- Challenges are useless after a day; checks keep only an outcome and are
-- kept 30 days (completions keep their own record; the link is set null).
create or replace function public.purge_presence_records()
returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare n integer; m integer;
begin
  delete from public.presence_checks where checked_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from public.presence_challenges c
   where c.created_at < now() - interval '1 day'
     and not exists (select 1 from public.presence_checks k where k.challenge_id = c.id);
  get diagnostics m = row_count;
  return n + m;
end $$;

revoke all on function public.purge_presence_records() from public, anon, authenticated;
grant execute on function public.purge_presence_records() to service_role;

commit;

-- Verification (run after applying):
--   select pg_get_function_identity_arguments('public.complete_quest'::regproc);  -- 6 args
--   select has_table_privilege('authenticated', 'public.presence_checks', 'SELECT'); -- false
--   As a tester on a GPS quest: create_presence_challenge → verify_gps_presence → complete_quest
--   with p_presence_check_id; completing without the check must return presence_required.
--
-- Rollback (restores the unverified GPS behaviour):
--   begin;
--   drop function if exists public.complete_quest(uuid, verification_type, text, uuid, uuid, uuid);
--   -- re-run complete_quest from 0018_scan_verification.sql
--   drop function if exists public.purge_presence_records();
--   drop function if exists public.verify_gps_presence(uuid, double precision, double precision, double precision, timestamptz);
--   drop function if exists public.create_presence_challenge(uuid);
--   drop index if exists public.quest_completions_presence_check_once;
--   alter table public.quest_completions drop column if exists source_presence_check_id;
--   drop table if exists public.presence_checks, public.presence_challenges;
--   commit;
