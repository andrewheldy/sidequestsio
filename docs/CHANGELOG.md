# Changelog

All notable changes to the SideQuests.io project are recorded here. This log tracks operational/infrastructure changes (environment, deployment, verification) alongside code changes; it is not a substitute for `git log`.

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
