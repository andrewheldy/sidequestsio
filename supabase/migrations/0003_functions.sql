-- ===========================================================================
-- SideQuests.io — Server-side functions / RPCs (Phases 6–11)
-- ===========================================================================
-- These SECURITY DEFINER functions own the integrity-sensitive mutations so the
-- rules can't be bypassed by a tampered client. They return JSON shapes that
-- match the TypeScript Repository results.
-- ===========================================================================

-- Triangular XP curve, matching src/lib/app/leveling.ts.
create or replace function level_for_xp(p_xp integer) returns integer
language plpgsql immutable as $$
declare lvl integer := 1;
begin
  while round(100 * (lvl + 1) * lvl / 2.0) <= p_xp loop
    lvl := lvl + 1;
  end loop;
  return lvl;
end $$;

-- ---------------------------------------------------------------------------
-- record_scan: append a scan event (anonymous or authenticated).
-- ---------------------------------------------------------------------------
create or replace function record_scan(
  p_quest_id uuid,
  p_qr_code_id uuid,
  p_anonymous_session_id text,
  p_device_type device_type,
  p_browser text,
  p_operating_system text,
  p_referrer text
) returns scan_events
language plpgsql security definer set search_path = public as $$
declare q quests; s scan_events;
begin
  select * into q from quests where id = p_quest_id;
  if not found then raise exception 'quest_not_found'; end if;

  insert into scan_events(
    qr_code_id, quest_id, venue_id, partner_id, user_id,
    anonymous_session_id, device_type, browser, operating_system, referrer,
    conversion_state
  ) values (
    p_qr_code_id, q.id, q.venue_id, q.partner_id, auth.uid(),
    p_anonymous_session_id, coalesce(p_device_type,'unknown'), p_browser,
    p_operating_system, p_referrer,
    case when auth.uid() is null then 'scanned' else 'authenticated' end
  ) returning * into s;

  return s;
end $$;

-- ---------------------------------------------------------------------------
-- start_quest: idempotent in-progress attempt for the current user.
-- ---------------------------------------------------------------------------
create or replace function start_quest(p_quest_id uuid) returns quest_attempts
language plpgsql security definer set search_path = public as $$
declare a quest_attempts;
begin
  select * into a from quest_attempts
   where user_id = auth.uid() and quest_id = p_quest_id and status = 'in_progress'
   limit 1;
  if found then return a; end if;

  insert into quest_attempts(user_id, quest_id)
  values (auth.uid(), p_quest_id)
  returning * into a;
  return a;
end $$;

-- ---------------------------------------------------------------------------
-- complete_quest: verify + award atomically (anti-farming via unique index).
-- ---------------------------------------------------------------------------
create or replace function complete_quest(
  p_quest_id uuid,
  p_verification_method verification_type,
  p_venue_code text,
  p_source_scan_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q quests; uid uuid := auth.uid();
  v_completion quest_completions; v_profile user_profiles;
  prev_level integer; new_level integer; verified boolean;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if exists (select 1 from quest_completions where user_id = uid and quest_id = q.id) then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;
  if q.status <> 'active' or (q.start_date is not null and now() < q.start_date) then
    return jsonb_build_object('ok', false, 'error', 'quest_inactive');
  end if;
  if q.end_date is not null and now() > q.end_date then
    return jsonb_build_object('ok', false, 'error', 'quest_expired');
  end if;

  verified := case q.verification_type
    when 'venue_code' then (p_venue_code is not null and q.verification_secret is not null
                            and upper(trim(p_venue_code)) = upper(q.verification_secret))
    else true end;
  if not verified then
    update quest_attempts set status='failed', failure_reason='verification_failed',
           verification_method=p_verification_method
     where user_id=uid and quest_id=q.id and status='in_progress';
    return jsonb_build_object('ok', false, 'error', 'verification_failed');
  end if;

  insert into quest_completions(user_id, quest_id, venue_id, partner_id,
                                xp_awarded, points_awarded, source_scan_id)
  values (uid, q.id, q.venue_id, q.partner_id, q.xp_reward, q.points_reward, p_source_scan_id)
  returning * into v_completion;

  insert into points_ledger(user_id, transaction_type, source, points_amount,
                            xp_amount, quest_id, partner_id, metadata)
  values (uid, 'earn', 'quest_completion', q.points_reward, q.xp_reward, q.id, q.partner_id,
          jsonb_build_object('verification', p_verification_method));

  update quest_attempts set status='completed', completed_at=now(),
         verification_method=p_verification_method
   where user_id=uid and quest_id=q.id and status='in_progress';

  if p_source_scan_id is not null then
    update scan_events set conversion_state='completed' where id = p_source_scan_id;
  end if;

  select * into v_profile from user_profiles where user_id = uid for update;
  prev_level := v_profile.level;
  new_level := level_for_xp(v_profile.xp + q.xp_reward);
  update user_profiles set
    xp = xp + q.xp_reward,
    points_balance_cache = points_balance_cache + q.points_reward,
    lifetime_points = lifetime_points + q.points_reward,
    completed_quests_count = completed_quests_count + 1,
    level = new_level
  where user_id = uid;

  insert into audit_logs(actor_id, action, entity_type, entity_id)
  values (uid, 'quest.completed', 'quest', q.id::text);

  return jsonb_build_object(
    'ok', true,
    'completion', to_jsonb(v_completion),
    'xpAwarded', q.xp_reward,
    'pointsAwarded', q.points_reward,
    'newLevel', new_level,
    'leveledUp', new_level > prev_level
  );
end $$;

-- ---------------------------------------------------------------------------
-- redeem_reward: spend points atomically, decrement inventory, issue code.
-- ---------------------------------------------------------------------------
create or replace function redeem_reward(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r rewards; uid uuid := auth.uid(); bal integer; red reward_redemptions; code text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into r from rewards where id = p_reward_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'inactive'); end if;
  if r.expiration_date is not null and now() > r.expiration_date then
    return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if r.inventory is not null and r.inventory <= 0 then
    return jsonb_build_object('ok', false, 'error', 'out_of_stock'); end if;

  select points_balance_cache into bal from user_profiles where user_id = uid for update;
  if bal < r.points_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_points'); end if;

  code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,4) || '-' ||
                substr(replace(gen_random_uuid()::text,'-',''),1,4));

  insert into reward_redemptions(user_id, reward_id, partner_id, points_spent, redemption_code)
  values (uid, r.id, r.partner_id, r.points_cost, code)
  returning * into red;

  insert into points_ledger(user_id, transaction_type, source, points_amount, reward_id, partner_id, metadata)
  values (uid, 'spend', 'reward_redemption', -r.points_cost, r.id, r.partner_id,
          jsonb_build_object('redemption_id', red.id));

  if r.inventory is not null then
    update rewards set inventory = inventory - 1 where id = r.id;
  end if;
  update user_profiles set
    points_balance_cache = points_balance_cache - r.points_cost,
    rewards_redeemed_count = rewards_redeemed_count + 1
  where user_id = uid;

  insert into audit_logs(actor_id, action, entity_type, entity_id)
  values (uid, 'reward.redeemed', 'reward', r.id::text);

  return jsonb_build_object('ok', true, 'redemption', to_jsonb(red));
end $$;

-- ---------------------------------------------------------------------------
-- create_community_note: only completers may post; <=280 chars.
-- ---------------------------------------------------------------------------
create or replace function create_community_note(
  p_quest_id uuid, p_content text, p_image_url text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q quests; n community_notes;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_completed'); end if;
  if p_content is null or length(trim(p_content)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  if char_length(p_content) > 280 then
    return jsonb_build_object('ok', false, 'error', 'too_long'); end if;
  if not exists (select 1 from quest_completions where user_id = uid and quest_id = p_quest_id) then
    return jsonb_build_object('ok', false, 'error', 'not_completed'); end if;
  select * into q from quests where id = p_quest_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  insert into community_notes(user_id, quest_id, venue_id, content, image_url)
  values (uid, q.id, q.venue_id, trim(p_content), p_image_url)
  returning * into n;
  update user_profiles set community_notes_count = community_notes_count + 1 where user_id = uid;

  return jsonb_build_object('ok', true, 'note', to_jsonb(n));
end $$;

-- ---------------------------------------------------------------------------
-- adjust_points: admin-only manual ledger adjustment.
-- ---------------------------------------------------------------------------
create or replace function adjust_points(
  p_user_id uuid, p_points integer, p_xp integer, p_reason text
) returns points_ledger
language plpgsql security definer set search_path = public as $$
declare e points_ledger;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into points_ledger(user_id, transaction_type, source, points_amount, xp_amount, metadata)
  values (p_user_id, 'adjust', 'admin_adjustment', p_points, coalesce(p_xp,0),
          jsonb_build_object('reason', p_reason))
  returning * into e;
  update user_profiles set
    points_balance_cache = points_balance_cache + p_points,
    lifetime_points = lifetime_points + greatest(p_points, 0),
    xp = xp + coalesce(p_xp,0),
    level = level_for_xp(xp + coalesce(p_xp,0))
  where user_id = p_user_id;
  insert into audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'points.adjusted', 'user', p_user_id::text,
          jsonb_build_object('points', p_points, 'reason', p_reason));
  return e;
end $$;

-- ---------------------------------------------------------------------------
-- get_leaderboard: in-period XP per user, honouring opt-out.
-- ---------------------------------------------------------------------------
create or replace function get_leaderboard(
  p_scope leaderboard_scope, p_scope_id text,
  p_period leaderboard_period, p_limit integer
) returns table(rank bigint, user_id uuid, display_name text, avatar_url text, score bigint)
language sql stable security definer set search_path = public as $$
  with since as (
    select case p_period
      when 'weekly' then now() - interval '7 days'
      when 'monthly' then now() - interval '1 month'
      else timestamptz '-infinity' end as ts
  ),
  scoped as (
    select l.user_id, sum(l.xp_amount)::bigint as score
    from points_ledger l
    join quests q on q.id = l.quest_id
    left join venues v on v.id = q.venue_id, since
    where l.xp_amount > 0 and l.created_at >= since.ts
      and (
        p_scope = 'global'
        or (p_scope = 'campaign' and l.partner_id::text = p_scope_id)
        or (p_scope = 'venue' and q.venue_id::text = p_scope_id)
        or (p_scope = 'city' and v.city = p_scope_id)
      )
    group by l.user_id
  )
  select row_number() over (order by s.score desc) as rank,
         u.id, u.display_name, u.avatar_url, s.score
  from scoped s
  join users u on u.id = s.user_id
  join privacy_preferences p on p.user_id = u.id
  where u.role = 'user' and p.leaderboard_visibility <> 'private'
  order by s.score desc
  limit coalesce(p_limit, 100);
$$;

-- ---------------------------------------------------------------------------
-- partner_analytics / platform_analytics: aggregate, privacy-safe rollups.
-- ---------------------------------------------------------------------------
create or replace function partner_analytics(p_partner_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare total int; uniq int; auth_v int; comp int; redm int; notes int; suppressed boolean;
begin
  if not owns_partner(p_partner_id) then raise exception 'forbidden'; end if;
  select count(*) into total from scan_events where partner_id = p_partner_id;
  select count(distinct coalesce(user_id::text, anonymous_session_id)) into uniq
    from scan_events where partner_id = p_partner_id;
  select count(distinct user_id) into auth_v
    from scan_events where partner_id = p_partner_id and user_id is not null;
  select count(*) into comp from quest_completions where partner_id = p_partner_id;
  select count(*) into redm from reward_redemptions where partner_id = p_partner_id;
  select count(*) into notes from community_notes n
    join quests q on q.id = n.quest_id where q.partner_id = p_partner_id;
  suppressed := total > 0 and total < 5;

  return jsonb_build_object(
    'totalScans', total, 'uniqueVisitors', uniq, 'authenticatedVisitors', auth_v,
    'completions', comp, 'conversionRate', case when total>0 then comp::float/total else 0 end,
    'rewardsRedeemed', redm, 'communityNotes', notes,
    'suppressed', suppressed,
    'scansByDay', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'value', c) order by d) from (
        select date(timestamp) d, count(*) c from scan_events
        where partner_id = p_partner_id group by date(timestamp)
      ) t), '[]'::jsonb),
    'scansByQuest', case when suppressed then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.title, 'value', c)) from (
        select quest_id, count(*) c from scan_events where partner_id = p_partner_id group by quest_id
      ) t join quests q on q.id = t.quest_id), '[]'::jsonb) end,
    'scansByVenue', case when suppressed then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'label', v.name, 'value', c)) from (
        select venue_id, count(*) c from scan_events
        where partner_id = p_partner_id and venue_id is not null group by venue_id
      ) t join venues v on v.id = t.venue_id), '[]'::jsonb) end
  );
end $$;

create or replace function platform_analytics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare total int; uniq int; auth_v int; comp int; redm int; notes int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select count(*) into total from scan_events;
  select count(distinct coalesce(user_id::text, anonymous_session_id)) into uniq from scan_events;
  select count(distinct user_id) into auth_v from scan_events where user_id is not null;
  select count(*) into comp from quest_completions;
  select count(*) into redm from reward_redemptions;
  select count(*) into notes from community_notes;
  return jsonb_build_object(
    'totalScans', total, 'uniqueVisitors', uniq, 'authenticatedVisitors', auth_v,
    'completions', comp, 'conversionRate', case when total>0 then comp::float/total else 0 end,
    'rewardsRedeemed', redm, 'communityNotes', notes, 'suppressed', false,
    'scansByDay', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'value', c) order by d) from (
        select date(timestamp) d, count(*) c from scan_events group by date(timestamp)
      ) t), '[]'::jsonb),
    'scansByQuest', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.title, 'value', c)) from (
        select quest_id, count(*) c from scan_events group by quest_id
      ) t join quests q on q.id = t.quest_id), '[]'::jsonb),
    'scansByVenue', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'label', v.name, 'value', c)) from (
        select venue_id, count(*) c from scan_events where venue_id is not null group by venue_id
      ) t join venues v on v.id = t.venue_id), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------
-- create_qr_code: generate a unique short code for a quest.
-- ---------------------------------------------------------------------------
create or replace function create_qr_code(
  p_quest_id uuid, p_partner_id uuid, p_venue_id uuid
) returns qr_codes
language plpgsql security definer set search_path = public as $$
declare c qr_codes; code text;
begin
  if not owns_partner(p_partner_id) then raise exception 'forbidden'; end if;
  code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into qr_codes(quest_id, partner_id, venue_id, code, destination_url)
  values (p_quest_id, p_partner_id, p_venue_id, code, '/q/' || p_quest_id::text)
  returning * into c;
  return c;
end $$;

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create app rows when an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into users(id, email, display_name)
  values (new.id, new.email, coalesce(split_part(new.email,'@',1), 'Quester'))
  on conflict (id) do nothing;
  insert into user_profiles(user_id) values (new.id) on conflict do nothing;
  insert into privacy_preferences(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
