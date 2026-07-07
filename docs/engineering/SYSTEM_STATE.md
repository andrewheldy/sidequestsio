# SideQuests.io — System State

**As of:** 2026-07-06
**Repository:** `github.com/andrewheldy/sidequestsio`
**Branch documented:** `main`
**Latest commit on `origin/main`:** `6acfeee` ("Create .mcp.json"), on top of `ad1341e` (environment cleanup, this session)
**Latest commit deployed to Vercel production:** `6acfeee`

This document describes the system as it actually exists today. It is a synthesis of:

- direct inspection of the current codebase,
- the Codex production audit (`docs/audits/2026-07-06-codex-production-audit.md`), performed against commit `c499497`,
- today's Supabase MCP and Vercel MCP production verification (`docs/audits/2026-07-06-mcp-production-verification.md`),
- the environment-cleanup work completed in this session (commit `ad1341e`).

It is not a roadmap and proposes no new work. Where the Codex audit's findings have since changed (because of this session's cleanup), that is noted explicitly. Where a Codex finding has *not* been re-verified, it is marked as such rather than assumed fixed.

---

## 1. Architecture

SideQuests is a single-page application: **Vite + React 18 + TypeScript**, deployed as a static SPA on Vercel, talking directly to Supabase (Postgres + Auth + Storage + RPC) from the browser. There is no separate backend server or API layer.

```
React SPA (Vite, static build on Vercel)
  │
  ├─ Marketing pages (public, static content)
  ├─ Public app pages (quest detail, QR/scan resolution, auth, onboarding)
  └─ /app/* in-app shell (explore, map, quests, community notes, checkin, favorites, profile, settings)
       │
       └─ Repository interface (src/lib/db/repository.ts)
            │
            ├─ SupabaseRepository  → Supabase Postgres (RLS + RPCs) — selected when
            │                        VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set
            ├─ LocalRepository     → browser localStorage, real business logic — the
            │                        fallback when Supabase isn't configured or fails
            └─ MockRepository      → static JSON, dev-build-only (see §11)
```

There are no app-owned API routes anywhere in the repository (no `api/`, `pages/api/`, `app/api/`, or `route.ts`). All backend behavior is client-to-Supabase; integrity-sensitive writes (points, completions, redemptions) go through Postgres RPCs, not direct table writes.

`ARCHITECTURE.md` at the repo root is an earlier planning document; it describes a route map (partner/admin portals, `/app/wallet`, `/app/rewards`, etc.) that does not match what is currently mounted in `src/App.tsx` (see §7). Where the two disagree, this document and the live routes in `src/App.tsx` are authoritative.

## 2. Frontend

- **Stack:** Vite 5, React 18, TypeScript 5.8, React Router v6, TanStack Query v5, Tailwind CSS + shadcn/ui (Radix primitives), react-hook-form + zod, Mapbox GL JS, Recharts.
- **Build tool config:** `tsconfig.app.json` has `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false` — the project does not run in TypeScript strict mode.
- **Bundling:** production build produces a main chunk (~1.1 MB minified / ~315 KB gzip) and a separate Mapbox chunk (~1.8 MB minified / ~503 KB gzip), both flagged by Vite as over the 500 KB warning threshold. `@supabase/supabase-js` is both statically imported (`src/lib/supabase.ts`) and dynamically imported (`src/lib/supabase/client.ts`), so the dynamic import does not get its own chunk — this produces a build-time warning but not an error.
- **Two parallel quest data models exist in the frontend:**
  - `QuestWithContext` (`src/types/db.ts`) — the Supabase/repository shape, joined with `venue`.
  - `Quest` (`src/lib/quests.ts`) — a separate, hardcoded static catalogue ("Mock quest catalogue... so the MVP needs no quest backend" per its own header comment), consumed by `AppHome`, `Favorites`, `AppHeader`, and the map components (`QuestMap`, `QuestMapPopup`, `NearbyQuestsMapSection`).
  - These two shapes are not interchangeable without a mapping function; `QuestBrowser.tsx` is the one place that converts between them (it used to convert `DEMO_QUESTS` into `QuestWithContext`; that conversion was removed this session — see §11).

## 3. Backend

- No custom backend server. Supabase is the only backend: Postgres (with RLS), Supabase Auth, Supabase Storage, and Postgres RPCs called via PostgREST.
- **RPCs** (all in `supabase/migrations/0003_functions.sql`): `record_scan` (anonymous-callable), `start_quest`, `complete_quest`, `redeem_reward`, `create_community_note`, `adjust_points` (admin-only), `get_leaderboard`, `partner_analytics`, `platform_analytics`, `create_qr_code`.
- **Verification trust model:** `complete_quest` only substantively verifies the `venue_code` method (checks a secret code); for every other verification type (`qr`, `nfc`, `gps`, `staff`) it marks the completion `verified = true` without additional server-side checks. This is a known, intentional MVP simplification, not a bug — but it means non-`venue_code` completions are currently trust-the-client.
- **10 migration files** exist in `supabase/migrations/`: `0001_profiles.sql`, `0001_schema.sql`, `0002_profile_overhaul.sql`, `0002_rls.sql`, `0003_avatars_storage.sql`, `0003_functions.sql`, `0004_phone_social.sql`, `0005_note_reports.sql`, `0006_game_schema.sql`, `0007_rls_idempotent.sql`, `0008_profile_is_public.sql`. Migration application order and idempotency have not been independently re-verified in this session beyond what the Codex audit reported (see §12).

## 4. Supabase

- **Project ref:** `wvedvngtuzsttpavmgjw` (`https://wvedvngtuzsttpavmgjw.supabase.co`).
- **20 tables in the `public` schema, all with RLS enabled** (confirmed live via Supabase MCP today): `users`, `user_profiles`, `privacy_preferences`, `partners`, `venues`, `quests`, `qr_codes`, `scan_events`, `quest_attempts`, `quest_completions`, `community_notes`, `note_reports`, `points_ledger`, `rewards`, `reward_redemptions`, `leaderboard_snapshots`, `analytics_rollups`, `consent_events`, `audit_logs`, `profiles`.
- **RLS enabled ≠ grants confirmed working.** The Codex audit found live anon reads returning permission-denied on `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, and `community_notes_with_author` despite RLS policies intending public reads — i.e., PostgREST grants may be missing independent of RLS. Today's MCP check confirmed RLS is *enabled* on all tables but used a management/service context, not a live anon client, so **this specific grants problem was not re-tested and should be treated as still open/unconfirmed**.
- **Storage:** 1 bucket, `avatars` (public, 5 MB limit, `image/jpeg`/`image/png`/`image/webp`). No `proofs` bucket exists, even though `src/lib/media.ts` uploads proof photos to a `proofs` bucket — this mismatch, identified by the Codex audit, is still present.
- **Open security advisories** (confirmed live today, pre-existing, not touched by this session):
  - ERROR: `public.public_profiles` view uses `SECURITY DEFINER`.
  - WARN: 6 functions have mutable `search_path` (`owns_partner`, `is_admin`, `set_updated_at`, `app_uid`, `level_for_xp`, and one more).
  - WARN: the public `avatars` bucket has a broad SELECT policy allowing clients to list all files, not just fetch by URL.
  - WARN: 10+ `SECURITY DEFINER` RPCs are callable by both `anon` and `authenticated` (`adjust_points`, `complete_quest`, `create_community_note`, `create_qr_code`, `get_leaderboard`, `handle_new_auth_user`, `handle_new_user`, `partner_analytics`, `platform_analytics`, `record_scan`, `redeem_reward`, `rls_auto_enable`, `start_quest`).
  - WARN: leaked-password protection is disabled in Supabase Auth.
- **Auth bootstrap risk (unresolved, code-verified, not live-verified):** `supabase/migrations/0006_game_schema.sql` defines `handle_new_auth_user()` to insert rows into `users`, `user_profiles`, `privacy_preferences`, and `profiles`; `supabase/migrations/0003_functions.sql` separately defines a same-named function that only inserts into `users`, `user_profiles`, `privacy_preferences` (no `profiles` row). Whichever migration runs last wins. Which version is live has not been independently confirmed since the Codex audit.

## 5. Vercel

- **Team:** `andrewheldyai-7144's projects` (`team_yeShyQjSq35ZBjpcOShV0M21`).
- **Project:** `sidequestsio` (`prj_vhwdyqvoP8JiR2Pmx03VBYye0D2O`), framework `vite`, Node `24.x`.
- **Domains:** `miamisidequests.io`, `sidequestsio.vercel.app`, `sidequestsio-andrewheldyai-7144s-projects.vercel.app`, `sidequestsio-git-main-andrewheldyai-7144s-projects.vercel.app`.
- **Config:** `vercel.json` sets `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, and a catch-all SPA rewrite (`/(.*) → /index.html`). No serverless/edge functions are configured.
- **Latest deployment:** `dpl_BwfY77wz28rpPi8MsXrppmDKvJGL`, built from commit `6acfeee`, `readyState: READY`, `target: production`. Build completed cleanly (1885 modules, ~11s) with only the pre-existing warnings noted in §2. No runtime errors logged in the past 7 days.

## 6. Auth

- Supabase Auth via the browser client (`src/lib/supabase.ts`, `src/lib/supabase/client.ts`); the client is `null` and the app runs in a degraded "guest" mode if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset.
- `AuthContext` (`src/contexts/AuthContext.tsx`) reads/writes the `profiles` table by `user_id`, handles sign-up (with `display_name` metadata), sign-in, onboarding completion, and profile updates.
- **Known gap (code-verified, unresolved):** if fetching the profile errors or returns no row, `AuthContext` silently sets `profile = null`. `ProtectedRoute` and the app's `AppLayout` only redirect to onboarding when `profile` exists and `onboarding_completed` is false — a signed-in user with a missing `profiles` row can pass the guard entirely rather than being sent to a repair/onboarding flow.
- **Known gap (code-verified, unresolved):** quest completion redirects unauthenticated users to `/auth?next=...`, but the `Auth` page only reads `location.state.from`, not the `next` query parameter — the redirect-back-after-signin path is broken for that entry point.
- **Public profile visibility field mismatch (code-verified, unresolved):** the Settings page writes `profiles.is_public`; the `public_profiles` view (used by the public profile page) filters on `profiles.is_profile_public`. A newer migration (`0008_profile_is_public.sql`) added `is_public`, but the view was not updated to match — toggling visibility in Settings may not affect what the public view actually shows.

## 7. Routing

Mounted routes, as read directly from `src/App.tsx` today:

**Public:** `/`, `/quests`, `/community-notes`, `/breadcrumbs` (redirect), `/verticals`, `/verticals/:slug`, `/partnerships`, `/hosts`, `/privacy`, `/terms`, `/auth`, `/onboarding`, `/u/:username`, `/quests/:questId`, `/q/:questId`, `/scan/:code`.

**In-app (`/app`, redirects to `/app/explore`):** `explore`, `map`, `quests`, `community-notes` (all unprotected), plus protected (behind `ProtectedRoute`): `checkin`, `favorites`, `profile`, `settings`.

**Not mounted, despite being linked to or having page code present:** `/partner*`, `/admin*`, `/app/wallet`, `/app/rewards`, `/app/leaderboard`, `/app/history`, `/app` home dashboard. `src/pages/app/Profile.tsx` links to `/partner` and `/admin`; `src/pages/QuestDetail.tsx` links to `/app/wallet`; none of these routes exist in `src/App.tsx`, so following those links currently 404s (`NotFound` catch-all route).

**Layout duplication (code-verified, unresolved):** two separate `AppLayout` components exist — a route-level shell (`src/pages/app/AppLayout.tsx`) and a component-level wrapper (`src/components/app/AppLayout.tsx`). Some mounted pages (e.g. `Settings`) render the component wrapper again inside the route shell, producing a duplicated max-width container and duplicated bottom navigation on those specific pages. `Explore`/`MapView` don't use the wrapper at all, so the app shell is visually inconsistent across mounted pages.

## 8. Storage

- One Supabase Storage bucket exists: `avatars` (public, 5 MB limit, restricted to `image/jpeg`/`image/png`/`image/webp`), with public read and owner-scoped write/update/delete policies.
- No `proofs` bucket exists. `src/lib/media.ts` uploads quest-completion proof photos to a bucket named `proofs`; `src/components/app/QuestProofCamera.tsx` currently swallows the resulting upload failure and posts the community note without an image rather than surfacing an error.

## 9. Environment Variables

**Currently required by the frontend** (typed in `src/vite-env.d.ts`):

| Variable | Purpose | Present in Vercel Production | Present in Vercel Preview |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ (Sensitive) | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ (Sensitive) | ✅ |
| `VITE_MAPBOX_PUBLIC_TOKEN` | Mapbox GL public token for the quest map | ✅ (Sensitive) | ✅ |

All three are marked **Sensitive** in Vercel: once set, their values cannot be retrieved again via CLI/API by anyone, including the project owner (`vercel env pull` returns an empty string for each). This was confirmed today and is a Vercel platform property, not a misconfiguration.

**Removed this session** (previously present in both Preview and Production, now deleted from Vercel and from the codebase):

- `vite_data_source` — formerly forced `MockRepository` when set to `mock`; the toggle it drove no longer exists (see §11).
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — a Next.js-convention variable name with no reference anywhere in this Vite codebase; dead configuration.

**Local-only / script-only:** `scripts/geocode-miami-crm.ts` references `MAPBOX_ACCESS_TOKEN` (no `VITE_` prefix), used only by that standalone script, not by the deployed app.

**`.env.example`** now contains placeholder values only (`https://your-project.supabase.co`, `your-public-anon-key`, `pk.your-public-mapbox-token`) — the Codex audit's finding that it contained a live anon JWT and Supabase URL, and was missing `VITE_MAPBOX_PUBLIC_TOKEN`, has been resolved this session.

## 10. MCP Configuration

`.mcp.json` at the repo root configures two MCP servers:

- **`supabase`** — HTTP transport to `mcp.supabase.com`, scoped to project `wvedvngtuzsttpavmgjw`, with `read_only=true` and features `debugging,database,development,storage`.
- **`vercel`** — HTTP transport to `mcp.vercel.com`, account-wide (not project-scoped by the config itself; access was exercised against team `andrewheldyai-7144's projects` / project `sidequestsio`).

The Vercel MCP server exposes no tool for listing or managing environment variables; env-var inspection and mutation in this session went through the read-only/write `vercel` CLI instead (`vercel env ls`, `vercel env rm`, `vercel env pull`).

## 11. Deployment Status

- Production is live at `miamisidequests.io` (and the associated `*.vercel.app` aliases), serving deployment `dpl_BwfY77wz28rpPi8MsXrppmDKvJGL`, built from commit `6acfeee`.
- `6acfeee` sits on top of `ad1341e`, this session's environment-cleanup commit, which:
  - Changed `isDemoMode` (`src/lib/demo.ts`) from `import.meta.env.VITE_DATA_SOURCE === 'mock'` to `import.meta.env.DEV` — demo mode (which selects `MockRepository`, see `src/lib/db/index.ts`) is now tied to the Vite dev-build flag and cannot be switched on in a production build via any Vercel env var.
  - Removed `QuestBrowser.tsx`'s silent fallback to hardcoded `DEMO_QUESTS` when its Supabase query errored, timed out, or returned empty; it now renders an explicit error state or empty state instead.
  - Left `Explore.tsx`, `MapView.tsx` (in-app), and `Quests.tsx` (public marketing page) unchanged — they still render the static `src/lib/quests.ts`/`DEMO_QUESTS` catalogues unconditionally, independent of any env var or backend state. This was an explicit, scoped decision (not an oversight) to avoid a larger rewrite of the shared `Quest` type surface in the same pass.
  - Updated `.env.example` and `src/vite-env.d.ts` (see §9).
- `6acfeee` itself is a separate, later commit ("Create .mcp.json") that added `.mcp.json` to the repo; it was not authored as part of the environment-cleanup work.
- The local `main` branch has been pushed to `origin/main` (confirmed via `git fetch` — `origin/main` is at `6acfeee`).

## 12. Build Status

- `npm install` succeeds (412 packages).
- `npm run build` (`vite build`) succeeds, both locally and in Vercel's build log for the latest deployment. Warnings only: stale Browserslist data, the Supabase static+dynamic import chunk-split warning, and two chunks over the 500 KB minified threshold (main ~1.1 MB, Mapbox ~1.8 MB).

## 13. Typecheck Status

- `npx tsc -p tsconfig.app.json --noEmit` passes with zero errors, both at the Codex audit's snapshot (`c499497`) and after this session's changes.
- This passes under a non-strict `tsconfig.app.json` (`strict: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`), so it does not guarantee the same level of type safety a strict config would.

## 14. Known Production Blockers

These are carried forward from the Codex production audit and have **not** been independently re-verified or fixed in this session (the environment cleanup addressed §9's `.env.example`/env-var items only):

1. **Supabase anon read grants** — the Codex audit found live anon reads permission-denied on `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, and `community_notes_with_author` despite RLS intending public access. Not re-tested against a live anon client this session.
2. **Auth/profile bootstrap migration-order trap** — two differently-behaved definitions of `handle_new_auth_user()` exist across migrations; whichever ran last on the live database determines whether new signups get a `profiles` row. Live function state not re-inspected this session.
3. **Fable quest fields missing from schema** — `src/types/db.ts` and `QuestDetail.tsx` expect `funky_action`, `action_type`, `proof_method`, `social_share_prompt`, `staff_phrase`, `estimated_time`, and `links` on `quests`; no checked-in migration creates these columns.
4. **`proofs` storage bucket does not exist** — proof-photo uploads target a bucket that was never migrated; upload failures are currently swallowed rather than surfaced.
5. **Public profile visibility field mismatch** — Settings writes `is_public`; the `public_profiles` view filters on `is_profile_public` (§6).
6. **Unreachable but linked routes** — `/partner`, `/admin`, `/app/wallet`, `/app/rewards`, `/app/leaderboard`, `/app/history` are linked from mounted pages but not mounted in `src/App.tsx` (§7).
7. **Auth `next`-redirect is broken** for the quest-completion → sign-in → back-to-quest flow (§6).
8. **Lint is not clean** — Codex audit reported `npm run lint` failing with 26 errors/14 warnings; not re-run this session.
9. **`npm audit` reported 10 production vulnerabilities**, including high-severity React Router advisories, at audit time; not re-run this session.
10. **Non-`venue_code` quest completions are trust-the-client** — `complete_quest` marks `qr`/`nfc`/`gps`/`staff` verification types as verified without independent server-side checks (§3).

## 15. Known Technical Debt

- **Two parallel quest data models** (`Quest` in `src/lib/quests.ts` vs. `QuestWithContext` in `src/types/db.ts`) with no shared mapping layer except the one-off conversion that used to exist in `QuestBrowser.tsx` (removed this session, not replaced elsewhere).
- **Mixed data-source policy across "production" surfaces**: `/app/explore` and `/app/map` (in-app) and `/quests` (marketing) always render static demo data regardless of backend state; `/app/quests` now shows live Supabase data with an explicit error/empty state (post this session's fix); `/quests/:questId` reads live repository data. There is no single, consistent policy for when a mounted page is "live" vs. "demo."
- **Duplicated `AppLayout` shell** causing double bottom-nav/wrapper rendering on some mounted app pages (§7).
- **Two app-layout files with the same name** (`src/pages/app/AppLayout.tsx` and `src/components/app/AppLayout.tsx`) — an ongoing source of import confusion.
- **`ARCHITECTURE.md` is stale** relative to the actual mounted routes and migration filenames (it references `0001_schema.sql`/`0002_rls.sql` as if they were the only migrations, and documents partner/admin routes as if live).
- **`tsconfig.app.json` runs non-strict** (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` all disabled).
- **Large bundle chunks** (main ~1.1 MB, Mapbox ~1.8 MB minified) with no code-splitting/manualChunks configuration.
- **`@supabase/supabase-js` is both statically and dynamically imported**, defeating the intended code-split of `SupabaseRepository` into its own chunk.
- **No automated tests** — `package.json` has no `test` script; CI (`.github/workflows/ci.yml`) runs only install, typecheck, and build.
- **Direct table update outside the RPC layer**: `SupabaseRepository`'s scan-conversion path (`markScanConverted`) updates `scan_events` directly rather than through an RPC, while RLS for that table has no corresponding update policy per the Codex audit — a potential silent-failure path, not re-verified this session.
- **Multiple `SECURITY DEFINER` RPCs are broadly executable** by `anon`/`authenticated` without additional restriction (§4) — flagged by Supabase's own advisors, not addressed this session.
- **Leaked-password protection is disabled** in Supabase Auth (§4).
