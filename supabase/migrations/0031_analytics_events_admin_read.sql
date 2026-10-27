-- 0031_analytics_events_admin_read.sql — raw analytics events are admin-only
--
-- WHY: 0020 let partner owners read their partner's raw analytics_events rows
-- directly (policy analytics_events_owner_read + select grant to
-- authenticated), i.e. GET /rest/v1/analytics_events returned per-event
-- user_id, anonymous_id, session_id, page_path and properties. That breaks
-- docs/legal/Privacy-Policy.md §7 (partners get aggregated, anonymized
-- analytics that cannot reasonably be linked back to a user) and
-- docs/legal/Partner-Terms.md §7 (aggregate, privacy-safe analytics).
--
-- What changes
--   * The read policy is replaced by analytics_events_admin_read:
--     using (public.is_admin()). Partner owners no longer see any rows.
--   * Grants are unchanged: authenticated keeps select (admins need it; RLS
--     now filters everyone else to zero rows); still no write grants.
--
-- What does not change
--   * Partners get their numbers through public.partner_insights() (0021),
--     which is SECURITY DEFINER, checks owns_partner() itself and returns
--     aggregates only. It reads the table as its owner, so this policy does
--     not affect it.
--   * record_analytics_events() (0020) is SECURITY DEFINER and keeps writing.
--   * Nothing in src/ or apps/mobile/src/ reads the table directly.
--
-- Depends on 0016 (is_admin as SECURITY DEFINER), 0020. Idempotent.
-- Reverse with (restores the 0020 partner-owner read — reintroduces the
-- privacy issue above):
--   drop policy if exists analytics_events_admin_read on public.analytics_events;
--   create policy analytics_events_owner_read on public.analytics_events
--     for select to authenticated
--     using ((partner_id is not null and public.owns_partner(partner_id)) or public.is_admin());

begin;

drop policy if exists analytics_events_owner_read on public.analytics_events;
drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events
  for select to authenticated
  using (public.is_admin());

-- Re-assert 0020's grants so the end state does not depend on drift.
revoke all on table public.analytics_events from anon, authenticated;
grant select on table public.analytics_events to authenticated;

commit;

-- Verification (read-only):
--   select policyname, qual from pg_policies
--    where schemaname = 'public' and tablename = 'analytics_events';
--     -- exactly one row: analytics_events_admin_read | is_admin()
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'analytics_events'
--      and grantee in ('anon', 'authenticated');
--     -- authenticated | SELECT only
--   select prosecdef from pg_proc where oid = 'public.partner_insights(uuid,uuid,integer)'::regprocedure;
--     -- true
--   Then, signed in as a non-admin partner owner: /partner still loads, and
--   GET /rest/v1/analytics_events?select=id&limit=1 returns [].
