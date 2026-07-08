# Changelog

All notable changes to the SideQuests.io project are recorded here. This log tracks operational/infrastructure changes (environment, deployment, verification) alongside code changes; it is not a substitute for `git log`.

## 2026-07-07 — Image fallbacks + asset-candidate sourcing sheet (no DB writes)

- Frontend: quest images can no longer render as broken `<img>` elements — matters because all 62
  Miami quests import image-less until assets are approved. New shared
  `src/components/QuestImage.tsx` (category-emoji gradient fallback, mirroring the QuestHero
  treatment, plus `onError` swap for dead URLs) now backs `AppQuestCard` (Explore/Favorites) and
  the marketing `QuestCard` (`/quests`); `BusinessAvatar` falls back to initials when a
  `venues.logo_url` fails to load, not only when it is absent (stale "no logo_url column yet"
  comment refreshed — 0014 is live).
- New `npm run assets:candidates` (`scripts/generate-asset-candidates.ts`): joins
  `quest_assets.csv` with `miami-crm.csv` and writes `data/generated/miami/asset_candidates.csv` —
  one row per permission-safe sourcing lead (official_website ×124, official_instagram ×122,
  royalty_free hero fallback ×62 = 308 rows covering all 124 missing assets). Offline and
  deterministic: fetches nothing, downloads nothing, writes nowhere else;
  `candidate_image_url`/`approved` are human-only columns. Approval workflow documented in
  `docs/CRM_IMPORT_RUNBOOK.md` §10 (candidate → manual review → approved → user-run Storage
  upload → CSV update → re-import).
- Runbook §5 prerequisite note synced with reality (0014 verified applied live 2026-07-07,
  evening gate audit). No Supabase writes; `miami-crm.csv` untouched.

## 2026-07-07 — Miami launch dataset generated from verified venue workbook (import NOT yet run)

- Added the verified Miami venue workbook at `data/imports/miami/SideQuests_Venue_Database.xlsx`
  (immutable canonical source; sha256 `7848b68b…59520`) and generated the full import-ready
  dataset into `data/generated/miami/`: `miami-crm.csv` (the `npm run import:crm` input, 64 rows),
  plus review artifacts `partners.csv`/`venues.csv`/`quests.csv` (62 each, deterministic UUIDs
  matching the importer), `quest_assets.csv` (124 missing hero/logo assets with sourcing leads),
  and `validation_report.md` (full accounting, data-quality findings, gate checklist).
- Quest content: 62 hand-written quests grounded only in workbook-verified facts per
  `QUEST_DESIGN_GUIDE.md` — tiers exactly easy 50/25 (30) and medium 150/75 (32), all 8 categories
  used, no purchases/staff-interaction required. 2 rows held back as `manual_review`
  (Miami Supercar Rooms: members-only; Beachwalk: no address/coords by the workbook's own rule).
  35 missing coordinates resolved via Nominatim geocoding (28 high / 5 medium confidence,
  provenance in `venues.csv`); nothing was fabricated for the workbook's empty columns.
- Dry run verified: 64 parsed, 62 eligible, 2 skipped, **0 errors**; all 122 warnings are the two
  expected missing-hero/missing-hours classes. **No database writes** — production import stays
  gated behind `0014_venue_business_profile.sql` + explicit approval per the validation report.

## 2026-07-07 — Demo data removed from production surfaces (Explore/Favorites//quests → Supabase)

- `src/pages/app/Explore.tsx`, `src/pages/app/Favorites.tsx` and the public `src/pages/Quests.tsx` now read live repository data via a new shared hook `src/hooks/useActiveQuests.ts` (one cached `['active-quests']` query → `listQuests({status:'active'})` → `questsWithContextToFlatQuests`), replacing the hardcoded `DEMO_QUESTS`/`MIAMI_QUESTS` catalogues. Loading/error/empty states added using the existing `Loading`/`EmptyState` components; search, category chips, and card visuals unchanged.
- Deleted the orphaned demo modules: `src/data/demo/demoQuests.ts`, `src/data/miami/{toQuest.ts,index.ts,funkyActions.json}`, and the dead static `QUESTS` catalogue + `getQuestById` in `src/lib/quests.ts` (the flat `Quest` type and `QUEST_CATEGORIES` remain — they're the render contract). The `src/data/miami/miamiQuestLocations*.json` files stay (used by the `geocode:miami` scripts); `src/data/mock/` stays (dev-only `MockRepository`, `isDemoMode = import.meta.env.DEV` by design). Flat `Quest` gained optional `description` (mapped from `quests.description`) so the public quest cards keep their concept line.
- Verified: typecheck, lint (touched files), production build all clean; drove the built app against live Supabase — `/quests` renders all 9 live quests (cards + map pins) and `/app/explore` renders live data; `/app/favorites` correctly guards to `/auth`; zero console errors. Remaining placeholder surfaces: `CheckIn.tsx` (deliberate placeholder UX) and the dev-only mock repository.

## 2026-07-07 — CRM launch-content import pipeline (Miami workbook → production)

- Added `scripts/import-crm.ts` (`npm run import:crm -- <csv>`): reusable importer that turns a verified flat CRM workbook into partners → venues → quests → qr_codes in dependency order. Single column→field mapping object; eligibility filtering on `import_decision`/`business_status`/`verification_status` (research/QA columns are never persisted — fail-safe refusal when no positive signal); URL/coordinate/enum/integer/required/cross-row validation; deterministic UUIDv5 identity from slugs (idempotent upserts, no duplicates, status is insert-only so manual pauses survive re-imports). Dry-run by default; `--emit-sql` writes import + `.verify.sql` + `.rollback.sql` (archive-based, non-destructive) for the SQL-editor workflow; `--apply` uses the service-role key via PostgREST. Template: `scripts/templates/miami-crm.template.csv`; runbook incl. schema-discrepancy log: `docs/CRM_IMPORT_RUNBOOK.md`. No schema or app-code changes.
- Verified live (read-only MCP, 2026-07-07): anon `SELECT` grants are now live on `quests`/`venues`/`partners`/`qr_codes` — the `0009_grants.sql` blocker is resolved. `0014_venue_business_profile.sql` is verified **not yet applied** on live (`venues` still has only its 8 base columns) — it must be run before any CRM import; the emitted import SQL guards for it and aborts if missing.

## 2026-07-07 — Legal, compliance & consent foundation (migration authored, not yet applied)

- Added `docs/legal/` — initial legal drafts (AI-assisted, verified against the live product; flagged for attorney review before relying on them at scale) for Privacy Policy, Terms of Service, Community Guidelines, Cookie Policy, Delete Account, and Partner Terms & Conditions, plus `Legal-Version-History.md` (public changelog) and `README.md` (engineering reference for versioning/rendering/consent-mapping — see that file for the full system explanation).
- Added markdown-rendering infra: `react-markdown` + `remark-gfm` (new dependencies), `src/components/legal/LegalDocPage.tsx`, `src/lib/slugify.ts`; registered the previously-unused `@tailwindcss/typography` plugin, themed to the app's own CSS-variable palette (`tailwind.config.ts`) instead of default grays. `/privacy` and `/terms` now render live from `docs/legal/*.md` (rewritten in place, same URLs); new routes `/community-guidelines`, `/cookies`, `/delete-account`, `/partner-terms`.
- Added a client-side cookie consent system (`src/lib/cookieConsent.ts`, `src/contexts/CookieConsentContext.tsx`, `src/components/CookieConsentBanner.tsx`, `/cookie-preferences`): localStorage-only, Necessary/Analytics/Marketing/Preferences categories, first-visit banner. `hasAnalyticsConsent()`/`hasMarketingConsent()` are the API future tools should check before initializing — no analytics/marketing tool is integrated today.
- Added signup consent capture: `Auth.tsx` now requires a "Terms of Service + Privacy Policy" checkbox (blocks submit) and an optional marketing-emails checkbox. `AuthContext.signUp()` passes `terms_version`/`privacy_version`/`marketing_opt_in` through `auth.users.raw_user_meta_data`; `supabase/migrations/0015_legal_consent.sql` (**authored, not applied** — run manually after a backup) adds `profiles.accepted_terms_at/accepted_privacy_at/terms_version/privacy_version/marketing_opt_in/marketing_opt_in_at` and extends `handle_new_auth_user()` to populate them and seed `privacy_preferences.marketing_consent` from the same choice. No backfill for existing accounts (no fabricated consent history); the existing `consent_events`/`privacy_preferences` system (Settings toggles) is untouched.
- Footer (`src/components/layout/Footer.tsx`) gained links to the four new documents, in all 8 locales (`src/i18n/*.ts`) — document bodies remain English-only, matching the pre-existing Privacy/Terms pages.

## 2026-07-06 — Sprint 0 applied & verified; Sprint 1 auth lifecycle + app shell fixes

### Sprint 0 verification (migrations 0009–0013 now live)

- Migrations applied to production by the founder (SQL editor, after backup). Post-apply verification: `scripts/verify-db.sql` **16/17 passing** (only the quest-content check remains, by design until content authoring); `npm run smoke:supabase` **8/8** — anon reads of quests/venues/QR/rewards/notes all work, ledger correctly still blocked. Backfill confirmed: `auth.users` = `users` = `profiles` = `user_profiles` = `privacy_preferences`.
- Live throwaway-signup test: the canonical trigger created all four rows (`users`, `user_profiles`, `privacy_preferences`, `profiles`) with `display_name` propagated from metadata, `is_public=false`, `onboarding_completed=false`. Incidental finding: **email confirmation is enabled** in Supabase Auth (a confirmation email was sent). Test account `vipheldy+sqverify…@gmail.com` left in place; delete via dashboard when convenient.

### Sprint 1 — AUTH-1..3 + SHELL-1..2

- **AUTH-1:** `/auth?next=…` now works. `Auth.tsx` prefers a validated `next` query param (same-origin relative paths only — `safeNextPath` in new `src/lib/navigation.ts` rejects `//`, schemes, backslashes), falling back to `state.from`, then `/app`. The destination is carried through onboarding via route state, so QR → sign-in → onboarding → back-to-quest survives end-to-end (`Onboarding.tsx` finishes to the carried destination).
- **AUTH-2:** signed-in users with a missing `profiles` row no longer bypass guards. `AuthContext.fetchProfile` distinguishes no-row from error and self-heals by inserting the row (race-safe upsert with `ignoreDuplicates`, mirroring the DB trigger's values); `ProtectedRoute` and the `/app` route shell route missing-profile users to `/onboarding`. A new `profileLoading` context flag prevents the guard from misfiring in the moment between sign-in and profile fetch.
- **AUTH-3:** `completeOnboarding` uses upsert instead of update, so finishing onboarding creates/repairs the profile row rather than silently updating zero rows.
- **SHELL-1:** removed dead `/partner` and `/admin` shortcuts from Profile (routes unmounted per PD-1; restored with T-SHELL-3); CheckIn placeholder now shows the real live code format (`WYND-COF1`).
- **SHELL-2:** removed the nested `components/app/AppLayout` wrapper from all five mounted pages that double-rendered the shell (`Profile`, `Settings`, `CheckIn`, `QuestBrowser`, `AppCommunityNotes`) — each now renders `AppHeader` + content inside the route shell, so every app page has exactly one column and one bottom nav. The wrapper is marked `@deprecated` for the remaining unmounted pages.
- Validation: typecheck clean, production build clean (pre-existing chunk warnings only), zero new lint issues in touched files, grep gates confirm no dead links or wrapper imports remain in mounted pages. Not yet done (per plan): QuestDetail's `/app/wallet` link (T-QX-1, DATA stream), Explore/Map live data (DATA stream).

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
