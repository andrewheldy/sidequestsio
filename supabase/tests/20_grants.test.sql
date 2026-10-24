-- RLS + grants matrix for the location/adventure/presence objects.
-- The shim mirrors Supabase default privileges (anon/authenticated get ALL on
-- new tables unless a migration revokes), so these prove the revokes hold.
\ir _helpers.sql
begin;

create temp table fx (k text primary key, id uuid) on commit drop;
grant all on fx to anon, authenticated;
do $$
begin
  insert into fx values ('a', pg_temp.mk_user('grant-a@test.local'));
  insert into fx values ('b', pg_temp.mk_user('grant-b@test.local'));
  insert into fx values ('p', pg_temp.mk_partner('Grant Partner'));
  insert into fx values ('v', pg_temp.mk_venue((select id from fx where k='p'), 'Grant Venue', 25.80, -80.19));
  insert into fx values ('q', pg_temp.mk_quest((select id from fx where k='p'), (select id from fx where k='v'), 'Grant Quest'));
  insert into public.nudge_settings (user_id, timezone) values ((select id from fx where k='b'), 'America/New_York');
  insert into public.nudge_installations (user_id, installation_id, adventure_enabled)
    values ((select id from fx where k='b'), gen_random_uuid(), true);
  insert into public.quest_feedback (user_id, kind, quest_id)
    values ((select id from fx where k='b'), 'save', (select id from fx where k='q'));
  insert into public.nudge_claims (user_id, installation_id, idempotency_key, quest_id, region_id)
    values ((select id from fx where k='b'), gen_random_uuid(), 'grant-key-1', (select id from fx where k='q'), 'v:x');
end $$;

-- Table privileges ------------------------------------------------------------
do $$
declare t text; r text;
begin
  foreach t in array array['nudge_claims', 'presence_challenges', 'presence_checks'] loop
    foreach r in array array['anon', 'authenticated'] loop
      perform pg_temp.ok(not has_table_privilege(r, 'public.' || t, 'SELECT')
                         and not has_table_privilege(r, 'public.' || t, 'INSERT')
                         and not has_table_privilege(r, 'public.' || t, 'UPDATE')
                         and not has_table_privilege(r, 'public.' || t, 'DELETE'),
        format('%s has no access to %s', r, t));
    end loop;
  end loop;
  foreach t in array array['nudge_settings', 'nudge_installations', 'quest_feedback'] loop
    perform pg_temp.ok(not has_table_privilege('anon', 'public.' || t, 'SELECT')
                       and not has_table_privilege('anon', 'public.' || t, 'INSERT'),
      format('anon has no access to %s', t));
  end loop;
  perform pg_temp.ok(has_table_privilege('anon', 'public.discovery_areas', 'SELECT')
                     and not has_table_privilege('anon', 'public.discovery_areas', 'INSERT')
                     and not has_table_privilege('authenticated', 'public.discovery_areas', 'UPDATE'),
    'discovery_areas: public read only');
  perform pg_temp.ok(has_table_privilege('anon', 'public.app_feature_flags', 'SELECT')
                     and not has_table_privilege('authenticated', 'public.app_feature_flags', 'UPDATE')
                     and not has_table_privilege('authenticated', 'public.app_feature_flags', 'INSERT'),
    'app_feature_flags: public read only');
end $$;

-- Function privileges ---------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.claim_nudge(uuid,text,uuid,text,text,text)',
    'public.record_nudge_result(uuid,text)',
    'public.record_consent(public.consent_type,boolean,text,uuid,text)',
    'public.get_geofence_bundle(double precision,double precision,uuid)',
    'public.create_presence_challenge(uuid)',
    'public.verify_gps_presence(uuid,double precision,double precision,double precision,timestamptz)',
    'public.complete_quest(uuid,public.verification_type,text,uuid,uuid,uuid)',
    'public.location_catalog_issues()',
    'public.purge_nudge_records()',
    'public.purge_presence_records()',
    'public.has_current_consent(uuid,public.consent_type)'] loop
    perform pg_temp.ok(not has_function_privilege('anon', f, 'EXECUTE'), 'anon cannot execute ' || f);
  end loop;
  foreach f in array array['public.purge_nudge_records()', 'public.purge_presence_records()',
                           'public.has_current_consent(uuid,public.consent_type)'] loop
    perform pg_temp.ok(not has_function_privilege('authenticated', f, 'EXECUTE'),
      'authenticated cannot execute ' || f);
  end loop;
  perform pg_temp.ok(has_function_privilege('anon',
    'public.discover_nearby(double precision,double precision,text,text,integer,public.quest_category[],integer,integer,text)', 'EXECUTE')
    and has_function_privilege('anon', 'public.get_quest_card(uuid)', 'EXECUTE'),
    'guests can discover and read quest cards');
  perform pg_temp.ok(not exists (select 1 from pg_proc where proname = 'complete_quest' and pronargs <> 6),
    'only the 6-argument complete_quest exists');
  perform pg_temp.ok((select bool_and(prosecdef) from pg_proc where proname in
                       ('claim_nudge', 'record_nudge_result', 'record_consent', 'create_presence_challenge',
                        'verify_gps_presence', 'complete_quest'))
                     and not (select bool_or(prosecdef) from pg_proc where proname in
                       ('discover_nearby', 'get_quest_card', 'get_geofence_bundle', 'venue_open_state')),
    'definer only where needed; discovery runs as invoker');
  perform pg_temp.ok((select bool_and(exists (select 1 from unnest(proconfig) c where c like 'search_path=%'))
                        from pg_proc where proname in ('claim_nudge', 'record_nudge_result', 'record_consent',
                          'create_presence_challenge', 'verify_gps_presence', 'complete_quest',
                          'purge_nudge_records', 'purge_presence_records', 'has_current_consent')),
    'every definer function pins search_path');
end $$;

select pg_temp.act_as(null);
select pg_temp.raises('select * from public.nudge_claims', 'anon select nudge_claims denied');
select pg_temp.raises('select * from public.nudge_settings', 'anon select nudge_settings denied');
select pg_temp.raises($q$select public.claim_nudge(gen_random_uuid(), 'abcdefghij', gen_random_uuid(), 'v:x')$q$,
  'anon claim_nudge denied');
select pg_temp.raises($q$select public.get_geofence_bundle(25.8, -80.19)$q$, 'anon get_geofence_bundle denied');

-- Cross-user RLS ---------------------------------------------------------------
select pg_temp.act_as((select id from fx where k = 'a'));
select pg_temp.raises('select * from public.nudge_claims', 'authenticated select nudge_claims denied');
select pg_temp.raises('select * from public.presence_checks', 'authenticated select presence_checks denied');
do $$
declare n int;
begin
  select count(*) into n from public.nudge_settings;        perform pg_temp.ok(n = 0, 'user A cannot see user B nudge_settings');
  select count(*) into n from public.nudge_installations;   perform pg_temp.ok(n = 0, 'user A cannot see user B installations');
  select count(*) into n from public.quest_feedback;        perform pg_temp.ok(n = 0, 'user A cannot see user B feedback');
  update public.nudge_settings set max_per_day = 0;         get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'user A cannot update user B nudge_settings');
  delete from public.nudge_installations;                    get diagnostics n = row_count;
  perform pg_temp.ok(n = 0, 'user A cannot delete user B installations');
  perform pg_temp.ok(public.record_nudge_result(
      null::uuid, 'scheduled') ->> 'error' = 'invalid_request',
    'record_nudge_result validates input');
end $$;
select pg_temp.raises($q$insert into public.nudge_settings (user_id, timezone) values ((select id from fx where k='b'), 'UTC')$q$,
  'user A cannot create settings for user B');
select pg_temp.raises($q$insert into public.nudge_installations (user_id, installation_id) values ((select id from fx where k='b'), gen_random_uuid())$q$,
  'user A cannot register an installation for user B');
select pg_temp.raises($q$update public.app_feature_flags set enabled = true$q$, 'authenticated cannot flip feature flags');
select pg_temp.raises($q$select public.purge_nudge_records()$q$, 'authenticated cannot purge');
select pg_temp.raises($q$insert into public.nudge_settings (timezone, max_per_day) values ('UTC', 3)$q$,
  'nudge cap cannot be raised above 2');
select pg_temp.raises($q$insert into public.nudge_settings (timezone) values ('Mars/Olympus')$q$,
  'invalid timezone rejected');
do $$
begin
  insert into public.nudge_settings (timezone, max_per_day) values ('Europe/Paris', 1);
  perform pg_temp.ok((select max_per_day from public.nudge_settings) = 1, 'user can lower their own cap');
  perform pg_temp.ok(public.record_consent('notifications', true, '1.1.0', gen_random_uuid()) ->> 'ok' = 'true',
    'record_consent succeeds for the caller');
  perform pg_temp.ok((select count(*) from public.consent_events
                       where consent_type = 'notifications' and policy_version = '1.1.0') = 1,
    'record_consent appends to the existing ledger');
  perform pg_temp.ok(public.record_consent('notifications', true, '') ->> 'error' = 'invalid_request',
    'record_consent requires a policy version');
end $$;

rollback;
