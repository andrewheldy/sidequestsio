# SideQuests.io — Codebase Audit Report

> **Phase −1 deliverable.** This documents what *actually exists* in the
> repository as of branch `claude/sidequests-codebase-audit-r9v8l6`
> (HEAD `c499497`, PR #36). It is derived from reading the source, not from
> `ARCHITECTURE.md` or `README.md`, both of which describe an intended design
> that the running code only partially matches. Discrepancies are called out
> explicitly.

---

## 0. Executive Summary

SideQuests.io is a **Vite + React 18 + TypeScript SPA** (Lovable-generated)
with shadcn-ui, Tailwind, React Router v6, and TanStack Query, plus a Supabase
backend (Postgres + Auth + RLS + RPCs). It was built across ~15+ independent
Claude PR branches (see `git log --merges`), and that history shows: the project
contains **two parallel, partially-reconciled architectures** layered on top of
each other.

**The three biggest structural findings:**

1. **Split-brain profile model.** Two separate profile systems coexist. The
   auth/onboarding/settings UI reads & writes a `public.profiles` table
   (one-row-per-auth-user). The game engine (Repository + all RPCs) reads &
   writes `public.users` + `public.user_profiles`. **XP/points earned by
   completing a quest land in `user_profiles`; the Profile screen displays
   `profiles`.** The two never sync.

2. **Two migration lineages in one folder.** `0001_profiles → 0002_profile_overhaul
   → 0003_avatars_storage → 0004_phone_social` (the *profiles* lineage) and
   `0001_schema → 0002_rls → 0003_functions` (the *game* lineage) have
   **colliding file numbers** and **colliding triggers**. `0006_game_schema`
   + `0007_rls_idempotent` were added to consolidate them, and the
   `supabase/README.md` prescribes a *specific subset/order*. Running the folder
   naively (all files, in filename order) produces conflicts.

3. **A large, fully-built admin + partner + wallet/rewards/leaderboard surface
   that is not routed at all.** 18 page components exist, are wired to the
   Repository, and are unreachable because `App.tsx` never declares their routes.

The demo the team currently shows runs on `MockRepository` (read-only, writes
throw) fed by static JSON — **not** the `LocalRepository` that `ARCHITECTURE.md`
advertises as "the fully functional local backend." That `LocalRepository`
(which contains real ledger/completion/inventory logic) is effectively orphaned.

Overall: the **marketing site is production-grade**; the **backend schema/RPC/RLS
design is strong and mostly complete**; the **gap is in wiring** — routing,
profile-model unification, and connecting the polished backend to the parts of
the UI users can actually reach.

---

## 1. Current Architecture Diagram (as-built)

```
┌──────────────────────────── React SPA (Vite, single bundle) ────────────────────────────┐
│                                                                                           │
│  MARKETING (reachable, static)        APP SHELL /app/* (reachable)                        │
│  / /quests /community-notes           ├ explore  ← DEMO_QUESTS (static json)              │
│  /verticals /partnerships /hosts      ├ map      ← DEMO_QUESTS + Mapbox                   │
│  /privacy /terms                      ├ quests   ← Repository.listQuests() + DEMO fallback│
│   └ hardcoded + i18n strings          ├ community-notes ← Repository.listNotes...         │
│                                       ├ checkin  ← Repository.listQuests()  [Protected]   │
│  PUBLIC APP (reachable)               ├ favorites← localStorage           [Protected]    │
│  /auth /onboarding                    ├ profile  ← AuthContext(profiles)   [Protected]    │
│  /u/:username  ← public_profiles view └ settings ← AuthContext(profiles)   [Protected]    │
│  /quests/:id   ← Repository + scanFlow                                                     │
│  /q/:id /scan/:code ← scanFlow (record_scan)                                              │
│                                                                                           │
│  ❌ ORPHANED (built, NOT routed): /app AppHome, History, Leaderboard, Rewards, Wallet,    │
│     AppCommunityNotes(dup); ALL /admin/* (7 pages); ALL /partner/* (5 pages)             │
│                                                                                           │
│            UI ──► getRepository() ──┬─ MockRepository   (VITE_DATA_SOURCE=mock)           │
│   (TanStack Query)                  ├─ SupabaseRepository(VITE_SUPABASE_URL set)          │
│                                     └─ LocalRepository  (default / no env)  ← ~orphaned   │
│            AuthContext ──► supabase.from('profiles')   (separate client, separate table)  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                            │ (Supabase mode only)
        ┌───────────────────────────────────┴───────────────────────────────────┐
        ▼                                                                         ▼
  GAME LINEAGE (Repository/RPC target)                          PROFILES LINEAGE (Auth target)
  users, user_profiles, privacy_preferences,                    profiles (1 row / auth user)
  partners, venues, quests, qr_codes,                           public_profiles (view)
  scan_events, quest_attempts, quest_completions,               avatars bucket
  points_ledger, rewards, reward_redemptions,                   ▲ written by AuthContext,
  community_notes(+note_reports), leaderboard_snapshots,        │ Onboarding, Settings
  analytics_rollups, consent_events, audit_logs                 │
  RPCs: record_scan, start_quest, complete_quest,               └─ NEVER synced to user_profiles
        redeem_reward, create_community_note, adjust_points,
        get_leaderboard, partner/platform_analytics, create_qr_code
```

**Runtime modes (important — they are not equivalent):**

| Mode | Trigger | Data layer | Auth | What works |
|------|---------|-----------|------|------------|
| **Default** | no env vars | `LocalRepository` | **not configured** (`/auth` returns "not set up") | Marketing + guest preview of Explore/Map/Quests. Cannot sign in → all `[Protected]` pages unreachable. |
| **Demo** | `VITE_DATA_SOURCE=mock` | `MockRepository` (**writes throw** "Demo mode") | demo sign-in toggle injects a fake user | Browse everything; **completing quests & redeeming rewards fail**. |
| **Production** | `VITE_SUPABASE_URL` + anon key | `SupabaseRepository` (RPC-backed) | real Supabase auth | Full flows — subject to the profile split-brain & routing gaps below. |

> Note: the `ARCHITECTURE.md` claim that `LocalRepository` is "what runs out of
> the box — fully functional" is no longer true. Out of the box you get
> `LocalRepository` for data but **no auth**, so the rich local logic is never
> exercised; the actual demo path uses the read-only `MockRepository`.

---

## 2. Database Inventory

### 2a. Migration files (the folder is the single biggest source of confusion)

| File | Lineage | Lines | Role |
|------|---------|------:|------|
| `0001_profiles.sql` | **Profiles** | 89 | `profiles` table, `handle_new_user()` + `on_auth_user_created` trigger, `set_updated_at`. |
| `0001_schema.sql` | **Game** | 305 | 19 game tables, all enums, indexes, `community_notes_with_author` view. **Same number as above.** |
| `0002_profile_overhaul.sql` | Profiles | 64 | bio/social columns, privacy flags, `public_profiles` view. |
| `0002_rls.sql` | Game | 134 | `app_uid/is_admin/owns_partner` helpers + RLS on all game tables. **Same number.** |
| `0003_avatars_storage.sql` | Profiles | 50 | `avatars` storage bucket + object policies. |
| `0003_functions.sql` | Game | 393 | 11 SECURITY DEFINER RPCs + `handle_new_auth_user()` re-defining `on_auth_user_created`. **Same number.** |
| `0004_phone_social.sql` | Profiles | 43 | phone/youtube/snapchat columns; rebuilds `public_profiles`. |
| `0005_note_reports.sql` | Game | 96 | `note_reports` table + `flag_count` + flag-sync trigger. |
| `0006_game_schema.sql` | **Consolidated** | 500 | Re-applies the entire game schema + profile-overhaul columns + note_reports + avatars onto a DB that only has `0001_profiles`. Trigger `on_auth_user_created_game` → its `handle_new_auth_user()` **also inserts a `profiles` row**. |
| `0007_rls_idempotent.sql` | Consolidated | 266 | Idempotent re-statement of all RLS (drop-before-create). Supersedes `0002_rls`. |
| `0008_profile_is_public.sql` | Profiles | 5 | adds `profiles.is_public`. |

`supabase/README.md` prescribes running **only** `0001_profiles → 0006 → 0007 →
0003_functions → 0003_avatars_storage`, and marks `0001_schema, 0002_rls,
0002_profile_overhaul, 0004_phone_social, 0005_note_reports` as *superseded*.
`0008` is not mentioned in that table.

**⚠️ Trigger collision (Critical).** Three files define a trigger on
`auth.users`:
- `0001_profiles.sql`: `on_auth_user_created` → `handle_new_user()` (inserts `profiles` only).
- `0003_functions.sql`: drops & recreates `on_auth_user_created` → `handle_new_auth_user()` that inserts `users/user_profiles/privacy_preferences` **but NOT `profiles`**.
- `0006_game_schema.sql`: `on_auth_user_created_game` → `handle_new_auth_user()` that inserts all of the above **plus `profiles`**.

Both `0003` and `0006` define a function of the **same name** `handle_new_auth_user()`.
Following the README order, **`0003_functions` runs last → its version wins →
the final function does NOT create a `profiles` row.** Result on a fresh signup:
`users/user_profiles/privacy_preferences` get created, but `profiles` does not
(unless the `0001_profiles` trigger still fires — but `0003` dropped it). See
§4 for the user-visible failure.

### 2b. Tables (game lineage — the Repository target)

| Table | Purpose | Key fields | Relationships | Constraints / Indexes | Used by |
|-------|---------|-----------|---------------|----------------------|---------|
| `users` | identity mirror of `auth.users` | id(PK), email, display_name, role enum, account_status | — | unique(email) | RPCs, AdminUsers, leaderboard |
| `user_profiles` | gamification stats | user_id(PK→users), xp, level, points_balance_cache, lifetime_points, counts | →users | — | complete_quest/redeem RPCs; Profile *should* use, doesn't |
| `privacy_preferences` | consent/visibility | user_id(PK), analytics/marketing/location consent, leaderboard/profile visibility | →users | — | Settings, leaderboard opt-out |
| `partners` | partner orgs | id(PK), name, type, status, owner_user_id | →users | — | owns_partner(), admin/partner pages |
| `venues` | partner locations | id(PK), partner_id, lat/lng, status | →partners | — | quests, analytics |
| `quests` | quest definitions | id, partner_id, venue_id, category, difficulty, xp/points_reward, verification_type+secret, status, dates | →partners,→venues | idx(status), idx(partner) | listQuests, QuestDetail |
| `qr_codes` | scannable codes | id, quest_id, partner_id, code(unique), destination_url, status | →quests,→partners | unique(code) | scanFlow resolveByCode, PartnerQrCodes |
| `scan_events` | scan tracking (append-only) | id, quest_id, qr_code_id, user_id?, anonymous_session_id, device/browser/os, conversion_state | →quests,→qr_codes,→users? | idx(partner,time), idx(quest) | record_scan RPC, analytics |
| `quest_attempts` | in-progress attempts (idempotent) | id, user_id, quest_id, status, verification_method | →users,→quests | — | start_quest RPC |
| `quest_completions` | finished quests | id, user_id, quest_id, xp/points_awarded, source_scan_id | →users,→quests | **unique(user_id,quest_id)**, idx(user/partner) | complete_quest, History |
| `community_notes` | ≤280-char notes | id, user_id, quest_id, content, image_url, moderation_status, flag_count | →users,→quests | check(len≤280), idx(quest,mod) | notes RPCs, moderation |
| `note_reports` | abuse reports | id, note_id, reporter_id, reason, status | →community_notes,→users | unique(note,reporter) | (no UI yet — see §5) |
| `points_ledger` | **append-only source of truth** for points/XP | id, user_id, transaction_type, source, points/xp_amount, refs, metadata | →users,→quests,→rewards,→partners | idx(user,time) | all award/spend RPCs, Wallet |
| `rewards` | redeemable items | id, partner_id, points_cost, inventory, status, expiration | →partners | — | listRewards, Rewards page |
| `reward_redemptions` | redemptions | id, user_id, reward_id, points_spent, redemption_code, status | →users,→rewards,→partners | idx(partner) | redeem_reward RPC |
| `leaderboard_snapshots` | precomputed ranks | scope, user_id, score, rank, period | →users | — | **unused** (leaderboard is computed live by RPC) |
| `analytics_rollups` | daily aggregates | partner/venue/quest/date, counts | →partners… | unique(partner,venue,quest,date) | **unused** (analytics computed live by RPC) |
| `consent_events` | consent audit | user_id, consent_type, granted, source | →users | — | recordConsent |
| `audit_logs` | sensitive-action log | actor_id, action, entity_type/id, metadata | →users? | — | RPCs write; AdminAnalytics reads |

### 2c. Tables (profiles lineage — the Auth target)

| Table / object | Purpose | Notes |
|----------------|---------|-------|
| `profiles` | one row per auth user: display_name, username(unique), avatar_url, home_city, bio, all social URLs, phone, privacy flags (`is_public`, `is_profile_public`, `show_*`), **xp/level/streak**, interests, quest_style/energy, starting_area, onboarding_completed | This is what **AuthContext/Onboarding/Settings/Profile** actually use. Has its **own** xp/level columns, distinct from `user_profiles`. |
| `public_profiles` (view) | privacy-safe public projection of `profiles` where `is_profile_public`; social links gated by `show_social_links`; phone never exposed | Read by `/u/:username` (PublicProfile). `security_invoker=false`. |
| `community_notes_with_author` (view) | notes joined to `users.display_name/avatar` | Read by SupabaseRepository note listing. |
| `avatars` (storage bucket) | public-read, 5 MB cap, per-`{uid}/` write policy | Used by AvatarUploader. |

### 2d. RPCs (SECURITY DEFINER), Triggers, Indexes, Buckets

- **RPCs (11):** `level_for_xp`, `record_scan`, `start_quest`, `complete_quest`,
  `redeem_reward`, `create_community_note`, `adjust_points`, `get_leaderboard`,
  `partner_analytics`, `platform_analytics`, `create_qr_code`. All target the
  **game** tables; all called by `SupabaseRepository`.
- **Helper fns:** `app_uid()`, `is_admin()`, `owns_partner()`.
- **Triggers:** `on_auth_user_created` / `on_auth_user_created_game` (signup
  bootstrap — see collision above); `profiles_set_updated_at`;
  `note_reports_sync_flags` (flag tally → auto-`flagged` at ≥3).
- **Indexes:** present on the documented hot paths (quests.status/partner,
  scan_events partner+time / quest, completions user/partner, ledger user+time,
  notes quest+moderation, redemptions partner, note_reports note/reporter/status).
- **Storage buckets:** `avatars` only.
- **Edge functions:** **none** (`supabase/functions/` does not exist). The
  "edge function" rollup job mentioned in `ARCHITECTURE.md §15` is not built.

---

## 3. Route Inventory

### Reachable (declared in `src/App.tsx`)

| Route | Component | Guard | Data source |
|-------|-----------|-------|-------------|
| `/` | Index | — | hardcoded + i18n |
| `/quests` | Quests | — | `DEMO_QUESTS` (static) |
| `/community-notes` (`/breadcrumbs`→redirect) | CommunityNotes | — | hardcoded samples |
| `/verticals`, `/verticals/:slug` | Verticals / VerticalDetail | — | hardcoded |
| `/partnerships`, `/hosts` | Partnerships / Hosts | — | hardcoded + ContactForm |
| `/privacy`, `/terms` | Privacy / Terms | — | static |
| `/auth` | Auth | — | AuthContext signIn/signUp |
| `/onboarding` | Onboarding | — | AuthContext + localStorage |
| `/u/:username` | PublicProfile | — | `public_profiles` view |
| `/quests/:questId` | QuestDetail | — (sign-in to complete) | Repository + scanFlow + analytics |
| `/q/:questId` | QrLanding | — | `recordQuestScan()` → redirect |
| `/scan/:code` | ScanResolve | — | `resolveByCode()` → redirect |
| `/app` | AppLayout | onboarding gate | — |
| `/app/explore` | Explore | — | `DEMO_QUESTS` |
| `/app/map` | MapView | — | `DEMO_QUESTS` + Mapbox |
| `/app/quests` | QuestBrowser | — | Repository + `DEMO_QUESTS`/`MIAMI_QUESTS` fallback |
| `/app/community-notes` | AppCommunityNotes | — | Repository |
| `/app/checkin` | CheckIn | **ProtectedRoute** | Repository |
| `/app/favorites` | Favorites | **ProtectedRoute** | `MIAMI_QUESTS` + FavoritesContext (localStorage) |
| `/app/profile` | Profile | **ProtectedRoute** | AuthContext(`profiles`) + Repository privacy |
| `/app/settings` | Settings | **ProtectedRoute** | AuthContext(`profiles`) + Repository |
| `*` | NotFound | — | static |

### ❌ Orphaned (component exists, wired to Repository, **no route declared**)

- **App:** `AppHome.tsx`, `History.tsx`, `Leaderboard.tsx`, `Rewards.tsx`,
  `Wallet.tsx` (plus a second `pages/app/AppLayout.tsx` that duplicates the
  routed one and a `pages/app/CheckIn` variant — see §6).
- **Admin (all 7):** AdminHome, AdminUsers, AdminQuests, AdminPartners,
  AdminCommunityNotes, AdminRewards, AdminAnalytics. Nav exists in
  `dashboard/navs.ts` (`/admin/*`) but no `<Route>`.
- **Partner (all 5):** PartnerHome, PartnerQuests, PartnerAnalytics,
  PartnerRewards, PartnerQrCodes. Nav exists (`/partner/*`) but no `<Route>`.

Guards `RequireAuth` / `RequireRole` in `components/app/Guards.tsx` are **never
imported** (they were meant to gate the unrouted admin/partner areas). Only
`ProtectedRoute.tsx` is active.

---

## 4. Authentication Audit

**Providers:** email/password only in code (`signUp`/`signInWithPassword`).
`signUp` sets `emailRedirectTo: /app`. README mentions Google/Apple/magic-link
but no OAuth handling exists in `AuthContext`. Role comes from
`user.user_metadata.role` (default `'user'`) — note this differs from the RLS
layer, which reads `users.role` (the table column), so client-role and
server-role can disagree.

**Flow as-built:** `getSession()` → set user → `fetchProfile()` reads
`profiles` by `user_id` (`.maybeSingle()`). `onAuthStateChange` re-fetches via
`setTimeout(…,0)`. `loading` is cleared in the `getSession().finally`.

**Verified failure cases:**

1. **Missing-profile (Critical, depends on migration order).** Per §2a, with the
   README's apply order the signup trigger does **not** create a `profiles`
   row. Then:
   - `fetchProfile` → `profiles` returns null → `profile = null`.
   - `ProtectedRoute` guard is `if (profile && !profile.onboarding_completed)`.
     With `profile === null` the condition is **false**, so the user is *let
     through* the onboarding gate into `/app/profile` etc. with `profile = null`
     → Profile/Settings render empty/broken, not an infinite loop but a broken
     session.
   - `completeOnboarding()` and `updateProfile()` issue `UPDATE profiles … WHERE
     user_id = …`. With no row, this updates **0 rows, returns no error**, and
     `fetchProfile` re-reads null → **onboarding silently never persists**; the
     user can loop through onboarding forever with nothing saved.
2. **No-env mode (High).** When Supabase isn't configured, `signIn/signUp`
   return the "not set up" message, so the entire `[Protected]` surface is
   unreachable in the default build, despite `LocalRepository` being active for
   data.
3. **Infinite-loading (Medium).** `loading` only resolves inside the
   `getSession()` promise. If that call hangs (network/misconfig) with
   `isSupabaseConfigured===true`, `LoadingScreen` shows indefinitely — there is
   no timeout/fallback.
4. **Profile split-brain (Critical, see §0/§2).** Even when everything is
   provisioned, the XP/level/points shown on `/app/profile` come from
   `profiles.xp/level` (seeded to 100/1 at onboarding and never updated by
   gameplay), while real gameplay writes `user_profiles`. Completing quests will
   not change the displayed stats.

---

## 5. Quest, QR & Community-Notes System Audit

**Quests.** Stored in `quests` (game lineage) for prod; the *demo/marketing*
surfaces render from static `src/data/demo/demoQuests.ts` and
`src/data/miami/*` (geocoded Miami dataset + `toQuest.ts`). `QuestDetail`
(`/quests/:id`, reachable) is the real, data-driven page: it loads via
Repository, records a scan/view through `scanFlow`, fires the analytics funnel,
and runs completion. `QuestBrowser` falls back to `DEMO_QUESTS`/`MIAMI_QUESTS`
on empty/timeout. Quest "funky actions" (website/social/Google-review/reservation
links) live in the quest data model and render on `QuestDetail`.

**Completion & rewards.** `complete_quest` RPC is the real path: verifies
(`venue_code` checks `verification_secret`; qr/nfc/gps/staff pass post-scan),
inserts completion (unique-guarded), writes ledger, updates `user_profiles`
cache + level, marks scan converted, audit-logs — all atomic. `redeem_reward`
spends atomically with inventory decrement + code issuance. **In demo mode these
throw** (`MockRepository` writes disabled), so the demo cannot complete or
redeem.

**Links / rewards storage.** Rewards in `rewards`/`reward_redemptions`; quest
links are quest-data fields rendered client-side (tracked via `link_clicked`,
`website_click`, `google_review_click`, `social_share_click`).

**QR system.** `scan/:code` → `resolveByCode()` looks up `qr_codes.code` → quest;
`q/:id` → `recordQuestScan()` for direct links. Both call `record_scan` RPC
(records device bucket, anon session, conversion_state) then redirect with
`?scan=<id>` for completion attribution. Anonymous session id = `anon_<nanoid16>`
in localStorage (`session.ts`), with `pendingScan` carried through sign-in.
`create_qr_code` RPC mints codes; `PartnerQrCodes` page calls it — **but that
page is orphaned, and there is NO QR-image library** (`qrcode`/`react-qr-*` not
in deps), so the system can store codes and destination URLs but **cannot render
or print an actual QR image** anywhere. This is the single biggest functional
gap in the "QR" product.

**Community notes.** `create_community_note` enforces completer-only + ≤280.
Moderation status + crowd reporting (`note_reports`, auto-`flagged` at ≥3) exist
in SQL, but **no end-user "report note" UI** and the **AdminCommunityNotes
moderation page is orphaned**, so moderation is unreachable in the running app.

---

## 6. Technical Debt Report (ranked)

| # | Item | Severity | Detail |
|---|------|----------|--------|
| 1 | **Profile split-brain (`profiles` vs `users`+`user_profiles`)** | **Critical** | Two XP/points stores; gameplay never updates the displayed profile. Pick one model. |
| 2 | **Auth trigger collision / order-dependent profile creation** | **Critical** | Same-named `handle_new_auth_user()` in `0003`+`0006`; README order yields a function that omits the `profiles` insert. |
| 3 | **Duplicate/contradictory migration numbering** | **Critical** | Two `0001/0002/0003`. Naive apply (filename order) breaks; correctness depends on out-of-band README instructions. |
| 4 | **18 orphaned pages (admin ×7, partner ×5, app ×6)** | **High** | Built + Repository-wired but no routes → entire partner & admin products are inaccessible. |
| 5 | **No QR image generation** | **High** | Core "scan a QR" product cannot produce printable codes. |
| 6 | **Demo path uses read-only `MockRepository`, not `LocalRepository`** | **High** | Demo can't complete quests/redeem; the rich `LocalRepository` logic is orphaned; contradicts `ARCHITECTURE.md`. |
| 7 | **Analytics sink is local-only** | **High** | `track()` writes a 500-cap localStorage ring (`sq.events`); no warehouse/remote sink registered → no real analytics despite a rich event catalogue (~35 events). |
| 8 | **Unused tables** | **Medium** | `leaderboard_snapshots` & `analytics_rollups` never written/read (RPCs compute live); the nightly rollup job (ARCH §15) doesn't exist. |
| 9 | **Duplicate components/pages** | **Medium** | `pages/app/AppLayout.tsx` (orphan) duplicates the routed shell; `components/app/CommunityNotes.tsx` vs `pages/app/AppCommunityNotes.tsx` vs `pages/CommunityNotes.tsx`; two Supabase clients (`lib/supabase.ts` eager vs `lib/supabase/client.ts` lazy). |
| 10 | **`note_reports` has no reporting UI** | **Medium** | Backend abuse-reporting flow with no front door. |
| 11 | **Client role ≠ server role** | **Medium** | Guards read `user_metadata.role`; RLS reads `users.role`. Can diverge. |
| 12 | **Committed Supabase URL + anon key in `.env.example`** | **Medium** | Anon key is public-by-design, but committing a real project URL/key invites confusion and accidental shared-project writes; should be placeholders. |
| 13 | **No timeout on auth `loading`** | **Medium** | Possible permanent `LoadingScreen` on a hung `getSession()`. |
| 14 | **`0008_profile_is_public` missing from README order; `is_public` vs `is_profile_public` overlap** | **Low** | Two near-identical visibility flags on `profiles`. |
| 15 | **No tests; geocoding scripts are one-offs** | **Low** | `scripts/geocode-miami-*` are dev utilities; no unit/RLS tests anywhere (ARCH §15 item 8 unmet). |
| 16 | **Dead `LocalRepository` seed path & `import_notes.sql` placeholders** | **Low** | Manual UUID-substitution seeding is brittle. |

---

## 7. Gap Analysis (Current vs Desired) — completion estimates

Legend: **E**=Existing & working · **P**=Partially built · **M**=Missing · **R**=Needs rewrite/reconcile

| Feature | State | % | Notes |
|---------|-------|---:|------|
| Marketing site | E | **95%** | Polished, i18n (8 langs), responsive. |
| Authentication (email signup/login) | P | **75%** | Works in Supabase mode; trigger/order fragility + missing-profile case. |
| Profile system | R | **55%** | Split-brain; must unify `profiles`↔`user_profiles`. |
| Onboarding | P | **75%** | Good UX; persistence breaks if no `profiles` row. |
| Public profiles (`/u/:username`) | E | **85%** | View-backed, privacy-gated. |
| Quest catalog / browse (demo) | E | **85%** | Static + Repository fallback. |
| Quest detail page | E | **75%** | Real data + funnel; verification is light client-side. |
| Quest completion (prod, end-to-end) | P | **60%** | RPC solid; reachable only via `/quests/:id`; demo path broken. |
| QR scan tracking | P | **65%** | `record_scan` + scanFlow good; attribution present. |
| QR code generation (printable) | M | **15%** | RPC mints codes; **no image rendering**; page orphaned. |
| Rewards & redemption | P | **60%** | RPC + pages built; **Rewards page orphaned**; demo writes fail. |
| Points ledger / Wallet | P | **55%** | Ledger solid; **Wallet page orphaned**. |
| Leaderboards | P | **60%** | RPC live-computes; **Leaderboard page orphaned**; snapshots table unused. |
| Community notes | P | **65%** | Create/list/moderate in SQL; report UI + moderation page missing/orphaned. |
| Analytics — capture | E | **70%** | Rich typed event catalogue, guarded against re-render overcount. |
| Analytics — delivery/dashboards | P | **25%** | Local-only sink; partner/admin dashboards built but **orphaned**. |
| Partner dashboard | P | **40% built / 0% reachable** | 5 pages Repository-wired, not routed, no role guard. |
| Admin tools | P | **45% built / 0% reachable** | 7 pages Repository-wired, not routed, no role guard. |
| RLS / security model | E | **80%** | Comprehensive; correctness hinges on applying the right migration subset. |
| Demo mode | P | **60%** | Read-only; diverges from `LocalRepository`; can't exercise writes. |
| Media uploads (avatars) | E | **80%** | Bucket + policies + uploader. |
| Rollup jobs / edge functions | M | **5%** | None exist. |
| Tests | M | **0%** | None. |

---

## 8. Recommended Refactor Strategy (extend, don't rebuild)

Working systems to **preserve as-is**: marketing site, the entire SQL RPC/RLS
layer, the Repository interface, `scanFlow`, analytics event catalogue, Mapbox
map, avatar storage, the Miami quest dataset.

The work is **reconciliation + wiring**, in this order:

1. **Unify the profile model (resolves debt #1, #2, #4-prereq).** Choose
   `users` + `user_profiles` as the single source of truth (it's what every RPC
   already updates) and **fold the `profiles`-only columns** (username, bio,
   social links, phone, privacy flags, interests, quest_style/energy,
   starting_area, onboarding_completed) into `user_profiles` (or a 1:1
   `user_profiles_extra`). Point `AuthContext.fetchProfile/updateProfile/
   completeOnboarding` at `user_profiles`. Rebuild `public_profiles` over the
   unified table. Migrate existing `profiles` data once. This single change
   removes the split-brain and makes gameplay update the visible profile.
2. **Collapse the migrations (resolves #2, #3).** Freeze a single canonical
   baseline: keep `0006_game_schema` + `0007_rls_idempotent` + `0003_functions`
   + `0003_avatars_storage` reconciled into **one numbered, linear sequence**;
   move the superseded `000x` files into `supabase/migrations/_archive/`. Make
   exactly one signup trigger with one function that provisions the unified
   tables. Verify with a clean `supabase db reset`.
3. **Route what's already built (resolves #4).** Add `/app` routes for
   AppHome/Wallet/Rewards/History/Leaderboard, and `/partner/*` + `/admin/*`
   route trees wrapped in `RequireRole` (already written in `Guards.tsx`). Make
   server `users.role` the single role source for both guards and RLS. Delete
   the duplicate `pages/app/AppLayout.tsx`.
4. **Add QR image generation (resolves #5).** Add a `qrcode`-style dependency;
   render/download/print codes on `PartnerQrCodes` from `qr_codes.code` →
   `/scan/:code` (or `/q/:id`).
5. **Make demo mode write-capable (resolves #6).** Either point demo at
   `LocalRepository` (which already implements writes) instead of the read-only
   `MockRepository`, or implement the missing write methods on `MockRepository`.
   Then retire whichever local backend is not chosen.
6. **Register a real analytics sink (resolves #7).** Add a remote sink behind
   the existing `registerSink()` seam (PostHog/Segment/Supabase table); keep the
   local sink for dev.
7. **Cleanup (#8–#16).** Wire `note_reports` reporting UI + moderation route;
   either implement rollup jobs or drop the unused `leaderboard_snapshots`/
   `analytics_rollups` tables; replace `.env.example` secrets with placeholders;
   add an auth `loading` timeout; add ledger/leveling/completion unit tests +
   RLS tests.

---

## 9. Migration Strategy (data-safe)

1. **Baseline freeze:** snapshot current prod schema; confirm which migrations
   are *actually applied* in the live Supabase project (the repo cannot tell us —
   inspect `supabase_migrations`/`pg_trigger`/`information_schema`). This is the
   first concrete task before any change.
2. **Profile unification migration (forward-only, idempotent):**
   `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS …` for every `profiles`
   field; backfill `INSERT … SELECT` from `profiles`; recreate `public_profiles`
   over the unified table; repoint the signup trigger; **keep `profiles` as a
   read-only compatibility view** for one release, then drop.
3. **App cutover:** ship the AuthContext repoint + new routes behind the same
   release; verify onboarding writes persist and gameplay updates the visible
   profile.
4. **Archive superseded SQL** and renumber to a linear sequence; document the
   one true order; validate with `supabase db reset` on a scratch project.
5. **Seeding:** keep `seed_full.sql` (stable UUIDs); replace the manual
   `import_notes.sql` placeholder flow with a script keyed off created users.

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Unknown live-DB drift (which migrations applied?) | High | High | Inspect prod before touching schema (step 9.1). |
| Profile unification data loss | Med | High | Forward-only ALTER + backfill + compatibility view; never `DROP` before verify. |
| Routing admin/partner without correct role enforcement | Med | High | Server `users.role` as source; `RequireRole` + RLS already exist — test both. |
| Re-running the migration folder in the wrong order on a fresh env | High | Med | Collapse to a single linear sequence; archive superseded files. |
| Demo mode regressions when switching local backends | Med | Med | Pick one local repo; add a smoke test of complete/redeem. |
| Committed project URL/anon key reused accidentally | Low | Med | Placeholder `.env.example`; rotate if the project is real. |
| Analytics gap hides product signal | High (ongoing) | Med | Register remote sink early. |

---

## 11. Recommended Roadmap (sequenced, based on the audited code)

**Phase 0 — Stabilize the foundation (unblocks everything; ~1 sprint)**
- 0.1 Inspect the live Supabase DB; record exactly what's applied. *(prereq)*
- 0.2 Profile unification migration + AuthContext repoint (debt #1, #2).
- 0.3 Collapse/renumber migrations; one signup trigger; `db reset` verified (#3).
- 0.4 Replace `.env.example` secrets; add auth `loading` timeout (#12, #13).

**Phase 1 — Make built features reachable (high ROI; mostly wiring)**
- 1.1 Route `/app` Wallet/Rewards/History/Leaderboard/AppHome; delete dup layout (#4, #9).
- 1.2 Route `/partner/*` + `/admin/*` under `RequireRole`; unify role source (#4, #11).
- 1.3 Make demo write-capable (LocalRepository) so flows are demoable (#6).

**Phase 2 — Close core product gaps**
- 2.1 QR image generation + print on PartnerQrCodes (#5).
- 2.2 Community-note report UI + reachable moderation queue (#10).
- 2.3 Real analytics sink behind `registerSink()` (#7).

**Phase 3 — Production hardening**
- 3.1 Server-side verification hardening (signed QR tokens, GPS geofence, NFC).
- 3.2 Rollup job (edge function/pg_cron) → populate `analytics_rollups`/
  `leaderboard_snapshots`, switch dashboards/leaderboard to read them; or drop
  the unused tables if live-compute is acceptable (#8).
- 3.3 Rate limiting / abuse scoring on scans & completions.
- 3.4 Tests: ledger/leveling/completion units + RLS policy tests (#15).

**Phase 4 — Growth**
- OAuth providers (Google/Apple/magic-link), reward fulfillment ("mark
  redeemed" + expiry), native camera/NFC scanning, observability dashboards.

---

### Appendix — Source of truth for claims
Routing: `src/App.tsx`. Auth: `src/contexts/AuthContext.tsx`,
`src/components/ProtectedRoute.tsx`, `src/pages/app/AppLayout.tsx`. Data layer:
`src/lib/db/{index,repository,types}.ts`, `src/lib/db/{local,mock,supabase}/*`,
`src/lib/demo.ts`, `src/lib/supabase.ts` + `src/lib/supabase/client.ts`.
Scan/QR: `src/lib/quests/scanFlow.ts`, `src/lib/app/{session,device,id}.ts`,
`src/pages/{ScanResolve,QrLanding,QuestDetail}.tsx`. Analytics:
`src/lib/analytics/events.ts`, `src/types/events.ts`. Onboarding:
`src/lib/onboarding.ts`, `src/pages/Onboarding.tsx`. DB: `supabase/migrations/*`,
`supabase/README.md`, `supabase/seed_full.sql`, `supabase/import_*`.
