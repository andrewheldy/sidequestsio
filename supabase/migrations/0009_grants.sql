-- 0009_grants.sql — PostgREST role grants for anon/authenticated
--
-- WHY THIS EXISTS (verified live 2026-07-06): RLS is enabled and the intended
-- public-read policies exist on every game table, but the `anon` and
-- `authenticated` roles have NO table privileges, so every SPA read of the
-- game tables fails with permission-denied before RLS is even consulted.
-- Grants are the PostgREST privilege layer; RLS remains the row boundary.
--
-- Principles:
--   * Idempotent (GRANT is naturally idempotent; safe to re-run).
--   * A grant is added only where a matching RLS policy already exists live;
--     no policy ⇒ no grant (least privilege).
--   * No DELETE grants anywhere (no code path deletes directly).
--   * Abuse-sensitive writes stay RPC-only (SECURITY DEFINER), ungranted here.
--
-- NOTE: future `create table` statements do NOT inherit these grants — every
-- new table needs its own explicit grant in its own migration.

grant usage on schema public to anon, authenticated;

-- 1. Public discovery surfaces ------------------------------------------------
-- RLS policies (verified live): partners_public_read, venues_public_read,
-- quests_public_read, qr_public_read, rewards_public_read, notes_public_read,
-- leaderboard_public_read. Views: community_notes_with_author, public_profiles.
-- Needed by: quest browser/detail, QR resolution (/scan/:code), rewards list,
-- community notes, leaderboard, public profile page.
grant select on table
  public.partners,
  public.venues,
  public.quests,
  public.qr_codes,
  public.rewards,
  public.community_notes,
  public.community_notes_with_author,
  public.leaderboard_snapshots,
  public.public_profiles
to anon, authenticated;

-- 2. Auth-profile tables (restated for fresh-environment parity) --------------
-- Live already grants these; kept so a from-scratch environment matches prod.
-- RLS: owner-only select/insert/update + public-visibility select policy.
grant select on table public.profiles to anon;
grant select, insert, update on table public.profiles to authenticated;

-- 3. Authenticated self-service ------------------------------------------------
-- users: RLS = self read/update (no insert policy → no insert grant;
-- provisioning happens in the auth trigger, which runs as definer).
grant select, update on table public.users to authenticated;

-- user_profiles: RLS = self read/update (rows created by trigger).
grant select, update on table public.user_profiles to authenticated;

-- privacy_preferences: repository upserts (insert-or-update on user_id).
grant select, insert, update on table public.privacy_preferences to authenticated;

-- consent_events: append-only consent log written directly by the client;
-- select needed because the insert uses RETURNING.
grant select, insert on table public.consent_events to authenticated;

-- Own-history reads (RLS scopes to the signed-in user / owning partner):
grant select on table public.quest_attempts to authenticated;
grant select on table public.quest_completions to authenticated;
grant select on table public.points_ledger to authenticated;
grant select on table public.reward_redemptions to authenticated;

-- scan_events: partner-scoped read policy exists. The column-scoped UPDATE
-- keeps SupabaseRepository.markScanConverted from throwing permission-denied
-- mid-completion; with no UPDATE policy live it is a silent no-op until the
-- conversion moves server-side (planned 0014_complete_quest_v2).
grant select on table public.scan_events to authenticated;
grant update (conversion_state) on public.scan_events to authenticated;

-- 4. Partner self-management ----------------------------------------------------
-- RLS *_manage policies (owns_partner()/is_admin()) exist live for these four.
-- Grants activate the already-policied partner portal writes (upsertPartner/
-- Venue/Quest/Reward in SupabaseRepository) for when the portal mounts.
grant insert, update on table
  public.partners,
  public.venues,
  public.quests,
  public.rewards
to authenticated;

-- 5. Moderation & audit -----------------------------------------------------------
-- community_notes: notes_admin_update policy exists (admins moderate);
-- column-scoped so moderation can't touch content/author fields.
grant update (moderation_status) on public.community_notes to authenticated;

-- audit_logs: admin-only read policy exists. No INSERT grant: there is no
-- client insert policy live; the admin UI's addAudit path is revisited with
-- the admin mount (T-SHELL-3).
grant select on table public.audit_logs to authenticated;

-- Verification (run scripts/verify-db.sql afterwards; quick spot-check):
--   select has_table_privilege('anon', 'public.quests', 'SELECT');   -- true
--   select has_table_privilege('anon', 'public.points_ledger', 'SELECT'); -- false
