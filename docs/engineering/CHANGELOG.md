# Changelog

All notable changes to the SideQuests.io project are recorded here. This log tracks operational/infrastructure changes (environment, deployment, verification) alongside code changes; it is not a substitute for `git log`.

## 2026-10-29 — Mobile: SDK 58 patch versions realigned (Expo Doctor)

- Expo Doctor on a fresh `npm ci` of `main` failed 19/20: new SDK 58 patch releases were
  published after the 2026-10-25 alignment, so 13 packages (`expo`, `expo-router`,
  `react-native` 0.88.1, `jest-expo`, and other `expo-*` modules) were behind the bundled
  compatibility map. CI on `main` was green before those releases.
- Fix: `npx expo install --fix --npm` in `apps/mobile` (patch bumps only; no new packages, no
  app code change).
- Verified on Node 24 from a clean `npm ci`: typecheck, 28 suites / 266 tests, Expo Doctor
  20/20, iOS + Android export. Not checked on an iOS simulator.

## 2026-10-27 — Raw analytics events restricted to admins

- **Privacy fix:** `0020_analytics_events.sql` let partner owners read their partner's raw
  `analytics_events` rows through PostgREST, including `user_id`, `anonymous_id`, `session_id`,
  `page_path` and `properties`. That contradicts Privacy Policy §7 and Partner Terms §7
  (aggregate-only partner analytics).
- Added `supabase/migrations/0031_analytics_events_admin_read.sql`: the read policy is now
  `using (public.is_admin())`; grants are unchanged (select to authenticated, no writes).
  Idempotent, reverse SQL in the header.
- Partner Insights keeps working: it reads through `partner_insights()` (0021, `SECURITY
  DEFINER`, aggregate-only). No app code reads the table directly.
- **Applied** by the owner in the SQL editor after a backup; the owner reports the verification
  block in 0031 passed.

## 2026-10-26 — Readiness brief leftovers removed

- The `/readiness` page was removed in `53be631`, but its standalone Netlify build remained and
  no longer built. Removed `standalone/readiness/`, `vite.readiness.config.ts`, the
  `build:readiness` script, `scripts/{package,verify,axe}-readiness.*`, the readiness exports
  in `output/` (Netlify zip, PDF, PPTX, verification screenshots), `docs/design/readiness/`
  and the readiness section of `docs/DESIGN_INTELLIGENCE.md`. All remain in git history.
  `framer-motion` stays: `src/components/iiipoints/` still uses it.

## 2026-10-25 — Approved logo refresh across the website

- Replaced the angular doorway and previous lettering with the approved ivory/gold emblem,
  flowing path, and playful custom wordmark. Updated the shared `Logo`/`LogoMark` sources,
  export lockups, partner QR sign, and social/campaign templates; light surfaces use a navy
  icon tile for contrast. Adjusted shared logo dimensions for tightly cropped lettering.
- Photo overlays now draw the actual approved SVG lettering using a shared loader instead
  of typesetting `sidequests` in Manrope; quest titles reserve space for the rendered mark.
- Regenerated SVG/ICO/PNG favicons, Apple touch icon, regular/maskable install icons,
  Safari pinned-tab silhouette, Open Graph preview, and brand-kit raster exports.
  Versioned icon, manifest, and share-image references refresh cached artwork.
- Added `npm run assets:brand`. Exporting uses loopback HTTP and bundled licensed fonts,
  and checks image/font loading before capture, so unavailable remote fonts or blocked
  file navigation cannot silently produce invalid artwork. No npm dependencies added.
- Brand guide records owner approval and the new production sources. Website source update;
  no production deployment performed.
- Verified: typecheck, touched-file lint, 14 tests, production build, and asset regeneration.
  Chromium checks covered six routes at 1440/390/320 px with no broken logo images,
  horizontal overflow, or page errors; all ten icon/share-image requests returned 200,
  and the photo-overlay wordmark rendered to an exportable canvas.
## 2026-10-26 — Check-in spots for the 17 Miami Essentials area quests

- **Content:** each area quest (park, street, causeway, beach) now names its
  check-in spot — the venue anchor its 150 m GPS presence radius is measured
  from — at the start of its instructions (`action_prompt`), plus a short public
  `location_label`. Oleta River's anchor moves from the park centroid to the
  kayak ramp (OSM node 2728007023), 819 m away. The "check-in point" blockers
  are cleared.
- **Importer:** maps the CSV column `location_label` → `quests.location_label`
  (migration 0023), with the 0023 preflight guard covering it.
- **Production:** `data/generated/miami-essentials/sql/area-check-in-spots.sql`
  (guarded: exactly 17 quests under the Miami Essentials partner) updates the
  copy and labels, moves the Oleta venue, and publishes the 17 quests. It must be
  run by the owner; tested locally on a full migration replay and is idempotent.
## 2026-10-26 — Quest map markers: no drift, no jumps, no hidden pins

- Markers lagged and drifted while the map moved, and a tapped pin jumped to the
  map's corner: Mapbox positions a marker with `transform: translate(...)` on its
  root element, and that element also had `transition: transform` and a press
  `scale(...)` that replaced the translate. The press effect now lives on an
  inner element. Measured on a 120 px drag: production pins moved 106–131 px and
  settled late; the fix moves all of them exactly 120 px.
- 11 of 17 pins were covered by other pins at the default zoom and could not be
  tapped. Pins closer than one pin width on screen now merge into a count
  bubble (`src/lib/clusterPins.ts`, tested); tapping it zooms in until they
  separate (at street level it opens the first quest).



## 2026-10-25 — Quest map renders; Quests tab in the bottom nav

- **Map fix:** `QuestMap`'s container was `absolute inset-0`, but `mapbox-gl.css`
  (`.mapboxgl-map { position: relative }`) overrode `absolute`, collapsing it to
  0 px tall — tiles and all markers loaded but were clipped, so the map looked
  blank. The container now also has `h-full w-full`. Verified on production by
  applying the same classes: map 649 px tall, all 17 active-quest markers in
  view.
- **Bottom nav:** four tabs — Rewards, Quests, Map, You (supersedes the
  2026-09-28 three-tab decision). Quests opens `/app/quests`; the quest list
  and quest pages highlight Quests. New analytics event `nav_quests_clicked`.

## 2026-10-25 — Legal: location data and controls documented (Privacy 1.1.0); consent recording fixed

- `docs/legal/`: Privacy Policy 1.1.0 adds § Location Data (each feature, what is kept, on-device
  data, controls); Terms, Partner Terms and Delete Account → 1.1.0; `Legal-Version-History.md`
  rows added. `CURRENT_TERMS_VERSION` / `CURRENT_PRIVACY_VERSION` bumped to `1.1.0` on web
  (`src/lib/legal.ts`) and mobile (`apps/mobile/src/lib/legal.ts`). Existing users are not
  re-prompted (README step 5); Adventure has its own just-in-time consent.
- Web: the "Location for verification" toggle now gates GPS check-in (it was stored but never
  read). When it is off, quest completion asks in context and turning it on records consent.
- Web: Settings privacy toggles now append `consent_events` like the Profile toggles already did
  (shared `src/lib/app/consent.ts`); before, Settings changes left no consent record.
- Mobile: Adventure disclosure wording and version (`adventure-2026-10-25`) aligned with the
  policy; the Permissions card mentions GPS check-in and nearby alerts.
- The policy's 30-day retention relies on the `purge-presence-records` / `purge-nudge-records`
  `pg_cron` jobs already live on production (entry below).
- `LOCATION_DISCOVERY.md` §7 and §9 updated (gate 4 done).
- Verified: web typecheck, `npm test`, lint on touched files, build; `/privacy` and `/terms`
  rendered in Chromium at 390 px (anchor, tables, no horizontal scroll); mobile typecheck and full
  Jest suite (266 tests). Not checked: the GPS consent prompt against a live project.

## 2026-10-25 — Production: account-deletion function and purge jobs live

- Enabled `pg_cron` and `pg_net`. Deployed Edge Function `process-account-deletions` (v1).
  Checked live: secret key 200, no/publishable/anon key 401, a 0-request test run succeeded.
- Scheduled with `pg_cron`: `purge-nudge-records` 08:15 UTC, `purge-presence-records` 08:20 UTC,
  `process-account-deletions` 09:00 UTC (limit 25). Owner stored `project_url` / `secret_key` in
  Vault.
- Not yet exercised: an actual deletion against production. `Delete-Account.md` left at 1.0.1
  ("in-app option planned"); still accurate, since only the unreleased mobile app has the option.
  Details: `SYSTEM_STATE.md` (Update 2026-10-25, later).

## 2026-10-25 — Production: migrations 0021–0030 applied

- Owner applied 0021–0028 and 0030 in the SQL editor, and re-ran 0029 (the former 0023, already
  live; no-op). An owner-run read-only check confirmed every migration's marker object. Details
  and what is still open: `SYSTEM_STATE.md` (Update 2026-10-25).
- `LOCATION_DISCOVERY.md` gate 1 updated: applied directly to production; verify-db, the query
  plan and live RPC smoke tests remain before any flag is turned on.

## 2026-10-25 — Mobile: dark styling for the location screens; location doc brought current

- `src/components/theme.ts` (used by `/nearby`, `settings/location` and
  `components/discovery`) now maps its role colors onto the app's dark palette in
  `src/theme/tokens.ts`, so those screens match the rest of the app. Quest cards on `/nearby`
  sit on the raised surface color like the MVP's cards. Text pairings checked against WCAG AA
  (lowest: link on panel 4.82:1); unselected chip outlines use the app's `borderStrong`
  (2.14:1, same as elsewhere in the app).
- `docs/product/LOCATION_DISCOVERY.md`: status update for the MVP merge; code map points at
  `/nearby`, the MVP quest detail and `supabaseSession.ts`; `EXPO_PUBLIC_FEATURE_NEARBY` is
  documented as default off; release gate 3 (mobile sign-in) marked done in code; §10's next
  prerequisite is now applying 0023–0025 to a non-production project. The Phase 0 gap map is
  left as the dated record it is, with a pointer to the current state.
- Verified: mobile typecheck, full Jest suite, Expo Doctor, export. Not checked on a device or
  simulator.

## 2026-10-25 — Mobile: expo-router upgraded to 58.0.26 (test fix, no app change)

- The merge pinned `expo-router` to 58.0.24 (and excluded it from Expo Doctor) because 11
  onboarding route tests failed on 58.0.25+. Root cause was in the test, not the router:
  `flows.test.tsx` used an async expectation inside `waitFor`. With fake timers RNTL's
  `waitFor` advances the clock inside `act(() => jest.advanceTimersByTimeAsync(50))`, and an
  async expectation lets `waitFor` resolve while that `act` is still open. The open `act`
  outlived the test, closed out of order during the next one and left React's act depth at
  1, so later `act()` scopes in the file never flushed (the "overlapping act() calls"
  warnings). Router 58.0.25 added a 32 ms timer in `BottomTabView`, which widened that
  window enough to hit it.
- Fix: the expectation reads the mocked AsyncStorage synchronously. `expo-router` is back on
  `~58.0.26` and the `expo.install.exclude` entry is gone.
- Verified from a clean `npm ci`: typecheck, 28 suites / 266 tests (twice), Expo Doctor
  20/20 with no exclusions, iOS + Android export. The overlapping-act warnings no longer
  appear in `flows.test.tsx`.

## 2026-10-24 — Mobile MVP merged with main; migrations renumbered 0029/0030

- `feat/mobile-mvp` (PR #55, which superseded #56–#59) merged with `main` after location
  discovery (#54). The MVP app is the base: its Explore and quest detail stay the primary
  screens because they work against the current production schema.
- From `main`: location-ranked discovery moved from the Explore tab to `/nearby`, reachable
  from Explore only when `EXPO_PUBLIC_FEATURE_NEARBY=on` (now **off by default**: it needs
  0023 `discover_nearby`/`get_quest_card`, not applied to production). The Adventure pipeline
  stays behind `EXPO_PUBLIC_FEATURE_ADVENTURE`. `settings/location` is linked from Settings.
  GPS quests get "Check in with GPS" on the MVP quest detail (needs 0025).
- `src/lib/auth/session.ts` (the location modules' session seam) is now fed by the Supabase
  Auth client (`src/lib/auth/supabaseSession.ts`, imported first from `index.ts` so the
  geofence task sees it too). `getConfig()` reads the backend through `resolveBackend`, so
  the production project is refused for discovery RPCs as well.
- **Migrations renumbered** (resolves the collision noted below): MVP
  `0023_progress_role_integrity` → `0029_progress_role_integrity` (already applied to
  production on 2026-10-21 under its old name; revoke/grant only, so re-running is a no-op),
  and `0024_account_deletion_requests` → `0030_account_deletion_requests` (not applied).
  When recording the live ledger, note that 0029 is the former 0023. Main's 0023–0028 keep
  their numbers.

## 2026-10-24 — Location, Discovery & Adventure Mode (code + authored migrations; nothing applied)

- Authoritative spec, Phase 0 gap map, contracts and release gates:
  `docs/product/LOCATION_DISCOVERY.md`. Standing decision added to `docs/DECISIONS.md`.
- **Mobile (`apps/mobile`):** Manual (default) / Explore / Adventure modes with
  desired-vs-effective capability; Explore screen (area selector, Near me with
  explain-then-ask, map-area search, radius/category/duration filters, list + map,
  external directions); location settings with the Adventure disclosure and one
  permission per step; flag-off Adventure pipeline (module-scope geofence task, ≤ 15 + 1
  regions, persisted gate closed before cleanup, 3 s bounded server claim, one local
  notification, validated quest deep links); quest detail from fresh server state;
  GPS check-in client. New deps via `npx expo install --npm`: expo-location,
  expo-task-manager, expo-notifications, react-native-maps, AsyncStorage. Foundation
  packages aligned to SDK 58 patch versions (Expo Doctor was failing on `main`).
- **Native config:** background location only with `MOBILE_BACKGROUND_LOCATION=1`; no
  Android location foreground service; Expo's auto-applied Background Fetch mode removed.
  Verified by local `expo prebuild --no-install` with a placeholder ID (not committed,
  generated folders deleted): foreground build has no `ACCESS_BACKGROUND_LOCATION` and no
  "Always" string; background build adds `ACCESS_BACKGROUND_LOCATION` +
  `RECEIVE_BOOT_COMPLETED`; iOS has no `UIBackgroundModes`. `POST_NOTIFICATIONS` comes from
  the library manifest at Gradle merge and was not observed (no Gradle build run).
- **Migrations authored, not applied:** `0023_location_discovery.sql` (PostGIS, generated
  geography + GiST, quest location override and editorial fields, structured hours,
  `discovery_areas`, `quest_feedback`, `discover_nearby`, `get_quest_card`),
  `0024_adventure_nudges.sql` (consent purposes, nudge settings/installations/claims,
  feature flags off, bundle/claim/result/purge RPCs), `0025_gps_presence.sql` (presence
  challenges/checks; `complete_quest` requires an `inside` check for GPS quests — closes
  SYSTEM_STATE blocker 10 for GPS; anon execute revoked).
- **Test tooling:** `supabase/tests/run-local.sh` (`npm run db:test`) replays the
  production migration path on a throwaway Postgres 16 + PostGIS with a test-only Supabase
  shim; new CI job `database`. Jest now discovers `.test.ts` as well as `.test.tsx`.
- **Validation, Linux cloud instance, Node 22.22.0 (CI uses 24):**

  | Command | Result |
  | --- | --- |
  | `npm run mobile:typecheck` | Passed |
  | `npm run mobile:test` | Passed: 11 suites, 71 tests |
  | `npm run mobile:doctor` | Passed 20/20 (baseline `main`: 19/20) |
  | `npm run mobile:export` | Passed; iOS and Android Hermes bundles |
  | `npm run db:test` | Passed: 26 migration files applied; 8 SQL test files (≈200 checks) incl. two-session dblink concurrency |
  | `npx tsc -p tsconfig.app.json --noEmit` / `npm run build` | Passed (existing chunk-size warnings) |

  Local query plan on 20k synthetic venues + 2k override quests used both GiST indexes;
  ≈ 14 ms (3 km) / 80 ms (10 km) per call locally — not a Supabase measurement.
- **Not done / blocked:** no Supabase apply, no native compile, no device or field test,
  no store submission, no policy publication (draft text in the spec §7), no mobile
  sign-in (Adventure and GPS check-in show "Sign in required"), purge jobs unscheduled.
- **Reward tiers (owner decision, same day):** Hard 300 XP / 150 Points; `legendary` added at
  500 / 300 (`0026_legendary_difficulty.sql`, not applied). Only Hard quests on the exact old
  400 / 200 tier move; earned rewards are untouched. Types, both importers' validators and the
  partner quest form accept `legendary`. SQL test `70_reward_tiers` covers it.

## 2026-10-24 — Miami Essentials seed, web GPS presence, photo credits (code/data; migrations not applied)

- Reward tier defaults live in `src/lib/app/rewards.ts` (Easy 50/25, Medium
  150/75, Hard 300/150, Legendary 500/300 — matching 0026). Partner quest form
  and LocalRepository defaults read them. First web unit tests: `npm test`
  (`tests/`, node:test via tsx) — reward tiers, GPS presence rules, photo
  attribution — run in CI.
- **Web GPS presence:** the quest page now completes `gps` quests through
  0025's flow — `create_presence_challenge` → one fresh browser fix (never
  cached) → `verify_gps_presence` → `complete_quest(p_presence_check_id)`.
  Only `inside` completes; `outside` / `uncertain` explain why. Before this,
  only the mobile app was wired, so a web gps quest returned
  `presence_required`. LocalRepository mirrors the server rules
  (`src/lib/app/presence.ts`, tested).
- `import:crm` gains editorial-batch options (`partner_type`,
  `verification_type`, `proof_method`, `social_share_prompt`,
  `verification_radius_m` 75–150, photo-credit `image_*` columns, `--no-qr`,
  pending partners for non-active batches, off-tier reward warnings, read-only
  `<out>.preflight.sql`, migration guards). Existing CRM output unchanged.
- Added migrations (**authored, not applied**):
  `0027_quest_media_bucket.sql` (public-read `quest-media` bucket,
  service-role writes) and `0028_quest_image_attribution.sql`
  (`quests.image_attribution`). CC BY / BY-SA heroes show their credit on the
  quest page hero and Explore/Favorites/map cards (linked) and on
  quest-browser and /quests cards (plain text).
- Added the Miami Essentials dataset (40 concepts, 34 importable as draft),
  39 licensed hero images with provenance (29 of 33 seeded heroes credited;
  4 public domain) and a validation/QA report: `data/generated/miami-essentials/`.
- Quest browser cards without an image show the branded fallback.

## 2026-10-21 — In-app account deletion requests (authored, not applied)

- `supabase/migrations/0024_account_deletion_requests.sql` (**not applied**): table
  `account_deletion_requests` (one pending request per user; no email/profile data; own-row
  read via RLS; no client write grants) and authenticated SECURITY DEFINER RPCs
  `request_account_deletion()` (idempotent, per-user advisory lock, `process_by` = +30 days)
  and `cancel_account_deletion()`; both audit-logged. Nothing is deleted by this migration.
- Processing: `supabase/functions/process-account-deletions` (**not deployed**), service-role
  only via `withSupabase({ auth: 'secret' })`. Per pending request, idempotently: capture the
  email for the confirmation, run `process_account_deletion_data()` (0024, service_role-only
  RPC: partner owners are flagged `manual_review_reason = 'owns_partner'` before anything is
  deleted; otherwise community notes, profile and `public.users` are deleted in one
  transaction), remove `proofs/<uid>/` and `avatars/<uid>/`, `auth.admin.deleteUser`, mark
  completed. Failures stay pending with `attempts`/`last_error` and are retried next run.
  No email provider is configured: support sends the §5 confirmation from completed rows'
  `notify_email`, then clears it. Deploy/schedule/support queries are in `index.ts`.
- Verification: 6 Deno tests (`process.test.ts`) pass when run under Node 24 with a
  `Deno.test` shim against an in-memory fake client — Deno itself is not installed, so
  `deno check`/`deno test` and any run against real Auth/Storage/Postgres are pending. ESLint
  clean under the website config. The SQL has not been executed anywhere.
- Mobile: Settings → Delete account now records the request in-app, shows the pending
  status and deadline, and allows cancelling (policy §6). The account stays usable until
  processed. If the server lacks 0024 (PGRST202/PGRST205/42P01) the screen falls back to the
  truthful emailed request. 199/199 mocked tests; SQL not executed anywhere (no
  non-production database available).
- Follow-ups before claiming in-app deletion: renumber 0023/0024 against `main` (collision,
  see below), apply 0024 (after backup) to a non-production project first, `deno test`,
  deploy with `--no-verify-jwt` and schedule, then bump `docs/legal/Delete-Account.md` (§1
  still says the in-app option is "planned") per `docs/legal/README.md`.
- **Migration number collision (unresolved):** `main` (PR #54) added `0023_location_discovery`,
  `0024_adventure_nudges`, `0025_gps_presence`, `0026_legendary_difficulty`. This branch's
  `0023_progress_role_integrity` (already applied to production) and
  `0024_account_deletion_requests` (not applied) must be renumbered when the branch is
  rebased onto `main`; the next free number on `main` is 0027.

## 2026-10-21 — Consumer mobile MVP (code only, branch `feat/mobile-mvp`)

- Built on the mobile foundation (`9bc4245`) through an execution graph with
  worktree-isolated workers; ledger in `PRODUCTION_SPRINT_PLAN.md` Appendix C.
- **Shared base:** single Supabase client (PKCE; session in Keychain/Keystore, chunked);
  config refuses missing backends and the production project ref; session/profile state
  machine with cache + private-storage clearing on account change; validated return
  targets; account gate; dark tokens and primitives; Jest fake Supabase client.
- **Discovery:** Explore (real active quests, category/neighbourhood filters, list/map,
  "Near me" asks for location only on tap, distance only when known) and Quest Detail
  (record-driven sections, https-only links, directions, share; no favourites/reviews).
- **Account:** email/password sign-in/up with the website's consent semantics (terms
  required, marketing optional and unchecked, version stamps 1.0.0), verification resend,
  recovery, deep-link callback with param allowlist; onboarding adapted from the web with
  real first-quest suggestions; saves only onboarding columns (no starter XP/streak).
- **Profile/Settings:** progress and history from `user_profiles`/`quest_completions`
  ("unavailable", never fabricated zeroes); profile edit; `is_public`, completed-quests,
  leaderboard and marketing (+ `consent_events`) with rollback; permissions help;
  policy links; sign out; deletion is a truthful email request (no in-app deletion).
- **Quest loop:** QR-only. In-app scan accepts only `https://<web origin>/scan/<code>`
  (never opened) → `record_code_scan` → `complete_quest(source_scan_id)`; single-flight,
  no auto-retry, status re-check after network failure, pending vs confirmed states,
  2-hour stored scan scoped to the user. Rewards tab is read-only (no redemption).
- **Review (node G, independent):** no blockers/high; 2 medium + 4 low fixed in `015bc94`
  with regression tests (recovery link vs existing session, recovery vs pending quest
  return, device-clock cooldown, production-ref normalisation, malformed ids, Android
  mailto). Remaining low: Explore defaults to list rather than the reference's map-led
  layout; detail uses stacked sections instead of tabs.
- **Validation (macOS, Node 24.19.0, final `015bc94`):**

  | Command | Result |
  | --- | --- |
  | `npm run mobile:typecheck` | Passed |
  | `npm run mobile:test` | Passed, 18 suites / 191 tests — mocked Supabase and native modules |
  | `npm run mobile:export` | Passed, iOS + Android Hermes bundles (not native compilation) |
  | `npm run mobile:doctor` | 17/20, identical to baseline: 2 checks need exp.host / RN Directory (sandbox network), 1 pre-existing SDK patch drift |
  | `npx tsc -p tsconfig.app.json --noEmit`, `npm run build` (web) | Passed; no website files changed |
  | Live backend, native compilation, simulator/emulator, physical device | **Not run** — no approved non-production Supabase project; no Xcode simulator / Android SDK on the build machine |

## 2026-10-21 — Production: column-scoped self-update grants (0023 applied)

- **Problem (live-verified via read-only MCP before the fix):** `authenticated` held
  table-wide UPDATE on `public.users` and `public.user_profiles`, limited only by
  self-row RLS. Any signed-in user could set their own `users.role = 'admin'`
  (`is_admin()` trusts that column) or raise their own `points_balance_cache` / `xp` /
  `level`, which `redeem_reward()` spends against.
- **Fix:** `supabase/migrations/0023_progress_role_integrity.sql` replaces table-wide
  UPDATE with column grants on `users (display_name, avatar_url, last_active_at)` and
  `user_profiles (home_city)`. RLS policies are unchanged; SECURITY DEFINER writers
  (signup trigger, `complete_quest`, `redeem_reward`, `adjust_points`) are unaffected.
  No client code wrote these tables directly.
- **Applied** by the owner in the Supabase SQL editor on 2026-10-21 (after backup).
- **Verified (read-only MCP, project `wvedvngtuzsttpavmgjw`, 2026-10-21):** `authenticated`
  can no longer update `users.role`, `users.account_status`, `user_profiles.points_balance_cache`,
  `xp` or `level`; table-wide UPDATE is false for `authenticated` and `anon` on both tables;
  the four granted columns are updatable; SELECT is unchanged.
- **Exposure check (aggregates only, no personal data):** 9 users, all `role = 'user'`
  (no admin accounts exist); all 9 `user_profiles` balances and XP match the
  `points_ledger` sums. No evidence the hole was used.
- **Renumbered 2026-10-24:** this migration is now `0029_progress_role_integrity.sql`.

## 2026-10-20 — Consumer mobile foundation (code only)

- Added `apps/mobile`: Expo SDK 58 / React Native 0.88 / React 19.3 / strict
  TypeScript, Expo Router, safe-area handling, and local development-client support.
  Tabs are Rewards / Explore / Profile, Explore initial. The quest-detail route
  receives `questId`; a development-only sample link demonstrates navigation/back.
  Direct quest links are anchored to Explore so the stack can return there.
- Kept the website at the root with its original dependency declarations, exact
  lockfile, TypeScript settings, Vite and Vercel configuration. Mobile is an
  independent npm package with a separate lockfile and root convenience scripts;
  React versions are not unified and no shared package/backend was introduced.
- Added the minimal jest-expo / React Native Testing Library 14 navigation suite.
  CI retains web typecheck/build and adds mobile typecheck/tests, Expo Doctor,
  and iOS/Android JS exports. Both jobs run on all existing triggers, including
  shared configuration changes. No native cloud build/signing/submission is run.
- Added development/staging config and placeholders only. Native commands reject
  missing approved target identifiers; production config is deliberately blocked.
  EAS profiles are internal development/staging configuration only and have no
  account/project/signing bindings. No authentication, backend integration, maps,
  camera/QR, completion, points, redemption, or database work was performed.
- **Static/automated validation, Linux cloud instance with Node 24.19.0:**

  | Command (repository root unless noted) | Result |
  | --- | --- |
  | `npm ci --no-audit --no-fund` | Passed; root dependency graph restored from original lockfile |
  | `npm --prefix apps/mobile ci --no-audit --no-fund` | Passed; clean mobile install, 1069 packages |
  | `npx tsc --noEmit -p tsconfig.app.json` | Passed before and after mobile changes (local tsc binary used) |
  | `npm run build` | Passed before and after; existing Browserslist/chunk/import warnings remain |
  | `npm run lint` | Failed before and after: unchanged 21 errors / 16 warnings; unrelated cleanup excluded |
  | `npm run mobile:typecheck` | Passed after clean mobile install |
  | `npm run mobile:test` | Passed, 1 suite / 4 tests; native views mocked, not device tests |
  | `npm run mobile:export` | Passed for iOS and Android Hermes JS bundles; not native compilation |
  | `EXPO_OFFLINE=1 npx expo install --check --npm` (in `apps/mobile`) | Passed against installed SDK compatibility map; online metadata not checked |
  | `npm run mobile:doctor` | 18/20 passed; schema and React Native Directory checks failed fetching external metadata in restricted networking; full diagnostics remain pending |
  | `npm run mobile:start -- --localhost --port 8081` | Metro started; status, Android development manifest and full development JS bundle returned HTTP 200; checked actual screen modules |
  | `npm run mobile:android` | Blocked by missing approved Android application ID before native compilation |
  | `npm run mobile:ios` | Blocked: iOS local builds require macOS |

  In the cloud sandbox, npm used `NPM_CONFIG_CACHE=/workspace/.npm-cache`; Expo
  commands used `EXPO_NO_TELEMETRY=1`, and bundling used `EXPO_OFFLINE=1`. Metro
  needed access to its standard per-user `.expo/state.json`; no repository
  workaround or trust bypass was added. Expo Doctor was also retried with Node's
  environment-proxy support and still could not complete the two online checks.
  Official Expo documentation was read from its GitHub source because the docs
  hostname is outside this instance's network policy. Staging config generation
  was checked for its distinct name/scheme and absent invented IDs; negative
  config checks confirmed production and missing native IDs are rejected.
- **Native compilation:** no successful iOS/Android native compilation. This
  Linux image has no Android SDK, adb, emulator, Xcode, or CocoaPods. No approved
  application identifiers/signing/EAS access were found. Supply approved
  development/staging IDs and native tooling, then execute the documented local
  native commands. No paid builds, production deployment, account registration,
  store submission, database change, or merge was performed.
- **Simulator/emulator checks:** unrun. **Physical-device checks:** unrun.
  Native back gestures, hardware back, safe-area appearance, and installation
  must still be checked on actual native targets. Re-run full Expo Doctor with
  access to Expo API/schema and React Native Directory metadata.
- Setup commands, environment separation, feature entry points, and outstanding
  requirements are in `apps/mobile/README.md`. Existing root `.env.example`
  conflict markers were observed and left unchanged.

## 2026-09-30 — Partner Insights dashboard; production analytics on

- **Production redeployed** with `VITE_ANALYTICS_SINK=supabase` and a new URL-restricted `VITE_MAPBOX_PUBLIC_TOKEN`.
  - The live bundle includes the Supabase sink and a public (`pk.`) Mapbox token.
- **Partner Insights:**
  - `/partner` and `/partner/venues/:venueId` show read-only analytics per partner and per venue.
  - It is lazy-loaded, so the chart code only loads for people who open it.
  - Built on the new `partner_insights()` RPC (`0021_partner_insights.sql`, **not yet applied**).
  - Tested on Postgres (PGlite) against a production-shaped schema, covering the metrics and access: owner, other partner, venue of another partner, plain user, anon and admin.
  - A TypeScript twin gives the Local and Mock repositories identical numbers.
- **Removed:** the superseded, unmounted `PartnerHome` and `PartnerAnalytics` pages.

## 2026-09-28 — Prototype avatar removed; SideQuests explorer avatar

- Removed `src/assets/prototype-avatar.webp`: the temporary personal photo from the quest-page work is gone.
- Anyone without a profile photo (guests, or signed-in users who haven't uploaded one) now sees the
  SideQuests explorer (`src/assets/sidequests-explorer-avatar.svg`) as the "You" avatar in the bottom nav.
  - It is a brand-palette vector: bucket hat with the discovery sparkle, backpack straps, framed by the doorway.
  - A broken avatar URL also falls back to it.

## 2026-09-28 — Migrations 0019/0020 applied; Frost quest SQL

- **Applied to production:** `0019_venue_about.sql` and `0020_analytics_events.sql`, with post-checks passing (see `SYSTEM_STATE.md`).
  - There was no backup: both migrations only add schema.
- **Added `supabase/frost_museum_quest.sql`:** an idempotent insert of the Frost Museum partner, venue, quest and one venue code.
  - The code is generated at run time and printed with its sticker URL.
  - It passed a rolled-back dry run, then was **run on production**: the Frost quest is live at
    `/quests/30000000-0000-0000-0000-000000000010`, with one QR code. Production now has 10 active quests.
  - **Action needed:** print the Frost sticker with its `/scan/<code>` URL (shared with the owner).

## 2026-09-28 — Reusable quest page, three-tab nav, quest analytics

- **Quest page replaced** (`/quests/:questId`, same route) with the new location-first design:
  hero → intro → required action → Explore & Share → venue card → Community Notes. One template,
  fed by `buildQuestPageModel()` (`src/lib/quests/questPage.ts`) from the existing
  `QuestWithContext` shape. Completion still uses the existing flow (startQuest → completeQuest RPC
  → capture camera, now lazy-loaded). Removed the superseded `AboutActions`, `InfoCards`,
  `RewardCard`, `QuestObjectiveCard` and `BusinessAvatar` components.
- **Global bottom nav** is now Rewards / Map / You (no scan item). `/app/rewards` is mounted;
  Saved quests is linked from Profile.
- **Prototype avatar (temporary):** signed-in users without an avatar see
  `src/assets/prototype-avatar.webp` in the nav. **Remove before public launch.**
- **Analytics:** quest-page event catalogue (`src/types/events.ts`), `trackQuestEvent` /
  `trackQuestEventOnce` (`src/lib/analytics/questEvents.ts`), one-shot impression hook
  (`src/hooks/useImpression.ts`), a dev-only console sink, and consent gating for remote sinks.
  Events still only reach the on-device buffer unless `VITE_ANALYTICS_SINK=supabase` is set.
- **New migrations, not applied:** `0019_venue_about.sql` (`venues.description`,
  `venues.image_url`) and `0020_analytics_events.sql` (`analytics_events` table +
  `record_analytics_events()` RPC). Both are idempotent; apply after a backup.
- **"No quest found" 404:** missing quests and every unknown route show one shared doorway screen
  (`src/components/app/NoQuestFound.tsx`). The door swings open onto an empty path, and rests
  open under reduced motion. The network-error state keeps its retry screen.
- **Sample content:** the Frost Museum of Science quest in `src/data/mock/quests.json` (dev) and
  the LocalRepository seed (`STORE_VERSION` 6). It is not in production.

## 2026-09-28 — Migration 0018 applied; PR #40 live

- PR #40 was merged to `main` (`a2d41b6`) and deployed to Vercel production. Then
  `0018_scan_verification.sql` was applied to production (ledger `20260928031347`).
- **All `scripts/verify-db.sql` checks 18–26 pass in production:**
  - venue codes are private and point at `/scan/<code>` (9 QR codes backfilled);
  - `record_code_scan()` exists and scans carry `code_verified`;
  - `complete_quest()` requires a verified scan for QR/NFC quests.
- **Rolled-back live test** (nothing persisted):
  - `record_code_scan()` accepts a real code case-insensitively and records a verified scan;
  - it rejects a bad code;
  - `record_scan()` records again, which fixes P12.
- **Action needed:** re-encode the 9 venue stickers (or write NFC tags) with
  `https://miamisidequests.io/scan/<code>`. Stickers that encode the old `/q/<quest id>` link open
  the quest but show "Scan to unlock". See `PARTNERSHIP_PLAYBOOK.md`, "Venue codes".

## 2026-09-28 — Migrations 0016 and 0017 applied to production

- Both were applied to `wvedvngtuzsttpavmgjw` with the Supabase connector's `apply_migration`.
  The ledger records them as `20260928015058 0016_rls_hardening` and
  `20260928031102 0017_quest_frameworks`. The ledger also lists 0001–0004; 0005–0015 were applied
  out-of-band.
- **Pre-checks passed:**
  - The live `complete_quest` matched 0003.
  - There were no venue-code secrets to move.
  - There were no duplicate `(user_id, quest_id)` completions.
- **Post-checks passed:**
  - The RLS helpers are `SECURITY DEFINER`.
  - `quest_secrets`, `quest_frameworks` and `quest_instances` are unreadable by anon.
  - The notes view is moderation-filtered.
  - `complete_quest` has the 5-argument signature.
  - `unique (user_id, quest_id)` is gone.
  - The one existing completion is intact.
- **Still pending:** `0018_scan_verification.sql`. Apply it after the PR #40 app is deployed,
  because the previous app can't produce verified scans.

## 2026-09-28 — QR/NFC quests require a real scan; NFC tags as venue codes

- **Found while checking production (read-only, via the Supabase connector):**
  - `record_scan()` has failed on every call since 0003, because of a missing enum cast. There
    are zero scan rows, and `/scan/<code>` hangs.
  - `complete_quest()` never checked QR scans, and venue codes were publicly readable.
  - 9 active QR quests with one code each; 1 completion ever.
- **Added `supabase/migrations/0018_scan_verification.sql`:**
  - Venue codes get a `kind` (`qr` or `nfc`) and become private.
  - `record_code_scan()` verifies a scanned code server-side.
  - `record_scan()` is fixed.
  - `complete_quest()` requires a recent, unused, code-verified scan for QR/NFC quests.
  - `create_qr_code()` takes a kind.
  - `scripts/verify-db.sql` gains checks 24–26.
- **App:**
  - `/scan/<code>` resolves through `Repository.recordCodeScan()`. The Supabase version falls back
    to the old lookup until 0018 is applied.
  - Scan failures now show an error instead of a spinner.
  - The quest page shows "Scan to unlock" on QR/NFC quests until the user arrives from a scan,
    and it keeps the scan through sign-in.
  - The Local and Mock repositories mirror the rule.
- **Docs:** `PARTNERSHIP_PLAYBOOK.md` has a new "Venue codes: QR stickers and NFC tags" section
  (what URL to print, how to write and lock NFC tags, rotating a leaked code). The schema snapshot
  adds P12, P13 and §13.
- **Verification:**
  - Local Postgres 16 with 0001–0018, including a re-run of 0018. All 23 scenarios behaved as
    intended:
    - codes are unreadable by anon and other users;
    - bad, inactive, stale (3h), reused, other-user and other-quest scans are all rejected;
    - an anonymous scan is claimed after sign-in;
    - venue-code quests are unaffected;
    - NFC codes are created and resolved;
    - the old call signatures still work.
  - LocalRepository was tested in Node.
  - Quest page states were checked in a browser.
  - Typecheck, build and lint pass.

## 2026-09-27 — Quests generated on the spot from curated frameworks

- **Scope change (product owner):** quests may now be generated per user when they open a quest.
  Recorded in `PRODUCT_DECISION_LOG.md` ("Generated Quests"), `DECISIONS.md` and `PRODUCT_SPEC.md`.
  Guardrails: curator-written frameworks and templates (no AI), partner venues only, repeatable
  only after a cooldown the quest opts into.
- **Added `supabase/migrations/0017_quest_frameworks.sql` (not applied; apply after 0016):**
  - New tables `quest_frameworks` (templates with `{slot}` placeholders, validated by trigger)
    and `quest_instances` (one generated objective per visit, stable until completed or 24h).
  - `generate_quest_instance()` prefers a different framework than the user's last visit.
  - `quests.repeat_cooldown_days` added. NULL keeps the once-ever rule.
  - `complete_quest()` takes `p_instance_id` and enforces the repeat rule under an advisory lock.
    It replaces the dropped `unique (user_id, quest_id)`.
  - `scripts/verify-db.sql` gains checks 21–23.
- **App:**
  - `Repository.getQuestOffer()` is implemented in the Supabase, Local and Mock repositories.
    The Supabase version falls back to the static quest until 0017 is applied.
  - The quest page shows the generated objective, instructions, staff phrase and rewards, sends
    the instance on completion, and says when a new version unlocks.
  - Explore's "Featured detour" now rotates per user per day (`src/lib/quests/rotation.ts`) and
    skips quests the user can't do right now.
  - The local seed gives Wynwood Walls and Gramps frameworks and a 7-day cooldown. The local
    store version bumps to 5, so local sample data reseeds.
- **Verification:**
  - Local Postgres 16 with 0001–0017, including a re-run of 0017 to confirm it is idempotent.
    Generation, refresh stability, framework rotation, and single-framework slot re-draws all
    checked out (0 repeats in 12 pairs). So did the cooldown and once-ever rules, instance
    ownership, a concurrent double-complete (second one got `cooldown`), the old 4-argument
    call, and private instance reads.
  - LocalRepository was exercised in Node with the same scenarios.
  - The Explore rotation had 0 back-to-back repeats over 365 days and spreads evenly across users.
  - Quest page rendering was checked in a browser against a stubbed instance.
  - Typecheck and build pass. Lint on the touched files shows no new errors (18 pre-existing).

## 2026-09-27 — Database schema snapshot, live-schema dump script, RLS hardening migration

- **Added `docs/architecture/DATABASE_SCHEMA_SNAPSHOT.md`**, a dated, derived reference of the
  schema after migrations 0001–0015: Mermaid ER diagram, consolidated DDL, triggers, RPCs, an
  RLS/grant matrix, storage buckets and known pitfalls. Built to paste into another LLM. The
  migrations stay authoritative.
- **Added `scripts/schema-snapshot.sql`**, a read-only query that dumps the live `public` schema
  (columns, constraints, policies, grants, functions, triggers, indexes, buckets, row counts) as one
  JSON document for diffing against the snapshot.
- **Verification:** all 15 migrations were applied in order to a local Postgres 16 with stubbed
  `auth`/`storage` schemas. The end state matched the snapshot (20 tables, 2 views, 19 enums,
  42 FKs). 0006 stops at line 434 on a fresh build (P11, below). The live database was not
  inspected: the session's Supabase MCP was not authenticated.
- **Pitfalls surfaced** (reproduced locally as `anon`): `quests.verification_secret` is readable
  by anon (P1); `community_notes_with_author` returns non-approved notes (P2); and
  `is_admin()`/`owns_partner()` run as the caller, so any draft quest makes anon `SELECT` on
  `quests` fail with `permission denied for table users` (P10).
- **Added `supabase/migrations/0016_rls_hardening.sql` (not applied)**, which fixes P1, P2 and P10:
  - RLS helpers become `SECURITY DEFINER` with an empty `search_path`.
  - Venue-code secrets move to a server-only `quest_secrets` table. A trigger keeps
    `quests.verification_secret` NULL so existing writers keep working, and `complete_quest()`
    (0003's body, only the lookup changed) reads the secret from the new table.
  - `community_notes_with_author` gets a WHERE clause restating `notes_public_read`.
  - `scripts/verify-db.sql` gains checks 18–20. They fail on a 0001–0015 build and pass after 0016.
  - Tested locally, including a re-run of 0016 to confirm it is idempotent. Anon quest reads work
    with a draft present, the secret is hidden, and non-approved notes are hidden from anon and
    other users but visible to their author and admins. Right code completes, wrong code fails,
    and the trigger stores new secrets, ignores blank ones and updates changed ones.
- **Found, not fixed (P11):** on a fresh build, 0006's `create or replace view
  community_notes_with_author` fails because 0005 already added `flag_count`. Later migrations
  re-do what 0006 skips, but any from-scratch build stops there.

## 2026-09-27 — `/iiipoints`: unofficial III Points concept microsite (pitch prototype)

- **New route `/iiipoints`**, a self-contained interactive pitch for the III Points team: quest feed,
  three concept sponsor quests (Red Bull, Stella Artois, Playboy), a concept festival map, XP/profile,
  the post-festival Miami continuation, three-sided value, a mock organizer dashboard and a final CTA.
- **Not a product surface.** All state is session-only in the browser (`QuestState.tsx`); nothing
  touches Supabase, the repository layer, or real quests/points. Quests, sponsor activations, map
  and dashboard numbers are labelled as concept/fictional on the page, and the footer carries the
  unofficial-concept disclaimer. Sponsor names are typeset, not their logo files.
- **Isolated from the rest of the site.** The page is `React.lazy`-loaded (own ~19 KB gzip JS + ~10 KB
  CSS chunk); its fonts (Anton, Space Grotesk, IBM Plex Mono), title, `theme-color` and a
  `robots: noindex, nofollow` meta are added on mount and removed on unmount. Styles are scoped
  under `.iii` in `src/components/iiipoints/iiipoints.css`.
- **Analytics:** demo interactions emit one new typed event, `concept_interaction`
  (`props.page = "iiipoints"`), through the existing `track()` sink.
- Verified with typecheck + build and headless Chromium at 320/390/1440px: no horizontal overflow,
  no page errors, and a full scripted play-through (quests, all three sponsor flows, map hidden door,
  easter egg, level-up) with and without `prefers-reduced-motion`.

## 2026-09-25 — Header lockup: mark and wordmark sized separately

- **The header mark was a smudge, and the brand spec is why.** `logo-horizontal.svg` fixes the mark
  at ~15% of the lockup's width, so the site header's 150px lockup rendered it ~23px tall and the
  app header's 128px one ~20px. `brand/README.md`'s own selection table sets `icon.svg`'s minimum at
  32px while prescribing a 148px horizontal lockup — which yields ~23px. The two rows disagree;
  nothing was being misused.
- **`Logo` now composes the lockup** from `icon.svg` + `wordmark.svg` at independent sizes
  (`sm`/`md`/`lg`), instead of scaling the fixed horizontal file. `md` puts the mark ink at 32px.
  No artwork changed — this is an arrangement of the existing files. `logo-horizontal.svg` remains
  the signature for marketing, print and export.
- **Callers size by step, not width.** The six `<Logo>` sites dropped their `w-[…]` classes for
  `size`. App chrome uses `sm`, which lands the mark at ~28px: under the 32px floor, but it has to
  share a 320px header with the bell and avatar, and `icon-small.svg` can't stand in because it
  paints with `currentColor`, which an `<img>` cannot inherit.
- **Trade-off recorded:** the wordmark holds at 0.74× the mark's box, leaving the mark's wall ~11%
  heavier than the wordmark's stroke. Equal weight would need a ~205px lockup. Documented under
  "Screen lockup" in `brand/README.md`.
- Verified against the built app over CDP at 320/375/390/1280px: site header, auth, footer (reverse
  on Midnight Navy) and the app header all clear their neighbours at 320px.

## 2026-09-16 — Brand migration, phase 2: shipped assets, metadata, and the last legacy surfaces

- **Fixed a production-facing asset gap.** `index.html` and `site.webmanifest` referenced
  `/apple-touch-icon.png`, `/og-image.png`, `/icon-192.png` and `/icon-512.png`, none of which
  existed in `public/` — social shares rendered with no image and PWA install had no icon. The
  shipped `favicon.ico` was still the Lovable default heart. All of them are now generated from the
  brand vectors by `scripts/generate-brand-assets.mjs` (headless Chromium over CDP, no new npm
  dependency), which writes `favicon.ico` (16/32/48), `favicon.svg`, `favicon-16/32.png`,
  `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `mask-icon.svg` and a
  1200 × 630 `og-image.png` built from `scripts/brand/og-image.html`.
- **Metadata.** `theme-color` and the manifest's `theme_color`/`background_color` moved from Ocean
  Blue to Midnight Navy `#0D1321`; added SVG favicon + 16/32 PNG + Safari mask-icon links, Apple
  web-app meta, `og:locale`, `og:image:{type,width,height,alt}`, `twitter:image:alt`, and `image` on
  the Organization JSON-LD. Manifest gained `id`, `scope`, `lang`, `categories` and a maskable icon.
  `start_url` deliberately unchanged. The `@SideQuestsIO` handle was already established and is kept.
- **Logo usage is centralized** in `src/components/brand/Logo.tsx` (`<Logo>` lockup, `<LogoMark>`
  symbol). Five files previously imported brand SVGs by relative path; the homepage recoloured the
  navy mark with a `brightness-0 invert` filter, which is now the real reverse artwork
  (`brand/logos/icon-reverse.svg`). The winding-path glyph was redrawn as one continuous switchback
  ribbon to match the supplied artwork, applied across all 22 brand SVGs.
- **Removed the last of the previous identity.** The in-app header and app home rendered the
  wordmark as italic all-caps `SIDEQUESTS` on a coral gradient — replaced with the real lockup. Map
  markers were seven rainbow hex colours with emoji glyphs; they are now Midnight Navy doorway pins
  with lucide category glyphs in Reward Gold, Ocean Blue when selected. Also migrated: the
  coral→turquoise gradient CTAs and avatars, the generic-purple gradient chip (dead code, deleted),
  the onboarding blur-blob background and its emoji pickers, and the `#0E1428` / `#22c55e` /
  `#3B82F6` hardcoded hexes.
- **Tokens.** `src/index.css` gained brand-role variables (`--navy`, `--ocean`, `--sand`, `--palm`,
  `--gold`, `--coral`) and semantic `--success` / `--reward` / `--highlight` pairs, wired through
  `tailwind.config.ts` as `navy`/`ocean`/`sand`/`palm`/`gold`/`coral`/`success`/`reward`/`highlight`.
  The legacy `turquoise`/`indigo`/`sandstone`/`charcoal` aliases, the `gradient-coral` /
  `gradient-turquoise` recipes, the no-op `text-gradient-*` / `glow-*` classes and the `pulse-glow`
  keyframe were removed once nothing referenced them.
- **Wordmark spelling.** User-visible copy now reads `sidequests`, including the wordmark composited
  into every shared quest photo (`ctx.fillText`, and its font moved from Poppins to Manrope). 64
  occurrences across the eight locale files and the local seed data. Developer console prefixes
  (`[SideQuests]`) are unchanged.
- Removed obsolete duplicates: `brand/favicon/` (a stale parallel icon set with its own manifest,
  referenced by nothing), `public/site 2.webmanifest`, `src/components/BackendFallbackBanner 2.tsx`,
  and the ` 2` copies of the brand docs. Off-palette "achievement Violet" is gone from the brand docs.
- **OG card fixes (follow-up within the same migration).** The first pass shipped a card with
  several defects: the doorway mark rendered at ~30px in the lockup, where its winding path
  collapses into a smudge (the mark needs ~90px to resolve, in both positive and reverse); the
  arch's cream outline used a `box-shadow` spread, which cannot follow a border-radius the canvas
  clips and so rendered as a flat vertical stripe; the photo crop bisected the right-hand figure and
  its dark side sank into the navy background; the headline's three-line wrap was a coincidence of a
  `ch`-based measure; and the layout left a dead gap between the wordmark and the overline. The card
  now uses the **wordmark alone** (recognition on a social card lives in the wordmark, and it
  reproduces cleanly at any size), a real `border` that traces the arch, a lifted 68% crop with both
  figures whole, explicit line breaks, and an explicit three-row rhythm. The generator now fails
  loudly if an OG source file is missing instead of emitting a blank panel.
- Fixed a pre-existing clip in `brand/logos/wordmark.svg`: its ink runs to x=1076 but the viewBox was
  1050 wide, cutting 26 units off the final "s". Never visible before because nothing rendered the
  wordmark standalone — the app uses `logo-horizontal.svg`. Widened to 1094 and added
  `wordmark-reverse.svg` for dark surfaces.
- `brand/logos/icon-small.svg` and `logo-small.svg` (the 16–24px reduced-detail variants) were missed
  by the glyph redraw because they live in a 24-unit space rather than the 64-unit one the
  replacement matched. Ported, so the whole kit now carries one glyph.
- Verification: `npx tsc -p tsconfig.app.json --noEmit` clean; production build passes; `npm run lint`
  unchanged from baseline (36 pre-existing problems, none in the migrated code). Ten routes were
  screenshotted at 1440 px and 390 px against a local production build. No schema, RPC, auth, routing
  or business-logic change.

## 2026-08-15 — Design-intelligence rebuild, phase 1 (not deployed)

- Established the product's new visual direction: **a playable Miami field guide** with a quiet
  editorial base, threshold-shaped photography, stronger content hierarchy, and a Midnight / Ocean /
  Sand / Palm / Gold / Coral palette. Added the design-intelligence connection record, design brief,
  reusable findings, and machine-readable motion specifications under `docs/design/`.
- Rebuilt the global type, color, focus, card, button, header, footer, and public layout foundations;
  replaced the previous glow/gradient-heavy presentation with the approved brand system. The landing
  page, sign-in/sign-up, partnerships, Explore, app shell/navigation, and Quest Detail now share this
  system while preserving the existing routes, repository boundaries, consent behavior, auth flow,
  quest-completion flow, and analytics calls.
- Added restrained progressive-enhancement motion: below-fold sections reveal over 220 ms and quest
  cards lift 2 px on hover-capable devices. Content is visible without JavaScript, the hero is static,
  and `prefers-reduced-motion: reduce` disables reveals and hover transforms.
- Verification: TypeScript and production build pass; Playwright viewport checks pass at 1440 px,
  375 px, and 320 px with no horizontal overflow or console errors on the rebuilt routes. Keyboard
  focus, mobile navigation, reveal behavior, hover reset, and reduced-motion behavior were exercised.
  No deployment or backend/database change was made. Remaining public and secondary app routes are
  intentionally queued for the next rebuild phase.

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
