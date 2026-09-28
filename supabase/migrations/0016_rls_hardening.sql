-- 0016_rls_hardening.sql — close three read-path security gaps (P1, P2, P10)
--
-- Findings are documented in docs/architecture/DATABASE_SCHEMA_SNAPSHOT.md §10.
-- P2 and P10 were reproduced on a local Postgres 16 build of migrations
-- 0001–0015 by querying as `anon`; this migration was tested the same way.
-- CONFIRM LIVE STATE FIRST (see "Before applying" below): the ledger has drifted.
--
--   P10  is_admin() / owns_partner() / app_uid() run as the CALLER and read
--        public.users, which anon cannot SELECT. Any policy that falls through
--        to them (a draft quest, a paused reward, a non-approved note) makes the
--        whole anon SELECT fail with "permission denied for table users".
--        Fix: SECURITY DEFINER + empty search_path + schema-qualified names.
--
--   P2   community_notes_with_author runs as its owner (bypasses note RLS) and
--        has no moderation filter, so anon can read pending/rejected/flagged
--        notes. It cannot simply become security_invoker: its join to users
--        would then fail for anon. Fix: keep it owner-run and restate the
--        notes_public_read rule in the view's WHERE clause.
--
--   P1   anon can SELECT quests.verification_secret (the venue-code answer).
--        Column-level grants are not an option: the app reads quests with
--        select("*, …"), which would then fail for everyone. Fix: move the
--        secret into quest_secrets (RLS on, no policies, no client grants),
--        read it only inside complete_quest(), and keep quests.verification_secret
--        permanently NULL via a write-time trigger so existing writers (seed.sql,
--        the unmounted partner form) keep working unchanged.
--
-- Idempotent; safe to re-run. No data is lost: secrets are copied to
-- quest_secrets before quests.verification_secret is cleared. Runs in one
-- transaction so the view swap and secret move are atomic.
--
-- Before applying (SQL editor, after a backup):
--   -- complete_quest below is 0003's body with only the secret lookup changed.
--   -- If live differs from 0003, reconcile before applying:
--   select pg_get_functiondef('public.complete_quest(uuid, verification_type, text, uuid)'::regprocedure);
--   -- How many secrets will move:
--   select count(*) from public.quests where verification_secret is not null;
--   -- Current view columns (the view is dropped and recreated with n.*):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'community_notes_with_author'
--    order by ordinal_position;

begin;

-- ===========================================================================
-- P10. RLS helpers run as definer
-- ===========================================================================
-- Signatures, return types and behaviour are unchanged; policies that call
-- these functions pick up the new definitions automatically. Each returns only
-- facts about the caller's own identity, so running as definer leaks nothing.

create or replace function public.app_uid() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.users where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.owns_partner(p_partner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.partners
    where id = p_partner_id and owner_user_id = auth.uid()
  ) or public.is_admin()
$$;

-- ===========================================================================
-- P2. Notes-with-author view respects moderation
-- ===========================================================================
-- Same columns as before (n.* plus author name/avatar). The WHERE clause is
-- notes_public_read verbatim: approved notes for everyone, your own notes for
-- you, everything for admins (the moderation queue reads this view).
-- Dropped and recreated rather than replaced so a live column list that
-- differs from n.* cannot make the statement fail. security_barrier keeps
-- caller-supplied filters from being evaluated before the WHERE clause.

drop view if exists public.community_notes_with_author;
create view public.community_notes_with_author
  with (security_barrier = true)
as
  select
    n.*,
    u.display_name as author_display_name,
    u.avatar_url   as author_avatar_url
  from public.community_notes n
  join public.users u on u.id = n.user_id
  where n.moderation_status = 'approved'
     or n.user_id = auth.uid()
     or public.is_admin();

-- Grants are dropped with the view; restate 0009's.
revoke all on public.community_notes_with_author from public;
grant select on public.community_notes_with_author to anon, authenticated;

comment on view public.community_notes_with_author is
  'Community notes with author display name/avatar (no email). Runs as owner so '
  'the users join works for anon; the WHERE clause re-applies notes_public_read.';

-- ===========================================================================
-- P1. Venue-code secrets move out of the public quests row
-- ===========================================================================

create table if not exists public.quest_secrets (
  -- Deferrable so the quests BEFORE INSERT trigger can write here before the
  -- quest row itself exists; the FK is checked at commit.
  quest_id            uuid primary key
                        references public.quests (id) on delete cascade
                        deferrable initially deferred,
  verification_secret text not null check (char_length(trim(verification_secret)) > 0),
  updated_at          timestamptz not null default now()
);

comment on table public.quest_secrets is
  'Server-only quest verification secrets. RLS on with no policies and no client '
  'grants: only SECURITY DEFINER functions (complete_quest) and service_role read it.';

-- Server-only: RLS with no policies, and no client privileges even if the
-- project's default privileges would otherwise grant them.
alter table public.quest_secrets enable row level security;
revoke all on public.quest_secrets from public, anon, authenticated;

-- Keep quests.verification_secret permanently NULL. A non-blank value written
-- by any client (seed.sql, the partner form) is moved into quest_secrets; a
-- blank one is ignored. Writing NULL leaves the stored secret in place; it is
-- only consulted while verification_type = 'venue_code'.
create or replace function public.stash_quest_secret() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if nullif(trim(new.verification_secret), '') is not null then
    insert into public.quest_secrets (quest_id, verification_secret)
    values (new.id, trim(new.verification_secret))
    on conflict (quest_id) do update
      set verification_secret = excluded.verification_secret,
          updated_at          = now();
  end if;
  new.verification_secret := null;
  return new;
end $$;

drop trigger if exists quests_stash_secret on public.quests;
create trigger quests_stash_secret
  before insert or update of verification_secret on public.quests
  for each row
  when (new.verification_secret is not null)
  execute function public.stash_quest_secret();

-- Backfill, then clear. The UPDATE fires the trigger, which copies each
-- secret into quest_secrets and nulls the column in the same statement.
update public.quests
   set verification_secret = verification_secret
 where verification_secret is not null;

-- complete_quest reads the secret from quest_secrets.
create or replace function public.complete_quest(
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
  v_secret text;
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

  -- 0016: the venue code now lives in quest_secrets (was quests.verification_secret).
  if q.verification_type = 'venue_code' then
    select s.verification_secret into v_secret from quest_secrets s where s.quest_id = q.id;
  end if;
  verified := case q.verification_type
    when 'venue_code' then (p_venue_code is not null and v_secret is not null
                            and upper(trim(p_venue_code)) = upper(v_secret))
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


commit;

-- Verification (run after applying; all should hold):
--   select count(*) from public.quests where verification_secret is not null;   -- 0
--   select count(*) from public.quest_secrets;          -- = count moved above
--   select has_table_privilege('anon', 'public.quest_secrets', 'SELECT');      -- false
--   select proname, prosecdef from pg_proc
--    where proname in ('is_admin', 'owns_partner', 'app_uid')
--      and pronamespace = 'public'::regnamespace;                               -- all true
--   select pg_get_viewdef('public.community_notes_with_author'::regclass, true);
--   -- WHERE clause present. Then, signed out in the app: quest list loads even
--   -- with a draft quest present, and a venue-code quest still completes with
--   -- the right code and fails with a wrong one. Or run scripts/verify-db.sql.
--
-- Rollback (restores the pre-0016 behaviour, including the exposures):
--   begin;
--   drop trigger if exists quests_stash_secret on public.quests;
--   update public.quests q set verification_secret = s.verification_secret
--     from public.quest_secrets s where s.quest_id = q.id;
--   -- re-run complete_quest from 0003_functions.sql, the view from
--   -- 0006_game_schema.sql plus 0009's grant, and the helpers from
--   -- 0007_rls_idempotent.sql; then:
--   drop function if exists public.stash_quest_secret();
--   drop table if exists public.quest_secrets;
--   commit;
