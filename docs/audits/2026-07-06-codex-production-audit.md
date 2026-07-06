# SideQuests.io Fable 5 Production Audit

Audit date: 2026-07-06  
Repository: `https://github.com/andrewheldy/sidequestsio.git`  
Audited snapshot: `main` at `c4994975a2242836d97f1b5b7799a4a64ac3486d`  
Local checkout: `/Users/Heldy/Documents/Codex/2026-07-06/files-mentioned-by-the-user-audit/work/sidequestsio`  
Supabase project referenced by user and repo: `wvedvngtuzsttpavmgjw`

## Verification Legend

- Verified in code: confirmed by reading the local repository at the commit above.
- Verified by local commands: confirmed by `npm ci`, typecheck, build, lint, audit, or filesystem searches.
- Live anon check: confirmed with non-mutating Supabase REST/RPC/storage calls using the public anon client only.
- Live Vercel check: confirmed with the Vercel connector against the SideQuests project/deployments.
- Live-unverified: requires Supabase dashboard, service-role SQL inspection, authenticated smoke tests, or Vercel env access not available through the audited connector/tools.

No secrets are included in this report. The repo currently contains a concrete Supabase anon JWT in `.env.example`; it is intentionally redacted here.

## 1. Executive Summary

SideQuests is close enough to plan a focused Fable 5 production hardening sprint, but it is not ready for a production launch today.

What is working:

- The app is a Vite/React/TypeScript SPA with Supabase, React Router, Mapbox, Tailwind/shadcn, local/mock repositories, and a browser-facing production repository. See `package.json:6-14`, `package.json:44-60`, and `src/lib/db/index.ts:17-42`.
- TypeScript passes at the audited snapshot: `npx tsc -p tsconfig.app.json --noEmit` exited 0.
- Production build passes: `npm run build` exited 0.
- Vercel has a ready production deployment at current `main` commit `c4994975a2242836d97f1b5b7799a4a64ac3486d`. The deployment is a static Vite app configured by `vercel.json:1-6`.
- The quest/gameplay skeleton exists: public quest detail, QR resolution, scan recording, completion RPC, XP/points, reward redemption, community notes, and proof capture are all represented in code (`src/pages/QuestDetail.tsx:143-334`, `src/lib/quests/scanFlow.ts:35-90`, `src/lib/db/supabase/SupabaseRepository.ts:226-405`, `supabase/migrations/0003_functions.sql:23-393`).

Main production blockers:

1. Live Supabase anon reads are blocked by missing table/view grants. Live anon checks returned permission-denied for public discovery tables/views including `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, and `community_notes_with_author`, despite RLS policies intending public reads (`supabase/migrations/0007_rls_idempotent.sql:101-150`, `supabase/migrations/0007_rls_idempotent.sql:177-208`). This blocks public quest discovery, QR resolution, rewards, and notes when the app uses Supabase.
2. The auth/profile bootstrap has a migration-order trap. `0006_game_schema.sql` provisions `public.profiles` in `handle_new_auth_user` (`supabase/migrations/0006_game_schema.sql:472-500`), but `0003_functions.sql` later defines an older function with the same name and no `profiles` insert (`supabase/migrations/0003_functions.sql:379-393`). The repo README says to run `0003_functions.sql` after `0006_game_schema.sql` (`supabase/README.md:17-29`, if present in the checkout), which can overwrite the newer trigger function.
3. The code expects Fable-style quest fields, but the checked-in migrations do not create them on `public.quests`. Types include `funky_action`, `action_type`, `action_prompt`, `proof_method`, `social_share_prompt`, `staff_phrase`, and `estimated_time` (`src/types/db.ts:148-182`), and UI uses them heavily (`src/pages/QuestDetail.tsx:389-395`, `src/pages/QuestDetail.tsx:456-504`, `src/pages/QuestDetail.tsx:594-705`). `public.quests` in the current migration set only has the base columns through `created_at` (`supabase/migrations/0006_game_schema.sql:177-194`).
4. Proof media uploads target a `proofs` storage bucket, but the repo only migrates an `avatars` bucket. `src/lib/media.ts:13-34` uploads to `proofs`; `supabase/migrations/0003_avatars_storage.sql:6-50` creates and secures only `avatars`.
5. Public profile visibility is split and currently mismatched. Settings toggles `profiles.is_public` (`src/pages/app/Settings.tsx:31-32`, `src/pages/app/Settings.tsx:82-90`), while `public_profiles` filters `profiles.is_profile_public` (`supabase/migrations/0006_game_schema.sql:436-463`). The `0008_profile_is_public.sql:1-5` migration adds `is_public`, but the view still uses `is_profile_public`.
6. Several routes users can reach are not mounted. Admin/partner pages exist, and profile links point to `/partner` and `/admin` (`src/pages/app/Profile.tsx:134-146`), but `src/App.tsx:57-123` does not mount any `/partner` or `/admin` routes. App pages such as wallet, rewards, leaderboard, history, and app home also exist but are not mounted; `QuestDetail` links to `/app/wallet` (`src/pages/QuestDetail.tsx:857-863`).
7. Lint and dependency audit are not launch-clean. `npm run lint` failed with 26 errors and 14 warnings. `npm audit --omit=dev` reported 10 production vulnerabilities, including high-severity React Router advisories.
8. `.env.example` includes live public Supabase config instead of placeholders and omits `VITE_MAPBOX_PUBLIC_TOKEN` even though README and map code require it (`.env.example:10-11`, `README.md:26-29`, `README.md:45-58`, `src/lib/mapbox.ts:7-16`).

Recommended launch posture:

- Treat Fable 5 as a production-readiness sprint around schema/grants/env/auth/routing rather than a broad rewrite.
- First make Supabase live schema, grants, storage buckets, and Fable quest fields deterministic.
- Then wire mounted app routes to live data in a controlled way, keeping the demo data as an explicit fallback or demo mode.

## 2. Current State

| Area | Status | Evidence |
|---|---|---|
| App framework | Working | Vite/React/TS scripts in `package.json:6-14`; router in `src/App.tsx:57-123`; SPA rewrite in `vercel.json:1-6`. |
| Local install | Working with warnings | `npm ci` completed; it reported 16 total vulnerabilities across all deps/dev deps. |
| Typecheck | Passing | `npx tsc -p tsconfig.app.json --noEmit` exited 0. |
| Build | Passing | `npm run build` exited 0; warnings for stale Browserslist data, Supabase dynamic import not splitting because of static import, and large chunks. |
| Lint | Failing | `npm run lint` exited 1 with 26 errors and 14 warnings, including `any`, no-unused-expressions, require import, and fast-refresh warnings. |
| Tests | Not present | `package.json:6-14` has no `test` script; CI runs install, typecheck, build only (`.github/workflows/ci.yml:21-28`). |
| Supabase schema | Partial | Core game tables and RLS are in migrations (`supabase/migrations/0006_game_schema.sql:118-383`, `supabase/migrations/0007_rls_idempotent.sql:45-266`), but current migration set lacks grants, Fable quest fields, and `proofs` bucket. |
| Live Supabase anon reads | Blocked | Live anon checks returned permission-denied for public discovery tables/views. `get_leaderboard` RPC and `public_profiles` were reachable. |
| Auth/profile | Partial | `AuthContext` reads and updates `profiles` (`src/contexts/AuthContext.tsx:160-171`, `src/contexts/AuthContext.tsx:243-288`), but profile-row creation depends on trigger order and route guards allow signed-in users through when `profile` is null (`src/components/ProtectedRoute.tsx:21-25`). |
| Quest loop | Partial | Query/detail/completion/proof skeleton exists (`src/pages/QuestDetail.tsx:143-334`), but live Supabase reads are grant-blocked and non-`venue_code` verification is trust-the-client in RPC (`supabase/migrations/0003_functions.sql:99-102`). |
| Admin/partner portals | Code present, route-blocked | Pages and navs exist under `src/pages/admin`, `src/pages/partner`, and `src/components/dashboard/navs.ts:4-18`, but routes are absent from `src/App.tsx:57-123`. |
| Map/location | Demo-ready, not live-wired | Mapbox token and map component exist (`src/lib/mapbox.ts:7-16`, `src/components/map/QuestMap.tsx:49-106`); mounted map consumes `DEMO_QUESTS` (`src/pages/app/MapView.tsx:1-25`). |
| Vercel | Deployed | Project uses Vite build and `dist` output (`vercel.json:1-6`). Live Vercel production deployment at current commit is READY. Actual env values were live-unverified. |

## 3. Backend and Supabase Audit

### Schema and Migrations

The repo has two layers of profile/account modeling:

- Auth/onboarding profile table: `public.profiles` is created by `supabase/migrations/0001_profiles.sql:6-28`, protected by owner-only RLS in `supabase/migrations/0001_profiles.sql:31-50`, and originally provisioned by an auth trigger in `supabase/migrations/0001_profiles.sql:69-89`.
- Game identity tables: `public.users`, `public.user_profiles`, and `public.privacy_preferences` are created in `supabase/migrations/0006_game_schema.sql:118-148` and secured in `supabase/migrations/0007_rls_idempotent.sql:66-99`.

Core game tables are present in the current migration set:

- Partners and venues: `supabase/migrations/0006_game_schema.sql:153-172`
- Quests and QR codes: `supabase/migrations/0006_game_schema.sql:177-205`
- Scan events, attempts, completions: `supabase/migrations/0006_game_schema.sql:210-251`
- Community notes and reports: `supabase/migrations/0006_game_schema.sql:256-284`
- Points ledger, rewards, redemptions: `supabase/migrations/0006_game_schema.sql:290-332`
- Leaderboards and analytics rollups: `supabase/migrations/0006_game_schema.sql:337-360`
- Consent events and audit logs: `supabase/migrations/0006_game_schema.sql:366-383`
- Views: `community_notes_with_author` and `public_profiles` in `supabase/migrations/0006_game_schema.sql:427-463`

The critical migration gaps are:

- No checked-in grants for tables such as `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, or `community_notes_with_author`. RLS policies alone are insufficient for PostgREST access; the role still needs table/view privileges. Live anon checks confirmed the grants are missing in the live project.
- No checked-in migration creating the Fable quest fields that the current frontend expects (`src/types/db.ts:148-182`).
- No checked-in migration creating the `proofs` storage bucket used by quest proof uploads (`src/lib/media.ts:13-34`).
- Profile visibility migrations diverge: `0006_game_schema.sql` creates and filters by `is_profile_public` (`supabase/migrations/0006_game_schema.sql:388-398`, `supabase/migrations/0006_game_schema.sql:459-460`), while `0008_profile_is_public.sql:1-5` adds `is_public`.

### Migration Order Risk

`supabase/migrations/0006_game_schema.sql:472-500` defines `public.handle_new_auth_user()` to insert:

- `public.users`
- `public.user_profiles`
- `public.privacy_preferences`
- `public.profiles`

`supabase/migrations/0003_functions.sql:379-393` later defines a function with the same name, but only inserts:

- `public.users`
- `public.user_profiles`
- `public.privacy_preferences`

If `0003_functions.sql` is run after `0006_game_schema.sql`, future signups may not get rows in `public.profiles`. That breaks onboarding/profile reads, because `AuthContext` expects `profiles` rows (`src/contexts/AuthContext.tsx:160-171`) and route guards only redirect to onboarding when a profile exists and `onboarding_completed` is false (`src/components/ProtectedRoute.tsx:21-25`, `src/pages/app/AppLayout.tsx:19-20`).

This is live-unverified from service-role SQL. It needs a Supabase dashboard inspection of:

- Final definition of `public.handle_new_auth_user`
- Existing triggers on `auth.users`
- Recent auth users missing `public.profiles`
- Grants on every table/view used by PostgREST

### RLS and Grants

The intended RLS model is reasonable:

- Users read/update their own `users` rows (`supabase/migrations/0007_rls_idempotent.sql:66-76`).
- Users read/update their own `user_profiles` rows (`supabase/migrations/0007_rls_idempotent.sql:78-89`).
- Users manage their own `privacy_preferences` (`supabase/migrations/0007_rls_idempotent.sql:91-99`).
- Public reads are intended for partners, venues, active quests, active QR codes, approved notes, active rewards, and leaderboard snapshots (`supabase/migrations/0007_rls_idempotent.sql:101-224`).
- Partner/admin access is enforced by `owns_partner` and `is_admin` helpers (`supabase/migrations/0007_rls_idempotent.sql:21-40`).

But live anon checks show table/view grants are not in place. A production-ready grant migration should be idempotent, scoped, and reviewed before running. It should not grant blanket write access. The likely intent is:

- Grant `USAGE` on schema `public` to `anon` and `authenticated`.
- Grant `SELECT` to `anon, authenticated` only on public discovery surfaces intended by RLS: active partners/venues/quests/qr_codes/rewards, approved/community views, leaderboard/public profile views.
- Grant table privileges to `authenticated` only where RLS permits self or partner-owned actions.
- Grant execute privileges on intended RPCs to `anon` or `authenticated` according to the call path. For example, `record_scan` is intentionally callable anonymously (`supabase/migrations/0003_functions.sql:23-50`), while completion/reward/community-note/admin RPCs require authenticated context or admin checks.

### RPCs and Integrity

The backend mutation model is centralized in Postgres RPCs:

- `record_scan`: appends a scan event for anonymous or authenticated visitors (`supabase/migrations/0003_functions.sql:23-50`).
- `start_quest`: creates an idempotent in-progress attempt (`supabase/migrations/0003_functions.sql:55-68`).
- `complete_quest`: validates quest state, prevents duplicate completions, writes completion and points ledger, updates profile stats (`supabase/migrations/0003_functions.sql:73-150`).
- `redeem_reward`: row-locks reward, checks balance/inventory, writes redemption and points ledger (`supabase/migrations/0003_functions.sql:155-195`).
- `create_community_note`: requires the user to have completed the quest (`supabase/migrations/0003_functions.sql:200-222`).
- `adjust_points`: admin-only points adjustment (`supabase/migrations/0003_functions.sql:227-248`).
- `get_leaderboard`: reads points ledger while honoring leaderboard opt-out (`supabase/migrations/0003_functions.sql:253-286`).
- `partner_analytics`: partner-owned analytics with small-cell suppression below 5 total scans (`supabase/migrations/0003_functions.sql:291-327`).
- `platform_analytics`: admin-only analytics (`supabase/migrations/0003_functions.sql:329-357`).
- `create_qr_code`: partner/admin QR creation (`supabase/migrations/0003_functions.sql:362-374`).

Security note: `complete_quest` only truly verifies `venue_code`; for all other verification types it sets `verified` to true (`supabase/migrations/0003_functions.sql:99-102`). That may be acceptable for a lightweight MVP if disclosed as a trust model, but it is not real QR/GPS/staff/photo verification.

### Storage

Avatar storage is migrated:

- `avatars` bucket, public, 5 MB, limited MIME types: `supabase/migrations/0003_avatars_storage.sql:6-17`
- Public read and owner-scoped write/update/delete policies: `supabase/migrations/0003_avatars_storage.sql:21-50`
- Client uploader uses `avatars`: `src/lib/profile.ts:214-227`

Proof storage is not migrated:

- Proof uploader uses `proofs`: `src/lib/media.ts:13-34`
- Proof camera swallows upload failure and still posts the note without an image (`src/components/app/QuestProofCamera.tsx:499-509`)

Production needs an idempotent `proofs` bucket migration and a visible error or retry path if proof upload fails.

## 4. Frontend and App Audit

### Routing

Mounted public routes in `src/App.tsx:57-80`:

- `/`
- `/quests`
- `/community-notes`
- `/breadcrumbs` redirect
- `/verticals`
- `/verticals/:slug`
- `/partnerships`
- `/hosts`
- `/privacy`
- `/terms`
- `/auth`
- `/onboarding`
- `/u/:username`
- `/quests/:questId`
- `/q/:questId`
- `/scan/:code`

Mounted app routes in `src/App.tsx:82-121`:

- `/app` redirect to `/app/explore`
- `/app/explore`
- `/app/map`
- `/app/quests`
- `/app/community-notes`
- Protected: `/app/checkin`, `/app/favorites`, `/app/profile`, `/app/settings`

Unclear or broken routing:

- Admin and partner pages exist but are not mounted. Profile links point to `/partner` and `/admin` (`src/pages/app/Profile.tsx:134-146`), and dashboard navs expect `/partner/...` and `/admin/...` (`src/components/dashboard/navs.ts:4-18`), but `src/App.tsx:57-123` has no matching routes.
- App pages `AppHome`, `Rewards`, `Wallet`, `Leaderboard`, and `History` exist but are not mounted. `AppHome` links `/app/rewards` (`src/pages/app/AppHome.tsx:65`), and quest completion links `/app/wallet` (`src/pages/QuestDetail.tsx:857-863`).

### Layout

There are two app layout shells:

- Route shell: `src/pages/app/AppLayout.tsx:23-29`
- Component wrapper: `src/components/app/AppLayout.tsx:23-30`

Several mounted child pages import and render the component wrapper inside the route shell, creating duplicate max-width shells and duplicate bottom navigation on those pages. Examples include settings (`src/pages/app/Settings.tsx:4`, `src/pages/app/Settings.tsx:110-277`) and similar app pages. Explore and Map do not use the component wrapper, so the app shell is inconsistent.

### Data Mode

Repository selection is clean and explicit:

- `VITE_DATA_SOURCE=mock` forces `MockRepository`.
- Configured Supabase env selects `SupabaseRepository`.
- Otherwise the app falls back to `LocalRepository`.

Evidence: `src/lib/db/index.ts:17-42`, `src/lib/demo.ts:1`.

However, mounted user-facing pages are mixed:

- `/app/explore` uses static `DEMO_QUESTS` (`src/pages/app/Explore.tsx:1-18`).
- `/app/map` uses static `DEMO_QUESTS` (`src/pages/app/MapView.tsx:1-25`).
- Public `/quests` uses demo data (`src/pages/Quests.tsx:10-11`, `src/pages/Quests.tsx:21-30`, `src/pages/Quests.tsx:66-70`).
- `/app/quests` uses repository data and falls back to demo data if Supabase returns empty/errors/timeouts (`src/pages/app/QuestBrowser.tsx:75-90`).
- `/quests/:questId` uses repository data (`src/pages/QuestDetail.tsx:143-154`).

For production, decide whether discovery surfaces should remain curated/demo, use Supabase live data, or explicitly show demo mode. The current mixed state can make production look alive while deep links fail against live Supabase.

### Auth and Redirects

Auth/profile basics:

- `AuthContext` reads `profiles` by `user_id` (`src/contexts/AuthContext.tsx:160-171`).
- Signup passes `display_name` metadata and redirects email confirmation to `/app` (`src/contexts/AuthContext.tsx:211-223`).
- Profile updates and onboarding update `profiles` directly (`src/contexts/AuthContext.tsx:243-288`).

Risks:

- If `fetchProfile` errors or finds no row, it silently sets `profile` to null (`src/contexts/AuthContext.tsx:167-171`).
- `ProtectedRoute` only sends users to onboarding if `profile && !profile.onboarding_completed` (`src/components/ProtectedRoute.tsx:21-25`). A signed-in user with a missing profile row can pass protected routes.
- `AppLayout` has the same issue (`src/pages/app/AppLayout.tsx:19-20`).
- Quest completion sends unauthenticated users to `/auth?next=...` (`src/pages/QuestDetail.tsx:249-254`), but `Auth` only reads `location.state.from`, not the `next` query param (`src/pages/Auth.tsx:30-35`).

### Public Profiles

Public profile read path is privacy-safe in concept:

- `PublicProfile` only reads `public_profiles` (`src/pages/PublicProfile.tsx:41-53`).
- The view excludes phone and gates social links by `show_social_links` (`supabase/migrations/0006_game_schema.sql:436-463`).

But there are two issues:

- Visibility toggle mismatch: Settings writes `is_public` (`src/pages/app/Settings.tsx:82-90`), while the public view filters `is_profile_public` (`supabase/migrations/0006_game_schema.sql:459-460`).
- Public profile renders bio/social links twice: inside the header (`src/pages/PublicProfile.tsx:129-143`) and again after the header body (`src/pages/PublicProfile.tsx:145-152`).

## 5. Environment Audit

### Client env used by code

| Env var | Used by | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts:17-23`, `src/lib/supabase/client.ts:17-36` | Required for auth and Supabase repository. `.env.example:10` includes the live URL and has a suspicious space after `=`. |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:17-23`, `src/lib/supabase/client.ts:17-36` | Required for auth and Supabase repository. `.env.example:11` contains a concrete anon JWT; redact and replace with placeholder. |
| `VITE_MAPBOX_PUBLIC_TOKEN` | `src/lib/mapbox.ts:7-16`, `src/components/map/QuestMap.tsx:20`, `src/components/map/QuestMap.tsx:50-60`, `src/components/map/QuestMap.tsx:229-266` | Required for map rendering. Documented in README (`README.md:45-58`) but missing from `.env.example` and from `src/vite-env.d.ts:3-13`. |
| `VITE_DATA_SOURCE` | `src/lib/demo.ts:1`, `src/lib/db/index.ts:20-41` | Optional. Set to `mock` for demo/static mode only. Avoid setting it in production unless intentionally forcing mock data. |

No code usage of `NEXT_PUBLIC_*` was found. This is a Vite app, so `NEXT_PUBLIC_*` values do not get exposed to `import.meta.env`.

### Server/script env

`scripts/geocode-miami-crm.ts` references `MAPBOX_ACCESS_TOKEN` (`scripts/geocode-miami-crm.ts:5`, `scripts/geocode-miami-crm.ts:198-200`) but the current geocoding flow uses Nominatim fetches (`scripts/geocode-miami-crm.ts:136-164`). Treat `MAPBOX_ACCESS_TOKEN` as a local/script-only env var, not a Vercel frontend requirement.

### Recommended env shape

Local `.env` or `.env.local`:

```sh
VITE_SUPABASE_URL=https://wvedvngtuzsttpavmgjw.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key from Supabase Settings API>
VITE_MAPBOX_PUBLIC_TOKEN=pk.<mapbox public token>
# Optional for demo-only sessions:
# VITE_DATA_SOURCE=mock
```

Vercel production and preview:

```sh
VITE_SUPABASE_URL=https://wvedvngtuzsttpavmgjw.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
VITE_MAPBOX_PUBLIC_TOKEN=pk.<mapbox public token>
```

Do not set a Supabase `service_role` key in any `VITE_*` variable. No service-role usage was found in source; keep it that way.

`.env.example` should be placeholder-only:

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=pk.your-public-mapbox-token
# VITE_DATA_SOURCE=mock
```

Vercel env values were live-unverified because the available Vercel connector exposed projects/deployments/logs, not env var listing. Confirm in Vercel dashboard or with `vercel env ls` before launch.

## 6. Auth and RLS Risk Matrix

| Risk | Severity | Verified status | Evidence | Launch action |
|---|---:|---|---|---|
| Missing table/view grants for anon/authenticated | Critical | Live anon verified | Live anon checks returned permission-denied for `partners`, `venues`, `quests`, `qr_codes`, `rewards`, `community_notes`, `community_notes_with_author`. RLS intends public reads in `supabase/migrations/0007_rls_idempotent.sql:101-224`. | Add reviewed idempotent grants migration; verify with anon and authenticated smoke tests. |
| Auth trigger function may not create `profiles` | Critical | Code verified, live-unverified | Newer trigger inserts `profiles` in `supabase/migrations/0006_game_schema.sql:486-492`; older same-name function in `supabase/migrations/0003_functions.sql:379-393` does not. | Inspect live function/triggers; make one canonical bootstrap function and migration order. |
| Signed-in user can bypass onboarding when `profile` is null | High | Code verified | `fetchProfile` sets null on error (`src/contexts/AuthContext.tsx:167-171`); guards redirect only when profile exists and is incomplete (`src/components/ProtectedRoute.tsx:21-25`). | Treat missing profile as repair/onboarding-needed or block with recovery UI. |
| Public profile visibility toggle writes wrong field | High | Code verified | Settings writes `is_public` (`src/pages/app/Settings.tsx:82-90`); view filters `is_profile_public` (`supabase/migrations/0006_game_schema.sql:459-460`). | Choose canonical field and update view/UI/migration. |
| Non-venue-code quest completion trusts client | High | Code verified | `complete_quest` returns verified true for non-`venue_code` methods (`supabase/migrations/0003_functions.sql:99-102`). | Decide MVP trust model; add GPS/QR/proof/staff validations or label as lightweight check-in. |
| Proof uploads target missing bucket | High | Code verified, live anon bucket list empty | `src/lib/media.ts:27-34` uses `proofs`; only avatars bucket is migrated (`supabase/migrations/0003_avatars_storage.sql:6-50`). | Add `proofs` bucket/policies and surface upload errors. |
| Anonymous scan endpoint can be abused | Medium | Code verified | `record_scan` is public by design (`supabase/migrations/0003_functions.sql:23-50`), and detail pages auto-record scans (`src/pages/QuestDetail.tsx:202-214`). | Add rate limits/monitoring later; keep MVP logging and anomaly checks. |
| Admin/partner portals unreachable | Medium | Code verified | Links exist, routes absent (`src/pages/app/Profile.tsx:134-146`, `src/App.tsx:57-123`). | Mount role-guarded routes or remove links for MVP. |
| Lint and audit failures | Medium | Command verified | `npm run lint` failed; `npm audit --omit=dev` found 10 prod vulnerabilities. | Fix lint errors and evaluate package upgrades before launch. |

## 7. Schema and Code Alignment

| Object | Migration/schema source | Code usage | Alignment |
|---|---|---|---|
| `profiles` | `supabase/migrations/0001_profiles.sql:6-28`; extended in `supabase/migrations/0006_game_schema.sql:388-398`; `is_public` added in `supabase/migrations/0008_profile_is_public.sql:1-5` | `src/contexts/AuthContext.tsx:160-288`, `src/pages/app/Settings.tsx:58-96`, `src/pages/PublicProfile.tsx:41-53` | Partial. Trigger order and visibility-field mismatch must be fixed. |
| `users` | `supabase/migrations/0006_game_schema.sql:118-127`; RLS `supabase/migrations/0007_rls_idempotent.sql:66-76` | `src/lib/db/supabase/SupabaseRepository.ts:70-91` | Schema matches repository; requires authenticated grants/RLS verification. |
| `user_profiles` | `supabase/migrations/0006_game_schema.sql:129-139`; RLS `supabase/migrations/0007_rls_idempotent.sql:78-89` | `src/lib/db/supabase/SupabaseRepository.ts:95-103`; level/points updated by `complete_quest` and `redeem_reward` | Aligned in code, but bootstrap trigger order can leave missing rows. |
| `privacy_preferences` | `supabase/migrations/0006_game_schema.sql:141-148`; RLS `supabase/migrations/0007_rls_idempotent.sql:91-99` | `src/pages/app/Settings.tsx:34-107`; `src/lib/db/supabase/SupabaseRepository.ts:107-129`; leaderboard RPC `supabase/migrations/0003_functions.sql:253-286` | Mostly aligned; needs grants and smoke tests for upsert. |
| `partners` | `supabase/migrations/0006_game_schema.sql:153-161`; RLS `supabase/migrations/0007_rls_idempotent.sql:101-111` | Repository list/get/upsert in `src/lib/db/supabase/SupabaseRepository.ts:151-167`; partner portal pages | Live anon blocked due missing grants. |
| `venues` | `supabase/migrations/0006_game_schema.sql:163-172`; RLS `supabase/migrations/0007_rls_idempotent.sql:113-124` | Repository list/get/upsert in `src/lib/db/supabase/SupabaseRepository.ts:168-178`; quest joins at `src/lib/db/supabase/SupabaseRepository.ts:181-197` | Live anon blocked due missing grants. Map production mapping still not wired. |
| `quests` | Base table in `supabase/migrations/0006_game_schema.sql:177-194`; RLS `supabase/migrations/0007_rls_idempotent.sql:127-137` | Types expect extra Fable fields (`src/types/db.ts:148-182`); detail UI uses them (`src/pages/QuestDetail.tsx:389-705`) | Mismatch. Add Fable fields migration or remove frontend assumptions. |
| `quest_links` or `quests.links` | Not present in current migrations | Type allows `QuestWithContext.links` (`src/types/db.ts:379-383`); detail UI uses `quest.links` (`src/pages/QuestDetail.tsx:456-504`) | Mismatch. Decide JSONB column vs separate table; no current checked-in schema. |
| `qr_codes` | `supabase/migrations/0006_game_schema.sql:196-205`; RLS `supabase/migrations/0007_rls_idempotent.sql:140-150` | QR resolve/list/create in `src/lib/db/supabase/SupabaseRepository.ts:202-222`; `src/lib/quests/scanFlow.ts:35-65` | Live anon blocked due missing grants. |
| `scan_events` | `supabase/migrations/0006_game_schema.sql:210-226`; RLS `supabase/migrations/0007_rls_idempotent.sql:152-159` | `record_scan` RPC, repository scan methods (`src/lib/db/supabase/SupabaseRepository.ts:225-255`) | Writes via RPC aligned. Direct `markScanConverted` updates table (`src/lib/db/supabase/SupabaseRepository.ts:242-248`) but RLS has no update policy; use RPC path instead. |
| `quest_attempts` | `supabase/migrations/0006_game_schema.sql:228-237`; RLS `supabase/migrations/0007_rls_idempotent.sql:160-166` | `start_quest` RPC and repository `startQuest` (`src/lib/db/supabase/SupabaseRepository.ts:257-261`) | Aligned if RPC execute grants exist. |
| `quest_completions` | `supabase/migrations/0006_game_schema.sql:239-251`; RLS `supabase/migrations/0007_rls_idempotent.sql:168-175` | Completion read/check and RPC (`src/lib/db/supabase/SupabaseRepository.ts:263-289`) | Aligned; verification trust model weak for non-`venue_code`. |
| `community_notes` | `supabase/migrations/0006_game_schema.sql:256-266`; RLS `supabase/migrations/0007_rls_idempotent.sql:177-187` | Notes view/RPC in repository (`src/lib/db/supabase/SupabaseRepository.ts:351-385`) | Live anon blocked for table/view grants. |
| `community_notes_with_author` | `supabase/migrations/0006_game_schema.sql:427-434` | Read by repository (`src/lib/db/supabase/SupabaseRepository.ts:351-377`) | Missing explicit grant in current migrations; live anon blocked. |
| `note_reports` | `supabase/migrations/0006_game_schema.sql:272-284`; RLS `supabase/migrations/0007_rls_idempotent.sql:251-266` | Type/search present; limited UI use found | Schema present. MVP can defer if moderation reporting is not launch-critical. |
| `points_ledger` | `supabase/migrations/0006_game_schema.sql:290-302`; RLS `supabase/migrations/0007_rls_idempotent.sql:189-195` | Award/redeem/adjust RPCs; wallet page exists but unmounted | Aligned, but wallet route missing. |
| `rewards` | `supabase/migrations/0006_game_schema.sql:304-314`; RLS `supabase/migrations/0007_rls_idempotent.sql:197-208` | Repository `listRewards`/`redeemReward` (`src/lib/db/supabase/SupabaseRepository.ts:321-339`); Rewards page exists unmounted | Live anon blocked for rewards discovery; route missing. |
| `reward_redemptions` | `supabase/migrations/0006_game_schema.sql:316-325`; RLS `supabase/migrations/0007_rls_idempotent.sql:210-216` | Repository redemptions (`src/lib/db/supabase/SupabaseRepository.ts:341-348`) | Aligned for authenticated users/partners if grants exist. |
| `leaderboard_snapshots` | `supabase/migrations/0006_game_schema.sql:337-346`; RLS `supabase/migrations/0007_rls_idempotent.sql:218-224` | Leaderboard page exists unmounted; repository uses `get_leaderboard` RPC, not snapshots (`src/lib/db/supabase/SupabaseRepository.ts:387-405`) | RPC live anon returned 200 empty; page route missing. |
| `analytics_rollups` | `supabase/migrations/0006_game_schema.sql:348-360`; RLS `supabase/migrations/0007_rls_idempotent.sql:226-232` | Partner/admin analytics RPCs (`src/lib/db/supabase/SupabaseRepository.ts:408-420`) | Partner/admin routes missing; live authenticated role checks unverified. |
| `consent_events` | `supabase/migrations/0006_game_schema.sql:366-373`; RLS `supabase/migrations/0007_rls_idempotent.sql:234-241` | Repository `recordConsent` (`src/lib/db/supabase/SupabaseRepository.ts:131-149`) | Aligned if grants exist; UI coverage should be tested. |
| `audit_logs` | `supabase/migrations/0006_game_schema.sql:375-383`; RLS `supabase/migrations/0007_rls_idempotent.sql:243-249` | Repository audit methods (`src/lib/db/supabase/SupabaseRepository.ts:422-451`) | Read admin-only, insert direct from client appears likely blocked except RPC writes; admin route missing. |
| Storage `avatars` | `supabase/migrations/0003_avatars_storage.sql:6-50` | Avatar uploader through `src/lib/profile.ts:214-227` | Aligned, but live bucket existence/policies need authenticated smoke test. |
| Storage `proofs` | Not present | Proof uploader `src/lib/media.ts:13-34`; proof camera `src/components/app/QuestProofCamera.tsx:499-509` | Missing migration/policies. |

## 8. API Route Audit

There are no app-owned API routes in this repository snapshot.

Verified by filesystem search:

- No `api/`
- No `pages/api/`
- No `app/api/`
- No `route.ts`/`route.js`
- Only Vercel config: `vercel.json:1-6`

Backend behavior is all client-to-Supabase:

- Static SPA routes handled by React Router and Vercel rewrite.
- Auth uses browser Supabase client (`src/lib/supabase.ts:17-30`).
- Gameplay repository uses lazy Supabase client (`src/lib/supabase/client.ts:17-46`, `src/lib/db/index.ts:17-42`).
- Integrity-sensitive writes happen through Postgres RPCs (`supabase/migrations/0003_functions.sql:23-393`).

Implications:

- No server middleware currently exists for rate limiting, secret use, signed uploads, or privileged admin operations.
- Do not add service-role keys to the browser. If service-role operations are needed, add an explicit server surface later, not a `VITE_*` env var.

## 9. Map and Location Audit

Mapbox is the right provider to keep for this MVP. The implementation already handles common launch concerns:

- Token comes from `VITE_MAPBOX_PUBLIC_TOKEN` (`src/lib/mapbox.ts:7`).
- Missing token and domain restriction errors have user-facing fallbacks (`src/lib/mapbox.ts:9-16`, `src/components/map/QuestMap.tsx:228-270`).
- Mapbox chunk is lazy-loaded on the map tab (`src/pages/app/MapView.tsx:1-6`).
- Geolocation is requested only on explicit button click (`src/components/map/UserLocationButton.tsx:12-50`).
- The code states coordinates are used locally for display and not sent to the server (`src/lib/mapbox.ts:49-52`, `src/components/map/UserLocationButton.tsx:12-15`).

Launch gaps:

- `.env.example` omits `VITE_MAPBOX_PUBLIC_TOKEN` (`.env.example:1-11`), while README requires it (`README.md:45-58`) and map code requires it (`src/lib/mapbox.ts:7-16`).
- `src/vite-env.d.ts:3-13` does not type `VITE_MAPBOX_PUBLIC_TOKEN`.
- Mounted `/app/map` uses `DEMO_QUESTS`, whose shape has top-level `lat`/`lng` (`src/pages/app/MapView.tsx:1-25`, `src/lib/quests.ts:8-32`). Supabase quest rows place coordinates on joined `venue.latitude`/`venue.longitude` (`supabase/migrations/0006_game_schema.sql:163-172`, `src/lib/db/supabase/SupabaseRepository.ts:181-197`). Production map needs a mapping layer from `QuestWithContext` to map pins.
- Mapbox token domain allowlist must include `https://miamisidequests.io/*`, production/preview Vercel domains, and local dev if needed. The UI even displays those hints (`src/components/map/QuestMap.tsx:245-266`).

Recommendation:

- Keep Mapbox.
- Add env typing and placeholder.
- Verify production token allowlist.
- Defer provider changes. The highest-value fix is live-data mapping, not a map rewrite.

## 10. Production Blockers

1. Supabase grants are missing in live production.
   - Public app reads fail for the exact tables needed by quest discovery and QR flows.
   - Fix before any production smoke test can be meaningful.

2. Auth/profile bootstrap needs canonicalization.
   - The same `handle_new_auth_user` function name is defined by multiple migrations with different behavior (`supabase/migrations/0006_game_schema.sql:472-500`, `supabase/migrations/0003_functions.sql:379-393`).
   - Missing `profiles` rows create silent auth/onboarding failures.

3. Fable quest fields are used in frontend but absent from checked-in DB schema.
   - Types/UI expect fields in `src/types/db.ts:148-182` and `src/pages/QuestDetail.tsx:389-705`.
   - Current `public.quests` migration lacks those columns (`supabase/migrations/0006_game_schema.sql:177-194`).

4. Quest proof bucket is absent.
   - `proofs` bucket used by code, no migration in repo.

5. Public profile visibility is inconsistent.
   - UI writes `is_public`; view filters `is_profile_public`.

6. User-reachable routes are missing.
   - `/partner`, `/admin`, `/app/wallet`, `/app/rewards`, `/app/leaderboard`, `/app/history`, and app home links need a clear launch decision.

7. App shell is duplicated on some mounted pages.
   - Two app layouts cause duplicated bottom nav/shelling on pages that wrap themselves inside the route shell.

8. Auth redirect after QR/sign-in is broken.
   - Completion flow writes `?next=...`; auth ignores it.

9. Lint/audit is not launch-clean.
   - Typecheck/build pass, but lint and production dependency audit still fail.

10. Env examples/docs are inconsistent.
   - `.env.example` contains real public Supabase values and omits Mapbox; README asks for Mapbox.

## 11. Priority Fixes

### P0 - Launch blockers

1. Back up the live Supabase database before any schema/grant changes.
2. Run a read-only live verification script in Supabase SQL editor:
   - Current grants for `anon` and `authenticated`
   - Current RLS enabled status
   - Current function body for `public.handle_new_auth_user`
   - Triggers on `auth.users`
   - Existing storage buckets and policies
   - Quest table columns
3. Add one idempotent grant migration:
   - Schema usage for `anon`, `authenticated`
   - Select grants on public read surfaces
   - Authenticated table privileges where RLS allows self/partner actions
   - Execute grants on intended RPCs
4. Canonicalize auth bootstrap:
   - One `handle_new_auth_user` function that provisions `users`, `user_profiles`, `privacy_preferences`, and `profiles`
   - One trigger or clearly named triggers that cannot overwrite each other accidentally
5. Align public profile visibility:
   - Choose either `is_public` or `is_profile_public`
   - Update view, UI, types, defaults, and migrations
6. Add `proofs` storage migration and policies:
   - Authenticated users can write under their own folder
   - Public read only if proof images are intended public
   - Size/MIME limits
7. Add Fable quest fields to schema or remove frontend dependency:
   - `funky_action`
   - `action_type`
   - `action_prompt`
   - `proof_method`
   - `social_share_prompt`
   - `staff_phrase`
   - `estimated_time`
   - `links` JSONB or a separate `quest_links` table
8. Fix auth `next` redirect and missing-profile route guard.
9. Mount or hide admin/partner/app routes for MVP.
10. Confirm Vercel production env values and redeploy.

### P1 - MVP hardening

1. Add Supabase smoke tests or scripts for anon/authenticated paths:
   - Public quest list
   - QR resolution
   - Signup creates profile rows
   - Onboarding updates `profiles`
   - Complete quest
   - Post community note
   - Upload avatar/proof
   - Reward redemption
2. Add real verification rules where MVP requires them:
   - QR completion should require a valid scan or code context.
   - GPS completion should compare current location to venue radius if users consent.
   - Staff phrase should not be displayed and accepted without server-side validation if it is meant to gate rewards.
3. Normalize app data surfaces:
   - Either wire Explore/Map/public quests to Supabase or label them as demo/curated.
   - Keep `VITE_DATA_SOURCE=mock` as an explicit demo mode.
4. Fix duplicated app layout.
5. Surface proof upload failures instead of silently posting image-less notes.
6. Add role-guarded admin/partner routes if included in MVP.

### P2 - Clean launch polish

1. Fix lint errors and warnings.
2. Address production dependency audit, especially React Router advisories.
3. Add `npm run test` or at least smoke/unit scripts for repository and route guards.
4. Reduce large bundle chunks:
   - Build warning showed main JS around 1.1 MB minified / 315 KB gzip.
   - Mapbox chunk around 1.8 MB minified / 501 KB gzip.
   - Supabase dynamic import does not split because `src/lib/supabase.ts` imports Supabase statically.
5. Consider restoring stricter TypeScript after MVP hardening; current config disables strict/noImplicitAny/unused checks (`tsconfig.app.json:18-22`).

## 12. MVP Launch Checklist

### Supabase

- [ ] Take database backup.
- [ ] Verify project ref is `wvedvngtuzsttpavmgjw`.
- [ ] Verify final `public.handle_new_auth_user` body creates all required profile rows.
- [ ] Verify `auth.users` triggers are not duplicated or overwritten in a surprising order.
- [ ] Verify `public.profiles` has the canonical visibility field and the public view uses the same field.
- [ ] Verify Fable quest columns or `quest_links` schema exist.
- [ ] Verify grants for `anon` and `authenticated` on public read surfaces.
- [ ] Verify execute grants for RPCs.
- [ ] Verify storage buckets: `avatars`, `proofs`.
- [ ] Verify storage policies with an authenticated test user.
- [ ] Seed or import production-ready partners, venues, quests, QR codes, and rewards.

### Vercel and Env

- [ ] Set `VITE_SUPABASE_URL` in production and preview.
- [ ] Set `VITE_SUPABASE_ANON_KEY` in production and preview.
- [ ] Set `VITE_MAPBOX_PUBLIC_TOKEN` in production and preview.
- [ ] Ensure `VITE_DATA_SOURCE` is unset in production unless intentionally serving mock data.
- [ ] Confirm no service-role key exists in Vercel frontend env.
- [ ] Confirm Mapbox token allowed URLs include production and preview domains.
- [ ] Redeploy production from the fixed commit.

### App Smoke Tests

- [ ] Visit `/` and public marketing routes.
- [ ] Visit `/quests` and confirm expected production data mode.
- [ ] Visit `/app/explore` and `/app/map`; confirm no demo/live mismatch.
- [ ] Visit a real `/q/:questId` direct link.
- [ ] Visit a real `/scan/:code` link.
- [ ] Sign up a new account.
- [ ] Confirm `profiles`, `users`, `user_profiles`, and `privacy_preferences` rows are created.
- [ ] Complete onboarding.
- [ ] Update display name, username, avatar, and visibility.
- [ ] Visit `/u/:username` after public toggle.
- [ ] Complete a quest.
- [ ] Confirm XP, points ledger, quest completion, and scan conversion.
- [ ] Upload and post proof/community note.
- [ ] Redeem a reward.
- [ ] Check leaderboard.
- [ ] Check wallet/rewards routes if included.
- [ ] Check partner/admin routes if included.
- [ ] Monitor browser console, Supabase logs, and Vercel deployment status during smoke test.

### CI and Release

- [ ] `npm ci`
- [ ] `npx tsc -p tsconfig.app.json --noEmit`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev`
- [ ] Update `.env.example` to placeholders.
- [ ] Update README migration/env steps to match actual production path.
- [ ] Tag a release or record deployment commit.

## 13. Fable 5 Planning Brief

Fable 5 should be planned as a production alignment pass: make the app's live backend contract match the user experience that already exists in the frontend.

### Planning Objective

Launch SideQuests with a trustworthy live Supabase data model, working auth/profile lifecycle, public quest discovery, QR completion loop, Mapbox map, and one clear MVP route set.

### Decisions Needed

1. Canonical profile model:
   - Keep `public.profiles` for auth/onboarding/public profile.
   - Keep `users`/`user_profiles` for game stats.
   - Define exactly which table owns XP/level/profile visibility/public display.

2. Public profile visibility:
   - Choose `is_public` or `is_profile_public`.
   - Update the view and UI to one field.

3. Fable quest data model:
   - Store Fable fields directly on `quests`, or create separate detail/link tables.
   - Decide how `links` should be represented: JSONB vs normalized table.
   - Decide whether `proof_method` should be constrained by enum/check values.

4. Verification trust model:
   - MVP can be lightweight, but the team should explicitly decide what "complete quest" means.
   - If rewards have real value, QR/GPS/staff validations need stronger server-side checks.

5. Route scope:
   - Decide whether admin and partner portals are in MVP.
   - Decide whether wallet/rewards/leaderboard/history are in MVP.
   - Mount the selected routes and remove/hide links to the rest.

6. Data source policy:
   - Use Supabase as production source of truth.
   - Keep mock/demo mode only behind explicit env or demo UI.
   - Avoid silent fallback to demo data in production if live queries fail.

7. Launch data:
   - Define minimum viable partners/venues/quests/QR/rewards.
   - Assign real verification secrets or QR codes.
   - Confirm map coordinates for every venue.

### Suggested Fable 5 Session Agenda

1. Review P0 blockers and assign owners.
2. Confirm Supabase migration/grant strategy and backup plan.
3. Decide canonical profile/visibility model.
4. Decide Fable quest schema and import/seed plan.
5. Decide MVP route set.
6. Decide verification trust model for launch.
7. Define production smoke test acceptance criteria.
8. Create implementation threads from the prompts below.

### Recommended MVP Definition

Minimum production launch should include:

- Public marketing routes.
- Public quest discovery from Supabase or an explicitly curated static mode.
- QR/deep-link quest detail.
- Sign up, sign in, onboarding, profile settings.
- Public profile if visibility works.
- Quest completion with a documented trust model.
- XP/points ledger and visible completion feedback.
- Community note posting after completion.
- Map tab with production quest coordinates.
- Basic rewards only if redemption flow is verified.

Defer unless specifically needed:

- Full partner portal.
- Full admin portal.
- Advanced analytics dashboards.
- Complex moderation workflows.
- Strict GPS enforcement.
- Social sharing automation beyond copy/share links.

## 14. Follow-Up Prompts

Use these as focused Codex follow-up threads.

1. Supabase read-only verification:

```text
Create a read-only Supabase verification SQL script for SideQuests that checks table/view grants, RLS status, auth.users triggers, handle_new_auth_user function body, quest columns, public profile visibility fields, RPC execute grants, and storage buckets/policies. Do not mutate anything. Use the current repo migrations as the expected baseline and explain every mismatch.
```

2. Grants migration:

```text
Add an idempotent Supabase migration that grants only the required privileges for anon/authenticated roles across SideQuests public discovery, authenticated self-service, partner-owned data, and RPC execution. Do not run it. Include a verification checklist and explain why each grant is needed.
```

3. Auth/profile bootstrap:

```text
Fix the SideQuests auth bootstrap migrations so new Supabase auth users always get rows in public.profiles, public.users, public.user_profiles, and public.privacy_preferences. Remove the migration-order trap around handle_new_auth_user without destructive operations. Include SQL verification queries.
```

4. Public profile visibility:

```text
Align SideQuests public profile visibility around one canonical field. Update migrations, AuthContext types if needed, Settings toggle, public_profiles view, and public profile smoke-test steps. Do not expose phone numbers or private social links.
```

5. Proof storage:

```text
Add a Supabase storage migration for the proofs bucket used by src/lib/media.ts. Scope authenticated uploads to the user's own folder, choose public/signed read intentionally, set size/MIME limits, and update the proof camera to surface upload failures instead of silently dropping images.
```

6. Fable quest schema:

```text
Add the missing Fable quest fields to the Supabase schema or create a quest_links model, matching src/types/db.ts and src/pages/QuestDetail.tsx. Keep the migration idempotent, avoid destructive changes, and update seed/import code so live quests include funky_action, proof_method, social_share_prompt, staff_phrase, estimated_time, and business links.
```

7. App routing and layout:

```text
Audit and fix SideQuests React Router routes so every in-app link resolves. Mount or hide /partner, /admin, /app/wallet, /app/rewards, /app/leaderboard, /app/history, and AppHome based on MVP scope. Remove the duplicate AppLayout/bottom-nav nesting while preserving the mobile shell.
```

8. Auth redirect and profile-null guard:

```text
Fix SideQuests auth redirect handling so /auth?next=... and ProtectedRoute state both work after sign-in. Treat a signed-in user with profile=null as a recoverable onboarding/profile-bootstrap state instead of allowing protected app access silently.
```

9. Lint and dependency audit:

```text
Make SideQuests launch-clean for npm run lint and npm audit --omit=dev. Keep changes scoped. Fix no-explicit-any/no-unused-expressions/require-import issues first, then evaluate React Router and transitive dependency upgrades safely.
```

10. Production smoke test:

```text
After the Supabase and routing fixes are deployed, run a production smoke test for miamisidequests.io covering public discovery, QR scan, sign-up, onboarding, profile visibility, map rendering, quest completion, proof upload, community note, rewards, wallet, leaderboard, and partner/admin routes if mounted. Separate verified results from live-unverified items.
```

## Commands Run

Local commands:

- `git clone https://github.com/andrewheldy/sidequestsio.git`
- `git rev-parse HEAD`
- `npm ci`
- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run build`
- `npm run lint`
- `npm audit --omit=dev --json`
- `rg`/`find`/`nl` searches across source, migrations, env, routes, API paths, storage, and Mapbox usage

Live checks:

- Supabase anon REST/RPC/storage non-mutating checks against `wvedvngtuzsttpavmgjw`
- Vercel project/deployment/log inspection through the Vercel connector

Live-unverified:

- Vercel environment variables
- Supabase service-role SQL introspection
- Authenticated user flows
- Production browser smoke test
