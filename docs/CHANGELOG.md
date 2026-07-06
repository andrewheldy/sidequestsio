# Changelog

All notable changes to the SideQuests.io project are recorded here. This log tracks operational/infrastructure changes (environment, deployment, verification) alongside code changes; it is not a substitute for `git log`.

## 2026-07-06 — Sprint 0: production sprint plan + backend-unblock migrations (authored, not yet applied)

- Added `docs/PRODUCTION_SPRINT_PLAN.md` — the evidence-tagged execution plan for the Miami MVP launch, preceded by a live reality-verification pass (read-only Supabase MCP) that settled the audits' open unknowns. Key live confirmations: anon/authenticated grants missing on all game tables (policies exist; grants-only fix); the `handle_new_auth_user` migration-order trap **has fired** on the live DB (both `auth.users` triggers run the variant without the `profiles` insert; 6 `users` vs 5 `profiles`); live `quests` already has the Fable columns except `action_prompt` (drift ahead of repo), all NULL; `public_profiles` view filters `is_profile_public` while Settings writes `is_public` (live `is_public` is nullable default **true**, contradicting checked-in 0008); only the `avatars` bucket exists; no admin user exists; community notes default to `approved`.
- Authored five idempotent migrations (**not yet applied** — human applies in SQL editor after a backup; the project MCP is read-only):
  - `0009_grants.sql` — PostgREST grants for `anon`/`authenticated`, aligned 1:1 with existing RLS policies (least privilege; no DELETE grants; RPC-only writes stay ungranted).
  - `0010_auth_bootstrap.sql` — one canonical `handle_new_auth_user` (now also creates the `profiles` row), exactly one trigger, drops the orphaned `handle_new_user`, and backfills missing rows for existing auth users. Order-proof: safe to run last from any starting state.
  - `0011_profile_visibility.sql` — canonicalizes visibility on `is_public` (backfilled from `is_profile_public`, preserving every profile's current actual visibility — all 5 private), sets NOT NULL DEFAULT false (opt-in), repoints the `public_profiles` view.
  - `0012_quest_fable_fields.sql` — adds `action_prompt`, captures the seven drifted Fable columns + `links` as checked-in schema.
  - `0013_proofs_bucket.sql` — `proofs` bucket (public read, owner-folder writes, 25 MB, image+video MIME) that `src/lib/media.ts` already targets.
- Added `scripts/verify-db.sql` — a 17-check read-only reality gate (grants, trigger canonicalization, backfill counts, view/column shape, buckets, content readiness). Pre-flighted against live: runs clean, 1/17 passing pre-apply, each failure matching the verified findings exactly.
- Added `scripts/smoke-supabase.ts` + `npm run smoke:supabase` — anon-client smoke of the SPA's real read paths. Baseline run against production: 3/8 passing (401 on quests/venues/qr_codes/rewards/notes — reproducing the Codex audit's grant finding from the local anon key; `get_leaderboard` and `public_profiles` pass).
- Corrected `supabase/README.md`: migration execution order now includes 0008–0013 with an explicit warning about the historical 0003-after-0006 trap (resolved permanently by 0010), and the stale "MVP demo always runs from mock JSON data" claim replaced with the actual repository-selection behavior per `docs/DECISIONS.md`.

## 2026-07-06 — Environment cleanup, MCP setup, and production verification

### Environment cleanup (commit `ad1341e`)

- Removed the env-var-controlled demo mode. `isDemoMode` (`src/lib/demo.ts`) previously read `VITE_DATA_SOURCE === 'mock'`, a build-time variable that had been set on Vercel in both Preview and Production, silently switching the whole app to `MockRepository`. It is now derived from `import.meta.env.DEV`, which Vite hard-codes to `false` in production builds regardless of any Vercel env var — demo mode can no longer be enabled in production.
- Removed `QuestBrowser.tsx`'s silent fallback to hardcoded `DEMO_QUESTS` on Supabase query error, timeout, or empty result. It now renders an explicit error state ("Couldn't load quests") or empty state instead of masking backend failures with fake data.
- Rewrote `.env.example` to placeholder values only (`https://your-project.supabase.co`, `your-public-anon-key`, `pk.your-public-mapbox-token`); it previously contained a live Supabase project URL and a real anon JWT.
- Added `VITE_MAPBOX_PUBLIC_TOKEN` to the `ImportMetaEnv` typing in `src/vite-env.d.ts`; removed the now-unused `VITE_DATA_SOURCE` typing.
- Updated stale code comments in `src/lib/db/index.ts` and `src/lib/db/mock/MockRepository.ts` that referenced `VITE_DATA_SOURCE`.
- Deleted `vite_data_source` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` from Vercel (both Preview and Production environments) via the `vercel` CLI. `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` was a Next.js-convention variable with no reference anywhere in this Vite codebase.
- Verified `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MAPBOX_PUBLIC_TOKEN` already existed in both Preview and Production — no new variables were added.

### MCP setup and verification

- Confirmed both MCP servers configured in `.mcp.json` are connected and functioning: `supabase` (project-scoped to `wvedvngtuzsttpavmgjw`, read-only) and `vercel` (account-wide).
- Ran a read-only Supabase visibility check: 20 tables in `public`, all with RLS enabled; 1 storage bucket (`avatars`); captured the current set of open security advisories (pre-existing, unrelated to this session's changes).
- Ran a read-only Vercel visibility check: confirmed project linkage, domains, and that the Vercel MCP server has no env-var listing/management tool (env-var work went through the `vercel` CLI instead).
- Compared Vercel env-var names against `import.meta.env` usage in the codebase and found the `VITE_DATA_SOURCE` case-mismatch and the dead `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` variable that were then removed above.

### Production verification (post-deployment)

- Confirmed the latest commit (`6acfeee`, which includes `ad1341e`) is deployed to Vercel production as deployment `dpl_BwfY77wz28rpPi8MsXrppmDKvJGL`, `readyState: READY`.
- Confirmed Vercel's own build log for that deployment completed cleanly with no errors.
- Confirmed no runtime errors have been logged for the project in the past 7 days.
- Confirmed via `vercel env ls production` that `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MAPBOX_PUBLIC_TOKEN` are present in Production, and that `vite_data_source`/`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` are absent.
- Discovered all three required Vercel env vars are marked **Sensitive**, meaning their values cannot be retrieved again via CLI/API by anyone (including the project owner) — this blocked a direct local test of the real anon key against the Supabase REST API. Confirmed the Supabase REST endpoint is reachable and correctly enforces API-key auth via an invalid-key test instead.
- Ran `npm install`, `npx tsc -p tsconfig.app.json --noEmit` (passed, zero errors), and `npm run build` (passed) locally against the post-cleanup working tree.

### Documentation

- Added `docs/audits/2026-07-06-codex-production-audit.md` — the full Codex production audit performed against commit `c499497`, preserved verbatim.
- Added `docs/audits/2026-07-06-mcp-production-verification.md` — the factual record of today's MCP-based verification described above.
- Added `docs/SYSTEM_STATE.md` — a synthesized, reality-only description of the system's current architecture, frontend, backend, Supabase, Vercel, auth, routing, storage, environment variables, MCP configuration, deployment/build/typecheck status, and known production blockers/technical debt.
- Added this changelog.
