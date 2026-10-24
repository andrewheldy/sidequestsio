-- create_presence_challenge / verify_gps_presence / complete_quest (GPS + QR paths)
\ir _helpers.sql
begin;

create temp table fx (k text primary key, id uuid) on commit drop;
grant all on fx to anon, authenticated;
do $$
declare p uuid := pg_temp.mk_partner('Presence Partner'); v uuid;
begin
  v := pg_temp.mk_venue(p, 'Presence Venue', 25.8000, -80.2000);
  insert into fx values ('p', p), ('v', v);
  insert into fx values ('qg', pg_temp.mk_quest(p, v, 'GPS quest', 'art', 20, 'gps'));
  update public.quests set verification_radius_m = 100 where id = (select id from fx where k = 'qg');
  insert into fx values ('qq', pg_temp.mk_quest(p, v, 'QR quest', 'art', 20, 'qr'));
  insert into fx values ('u', pg_temp.mk_user('presence-u@test.local'));
  insert into fx values ('u2', pg_temp.mk_user('presence-u2@test.local'));
end $$;

-- verify helper: new challenge + one sample; returns the verify result.
create or replace function pg_temp.check_at(p_lat float8, p_lng float8, p_acc float8,
                                            p_at timestamptz default now()) returns jsonb
language plpgsql as $$
declare c jsonb;
begin
  c := public.create_presence_challenge((select id from fx where k = 'qg'));
  return public.verify_gps_presence((c ->> 'challengeId')::uuid, p_lat, p_lng, p_acc, p_at);
end $$;

select pg_temp.act_as((select id from fx where k = 'u'));
do $$
declare c jsonb; r jsonb;
begin
  perform pg_temp.ok(public.create_presence_challenge((select id from fx where k='qq')) ->> 'error' = 'not_gps_quest',
    'no GPS challenge for a QR quest');
  perform pg_temp.ok(public.create_presence_challenge(gen_random_uuid()) ->> 'error' = 'not_found', 'unknown quest');

  -- 0.0003° ≈ 33 m; 0.0008° ≈ 89 m; 0.002° ≈ 222 m (north of the venue).
  r := pg_temp.check_at(25.8003, -80.2000, 10);
  perform pg_temp.ok(r ->> 'outcome' = 'inside' and r ->> 'reason' = 'ok', 'inside: distance + accuracy ≤ radius');
  r := pg_temp.check_at(25.8020, -80.2000, 10);
  perform pg_temp.ok(r ->> 'outcome' = 'outside' and r ->> 'reason' = 'outside_radius', 'outside: distance − accuracy > radius');
  r := pg_temp.check_at(25.8008, -80.2000, 20);
  perform pg_temp.ok(r ->> 'outcome' = 'uncertain' and r ->> 'reason' = 'ambiguous', 'uncertain when accuracy straddles the radius');
  r := pg_temp.check_at(25.8000, -80.2000, 60);
  perform pg_temp.ok(r ->> 'outcome' = 'uncertain' and r ->> 'reason' = 'low_accuracy', 'accuracy worse than 50 m is uncertain');
  r := pg_temp.check_at(25.8000, -80.2000, 10, now() - interval '40 seconds');
  perform pg_temp.ok(r ->> 'outcome' = 'uncertain' and r ->> 'reason' = 'stale_sample', 'sample older than 30 s is stale');
  r := pg_temp.check_at(25.8000, -80.2000, 10, now() + interval '2 minutes');
  perform pg_temp.ok(r ->> 'outcome' = 'uncertain' and r ->> 'reason' = 'invalid_sample', 'future timestamp is invalid');
  r := pg_temp.check_at('NaN', -80.2000, 10);
  perform pg_temp.ok(r ->> 'reason' = 'invalid_sample', 'NaN latitude is invalid');
  r := pg_temp.check_at(25.8000, -80.2000, 0);
  perform pg_temp.ok(r ->> 'reason' = 'invalid_sample', 'zero accuracy is invalid');
  r := pg_temp.check_at(25.8000, -80.2000, 'Infinity');
  perform pg_temp.ok(r ->> 'reason' = 'invalid_sample', 'infinite accuracy is invalid');

  c := public.create_presence_challenge((select id from fx where k = 'qg'));
  perform public.verify_gps_presence((c ->> 'challengeId')::uuid, 25.8, -80.2, 10, now());
  perform pg_temp.ok(public.verify_gps_presence((c ->> 'challengeId')::uuid, 25.8, -80.2, 10, now()) ->> 'error'
                       = 'challenge_invalid', 'a consumed challenge cannot be replayed');
  perform pg_temp.ok(public.verify_gps_presence(gen_random_uuid(), 25.8, -80.2, 10, now()) ->> 'error' = 'challenge_invalid',
    'unknown challenge rejected');
end $$;

-- Keep the 10-per-10-minutes rate limit out of the way of later checks.
select pg_temp.act_as_admin();
update public.presence_challenges set created_at = created_at - interval '11 minutes';
select pg_temp.act_as((select id from fx where k = 'u'));

-- Expired challenge
create temp table ch_exp on commit drop as
  select (public.create_presence_challenge((select id from fx where k = 'qg')) ->> 'challengeId')::uuid as id;
select pg_temp.act_as_admin();
update public.presence_challenges set expires_at = now() - interval '1 second' where id = (select id from ch_exp);
grant select on ch_exp to authenticated;
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(public.verify_gps_presence((select id from ch_exp), 25.8, -80.2, 10, now()) ->> 'error' = 'challenge_invalid',
  'expired challenge rejected');

-- Another user's challenge
create temp table ch_u on commit drop as
  select (public.create_presence_challenge((select id from fx where k = 'qg')) ->> 'challengeId')::uuid as id;
grant select on ch_u to authenticated;
select pg_temp.act_as((select id from fx where k = 'u2'));
select pg_temp.ok(public.verify_gps_presence((select id from ch_u), 25.8, -80.2, 10, now()) ->> 'error' = 'challenge_invalid',
  'cannot answer another user''s challenge');

select pg_temp.act_as_admin();
select pg_temp.ok(not exists (select 1 from information_schema.columns
                               where table_name in ('presence_checks', 'presence_challenges')
                                 and column_name ~ '(^|_)(lat|latitude|lng|lon|longitude|accuracy|accuracy_m|geog)(_|$)'),
  'presence tables store no coordinates or accuracy');

-- ---------------------------------------------------------------------------
-- complete_quest
-- ---------------------------------------------------------------------------
-- Keep the 10-per-10-minutes rate limit out of the way of later checks.
select pg_temp.act_as_admin();
update public.presence_challenges set created_at = created_at - interval '11 minutes';
select pg_temp.act_as((select id from fx where k = 'u'));

create temp table checks (k text primary key, id uuid) on commit drop;
grant all on checks to authenticated;
select pg_temp.act_as((select id from fx where k = 'u'));
insert into checks values ('inside',  (pg_temp.check_at(25.8003, -80.2000, 10) ->> 'checkId')::uuid);
insert into checks values ('outside', (pg_temp.check_at(25.8020, -80.2000, 10) ->> 'checkId')::uuid);
insert into checks values ('unsure',  (pg_temp.check_at(25.8008, -80.2000, 20) ->> 'checkId')::uuid);
select pg_temp.act_as((select id from fx where k = 'u2'));
insert into checks values ('u2_inside', (pg_temp.check_at(25.8003, -80.2000, 10) ->> 'checkId')::uuid);

select pg_temp.act_as((select id from fx where k = 'u'));
do $$
declare q uuid := (select id from fx where k = 'qg'); r jsonb;
begin
  perform pg_temp.ok(public.complete_quest(q, 'gps', null, null) ->> 'error' = 'presence_required',
    'GPS quest without a presence check is refused (was trust-the-client)');
  perform pg_temp.ok(public.complete_quest(q, 'gps', null, null, null, (select id from checks where k='outside')) ->> 'error'
                       = 'presence_required', 'outside check refused');
  perform pg_temp.ok(public.complete_quest(q, 'gps', null, null, null, (select id from checks where k='unsure')) ->> 'error'
                       = 'presence_required', 'uncertain check refused (no automatic pass)');
  perform pg_temp.ok(public.complete_quest(q, 'gps', null, null, null, (select id from checks where k='u2_inside')) ->> 'error'
                       = 'presence_required', 'another user''s check refused');
  r := public.complete_quest(q, 'gps', null, null, null, (select id from checks where k='inside'));
  perform pg_temp.ok((r ->> 'ok')::boolean and (r ->> 'xpAwarded')::int = 150 and (r ->> 'pointsAwarded')::int = 75,
    'inside check completes with the quest''s canonical rewards');
end $$;
select pg_temp.ok((select count(*) from public.points_ledger where quest_id = (select id from fx where k='qg')) = 1
                  and (select xp from public.user_profiles where user_id = (select id from fx where k='u')) = 150,
  'one ledger row and XP applied atomically');

select pg_temp.act_as_admin();
update public.quests set repeat_cooldown_days = 1 where id = (select id from fx where k = 'qg');
update public.quest_completions set completed_at = now() - interval '2 days' where quest_id = (select id from fx where k = 'qg');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(public.complete_quest((select id from fx where k='qg'), 'gps', null, null, null,
                    (select id from checks where k='inside')) ->> 'error' = 'presence_required',
  'a presence check cannot be reused for a repeat completion');
insert into checks values ('stale_check', (pg_temp.check_at(25.8003, -80.2000, 10) ->> 'checkId')::uuid);
select pg_temp.act_as_admin();
update public.presence_checks set checked_at = now() - interval '16 minutes' where id = (select id from checks where k = 'stale_check');
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok(public.complete_quest((select id from fx where k='qg'), 'gps', null, null, null,
                    (select id from checks where k='stale_check')) ->> 'error' = 'presence_required',
  'presence check older than 15 minutes refused');

-- QR path is unchanged: needs a code-verified scan.
select pg_temp.ok(public.complete_quest((select id from fx where k='qq'), 'qr', null, null) ->> 'error' = 'scan_required',
  'QR quest still requires a verified scan');
select pg_temp.act_as_admin();
create temp table scan on commit drop as
  with s as (
    insert into public.scan_events (quest_id, venue_id, partner_id, user_id, anonymous_session_id, code_verified)
    values ((select id from fx where k='qq'), (select id from fx where k='v'), (select id from fx where k='p'),
            (select id from fx where k='u'), 'test', true) returning id)
  select id from s;
grant select on scan to authenticated;
select pg_temp.act_as((select id from fx where k = 'u'));
select pg_temp.ok((public.complete_quest((select id from fx where k='qq'), 'qr', null, (select id from scan)) ->> 'ok')::boolean,
  'QR quest completes with a verified scan (5-arg-compatible call)');

-- Rate limit (10 challenges / 10 min).
do $$
declare i int; r jsonb;
begin
  for i in 1..10 loop r := public.create_presence_challenge((select id from fx where k = 'qg')); end loop;
  perform pg_temp.ok(r ->> 'error' = 'rate_limited', 'challenge creation is rate limited');
end $$;

select pg_temp.act_as_admin();
update public.presence_checks set checked_at = now() - interval '31 days';
select pg_temp.ok(public.purge_presence_records() > 0, 'purge removes old presence checks');

rollback;
