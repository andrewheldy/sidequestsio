-- Re-applying 0023–0025 must be a no-op (migrations are idempotent).
\ir _helpers.sql
set client_min_messages = warning;
\ir ../migrations/0023_location_discovery.sql
\ir ../migrations/0024_adventure_nudges.sql
\ir ../migrations/0025_gps_presence.sql
set client_min_messages = notice;
select pg_temp.ok((select count(*) from pg_proc where proname = 'complete_quest') = 1, 're-apply: one complete_quest');
select pg_temp.ok((select count(*) from public.discovery_areas) = 9, 're-apply: discovery areas not duplicated');
select pg_temp.ok((select bool_and(not enabled) from public.app_feature_flags), 're-apply: flags stay off');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.nudge_claims', 'SELECT'), 're-apply: grants unchanged');
