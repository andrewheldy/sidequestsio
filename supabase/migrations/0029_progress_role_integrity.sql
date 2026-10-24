-- 0029_progress_role_integrity.sql — stop clients editing their own role, XP and Points
--
-- RENUMBERED: authored and applied to production on 2026-10-21 as
-- 0023_progress_role_integrity.sql. It was renamed when the mobile MVP branch merged,
-- because main had already used 0023 for location discovery. Re-running it is a no-op
-- (revoke/grant only), so the live ledger needs no change beyond recording the new name.
--
-- WHY (code-verified and LIVE-verified 2026-10-21 via read-only MCP catalog
-- query: has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE')
-- and ... 'public.user_profiles', 'points_balance_cache' ... both returned true):
--   * 0009_grants.sql grants UPDATE on public.users and public.user_profiles to
--     `authenticated`, and 0007's users_self_update / profiles_self_update
--     policies allow any row where id/user_id = auth.uid(). There are no
--     column restrictions, so a signed-in user can PATCH through PostgREST:
--       - public.users.role = 'admin'  → public.is_admin() trusts that column,
--         unlocking admin-only RPCs (adjust_points, platform_analytics, …) and
--         admin RLS branches. Privilege escalation.
--       - public.user_profiles.points_balance_cache / xp / level → redeem_reward()
--         spends against points_balance_cache, so a user can mint Points.
--   * No client code writes either table directly (verified: the repository's
--     updateUser/updateProfile have no callers outside the admin page, whose
--     cross-user writes are already blocked by RLS). Every legitimate writer is
--     a SECURITY DEFINER function (handle_new_auth_user, complete_quest,
--     redeem_reward, adjust_points), which runs as the table owner and is
--     unaffected by these grants.
--
-- What changes: table-wide UPDATE is replaced by column-level UPDATE on the
-- harmless self-service columns only. RLS policies are unchanged.
--
-- Idempotent (revoke/grant are repeatable); non-destructive (no data change).
-- APPLIED to production 2026-10-21 (SQL editor, after backup) and verified via
-- read-only MCP; see docs/engineering/CHANGELOG.md.

begin;

revoke update on table public.users from anon, authenticated;
grant update (display_name, avatar_url, last_active_at) on public.users to authenticated;

revoke update on table public.user_profiles from anon, authenticated;
grant update (home_city) on public.user_profiles to authenticated;

commit;

-- Verification (expect false, false, true):
--   select has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.user_profiles', 'points_balance_cache', 'UPDATE');
--   select has_column_privilege('authenticated', 'public.users', 'display_name', 'UPDATE');
--
-- Rollback (restores the 0009 behaviour, including the hole):
--   begin;
--   grant update on table public.users to authenticated;
--   grant update on table public.user_profiles to authenticated;
--   commit;
