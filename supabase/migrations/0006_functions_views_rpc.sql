-- =============================================================================
-- 0006_functions_views_rpc.sql
-- The safe server-side write-path for the points/XP economy plus a public
-- profile view for social display and a leaderboard refresh job.
--
-- Why this migration exists (audit follow-up):
--   * points_ledger / xp_events / reward_redemptions have NO client write
--     policies, and qr_codes are not client-readable. All of those mutations
--     happen here, inside SECURITY DEFINER functions that validate first and
--     run as owner (bypassing RLS). The frontend calls these via supabase.rpc()
--     using the anon key — no service_role is ever needed in the client.
--
-- Depends on 0001–0005. Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public_profiles: safe, publicly-readable subset of profiles so the app can
-- render note authors and leaderboards WITHOUT exposing private profile data
-- (home_city, interests, onboarding, etc.). The base table keeps owner-only RLS.
-- -----------------------------------------------------------------------------
create or replace view public.public_profiles as
  select user_id, display_name, username, avatar_url, level, xp
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- =============================================================================
-- Internal award helpers — NOT callable by clients (execute revoked below).
-- They are invoked only by the RPCs further down, which run as owner.
-- =============================================================================
create or replace function public._award_points(
  p_uid uuid, p_delta integer, p_reason text, p_ref_type text, p_ref_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if p_delta = 0 then return; end if;
  select coalesce(
           (select balance_after from public.points_ledger
            where user_id = p_uid order by created_at desc, id desc limit 1), 0)
    into v_balance;
  v_balance := v_balance + p_delta;
  insert into public.points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
  values (p_uid, p_delta, v_balance, p_reason, p_ref_type, p_ref_id);
end;
$$;

create or replace function public._award_xp(
  p_uid uuid, p_xp integer, p_event text, p_ref_type text, p_ref_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_xp = 0 then return; end if;
  insert into public.xp_events (user_id, xp, event_type, ref_type, ref_id)
  values (p_uid, p_xp, p_event, p_ref_type, p_ref_id);
  update public.profiles
     set xp    = xp + p_xp,
         level = greatest(1, floor((xp + p_xp) / 250.0)::int + 1)
   where user_id = p_uid;
end;
$$;

revoke all on function public._award_points(uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public._award_xp(uuid, integer, text, text, uuid)     from public, anon, authenticated;

-- =============================================================================
-- complete_quest_by_qr(code): the core mobile QR flow. Verifies a scanned code,
-- records a verified completion (idempotent), awards XP + points once, and logs
-- analytics. Returns the completion row.
-- =============================================================================
create or replace function public.complete_quest_by_qr(p_code text)
returns public.quest_completions
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_qr         public.qr_codes;
  v_quest      public.quests;
  v_completion public.quest_completions;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_qr from public.qr_codes where code = p_code and is_active = true;
  if not found then
    raise exception 'Invalid or inactive QR code' using errcode = 'P0002';
  end if;

  select * into v_quest from public.quests where id = v_qr.quest_id;
  if v_quest.status <> 'published' then
    raise exception 'Quest is not currently available' using errcode = 'P0002';
  end if;

  -- analytics: always log the scan
  insert into public.qr_scans (qr_code_id, quest_id, user_id)
  values (v_qr.id, v_qr.quest_id, v_uid);
  update public.qr_codes set scan_count = scan_count + 1 where id = v_qr.id;

  -- record completion once (unique(quest_id,user_id) prevents duplicates)
  insert into public.quest_completions (
    quest_id, user_id, status, verification_method, qr_code_id,
    verified_at, xp_awarded, points_awarded)
  values (
    v_quest.id, v_uid, 'verified', 'qr', v_qr.id,
    now(), v_quest.xp, v_quest.points)
  on conflict (quest_id, user_id) do nothing
  returning * into v_completion;

  -- already completed → return existing, do not re-award
  if v_completion.id is null then
    select * into v_completion
    from public.quest_completions
    where quest_id = v_quest.id and user_id = v_uid;
    return v_completion;
  end if;

  perform public._award_xp(v_uid, v_quest.xp, 'quest_completion', 'quest_completion', v_completion.id);
  perform public._award_points(v_uid, v_quest.points, 'quest_completion', 'quest_completion', v_completion.id);

  return v_completion;
end;
$$;

-- =============================================================================
-- redeem_reward(reward_id): atomically validates and redeems a reward. Locks the
-- reward row to make inventory/limit checks race-safe, spends points via the
-- ledger, and creates a pending redemption with a claim code.
-- =============================================================================
create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_reward     public.rewards;
  v_balance    integer;
  v_used       integer;
  v_redemption public.reward_redemptions;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- lock the reward row to serialize concurrent redemptions
  select * into v_reward from public.rewards where id = p_reward_id for update;
  if not found or not v_reward.is_active then
    raise exception 'Reward unavailable';
  end if;
  if v_reward.valid_from is not null and now() < v_reward.valid_from then
    raise exception 'Reward not yet available';
  end if;
  if v_reward.valid_until is not null and now() > v_reward.valid_until then
    raise exception 'Reward has expired';
  end if;

  -- per-user limit (cancelled redemptions don't count)
  select count(*) into v_used
  from public.reward_redemptions
  where reward_id = p_reward_id and user_id = v_uid and status <> 'cancelled';
  if v_used >= v_reward.per_user_limit then
    raise exception 'You have reached the redemption limit for this reward';
  end if;

  -- inventory (null = unlimited)
  if v_reward.inventory is not null then
    if (select count(*) from public.reward_redemptions
        where reward_id = p_reward_id and status <> 'cancelled') >= v_reward.inventory then
      raise exception 'Reward is out of stock';
    end if;
  end if;

  -- balance check
  select coalesce(
           (select balance_after from public.points_ledger
            where user_id = v_uid order by created_at desc, id desc limit 1), 0)
    into v_balance;
  if v_balance < v_reward.cost_points then
    raise exception 'Not enough points to redeem this reward';
  end if;

  perform public._award_points(v_uid, -v_reward.cost_points, 'reward_redemption', 'reward', p_reward_id);

  insert into public.reward_redemptions (reward_id, user_id, status, points_spent, code)
  values (p_reward_id, v_uid, 'pending', v_reward.cost_points, encode(gen_random_bytes(6), 'hex'))
  returning * into v_redemption;

  return v_redemption;
end;
$$;

-- =============================================================================
-- current_points(): the caller's current points balance (latest ledger entry).
-- =============================================================================
create or replace function public.current_points()
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
           (select balance_after from public.points_ledger
            where user_id = auth.uid() order by created_at desc, id desc limit 1), 0);
$$;

-- =============================================================================
-- refresh_leaderboards(limit): recomputes today's global + per-city snapshots
-- from profile XP and ledger balances. Intended for a scheduled job
-- (pg_cron / Edge Function) running as service_role, or an admin. Re-running on
-- the same day is idempotent (replaces that day's snapshot).
-- =============================================================================
create or replace function public.refresh_leaderboards(p_limit integer default 100)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- GLOBAL · all_time
  delete from public.leaderboard_snapshots
  where scope = 'global' and period = 'all_time' and snapshot_date = current_date;

  insert into public.leaderboard_snapshots (scope, city, period, user_id, rank, points, xp, snapshot_date)
  select 'global', null, 'all_time', r.user_id, r.rnk, r.points, r.xp, current_date
  from (
    select p.user_id,
           row_number() over (order by p.xp desc, p.user_id) as rnk,
           p.xp,
           coalesce((select balance_after from public.points_ledger pl
                     where pl.user_id = p.user_id
                     order by created_at desc, id desc limit 1), 0) as points
    from public.profiles p
  ) r
  where r.rnk <= p_limit;

  -- CITY · all_time
  delete from public.leaderboard_snapshots
  where scope = 'city' and period = 'all_time' and snapshot_date = current_date;

  insert into public.leaderboard_snapshots (scope, city, period, user_id, rank, points, xp, snapshot_date)
  select 'city', r.home_city, 'all_time', r.user_id, r.rnk, r.points, r.xp, current_date
  from (
    select p.user_id, p.home_city,
           row_number() over (partition by p.home_city order by p.xp desc, p.user_id) as rnk,
           p.xp,
           coalesce((select balance_after from public.points_ledger pl
                     where pl.user_id = p.user_id
                     order by created_at desc, id desc limit 1), 0) as points
    from public.profiles p
    where p.home_city is not null
  ) r
  where r.rnk <= p_limit;
end;
$$;

-- =============================================================================
-- Execute grants: clients may call the validated RPCs; the refresh job is
-- service_role / admin only.
-- =============================================================================
grant execute on function public.complete_quest_by_qr(text)  to authenticated;
grant execute on function public.redeem_reward(uuid)         to authenticated;
grant execute on function public.current_points()            to authenticated;

revoke all on function public.refresh_leaderboards(integer) from public, anon, authenticated;
grant execute on function public.refresh_leaderboards(integer) to service_role;
