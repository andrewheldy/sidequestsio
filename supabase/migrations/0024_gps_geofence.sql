-- 0024_gps_geofence.sql — server-side location check for gps quests
--
-- WHY (2026-10-24): complete_quest() treated verification_type = 'gps' as
-- verified with no location at all (reproduced on a local staging copy), so a
-- gps quest could be completed from anywhere. This adds the check on the
-- server, where completion integrity belongs.
--
-- What changes:
--   1. quests.geofence_radius_m (nullable; NULL = 150 m default; 25–5000).
--   2. public.distance_m(): great-circle (haversine) distance in metres. No
--      PostGIS dependency.
--   3. complete_quest() gains p_latitude / p_longitude / p_accuracy_m
--      (all default NULL, so existing named-argument calls still resolve).
--      For gps quests it now requires a position, a reported accuracy of
--      100 m or better, a venue with coordinates, and
--         distance <= radius + least(accuracy, 50 m).
--      New errors: location_required, location_inaccurate, outside_geofence
--      (with distanceM / radiusM for the UI). Other verification types are
--      unchanged.
--
-- Privacy: the position is compared and discarded — not written to
-- quest_completions, quest_attempts, points_ledger, scan_events or
-- audit_logs. Only the failure reason 'outside_geofence' is recorded.
--
-- Limits (by design, documented): the browser reports the position, so this
-- is a presence check, not tamper-proof proof — a modified client can send
-- the venue's coordinates. It raises the cost of cheating to deliberate
-- spoofing, which is the right bar for low-value starter quests.
--
-- Deploy order: apply this migration, then deploy the client that sends the
-- position (src/pages/QuestDetail.tsx). Until the client ships, gps quests
-- return location_required — none are active in the repo seeds.
--
-- Idempotent. Function body = 0018's complete_quest plus the gps block.
--
-- Rollback:
--   begin;
--   drop function if exists public.complete_quest(uuid, verification_type, text, uuid, uuid,
--                                                 double precision, double precision, double precision);
--   -- re-run the complete_quest definition from 0018_scan_verification.sql
--   drop function if exists public.distance_m(double precision, double precision, double precision, double precision);
--   alter table public.quests drop column if exists geofence_radius_m;
--   commit;

begin;

-- 1. Per-quest radius ----------------------------------------------------------
alter table public.quests add column if not exists geofence_radius_m integer;
alter table public.quests drop constraint if exists quests_geofence_radius_m_range;
alter table public.quests add constraint quests_geofence_radius_m_range
  check (geofence_radius_m is null or geofence_radius_m between 25 and 5000);
comment on column public.quests.geofence_radius_m is
  'gps quests: completion must happen within this many metres of the venue (NULL = 150). See complete_quest().';

-- 2. Distance helper -------------------------------------------------------------
create or replace function public.distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable strict set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;
comment on function public.distance_m(double precision, double precision, double precision, double precision) is
  'Great-circle distance in metres (haversine, mean Earth radius 6371 km). Mirrored by src/lib/app/geofence.ts.';

-- 3. complete_quest with the gps check --------------------------------------------
-- The signature grows, so the 5-argument version must go first.
drop function if exists public.complete_quest(uuid, verification_type, text, uuid, uuid);

create or replace function public.complete_quest(
  p_quest_id uuid,
  p_verification_method verification_type,
  p_venue_code text,
  p_source_scan_id uuid,
  p_instance_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m double precision default null
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
  v_venue venues; v_radius integer; v_distance double precision;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- 0017: serialise completions per user+quest (replaces the dropped
  -- unique (user_id, quest_id) as the double-submit guard), then apply the
  -- quest's repeat rule: NULL cooldown = once ever, N = again after N days.
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

  -- 0018: QR/NFC quests need proof of presence: a code-verified scan of one of
  -- this quest's codes, by this user (or claimed from an anonymous scan made
  -- before they signed in), from the last 2 hours, not already used.
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

  -- 0024: GPS quests need the player's position inside the quest's geofence
  -- (venue coordinates + quests.geofence_radius_m, default 150 m). The
  -- position is used for this comparison only and is never stored.
  if q.verification_type = 'gps' then
    if p_latitude is null or p_longitude is null
       or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
      return jsonb_build_object('ok', false, 'error', 'location_required');
    end if;
    if p_accuracy_m is null or p_accuracy_m < 0 or p_accuracy_m > 100 then
      return jsonb_build_object('ok', false, 'error', 'location_inaccurate');
    end if;
    select * into v_venue from venues where id = q.venue_id;
    if not found or v_venue.latitude is null or v_venue.longitude is null then
      -- Fail closed: a gps quest without a mapped venue cannot be verified.
      return jsonb_build_object('ok', false, 'error', 'verification_failed');
    end if;
    v_radius := coalesce(q.geofence_radius_m, 150);
    v_distance := public.distance_m(p_latitude, p_longitude, v_venue.latitude, v_venue.longitude);
    -- GPS error is forgiven up to 50 m beyond the radius.
    if v_distance > v_radius + least(p_accuracy_m, 50) then
      update quest_attempts set status = 'failed', failure_reason = 'outside_geofence',
             verification_method = p_verification_method
       where user_id = uid and quest_id = q.id and status = 'in_progress';
      return jsonb_build_object('ok', false, 'error', 'outside_geofence',
                                'distanceM', round(v_distance::numeric), 'radiusM', v_radius);
    end if;
  end if;

  -- 0016: the venue code now lives in quest_secrets (was quests.verification_secret).
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
                                xp_awarded, points_awarded, source_scan_id, instance_id)
  values (uid, q.id, q.venue_id, q.partner_id, v_xp, v_points, p_source_scan_id, v_inst.id)
  returning * into v_completion;

  if v_inst.id is not null then
    update quest_instances set completed_at = now() where id = v_inst.id;
  end if;

  insert into points_ledger(user_id, transaction_type, source, points_amount,
                            xp_amount, quest_id, partner_id, metadata)
  values (uid, 'earn', 'quest_completion', v_points, v_xp, q.id, q.partner_id,
          jsonb_build_object('verification', p_verification_method, 'instance_id', v_inst.id));

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

commit;

-- Verification:
--   select pg_get_function_identity_arguments('public.complete_quest'::regproc);  -- 8 args
--   select public.distance_m(25.7617, -80.1918, 25.7617, -80.1918);               -- 0
--   -- Signed in, on an active gps quest: no position → location_required;
--   -- accuracy 500 → location_inaccurate; 1 km away → outside_geofence;
--   -- at the venue → ok.
