# SideQuests consumer mobile foundation

One Expo Router + React Native + strict TypeScript app for iOS and Android.
This task stops at the navigation foundation. No authentication, data integration,
maps, camera, QR, completion, points, redemption, or database changes are included.
Future integration must use the existing Supabase backend, with server-enforced
authorization; no second backend is introduced here.

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

The Jest integration suite renders the actual filesystem routes using
`expo-router/testing-library`, not a mocked navigation callback. It checks initial
Explore selection, tab order and switching, sample quest parameter delivery and
back navigation, direct quest links, and hiding the sample link outside development.
Native views are mocked by jest-expo; these tests do not prove device behavior.

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

The foundation runs without a `.env` file. If local native configuration is needed:

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
# Edit the ignored file; enter approved development identifiers only.
```

| Variable | Purpose |
| --- | --- |
| `APP_VARIANT` | `development` by default, or `staging`; `production` is rejected in this foundation |
| `MOBILE_IOS_BUNDLE_IDENTIFIER` | Approved iOS ID for the selected variant, required only for native iOS builds |
| `MOBILE_ANDROID_APPLICATION_ID` | Approved Android ID for the selected variant, required only for native Android builds |
| `EXPO_PUBLIC_SUPABASE_URL` | Placeholder for future existing-backend integration; currently unused |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Placeholder for a browser-safe publishable/anon key; currently unused |

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

## Next implementation entry points

| File/interface | Responsibility |
| --- | --- |
| `src/app/_layout.tsx` | Root native stack; anchors direct quest links to the tab group |
| `src/app/(tabs)/_layout.tsx` | Rewards / Explore / Profile tab ordering, initial Explore selection |
| `src/app/(tabs)/index.tsx` | Explore placeholder and the development-only sample link |
| `src/app/quests/[questId].tsx` | Quest detail; `useLocalSearchParams<{ questId: string }>()` receives the ID |
| `src/components/PlaceholderScreen.tsx` | Simple accessible text, scrolling, safe-area container |
| `__tests__/navigation.test.tsx` | Existing-route regression tests to extend with future screens |

Navigate to detail with the Router object form:
`{ pathname: '/quests/[questId]', params: { questId } }`. Preserve IDs as strings.
No mobile quest data contract or repository has been added yet. Inspect the existing
`src/types/db.ts`, `src/lib/db/repository.ts`, and Supabase migrations when integration
is authorized; do not import web UI or browser/localStorage repositories into native.

## Verification record

See the foundation entry in `docs/engineering/CHANGELOG.md` for the completed-run
results and outstanding native/device checks. Re-run the commands above after
future changes; a JS export is not a successful native compilation.
