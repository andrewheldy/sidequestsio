-- 0024_account_deletion_requests.sql — in-app account deletion requests
--
-- WHY: docs/legal/Delete-Account.md lets users delete their account, but the
-- only way to ask today is an email to support. App stores require deletion to
-- be initiable in-app. This migration adds the authenticated REQUEST step; the
-- irreversible PROCESSING step needs the service role (auth.users + Storage)
-- and runs in the server-only Edge Function described below; this migration
-- only adds its transactional data step (service_role only). Applying it
-- deletes nothing.
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
-- PROCESSING (supabase/functions/process-account-deletions, service role only)
-- ---------------------------------------------------------------------------
-- The Edge Function handles each pending request (oldest first), idempotently:
--   1. Capture auth.users.email into notify_email (for the §5 confirmation).
--   2. process_account_deletion_data() below, one transaction: if the user owns
--      any partner, flag manual_review_reason = 'owns_partner' and stop (a
--      person decides what happens to the partner); otherwise delete
--      community_notes, profiles and public.users (cascading user_profiles,
--      privacy_preferences, quest_attempts/completions/instances, points_ledger,
--      reward_redemptions, leaderboard_snapshots, consent_events, note_reports;
--      setting user_id null on scan_events, analytics_events, audit_logs).
--      Live public.users has no FK to auth.users, hence the explicit deletes.
--   3. Remove Storage objects under proofs/<uid>/ and avatars/<uid>/.
--   4. auth.admin.deleteUser(uid) (already-gone counts as done).
--   5. status = 'completed'. The confirmation email is then sent by support
--      (no email provider is configured): completed rows keep notify_email
--      until confirmation_sent_at is set, and the address is then cleared.
-- Any failure leaves the request pending with attempts/last_error updated; the
-- next run retries from wherever it stopped.
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

-- Processing bookkeeping, written only by the service-role Edge Function / RPC.
alter table public.account_deletion_requests add column if not exists data_deleted_at      timestamptz;
alter table public.account_deletion_requests add column if not exists manual_review_reason text;
alter table public.account_deletion_requests add column if not exists attempts             integer not null default 0;
alter table public.account_deletion_requests add column if not exists last_attempt_at      timestamptz;
alter table public.account_deletion_requests add column if not exists last_error           text;
-- Held only between processing and the confirmation email (§5), then cleared.
alter table public.account_deletion_requests add column if not exists notify_email         text;
alter table public.account_deletion_requests add column if not exists confirmation_sent_at timestamptz;

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
grant select, update on public.account_deletion_requests to service_role;

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

-- Server-only step 2 of processing (see header). Returns
-- {ok:true, outcome:'data_deleted'|'manual_review'|'not_pending', user_id?, status?}
-- or {ok:false, error:'not_found'}. Safe to call repeatedly for the same request.
create or replace function public.process_account_deletion_data(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r account_deletion_requests;
begin
  select * into r from account_deletion_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'pending' then
    return jsonb_build_object('ok', true, 'outcome', 'not_pending', 'status', r.status);
  end if;
  if r.manual_review_reason is not null then
    return jsonb_build_object('ok', true, 'outcome', 'manual_review', 'user_id', r.user_id);
  end if;

  -- Deleting a partner owner would orphan the partner's venues, quests and
  -- codes (owner_user_id is set null). A person must decide: flag and stop
  -- before anything is deleted.
  if exists (select 1 from partners where owner_user_id = r.user_id) then
    update account_deletion_requests
       set manual_review_reason = 'owns_partner', last_attempt_at = now()
     where id = r.id;
    insert into audit_logs (actor_id, action, entity_type, entity_id)
    values (null, 'account.deletion_manual_review', 'account_deletion_request', r.id::text);
    return jsonb_build_object('ok', true, 'outcome', 'manual_review', 'user_id', r.user_id);
  end if;

  delete from community_notes where user_id = r.user_id;
  delete from profiles where user_id = r.user_id;
  delete from users where id = r.user_id;

  update account_deletion_requests
     set data_deleted_at = coalesce(data_deleted_at, now())
   where id = r.id;
  insert into audit_logs (actor_id, action, entity_type, entity_id)
  values (null, 'account.deletion_data_deleted', 'account_deletion_request', r.id::text);

  return jsonb_build_object('ok', true, 'outcome', 'data_deleted', 'user_id', r.user_id);
end $$;

revoke execute on function public.process_account_deletion_data(uuid) from public, anon, authenticated;
grant execute on function public.process_account_deletion_data(uuid) to service_role;

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
--   select has_function_privilege('authenticated', 'public.process_account_deletion_data(uuid)', 'EXECUTE'); -- false
--   As a test user: request twice -> same id; cancel -> status cancelled; cancel again -> not_pending.
--
-- Rollback (only while no requests need keeping):
--   begin;
--   drop function if exists public.process_account_deletion_data(uuid);
--   drop function if exists public.cancel_account_deletion();
--   drop function if exists public.request_account_deletion();
--   drop table if exists public.account_deletion_requests;
--   commit;
