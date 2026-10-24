-- Shared fixtures for supabase/tests/*.test.sql (session-local, pg_temp).
-- Included with \ir by each test. TEST-ONLY.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- A real signup: the auth trigger provisions users / user_profiles /
-- privacy_preferences / profiles exactly as production does.
create or replace function pg_temp.mk_user(p_email text, p_interests text[] default '{}')
returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data) values (v, p_email, '{}'::jsonb);
  update public.profiles set interests = p_interests where user_id = v;
  return v;
end $$;

create or replace function pg_temp.mk_partner(p_name text) returns uuid
language sql as $$
  insert into public.partners (name, type, status) values (p_name, 'venue', 'active') returning id
$$;

create or replace function pg_temp.mk_venue(
  p_partner uuid, p_name text, p_lat double precision, p_lng double precision,
  p_hours jsonb default null, p_tz text default null
) returns uuid language sql as $$
  insert into public.venues (partner_id, name, latitude, longitude, opening_hours, timezone, status, neighborhood)
  values (p_partner, p_name, p_lat, p_lng, p_hours, p_tz, 'active', 'Test Hood') returning id
$$;

create or replace function pg_temp.mk_quest(
  p_partner uuid, p_venue uuid, p_title text,
  p_category public.quest_category default 'art',
  p_minutes integer default 20,
  p_verification public.verification_type default 'qr'
) returns uuid language sql as $$
  insert into public.quests (partner_id, venue_id, title, category, status, estimated_minutes,
                             verification_type, xp_reward, points_reward)
  values (p_partner, p_venue, p_title, p_category, 'active', p_minutes, p_verification, 150, 75)
  returning id
$$;

-- Always-open hours: every day 00:00–24:00.
create or replace function pg_temp.all_day() returns jsonb language sql as $$
  select jsonb_build_object('weekly', jsonb_build_object(
    'sun', '[["00:00","24:00"]]'::jsonb, 'mon', '[["00:00","24:00"]]'::jsonb,
    'tue', '[["00:00","24:00"]]'::jsonb, 'wed', '[["00:00","24:00"]]'::jsonb,
    'thu', '[["00:00","24:00"]]'::jsonb, 'fri', '[["00:00","24:00"]]'::jsonb,
    'sat', '[["00:00","24:00"]]'::jsonb))
$$;

-- A timezone whose current local time is inside [p_from, p_to). Some zone always
-- qualifies because offsets span UTC−12…UTC+14.
create or replace function pg_temp.tz_at(p_from time, p_to time) returns text
language sql stable as $$
  select name from pg_timezone_names
   where name like '%/%' and name not like 'posix/%' and name not like 'Etc/%'
     and (now() at time zone name)::time >= p_from
     and (now() at time zone name)::time <  p_to
   order by name limit 1
$$;

-- Act as a user (NULL = anon) for the rest of the transaction.
create or replace function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('role', case when p_uid is null then 'anon' else 'authenticated' end, true);
end $$;

create or replace function pg_temp.act_as_admin() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'postgres', true);
end $$;

create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'not ok - %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;

create or replace function pg_temp.raises(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok - % (%)', p_msg, sqlerrm;
    return;
  end;
  raise exception 'not ok - % (did not raise)', p_msg;
end $$;
