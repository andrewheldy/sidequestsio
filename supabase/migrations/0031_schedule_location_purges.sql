-- 0031_schedule_location_purges.sql — run the 30-day location purges daily
--
-- WHY: Privacy Policy 1.1.0 says GPS check-in results (presence_checks) and
-- nearby-alert records (nudge_claims) are deleted after 30 days. 0024 and
-- 0025 created purge_nudge_records() and purge_presence_records(), but
-- nothing calls them, so the stated retention is not enforced until this runs.
--
-- What changes
--   * Enables pg_cron when the server offers it (Supabase does; the local test
--     Postgres usually does not — then this migration only raises a notice).
--   * Schedules two daily jobs at 08:20 UTC. cron.schedule() with an existing
--     job name replaces that job, so re-running this is safe.
--
-- Deletes nothing by itself beyond what the purge functions already define
-- (rows older than 30 days; unused presence challenges older than 1 day).
-- Depends on 0024 and 0025. Idempotent. Apply after a backup.
--
-- Rollback:
--   select cron.unschedule('purge-nudge-records');
--   select cron.unschedule('purge-presence-records');

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice '0031: pg_cron is not available here; purges are NOT scheduled.';
    return;
  end if;
  create extension if not exists pg_cron;
  perform cron.schedule('purge-nudge-records', '20 8 * * *', 'select public.purge_nudge_records()');
  perform cron.schedule('purge-presence-records', '20 8 * * *', 'select public.purge_presence_records()');
end $$;

-- Verification (run after applying):
--   select jobname, schedule, command, active from cron.job where jobname like 'purge-%';  -- 2 rows
--   Next day: select status, return_message from cron.job_run_details
--             where jobid in (select jobid from cron.job where jobname like 'purge-%')
--             order by start_time desc limit 4;
