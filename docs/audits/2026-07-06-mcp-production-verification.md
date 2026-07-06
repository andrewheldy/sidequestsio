# SideQuests.io MCP Production Verification

Verification date: 2026-07-06
Performed via: Supabase MCP (project-scoped, read-only, project ref `wvedvngtuzsttpavmgjw`) and Vercel MCP (account-wide, project `sidequestsio`), supplemented by the read-only `vercel` CLI for env-var name listing (the Vercel MCP server exposes no env-var tool).

This is a factual verification record, not an audit narrative. It documents what was directly observed against the live Supabase project and the live Vercel project on this date. It does not re-run or supersede the Codex production audit (`2026-07-06-codex-production-audit.md`), which was performed against commit `c499497` before today's environment cleanup.

## 1. MCP Connection Status

| Server | Transport | Scope | Status |
|---|---|---|---|
| `supabase` | HTTP (`mcp.supabase.com`) | project `wvedvngtuzsttpavmgjw`, `read_only=true`, features: debugging, database, development, storage | Connected, verified |
| `vercel` | HTTP (`mcp.vercel.com`) | account-wide (team `andrewheldyai-7144's projects`) | Connected, verified |

Configuration lives in `.mcp.json` at the repo root.

## 2. Supabase Visibility Check

- Project URL reachable: `https://wvedvngtuzsttpavmgjw.supabase.co`.
- **20 tables in `public` schema, all with RLS enabled**: `scan_events`, `partners`, `analytics_rollups`, `privacy_preferences`, `reward_redemptions`, `quests`, `qr_codes`, `quest_completions`, `consent_events`, `audit_logs`, `leaderboard_snapshots`, `points_ledger`, `note_reports`, `community_notes`, `user_profiles`, `rewards`, `quest_attempts`, `venues`, `profiles`, `users`.
- **Storage buckets: 1** — `avatars` (public, 5 MB limit, `image/jpeg`/`image/png`/`image/webp`). No `proofs` bucket exists, consistent with the Codex audit's finding.
- This check confirms RLS is *enabled* on every table. It does **not** confirm the actual anon/authenticated grants or anon read behavior the Codex audit flagged as broken — that check used the Supabase management/service context, not a live anon REST client. **The Codex audit's "anon reads blocked by missing grants" finding was not re-verified and should still be treated as an open, unconfirmed-fixed item.**

### Security advisors (read-only, unchanged by this session's env cleanup)

- **ERROR**: `public.public_profiles` view is defined with `SECURITY DEFINER`.
- **WARN**: 6 functions have a mutable `search_path` (`owns_partner`, `is_admin`, `set_updated_at`, `app_uid`, `level_for_xp`, and one more).
- **WARN**: public `avatars` bucket has a broad SELECT policy that allows listing all files, not just object-URL access.
- **WARN**: 10 `SECURITY DEFINER` RPCs are executable by `anon` and by `authenticated` without additional restriction: `adjust_points`, `complete_quest`, `create_community_note`, `create_qr_code`, `get_leaderboard`, `handle_new_auth_user`, `handle_new_user`, `partner_analytics`, `platform_analytics`, `record_scan`, `redeem_reward`, `rls_auto_enable`, `start_quest` (some counted for both roles).
- **WARN**: leaked-password protection is disabled in Supabase Auth.

None of these were introduced by today's work; all pre-date this session and remain open.

## 3. Vercel Visibility Check

- Team: `andrewheldyai-7144's projects` (`team_yeShyQjSq35ZBjpcOShV0M21`).
- Project: `sidequestsio` (`prj_vhwdyqvoP8JiR2Pmx03VBYye0D2O`), framework **vite**, Node **24.x**.
- Domains: `miamisidequests.io`, `sidequestsio.vercel.app`, `sidequestsio-andrewheldyai-7144s-projects.vercel.app`, `sidequestsio-git-main-andrewheldyai-7144s-projects.vercel.app`.
- **Latest deployment**: `dpl_BwfY77wz28rpPi8MsXrppmDKvJGL`, built from commit `6acfeee` (which includes `ad1341e`, this session's environment-cleanup commit), **`readyState: READY`**, **`target: production`**.
- **Build log** for that deployment: clean Vite build, 1885 modules transformed, built in ~11s, deployment completed successfully. Only pre-existing warnings (stale Browserslist data, a static+dynamic import of `@supabase/supabase-js` preventing a chunk split, and two chunks over 500 kB after minification).
- **Runtime errors**: none found in the last 7 days (`get_runtime_errors`).

## 4. Production Environment Variables

Read via `vercel env ls production` (Vercel MCP has no env-var tool):

| Variable | Present in Production | Present in Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | ✅ |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ |
| `VITE_MAPBOX_PUBLIC_TOKEN` | ✅ | ✅ |
| `vite_data_source` | ❌ removed this session | ❌ removed this session |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | ❌ removed this session | ❌ removed this session |

All three required variables are marked **Sensitive** in Vercel: their values cannot be retrieved again via `vercel env pull`/API by anyone, including the project owner, by design. `vercel env pull --environment production` was attempted and returned empty strings for all three (`""`), confirming they are sensitive-typed rather than plaintext, not that they are unset. This means the real anon key could not be tested directly from a local client during this verification.

## 5. Supabase Connectivity Test

- Direct REST call to `https://wvedvngtuzsttpavmgjw.supabase.co/rest/v1/` with a deliberately invalid API key returned HTTP 401 with `sb-error-code: UNAUTHORIZED_INVALID_API_KEY` — confirms the project is live, reachable, and correctly enforcing API-key auth end to end (network path, TLS, Cloudflare edge, PostgREST gateway all functioning).
- The real production anon key could not be pulled (see §4), so an authenticated-as-anon read against `quests`/`venues`/etc. was not performed in this verification. Combined with the Codex audit's earlier finding of anon permission-denied errors on those same tables, **anon read access to public discovery tables remains unconfirmed-working** as of this date.

## 6. Build/Typecheck Status (this session, local)

Run against the working tree after the environment cleanup, before pushing:

- `npm install` — succeeded (412 packages).
- `npx tsc -p tsconfig.app.json --noEmit` — **passed, no errors**.
- `npm run build` — **passed**. Same warnings as the Vercel build log above (stale Browserslist data, mixed Supabase import, two chunks >500 kB).
- `npm run lint` was not run in this session; the Codex audit's finding (26 errors, 14 warnings) was not re-verified and should be treated as still-open.

## 7. Scope Note

This verification is narrower than the Codex audit by design: it confirms MCP connectivity, current deployment/env state, and that this session's specific changes (env var cleanup, dev-only demo mode, removal of `QuestBrowser`'s demo fallback) shipped correctly. It does not re-run the Codex audit's live anon-permission tests, lint, `npm audit`, or authenticated smoke tests. Anything from the Codex audit not explicitly re-confirmed above should be treated as still open.
