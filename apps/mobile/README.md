# SideQuests consumer mobile app (MVP)

One Expo Router + React Native + strict TypeScript app for iOS and Android, talking
directly to the existing Supabase backend (no second backend). Navigation is
Rewards / Explore / Profile; Settings, auth, onboarding, quest detail and quest
completion are stack routes.

Implemented journey: guest Explore (list/map, filters, optional "Near me") → quest
detail → sign in / create account (email + password, verification, recovery) →
onboarding when needed → back to the intended quest → QR quest completion confirmed by
the server → progress and history in Profile → profile/privacy settings, sign out,
in-app deletion request. Rewards shows real balances and available rewards read-only.

Location discovery and the Adventure nearby-alert pipeline from
[`docs/product/LOCATION_DISCOVERY.md`](../../docs/product/LOCATION_DISCOVERY.md) are
included but **off by default** (`EXPO_PUBLIC_FEATURE_NEARBY`, `EXPO_PUBLIC_FEATURE_ADVENTURE`):
they need migrations 0023–0025, which are not applied to production. GPS quests get a
"Check in with GPS" button on quest detail (server-computed presence, 0025).

Deliberately excluded: reward redemption (no partner fulfilment flow; 0 live
rewards), photo/proof capture, non-QR verification types, avatar upload, and
deletion *processing* until its Edge Function is deployed (see "Release blockers").

## Package layout and compatibility

Use Node 24 LTS and npm. `apps/mobile/package-lock.json` owns mobile dependencies;
the root lockfile owns the existing website and is unchanged. Install each npm
package independently. This deliberate boundary avoids hoisting native/React 19
dependencies into the React 18 website. Do not run npm workspace-wide dependency
upgrades or introduce shared packages as part of this foundation.

Scaffolded with `create-expo-app@5.0.0 --template blank-typescript@sdk-58
--no-install --no-agents-md`. Versions were selected from the stable npm tags and
Expo SDK 58's bundled compatibility map: Expo 58.0.16, Router 58.0.24, React 19.3.0,
React Native 0.88.0, TypeScript 6.0.3, jest-expo 58.0.11, and React Native Testing
Library 14. React DOM is pinned to Expo's matching 19.3.0 for Router's transitive
peer dependencies; mobile web is not a product target. No React version override,
custom Metro resolver, or deprecated react-test-renderer is used.

Official references checked during implementation:

- [Create a project](https://docs.expo.dev/get-started/create-a-project/)
- [Monorepos and dependency boundaries](https://docs.expo.dev/guides/monorepos/)
- [Router installation](https://docs.expo.dev/router/installation/)
- [Router testing](https://docs.expo.dev/router/reference/testing/)
- [Jest setup](https://docs.expo.dev/develop/unit-testing/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)

The docs site is restricted in the onboarding network. These documents were read
from their official source under `expo/expo/docs/pages` on GitHub; version numbers
were checked against npm and the installed SDK compatibility map.

## Install, start, check

From the repository root:

```sh
npm ci                          # website only
npm --prefix apps/mobile ci      # mobile only
npm run dev                     # website on port 8080
npm run mobile:start            # Metro for an installed development client
```

Mobile checks, also from the root:

```sh
npm run mobile:typecheck
npm run mobile:test
npm run mobile:doctor
npm run mobile:export
```

Equivalent commands from `apps/mobile` are `npm run start`, `npm run typecheck`,
`npm test`, `npm run doctor`, and `npm run export`. Use `npx expo install --npm
<package>` in this directory to select SDK-compatible native packages; `--npm`
avoids detecting the historical root `bun.lockb`. Root npm remains canonical.
CI installs from both frozen lockfiles and runs web typecheck/build plus mobile
typecheck, navigation tests, Expo Doctor, and iOS/Android JS exports. It does not
start EAS or compile/sign native binaries. Web ESLint ignores mobile; the existing
web lint baseline is recorded separately below.

The Jest suites render the actual filesystem routes with `expo-router/testing-library`
against an in-memory fake Supabase client (`__tests__/support`): navigation/tab order,
discovery, auth/onboarding/return flows, profile/settings writes and account
isolation, and the QR completion state machine, plus cross-feature journeys. Native
modules (camera, maps, location, secure store) are mocked; these tests do not prove
device behaviour or live-backend behaviour. Pure logic suites cover the location
work too (capability gate, quiet hours/DST, region budget, nudge pipeline, ranking,
RPC client); `expo-notifications` and `expo-task-manager` are mocked as well, so they
say nothing about permission dialogs, geofence delivery or battery on devices.

## Local development builds

`expo-dev-client` and its config plugin are installed. `npm run mobile:start`
starts Metro with `--dev-client`; this alone does not install an app. SDK 58
development builds are the intended workflow, not Expo Go during the SDK transition.

No approved native application IDs, EAS project/owner, or signing bindings were
found in this repository. Supply approved development IDs in an ignored
`apps/mobile/.env.local` (see `.env.example`). Do not invent or reuse production
IDs. No IDs or credentials are needed for typecheck, tests, or JS exports.

After the IDs are supplied, run from the repository root:

```sh
# Android: compatible JDK, Android SDK, and an emulator or connected device
npm run mobile:android

# iOS: macOS, Xcode, and the supported CocoaPods / simulator toolchain
npm run mobile:ios
# For a connected physical iPhone (requires approved signing)
npm run mobile:ios -- --device

# Start Metro separately after installing a development client
npm run mobile:start
```

The native wrappers invoke local `expo run:android` / `expo run:ios` and refuse
missing target IDs through `app.config.ts`. iOS may stop earlier on non-macOS.
Expo generates ignored `android/` and `ios/` folders when native commands run;
application configuration remains in `app.config.ts`. Platform stacks own the
header back button, iOS back gesture, and Android back handling. Tabs return to
Explore through their initial-route back behavior. Safe areas are handled by the
navigation headers/tab bar and `PlaceholderScreen` (quest detail includes the
bottom safe area).

`eas.json` records internal development/staging profiles and an iOS simulator
profile for a future approved build. It has no production or submission profile,
account owner, project ID, or signing material. No EAS builds were requested.
Before any cloud build, obtain explicit approval, authorized Expo project access,
approved IDs for the target variant, and (for signed iOS devices) Apple team and
provisioning access. Local Android debug builds do not require Play Store access;
iOS simulator builds do not require physical-device signing.

## Environments and client values

Without a `.env.local` the app runs but shows a "Backend not configured" state (no demo data). To configure:

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
# Edit the ignored file; enter approved development identifiers only.
```

| Variable | Purpose |
| --- | --- |
| `APP_VARIANT` | `development` by default, or `staging`; `production` is rejected in this foundation |
| `MOBILE_IOS_BUNDLE_IDENTIFIER` | Approved iOS ID for the selected variant, required only for native iOS builds |
| `MOBILE_ANDROID_APPLICATION_ID` | Approved Android ID for the selected variant, required only for native Android builds |
| `EXPO_PUBLIC_SUPABASE_URL` | Approved non-production project URL; production ref is refused |
| `EXPO_PUBLIC_WEB_ORIGIN` | Website origin for policy links and accepted scan host (default `https://miamisidequests.io`) |
| `MOBILE_ANDROID_GOOGLE_MAPS_API_KEY` | Optional Android map key; without it Android is list-only |
| `EXPO_PUBLIC_FEATURE_NEARBY` / `EXPO_PUBLIC_FEATURE_ADVENTURE` | `on` enables location discovery / Adventure (needs migrations 0023–0025); off otherwise |
| `MOBILE_BACKGROUND_LOCATION` | `1` adds background location for Adventure; omit for a foreground-only build |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key for that project (never service-role) |

Development and staging must use distinct approved identifiers, URL schemes, and
the existing backend's designated non-production configuration. To run staging,
use a separate ignored local environment file/configuration with `APP_VARIANT=staging`
and staging IDs; never silently fall back to production values. Stop Metro before
switching environments, then run `APP_VARIANT=staging npm run mobile:start -- --clear`
with the correct local staging file in place. EAS profiles set their variant;
values must be configured separately before any approved cloud build.

All `EXPO_PUBLIC_*` values ship in the app. Never put service-role keys, database
passwords, signing credentials, or other privileged secrets in them. None are
needed here. Configuration contains placeholders only; no migrations or imports
should be run for this foundation.

## Code map and contracts

| Path | Owner / responsibility |
| --- | --- |
| `src/lib/config.ts` | One config path; refuses missing config and the production project ref |
| `src/lib/supabase.ts`, `secureSessionStorage.ts` | Single PKCE client; session in Keychain/Keystore (chunked) |
| `src/lib/appStorage.ts` | Non-secret local state; account-scoped keys cleared on signout/switch |
| `src/lib/navigation/returnTo.ts` | Validated return targets (`quest:<id>`, `tab:<name>`), pending return with TTL |
| `src/lib/api/{quests,progress}.ts` | Shared reads; `user_profiles` is the only XP/Points source |
| `src/session/*` | Auth/profile state machine (`unconfigured · restoring · guest · loading_profile · needs_onboarding · ready · error`), `accountGate` |
| `src/components/ui`, `src/theme/tokens.ts` | Primitives and dark tokens (brand semantic palette + reference accent) |
| `src/features/discovery` | Explore, map, quest detail |
| `src/features/account`, `src/features/onboarding` | Auth screens, deep-link callback, post-auth routing, onboarding draft/save |
| `src/features/profile` | Profile, settings, edit profile, deletion request |
| `src/features/quest-loop`, `src/features/rewards` | QR scan → `record_code_scan` → `complete_quest`; rewards tab |
| `src/app/nearby.tsx` | Location-ranked discovery (area / Near me / map area, radius and time filters); behind `EXPO_PUBLIC_FEATURE_NEARBY` |
| `src/app/settings/location.tsx` | Mode choice, Adventure disclosure and permission steps, pause, alert cap |
| `src/lib/location/`, `discovery/`, `adventure/`, `presence/` | Location adapter, discovery RPCs and ranking, nudge pipeline, GPS check-in |
| `src/lib/auth/session.ts`, `supabaseSession.ts` | Session seam for the location modules, fed by the Supabase Auth client |
| `index.ts` | Entry: wires the session seam and registers the geofence task at module scope, then loads `expo-router/entry` |
| `__tests__/` | Jest (mocked Supabase + native modules); `support/` holds the fake client and native mocks |

Navigate to a quest with `{ pathname: '/quests/[questId]', params: { questId } }`; ids stay strings.

## Backend setup required for real use

1. An approved **non-production** Supabase project with the repo migrations applied
   (`scripts/verify-db.sql` afterwards). The app refuses `wvedvngtuzsttpavmgjw`.
2. Auth → URL configuration → Redirect URLs: `sidequests-development://auth/callback**`
   (and `sidequests-staging://auth/callback**` for staging). Without it, email links fall
   back to the website and users sign in afterwards. Links must be opened on the
   requesting device (PKCE).
3. `apps/mobile/.env.local`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   optional `EXPO_PUBLIC_WEB_ORIGIN`, `MOBILE_ANDROID_GOOGLE_MAPS_API_KEY`.
4. Synthetic test data in that project: an active QR quest with a venue and a printed
   `/scan/<code>` code from `create_qr_code`.

## Release blockers

- In-app account deletion: the app records a request through `request_account_deletion()`
  (migration 0030, applied to production 2026-10-25; on a backend without it the app falls back
  to a prefilled email). Requests are processed by the service-role Edge Function
  `supabase/functions/process-account-deletions`, deployed and scheduled daily (09:00 UTC) on
  2026-10-25. `docs/legal/Delete-Account.md` still says the in-app option is "planned"; update it
  through the `docs/legal/README.md` process when this app ships (the website has no in-app
  deletion).
- No live-backend, simulator, or device verification has been run (see verification record).

## Verification record

See the 2026-10-20 (foundation) and 2026-10-21 (MVP) entries in
`docs/engineering/CHANGELOG.md` for command results and outstanding native/device
checks, and the execution ledger in `docs/engineering/PRODUCTION_SPRINT_PLAN.md`
Appendix C. Re-run the commands above after
future changes; a JS export is not a successful native compilation.
