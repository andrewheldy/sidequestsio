-- 0024_account_deletion_requests.sql — in-app account deletion requests
--
-- WHY: docs/legal/Delete-Account.md lets users delete their account, but the
-- only way to ask today is an email to support. App stores require deletion to
-- be initiable in-app. This migration adds the authenticated REQUEST step; the
-- irreversible PROCESSING step needs the service role (auth.users + Storage)
-- and is specified below as a server-only Edge Function. It is NOT implemented
-- here, and nothing in this migration deletes data.
--
-- Policy mapping (Delete-Account.md v1.0.1):
--   §1 identity: the request is made with the user's own authenticated session
--      (auth.uid()), which replaces "reply from your account email".
--   §5 timeline: processed within 30 days of the request -> `process_by`.
--   §6 changing your mind: cancel_account_deletion() while still pending.
--
-- What changes
--   1. public.account_deletion_requests: at most one pending request per user.
--      Holds no email or profile data, so it can be kept as the compliance
--      record after the account is gone (§3 "records we're legally required to
--      keep"). No FK to users: the row must outlive the user it refers to.
--   2. RLS: a user can read only their own requests. No table write grants —
--      all writes go through the SECURITY DEFINER functions below.
--   3. request_account_deletion(): idempotent (returns the existing pending
--      request), serialised per user. cancel_account_deletion(): pending only.
--      Both write an audit_logs row. Neither signs the user out or changes
--      data: the account stays usable until it is processed.
--
-- Idempotent; non-destructive; one transaction. Apply after a backup.
--
-- ---------------------------------------------------------------------------
-- PROCESSING PLAN (Edge Function `process-account-deletions`, service role,
-- run by an admin or a daily schedule; never callable by clients)
-- ---------------------------------------------------------------------------
-- For each request with status = 'pending' (oldest first), in this order:
--   a. Read auth.users.email for the confirmation email BEFORE deleting.
--   b. Storage: remove every object under `proofs/<user_id>/` and
--      `avatars/<user_id>/` with the Storage API (SQL cannot remove the files).
--   c. SQL, one transaction:
--        delete from public.community_notes where user_id = :uid;   -- explicit (also cascades)
--        delete from public.users where id = :uid;
--          -- cascades: user_profiles, privacy_preferences, quest_attempts,
--          -- quest_completions, quest_instances, points_ledger, reward_redemptions,
--          -- leaderboard_snapshots, consent_events, note_reports (reporter);
--          -- set null: scan_events.user_id, analytics_events.user_id,
--          -- audit_logs.actor_id, partners.owner_user_id, note_reports.reviewed_by
--        update public.account_deletion_requests
--           set status = 'completed', completed_at = now() where id = :request_id;
--   d. auth.admin.deleteUser(:uid) — cascades public.profiles (0001_profiles FK).
--      (Live public.users has no FK to auth.users, hence the explicit delete in c.)
--   e. Send the confirmation email (§5) to the address from (a).
--   On any failure leave the request 'pending' and retry next run; steps are
--   idempotent. Partner owners: if the user owns an active partner, stop and
--   flag for manual handling instead of orphaning the partner.
-- Retention (§3/§4): anonymised analytics (scan_events/analytics_events with
-- user_id set null) and audit rows with actor set null remain.
-- ---------------------------------------------------------------------------

begin;

create table if not exists public.account_deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  status        text not null default 'pending',
  source        text not null default 'app',
  requested_at  timestamptz not null default now(),
  process_by    timestamptz not null default (now() + interval '30 days'),
  cancelled_at  timestamptz,
  completed_at  timestamptz
);

alter table public.account_deletion_requests drop constraint if exists account_deletion_requests_status_check;
alter table public.account_deletion_requests add constraint account_deletion_requests_status_check
  check (status in ('pending', 'cancelled', 'completed'));

-- One open request per user; history (cancelled/completed) is kept.
create unique index if not exists account_deletion_requests_one_pending
  on public.account_deletion_requests (user_id) where status = 'pending';

comment on table public.account_deletion_requests is
  'In-app account deletion requests (Delete-Account.md). Written only by request_/cancel_account_deletion(); processed by the service-role Edge Function described in 0024.';

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_self_read on public.account_deletion_requests;
create policy account_deletion_self_read on public.account_deletion_requests for select
  using (user_id = auth.uid() or public.is_admin());

revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

-- Returns {ok:true, request:{...}} or {ok:false, error:'not_authenticated'}.
create or replace function public.request_account_deletion() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r account_deletion_requests;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  -- Serialise per user so repeated taps / retries return the same request.
  perform pg_advisory_xact_lock(hashtextextended('account_deletion:' || uid::text, 0));
  select * into r from account_deletion_requests where user_id = uid and status = 'pending';
  if not found then
    insert into account_deletion_requests (user_id) values (uid) returning * into r;
    insert into audit_logs (actor_id, action, entity_type, entity_id)
    values (uid, 'account.deletion_requested', 'account_deletion_request', r.id::text);
  end if;

  return jsonb_build_object('ok', true, 'request', to_jsonb(r));
end $$;

-- Returns {ok:true, request:{...}} or {ok:false, error:'not_authenticated'|'not_pending'}.
create or replace function public.cancel_account_deletion() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r account_deletion_requests;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  perform pg_advisory_xact_lock(hashtextextended('account_deletion:' || uid::text, 0));
  update account_deletion_requests
     set status = 'cancelled', cancelled_at = now()
   where user_id = uid and status = 'pending'
  returning * into r;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;

  insert into audit_logs (actor_id, action, entity_type, entity_id)
  values (uid, 'account.deletion_cancelled', 'account_deletion_request', r.id::text);

  return jsonb_build_object('ok', true, 'request', to_jsonb(r));
end $$;

revoke execute on function public.request_account_deletion() from public, anon;
revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

commit;

-- Verification (run after applying):
--   select has_table_privilege('authenticated', 'public.account_deletion_requests', 'INSERT');  -- false
--   select has_table_privilege('authenticated', 'public.account_deletion_requests', 'SELECT');  -- true
--   select has_function_privilege('anon', 'public.request_account_deletion()', 'EXECUTE');      -- false
--   select has_function_privilege('authenticated', 'public.request_account_deletion()', 'EXECUTE'); -- true
--   As a test user: request twice -> same id; cancel -> status cancelled; cancel again -> not_pending.
--
-- Rollback (only while no requests need keeping):
--   begin;
--   drop function if exists public.cancel_account_deletion();
--   drop function if exists public.request_account_deletion();
--   drop table if exists public.account_deletion_requests;
--   commit;
