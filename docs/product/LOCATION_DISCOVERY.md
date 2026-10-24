# Location, Discovery & Adventure Mode

**Status (2026-10-24):** Phase 0 reconciled; Phase 1–2 code and migrations authored and tested
locally only. **Not applied to any Supabase project, not natively compiled, not device-tested,
not store-reviewed.** Background (Adventure) flags are off by default and must stay off until the
release gates in §9 pass.

This is the authoritative document for location-based discovery, background proximity nudges
("Adventure"), and GPS presence verification. It condenses the 2026-10-23 build specification
(v1.0) and records how it was reconciled with the repository. Thresholds below are product
defaults to tune with evidence, not measured performance or platform guarantees.

**Outcome.** Help someone find a worthwhile quest near them, and — only if they separately opt in —
tell them about one while the app is in the background. Every location permission can be declined
and the app still lets them explore by area, start eligible quests, and use non-GPS verification.
Proximity helps discovery; it never establishes completion or earns XP/Points.

---

## 1. Phase 0 gap map (inspected at `9bc4245`, 2026-10-24)

| Area | Found | Consequence |
| --- | --- | --- |
| Mobile app | `apps/mobile`: Expo SDK 58, RN 0.88, strict TS, Router tabs + quest route; no auth, data, maps or location | Built location/discovery/adventure modules there; Explore placeholder replaced |
| Mobile auth | **None** | Adventure and GPS proof require sign-in, so they degrade to "Sign in required". Mobile sign-in is the next prerequisite (§10) |
| Venue coordinates | `venues.latitude/longitude` (double), no PostGIS | 0023 adds one generated `geography` column + GiST index; lat/lon stay the only editable source |
| Quest location | Venue only | 0023 adds a nullable per-quest override + public label |
| Duration / hours | `quests.estimated_time` and `venues.hours` are display strings | Not parsed. 0023 adds `estimated_minutes`, `venues.opening_hours` (structured) and `venues.timezone`; unknown ⇒ "Hours not confirmed" |
| Interests | `profiles.interests` (onboarding vibes: foodie, nightlife, wellness, culture, outdoor, community, hidden-gems) | Reused; mapped to `quest_category` in SQL |
| Saves | Web saves are client-only (no table) | 0023 `quest_feedback` stores save/hide/mute/fewer server-side; web saves are not migrated |
| Consent | `consent_type` = analytics/marketing/location; `location` means one-time verification (Privacy Policy 1.0.1) | New purposes added; `location` keeps its meaning. No silent migration |
| GPS verification | `complete_quest()` treats `gps` as verified with no check (SYSTEM_STATE blocker 10) | 0025 requires a server-computed, challenge-bound `inside` presence check for GPS quests |
| Difficulty / rewards | Enum `easy|medium|hard`, no `legendary`. PRODUCT_SPEC lists Hard 400 / Legendary 1000+ XP; MASTER_CONTEXT Legendary 1000+; the build spec's "latest decision" is Hard 300 XP/150 Points, Legendary 500/300 | **Conflict surfaced, not changed.** Discovery displays each quest's stored `xp_reward`/`points_reward`; no reward calculator. Owner must reconcile PRODUCT_SPEC and decide whether to add `legendary` |
| Migration replay | Full history does not replay (0001_schema/0006 conflict) | `supabase/tests/run-local.sh` replays the production path (skips 0001_schema, 0002_rls, 0003_functions, 0005) on local Postgres 16 + PostGIS |
| Native map provider | None on mobile (web uses Mapbox GL JS) | `react-native-maps`: Apple Maps on iOS; Android map only when an approved Google Maps key is configured, otherwise list view |
| Native IDs / signing / devices | None approved in repo | Blocker for native builds and all device claims |

## 2. Modes and effective capability

| Mode | Location access | Background |
| --- | --- | --- |
| Manual (default) | none; user picks an area | none |
| Explore | foreground, after permission | foreground watch stops when app is inactive |
| Adventure | foreground + separately granted background | OS geofences only; no continuous GPS |

- The **desired** mode is stored per installation; the **effective** state is computed every time
  (`apps/mobile/src/lib/adventure/capability.ts`). Adventure is effective only with: release flag on,
  background-capable build, signed in, foreground + background permission, precise accuracy,
  notification permission, not paused. The UI shows the actual state and the first missing piece.
- A one-time GPS check never enables Explore or Adventure.
- Manual and Explore work as a guest; Adventure requires sign-in.
- OS permission is a device fact and is never stored server-side as trusted state.

## 3. Defaults

| Setting | Value |
| --- | --- |
| Last-known sample max age / acceptable accuracy / UI wait | 2 min / 200 m / 8 s |
| Re-query after movement / throttle | 200 m / ≥ 30 s between automatic requests |
| Radius options / default / server bounds | 1, 3, 5, 10 km / 3 km / 250 m – 25 km |
| Page size / max | 30 / 100 |
| Score | `0.35·proximity + 0.25·interest + 0.20·time_fit + 0.10·novelty + 0.10·editorial`, ties by distance then id |
| Variety re-rank (first 6) | ≤ 2 per venue, ≤ 3 per category when alternatives exist |
| "Do now" buffer | remaining open time ≥ estimated minutes + 10 |
| Regions | ≤ 15 candidate regions + 1 refresh region (≤ 16 total, minus other features), both platforms |
| Nudge radius / refresh radius | 250 m (curated 150–400) / ≈ 2 km around a public area centroid |
| Bundle expiry | 24 h; server eligibility re-checked at claim |
| Nudge cap / min gap | 2 per rolling 24 h per account (user may lower to 1 or 0) / 3 h |
| Same quest / same venue suppression | 7 days / 24 h |
| Quiet hours | 21:00–10:00 in the user's configured IANA timezone; unknown timezone ⇒ no nudge |
| Background request budget | 3 s total, no retries; failure ⇒ no notification |
| GPS proof | sample ≤ 30 s old, accuracy ≤ 50 m, radius 75–150 m per quest (default 100) |
| Retention | nudge claims 30 days; presence checks keep outcome only; exact device coordinates never stored |

## 4. Data changes (migrations 0023–0025)

All additive, idempotent, commented, with rollback notes in each file.

**0023_location_discovery.sql**
- `postgis` extension (schema `extensions`).
- `venues.geog` generated from lat/lon (null for invalid or 0,0), GiST index; `venues.timezone`,
  `venues.opening_hours` (see format below), `venues.location_source`, `venues.location_checked_at`.
- `quests.location_latitude/longitude/label`, generated `quests.location_geog` + GiST index,
  `estimated_minutes`, `access_notes`, `is_sponsored`, `nudge_eligible` (default false),
  `nudge_radius_m` (default 250, 150–400), `verification_radius_m` (75–150), `editorial_quality`
  (0–1, default 0.5), `location_source`, `location_checked_at`.
- `discovery_areas` (public neighborhood centroids, Miami seed) — manual origins and refresh anchors.
- `quest_feedback` (user-owned: `save`, `hide`, `mute_venue`, `fewer_category`).
- `venue_open_state(hours, tz, at)`, `discover_nearby(...)`, `get_quest_card(...)`,
  `location_catalog_issues()` (admin curation check).

`opening_hours` format (local wall-clock times; an end earlier than start runs past midnight):

```json
{ "weekly": { "mon": [["09:00","17:00"]], "fri": [["18:00","02:00"]], "sun": [] },
  "exceptions": { "2026-12-25": [] } }
```

**0024_adventure_nudges.sql**
- `consent_type` += `location_foreground`, `location_background`, `notifications`,
  `sponsored_notifications`, `partner_marketing`; `consent_events` += `policy_version`,
  `installation_id`. `record_consent(...)` appends to the existing ledger.
- `nudge_settings` (account: cap, quiet hours, timezone, event-window override, pause).
- `nudge_installations` (per user+installation: adventure enabled, paused, consent version).
- `nudge_claims` (minimal reservation/result record; no coordinates; no client table grants).
- `app_feature_flags` (`nudge_delivery`, `sponsored_nudges`, both off).
- `get_geofence_bundle`, `claim_nudge`, `record_nudge_result`, `purge_nudge_records`.

**0025_gps_presence.sql**
- `presence_challenges`, `presence_checks` (outcome + reason category only).
- `create_presence_challenge`, `verify_gps_presence`; `complete_quest` gains
  `p_presence_check_id` and requires a fresh unused `inside` check for `gps` quests.

Not created, by design: location history, route breadcrumbs, partner visitor maps, a second
completion or points ledger.

## 5. RPC contracts

All return `jsonb`. Errors are `{"ok": false, "error": "<code>"}` with non-sensitive codes. Callers
never pass a user id; identity is `auth.uid()`. Request coordinates are used in memory and never
written or logged by these functions.

**`discover_nearby(p_origin_lat float8, p_origin_lng float8, p_area_id text, p_source text,
p_radius_m int, p_categories quest_category[], p_max_minutes int, p_limit int, p_cursor text)`**
— `security invoker`, anon + authenticated.
- `p_source`: `device` | `area` | `map`. `area` requires `p_area_id` (origin from
  `discovery_areas`); `device`/`map` require finite lat/lng.
- Errors: `invalid_origin`, `invalid_source`, `invalid_radius`, `invalid_limit`, `invalid_cursor`,
  `unknown_area`, `invalid_request` (`p_max_minutes` outside 1–600).
- Guests never read feedback or completions; personalization only with an authenticated caller.
- Returns `{ok, serverTime, origin:{source, areaId, label}, items: QuestCard[], nextCursor}`.
- Eligibility: active quest in its date window; active venue (when it has one); valid effective
  location within radius; not hidden/muted by the caller; completion and repeat cooldown respected.
  Sponsorship never overrides a filter.

**`QuestCard`** (allowlisted; never includes verification secrets, codes or private fields):
`id, title, description, category, difficulty, xpReward, pointsReward, imageUrl, venueId,
venueName, locationLabel, latitude, longitude, distanceM (rounded to 10 m, null for get_quest_card),
estimatedMinutes, verificationType, accessNotes, isSponsored, startsAt, endsAt,
availability:{state: open|closed|unknown, closesAt}, reasons: string[], score`.

Reason codes: `nearby` (≤ 1 km), `matches_<category>_interest`, `fits_<n>_minutes`,
`saved_quest`, `event_available` (time-boxed quest). Never "popular" or "open now" without data.

**`get_quest_card(p_quest_id uuid)`** — invoker. `{ok, serverTime, state, quest}` where `state` is
`available | completed | cooldown | inactive | expired | not_found`; `quest` is null for
`not_found`/inactive.

**`get_geofence_bundle(p_origin_lat, p_origin_lng, p_installation_id uuid)`** — authenticated only
(`auth_required`). Origin must be an actual device sample. Returns
`{ok, version, serverTime, expiresAt, deliveryEnabled, coverage:{areaId,label},
refreshRegion:{id, latitude, longitude, radiusM}, regions:[{id, latitude, longitude, radiusM,
questIds}], candidates:[{questId, regionId, title, category, xpReward, pointsReward,
estimatedMinutes, venueId}]}`. ≤ 15 regions; colocated quests share a region
(`v:<venue_id>`, or `q:<quest_id>` for an override location), chosen within 10 km. The refresh
region sits on the nearest `discovery_areas` centroid (radius 2–5 km, sized to contain the device;
`refreshRegion` and `coverage` are null when no area is within 4.5 km). The bundle echoes neither
the origin nor distances. Candidates are `nudge_eligible`,
not sponsored, with known duration, and known hours or an explicit event window.

**`claim_nudge(p_installation_id uuid, p_idempotency_key text, p_quest_id uuid, p_region_id text,
p_catalog_version text, p_policy_version text)`** — `security definer`, authenticated only.
Per-user advisory lock; idempotent on `(user, idempotency_key)` — a replay re-checks the delivery
flag, consent and pause first, so a pause made after the first claim turns it into a deny. Only
allowed claims are stored. Malformed input returns `{ok:false, error:'invalid_request'}`. Denial reasons:
`auth_required, invalid_request, delivery_disabled, consent_missing, paused, timezone_unknown,
quiet_hours, cap_reached, min_gap, quest_suppressed, venue_suppressed, not_eligible,
availability_unknown, closed, invalid_candidate`. Allow returns
`{ok:true, allow:true, claimId, replay, quest:{id,title,category,xpReward,pointsReward}}`;
deny returns `{ok:true, allow:false, reason}`. A claim is never attendance.

**`record_nudge_result(p_claim_id uuid, p_outcome text)`** — definer, own claims only. Outcomes:
`scheduled`, `schedule_failed` (from `reserved`), `opened` (from `scheduled`). Cannot touch rewards.
Errors: `auth_required`, `invalid_request`, `not_found` (also for another user's claim),
`invalid_transition`.

**`record_consent(p_purpose consent_type, p_granted bool, p_policy_version text,
p_installation_id uuid, p_source text)`** — definer, authenticated; appends one event.

**`create_presence_challenge(p_quest_id uuid)`** → `{ok, challengeId, expiresAt}` (2 min). Errors:
`auth_required`, `not_found`, `quest_inactive`, `not_gps_quest`, `location_unavailable`,
`rate_limited` (10 per 10 minutes).
**`verify_gps_presence(p_challenge_id uuid, p_latitude, p_longitude, p_accuracy_m,
p_captured_at timestamptz)`** → `{ok, outcome: inside|outside|uncertain, reason, checkId}`.
Reasons: `ok`, `outside_radius`, `ambiguous`, `stale_sample`, `low_accuracy`, `invalid_sample`;
consumed, expired, foreign or unknown challenges return `challenge_invalid`. `complete_quest` on a
GPS quest without a fresh unused `inside` check returns `presence_required`; anon can no longer
execute `complete_quest` (the web only calls it signed in).
Rule: inside if `distance + accuracy ≤ radius`; outside if `distance − accuracy > radius`;
otherwise uncertain. Stale/low-accuracy/invalid samples are `uncertain`; replayed or expired
challenges are rejected. Uncertain offers retry, QR or staff verification — never an automatic
penalty or a widening radius. GPS alone is not fraud-proof.

## 6. Mobile implementation (apps/mobile)

| Path | Responsibility |
| --- | --- |
| `index.ts` | Entry: imports background task definitions before `expo-router/entry` |
| `src/lib/config.ts` | Supabase URL/key and feature flags from `EXPO_PUBLIC_*` |
| `src/lib/api/rpc.ts` | Minimal PostgREST RPC client with abort/timeout; never logs bodies |
| `src/lib/auth/session.ts` | Access-token seam; returns null until mobile auth exists |
| `src/lib/location/` | Application location types, sample-quality rules, `expo-location` adapter |
| `src/lib/discovery/` | Safe DTO types, RPC calls, variety re-rank, distance/availability copy, Miami areas |
| `src/lib/adventure/` | Capability gate, quiet hours, region selection, nudge pipeline, geofence task, notifications, cleanup |
| `src/lib/storage/deviceStore.ts` | Persisted per-installation settings (mode, pause, installation id, bundle, region state) — never device coordinates |
| `src/app/(tabs)/index.tsx` | Explore: area selector, Near me, list/map, radius/category/duration filters, Adventure status |
| `src/app/settings/location.tsx` | Location & nearby-alert settings, pause, explicit disclosure flow |
| `src/app/quests/[questId].tsx` | Safe quest card with fresh server state; unavailable state with alternatives |

Flags: `EXPO_PUBLIC_FEATURE_NEARBY` (foreground discovery, default on),
`EXPO_PUBLIC_FEATURE_ADVENTURE` (UI + registration, default off), and build-time
`MOBILE_BACKGROUND_LOCATION=1` (adds the background permission to the native artifact; omitted ⇒
foreground-only build). Server `app_feature_flags.nudge_delivery` is the emergency stop for claims.

Pause/sign-out ordering: the persisted local gate flips **first**, then regions are unregistered,
pending nudges cancelled, cached candidates cleared, and the server preference updated. Every
geofence callback re-reads the gate before and after the network claim.

## 7. Privacy (draft policy change — not yet published)

The live Privacy Policy (1.0.1) describes location only as a one-time verification input. Before
any build with Adventure enabled ships, publish a new policy version through the
`docs/legal/README.md` process. Draft disclosure, to be checked against the shipped behavior:

> SideQuests uses your location in the background to notice when you are near eligible quests and
> send optional nearby alerts, even when you are not using the app. We use proximity checks rather
> than saving a route history. We keep a minimal record of which quest alerts were sent, for up to
> 30 days, to enforce alert limits and troubleshoot. You can pause this in Settings at any time.

Also required: foreground discovery (coordinates used per request, not stored), GPS presence
(outcome only), separate notification and promotional consent, Apple privacy labels, Google Data
Safety, and the Play background-location declaration with a real demo video. Partner reporting
stays aggregate (suppress cohorts under 10); a geofence transition is never "verified foot traffic".

## 8. Verification (what ran)

Recorded per run in `docs/engineering/CHANGELOG.md`. Unit/UI tests use mocked native modules and
mocked network; local DB tests run on Postgres 16 + PostGIS 3.4 with a test-only Supabase shim
(`supabase/tests/`, `npm run db:test`, also a CI job). **None of this proves device, OS-delivery,
battery, or production behavior.**

`venue_open_state` returns `unknown` when today's intervals don't make the venue open and
yesterday's hours are missing (a late-night spill can't be ruled out). Purge functions
(`purge_nudge_records`, `purge_presence_records`) exist but nothing schedules them yet — the owner
must add a `pg_cron` job (daily) after applying 0024/0025.

Known gap outside this scope: `staff_approval` verification still trusts the client.

## 9. Release gates (all open)

1. Owner reviews and applies 0023–0025 to a non-production project; `scripts/verify-db.sql` and
   the local suite pass there; query plan checked on the real catalog.
2. Curators fill coordinates, timezone, structured hours, duration and nudge eligibility;
   `location_catalog_issues()` is empty for nudge-eligible quests.
3. Mobile sign-in exists (Adventure and GPS proof depend on it).
4. Updated Privacy/Cookie policy published; consent copy matches it.
5. Approved native IDs, signing, Google Maps key (Android map) and Expo project.
6. Physical-device evidence: iPhone, Pixel-class, Samsung-class — permissions, geofence delivery,
   notification routing (cold/warm), pause/sign-out cleanup, reboot/force-stop, battery baseline
   (provisional ≤ 3 points over 8 h). Field test in Wynwood and Little River.
7. Apple review and Google Play background-location approval; keep the foreground-only build path.
8. Sponsored nearby alerts stay disabled pending separate content, consent and store review.

## 10. Next prerequisite

Mobile authentication on the existing Supabase Auth (with the signup consent capture already used
by the web), wired into `src/lib/auth/session.ts`. Until then Adventure and GPS proof correctly
show "Sign in required".

## 11. Out of scope for v1

Continuous route tracking, friend tracking, advertising audiences, indoor positioning, navigation
or ETAs (external maps app only), dwell detection, offline nudge queue, LLM/embedding
recommendations, a new backend, an experiment platform, remote push.
