-- Two concurrent sessions for the same account (two devices): the cap/min-gap
-- must hold atomically, and one presence check must yield one completion.
-- Uses dblink (local test DB only) to run real parallel transactions.
\ir _helpers.sql
create extension if not exists dblink;

-- Committed fixtures (the other sessions must see them).
create table if not exists public._conc_fx (k text primary key, id uuid);
truncate public._conc_fx;
do $$
declare p uuid := pg_temp.mk_partner('Concurrency Partner');
        tz text := pg_temp.tz_at('11:00', '19:00');
        u uuid := pg_temp.mk_user('conc@test.local');
        va uuid; vb uuid; qa uuid; qb uuid; qg uuid; i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid();
        ch uuid; chk uuid;
begin
  va := pg_temp.mk_venue(p, 'Conc VA', 25.8010, -80.1994, pg_temp.all_day(), tz);
  vb := pg_temp.mk_venue(p, 'Conc VB', 25.8030, -80.1994, pg_temp.all_day(), tz);
  qa := pg_temp.mk_quest(p, va, 'Conc QA');
  qb := pg_temp.mk_quest(p, vb, 'Conc QB');
  qg := pg_temp.mk_quest(p, va, 'Conc GPS', 'art', 20, 'gps');
  update public.quests set nudge_eligible = true where id in (qa, qb);
  insert into public.nudge_settings (user_id, timezone) values (u, tz);
  insert into public.nudge_installations (user_id, installation_id, adventure_enabled) values (u, i1, true), (u, i2, true);
  insert into public.consent_events (user_id, consent_type, granted, source, policy_version) values
    (u, 'location_background', true, 'test', '1.1.0'), (u, 'notifications', true, 'test', '1.1.0');
  update public.app_feature_flags set enabled = true where key = 'nudge_delivery';
  insert into public.presence_challenges (user_id, quest_id, consumed_at) values (u, qg, now()) returning id into ch;
  insert into public.presence_checks (user_id, quest_id, challenge_id, outcome, reason)
    values (u, qg, ch, 'inside', 'ok') returning id into chk;
  insert into public._conc_fx values ('u', u), ('qa', qa), ('qb', qb), ('va', va), ('vb', vb),
                                     ('i1', i1), ('i2', i2), ('qg', qg), ('chk', chk);
end $$;

-- Runs as the user, holds the transaction open for 1 s after the call.
create or replace function public._conc_claim(p_uid uuid, p_inst uuid, p_key text, p_quest uuid, p_region text)
returns text language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  r := public.claim_nudge(p_inst, p_key, p_quest, p_region);
  perform pg_sleep(1);
  return r::text;
end $$;
create or replace function public._conc_complete(p_uid uuid, p_quest uuid, p_check uuid)
returns text language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  r := public.complete_quest(p_quest, 'gps', null, null, null, p_check);
  perform pg_sleep(1);
  return r::text;
end $$;

do $$
declare conn text := format('host=%s port=%s dbname=%s user=postgres',
                            split_part(current_setting('unix_socket_directories'), ',', 1),
                            current_setting('port'), current_database());
        f record; r1 text; r2 text; allowed int; n int;
begin
  select (select id from public._conc_fx where k='u') u, (select id from public._conc_fx where k='i1') i1,
         (select id from public._conc_fx where k='i2') i2, (select id from public._conc_fx where k='qa') qa,
         (select id from public._conc_fx where k='qb') qb, (select id from public._conc_fx where k='va') va,
         (select id from public._conc_fx where k='vb') vb, (select id from public._conc_fx where k='qg') qg,
         (select id from public._conc_fx where k='chk') chk
    into f;

  perform dblink_connect('c1', conn);
  perform dblink_connect('c2', conn);

  -- Device 1 and device 2 claim different quests at the same moment.
  perform dblink_send_query('c1', format('select public._conc_claim(%L, %L, %L, %L, %L)',
    f.u, f.i1, 'device-one-key-1', f.qa, 'v:' || f.va));
  perform dblink_send_query('c2', format('select public._conc_claim(%L, %L, %L, %L, %L)',
    f.u, f.i2, 'device-two-key-1', f.qb, 'v:' || f.vb));
  select x into r1 from dblink_get_result('c1') as t(x text);
  perform * from dblink_get_result('c1') as t(x text);
  select x into r2 from dblink_get_result('c2') as t(x text);
  perform * from dblink_get_result('c2') as t(x text);

  allowed := (case when (r1::jsonb ->> 'allow')::boolean then 1 else 0 end)
           + (case when (r2::jsonb ->> 'allow')::boolean then 1 else 0 end);
  perform pg_temp.ok(allowed = 1 and (r1::jsonb ->> 'reason' = 'min_gap' or r2::jsonb ->> 'reason' = 'min_gap'),
    format('concurrent claims from two devices: exactly one allowed (%s / %s)',
           coalesce(r1::jsonb ->> 'reason', 'allow'), coalesce(r2::jsonb ->> 'reason', 'allow')));
  select count(*) into n from public.nudge_claims where user_id = f.u;
  perform pg_temp.ok(n = 1, 'exactly one claim row stored');

  -- Same presence check submitted twice in parallel.
  perform dblink_send_query('c1', format('select public._conc_complete(%L, %L, %L)', f.u, f.qg, f.chk));
  perform dblink_send_query('c2', format('select public._conc_complete(%L, %L, %L)', f.u, f.qg, f.chk));
  select x into r1 from dblink_get_result('c1') as t(x text);
  perform * from dblink_get_result('c1') as t(x text);
  select x into r2 from dblink_get_result('c2') as t(x text);
  perform * from dblink_get_result('c2') as t(x text);
  allowed := (case when (r1::jsonb ->> 'ok')::boolean then 1 else 0 end)
           + (case when (r2::jsonb ->> 'ok')::boolean then 1 else 0 end);
  perform pg_temp.ok(allowed = 1, format('concurrent GPS completions with one check: exactly one succeeds (%s / %s)',
           coalesce(r1::jsonb ->> 'error', 'ok'), coalesce(r2::jsonb ->> 'error', 'ok')));
  select count(*) into n from public.points_ledger where user_id = f.u and quest_id = f.qg;
  perform pg_temp.ok(n = 1, 'ledger written exactly once');
  select count(*) into n from public.quest_completions where user_id = f.u and quest_id = f.qg;
  perform pg_temp.ok(n = 1, 'one completion row');

  perform dblink_disconnect('c1');
  perform dblink_disconnect('c2');
end $$;

drop function public._conc_claim(uuid, uuid, text, uuid, text);
drop function public._conc_complete(uuid, uuid, uuid);
drop table public._conc_fx;
update public.app_feature_flags set enabled = false where key = 'nudge_delivery';
