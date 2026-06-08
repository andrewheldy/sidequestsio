# Trainr — Repository Audit & Implementation Plan

> **Scope.** This document audits the current repository (`sidequestsio`, a
> mobile-first gamified platform branded **SideQuests.io**) and proposes a
> detailed, code-free implementation plan to evolve it into **Trainr**, a
> fitness/training product. It covers the Gym Lift → Trainr branding migration,
> onboarding improvements, a dual-currency economy (XP + Trainr Points), PR
> detection, badges, challenges, referrals, a creator reward store, and seasons.
>
> **No code is written here** — this is the plan that precedes implementation.

---

## 0. Orientation: what this repo actually is

The product *concept* in the task ("Gym Lift", "Trainr", workouts, PRs) does
**not yet exist anywhere in the codebase**. The repository today is a complete
gamified, real-world **quest** platform. There is no `gym`, `lift`, `workout`,
`exercise`, or `Trainr`/`Gym Lift` string anywhere in `src/` except the generic
`fitness` quest category.

This matters because the migration is **not a rename** — it is a **domain
re-platforming**. The good news: the existing engine (auth, onboarding, an
append-only points/XP ledger, atomic award RPCs, leaderboards, a creator/partner
portal, a reward store, RLS, a backend-agnostic repository abstraction) maps
almost one-to-one onto the Trainr feature set. The plan below leans on that
engine rather than rebuilding it.

**Conceptual mapping used throughout this document:**

| SideQuests concept            | Trainr concept                                   |
| ----------------------------- | ------------------------------------------------ |
| Quest                         | Workout / Challenge (a completable activity)     |
| Quest completion              | Workout session logged                           |
| Partner / venue               | Creator / gym / coach                            |
| Reward + redemption           | Creator reward store item + redemption           |
| `points_ledger`               | Dual-currency ledger (XP + Trainr Points)        |
| Community Notes               | Workout notes / form check posts (optional)      |
| QR scan → check-in            | Workout check-in / session start                 |
| Leaderboard                   | Seasonal leaderboard                             |

---

## 1. Repository Audit

### 1.1 Stack & tooling

- **Frontend:** Vite 5 + React 18 + TypeScript SPA (Lovable-generated). **Not**
  Next.js. Routing via React Router v6; server state via TanStack Query.
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS + custom design tokens in
  `tailwind.config.ts` / `src/index.css` (coral / turquoise / indigo palette,
  `glass-card`, `glow-coral`). `lucide-react` icons. `recharts` for dashboards.
- **Backend:** Supabase (Postgres + Auth + RLS + RPC + Storage). Mapbox GL for
  maps. Deployed on Vercel (`vercel.json` SPA catch-all rewrite).
- **i18n:** Custom `LanguageContext` + `src/i18n/{en,es,fr,de,pt,ja,zh,ru}.ts`.
- **Package managers:** **both** `bun.lockb` and `package-lock.json` are
  committed — a hygiene risk (pick one).

### 1.2 Two parallel data architectures (the single most important finding)

The repo contains **two overlapping, partially-conflicting data layers** that
appear to be from different build phases:

**A. The "live" profile layer (actually wired into the running app):**
- `src/contexts/AuthContext.tsx` talks **directly** to a single `profiles`
  table via `supabase.from('profiles')`.
- Supabase client: `src/lib/supabase.ts`.
- Schema: `0001_profiles.sql`, `0002_profile_overhaul.sql`,
  `0003_avatars_storage.sql`, `0004_phone_social.sql`, `0005_note_reports.sql`.
- The `Profile` type (in `AuthContext.tsx`) carries `xp`, `level`, `streak`,
  `interests`, `quest_style`, `onboarding_completed`, social links, privacy
  flags, plus optional cached stats.

**B. The "MVP repository" layer (documented in `ARCHITECTURE.md`, partly wired):**
- A backend-agnostic `Repository` interface (`src/lib/db/repository.ts`) with
  **three** implementations: `LocalRepository` (localStorage),
  `SupabaseRepository` (RPC-backed), `MockRepository` (demo). Selected by
  `getRepository()` in `src/lib/db/index.ts`.
- Supabase client: `src/lib/supabase/client.ts` (a **second**, separate client).
- Schema: `0001_schema.sql` (19 tables), `0002_rls.sql`, `0003_functions.sql`
  (the atomic RPCs). Domain types in `src/types/db.ts`.
- Normalized model: `users` + `user_profiles` + `privacy_preferences` +
  `partners` + `venues` + `quests` + `points_ledger` + `rewards` + …

**These two layers do not share tables, clients, or user models.** `AuthContext`
uses `profiles`; the `/app` quest pages use `getRepository()` → the MVP tables.

> **⚠️ Active conflict:** Both `0001_profiles.sql` **and** `0003_functions.sql`
> create a trigger named `on_auth_user_created` on `auth.users`, each
> `drop ... if exists`-ing the other. Only one can survive. The profiles trigger
> writes `public.profiles`; the functions trigger writes `users` +
> `user_profiles` + `privacy_preferences`. Whichever migration runs last wins,
> silently breaking the other half of the app. Migration **filename numbers
> also collide** (two `0001`, two `0002`, two `0003`), so apply order is
> undefined.

Reconciling these two layers is a **prerequisite** for the Trainr work (see
§5 Migration plan).

### 1.3 Existing auth flow

- Email/password via Supabase (`signUp`, `signIn`, `signInWithPassword`,
  `signOut`). Columns exist for `phone_number` and social URLs; OAuth redirect
  handling is noted as unfinished in `ARCHITECTURE.md`.
- `AuthProvider` bootstraps the session (`getSession`), subscribes to
  `onAuthStateChange`, and lazily fetches the `profiles` row.
- **Role** is read from `user.user_metadata.role` (defaults to `user`); the MVP
  layer instead derives admin/partner from the `users.role` column + RLS
  helpers `is_admin()` / `owns_partner()`. (Another divergence.)
- A **demo mode** (`isDemoMode`, `DemoSessionContext`) injects a `DEMO_USER` +
  `DEMO_PROFILE` and short-circuits all writes — useful for previews.
- `handle_new_user()` trigger auto-creates a `profiles` row on signup.

### 1.4 Existing onboarding flow

- `src/pages/Onboarding.tsx`: a polished **6-step, guest-first** wizard
  (Welcome → Vibes (multi) → Explorer archetype → Neighborhood → First-quest
  preview → Starter profile + account gate).
- Selections persist to `localStorage` (`sq_onboarding`) via
  `src/lib/onboarding.ts` so a **guest can complete onboarding before creating
  an account**, then convert at `/auth` (the conversion moment).
- On finish, `completeOnboarding()` writes `interests`, `quest_style`,
  `quest_energy`, `starting_area`, and seeds `xp=100, level=1, streak=1,
  onboarding_completed=true` onto the `profiles` row.
- `ProtectedRoute` redirects signed-in users with `onboarding_completed=false`
  to `/onboarding`, and signed-out users to `/auth`.
- Onboarding content is **Miami quest-themed** (neighborhoods, vibes) — all of
  it is Trainr-irrelevant and must be re-authored.

### 1.5 Existing "workout logging" flow (= quest completion today)

There is no set/rep logging. The closest analog — and the structural template
for workout logging — is **quest completion**:

1. `CheckIn.tsx` (`/app/checkin`) lets the user type a code or pick a quest →
   navigates to `/scan/:code`.
2. `ScanResolve` / `QrLanding` resolve the code (`src/lib/quests/scanFlow.ts`),
   record a `scan_event`, and route to `/quests/:questId`.
3. `QuestDetail` → `startQuest` (idempotent attempt) → `completeQuest`.
4. **`complete_quest` RPC (`0003_functions.sql`) is the gold-standard pattern**:
   it verifies, then **atomically** writes a `quest_completions` row + a
   `points_ledger` entry (earn), updates the `user_profiles` cache, recomputes
   `level` via `level_for_xp()`, marks the scan converted, and writes an
   `audit_log`. Anti-farming is structural: `unique(user_id, quest_id)`.

This atomic "verify → write ledger → update cache → recompute level → audit"
transaction is exactly the shape workout logging + PR detection should reuse.

### 1.6 Existing creator architecture (= partners today)

- `partners` (with `owner_user_id` for RBAC) → `venues` → `quests`/`rewards` →
  `qr_codes`. `usePartner()` resolves the current user's partner.
- Partner portal pages exist as files — `PartnerHome`, `PartnerQuests`,
  `PartnerAnalytics`, `PartnerRewards`, `PartnerQrCodes` — using a
  `DashboardLayout` + `MetricCard` shell and `getPartnerAnalytics()`.
- **However, none of `/partner/*` (or `/admin/*`) routes are mounted in
  `App.tsx`.** These pages are currently **dead code** (built but unreachable).
- RLS scopes every partner read/write through `owns_partner()`; analytics are
  aggregate-only and suppress small samples (`<5`).

### 1.7 Existing database schema (MVP layer, `0001_schema.sql`)

19 tables: `users`, `user_profiles`, `privacy_preferences`, `partners`,
`venues`, `quests`, `qr_codes`, `scan_events`, `quest_attempts`,
`quest_completions`, `community_notes`, `points_ledger`, `rewards`,
`reward_redemptions`, `leaderboard_snapshots`, `analytics_rollups`,
`consent_events`, `audit_logs`. Highlights:

- **`points_ledger` is append-only** and is the source of truth. Each row
  already carries **both** `points_amount` **and** `xp_amount` — i.e. the table
  is *already shaped for two currencies in one row*. `user_profiles` holds
  denormalized caches (`xp`, `level`, `points_balance_cache`, `lifetime_points`).
- `quest_completions` has `unique(user_id, quest_id)`.
- Enums are Postgres enums mirrored as TS string-unions in `src/types/db.ts`.
- `ledger_source` already includes `'referral'` and `'bonus'` values (unused).

### 1.8 Existing Supabase setup

- Client is **lazy and optional**: with no env vars the app runs fully on
  `LocalRepository` (and `AuthContext` surfaces a friendly "not configured"
  message). Two clients exist (§1.2).
- **RLS** (`0002_rls.sql`) is the real boundary for the MVP tables;
  integrity-sensitive mutations go through **`SECURITY DEFINER` RPCs**
  (`0003_functions.sql`): `complete_quest`, `redeem_reward`,
  `create_community_note`, `adjust_points`, `record_scan`, `start_quest`,
  `get_leaderboard`, `partner_analytics`, `platform_analytics`, `create_qr_code`.
- **Storage:** `0003_avatars_storage.sql` provisions an avatars bucket.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_PUBLIC_TOKEN`,
  optional `VITE_DATA_SOURCE=mock`.

### 1.9 Existing routing structure (as actually mounted in `App.tsx`)

- **Marketing (public):** `/`, `/quests`, `/community-notes`, `/verticals`,
  `/verticals/:slug`, `/partnerships`, `/hosts`, `/privacy`, `/terms`.
- **Auth/onboarding:** `/auth`, `/onboarding`.
- **Public profile:** `/u/:username`.
- **Quest/QR:** `/quests/:questId`, `/q/:questId`, `/scan/:code`.
- **App shell (`/app`):** `explore` (index), `map`, `quests`,
  `community-notes`, and **guarded** `checkin`, `favorites`, `profile`,
  `settings`.
- **Not mounted (dead/aspirational despite existing files + `ARCHITECTURE.md`
  claims):** `/partner/*`, `/admin/*`, `/app/wallet`, `/app/rewards`,
  `/app/leaderboard`, `/app/history`.

### 1.10 Audit risk register (carried into §5)

| # | Risk | Severity |
|---|------|----------|
| R1 | Dual data layers (`profiles` vs `users`+`user_profiles`) with two Supabase clients | **High** |
| R2 | Conflicting `on_auth_user_created` triggers + colliding migration numbers | **High** |
| R3 | Partner/admin/rewards/leaderboard routes unmounted; `ARCHITECTURE.md` overstates what ships | Medium |
| R4 | Role source-of-truth split (user_metadata vs `users.role`) | Medium |
| R5 | Two committed lockfiles (bun + npm) | Low |
| R6 | All domain content (Miami quests/neighborhoods) is throwaway for Trainr | Medium |

---

## 2. Architecture Plan

### 2.1 Guiding decisions

1. **Keep the stack** (Vite/React/Router/TanStack/Supabase). No Next.js rewrite.
2. **Standardize on the Repository pattern (layer B)** as the single data-access
   contract, and **fold the live `profiles` table into `user_profiles`** so
   there is **one** user model and **one** Supabase client. (See §5.)
3. **Reuse the append-only ledger + atomic RPC pattern** for every economy
   mutation. Never mutate balances outside an RPC/transaction.
4. **Event-driven gamification:** workout/economy actions emit typed domain
   events; badges, challenges, seasons, and referrals are **reactions** to those
   events, not logic bolted into the logging path. This keeps the hot path
   (logging a workout) simple and makes new reward rules additive.

### 2.2 New services (logical modules, each behind the Repository or an RPC)

| Service | Responsibility | Backed by |
|---|---|---|
| **WorkoutService** | Create/log workout sessions, sets, exercises | `log_workout` RPC (atomic) |
| **PRService** | Detect & persist personal records from logged sets | invoked inside `log_workout`; reads `exercises`, `personal_records` |
| **EconomyService** | Single entry point for all XP / Trainr Point grants & spends | `award_currency` / `spend_currency` RPCs over `currency_ledger` |
| **BadgeService** | Evaluate badge rules against domain events; grant badges | event consumer + `evaluate_badges` RPC |
| **ChallengeService** | Enroll, track progress, settle challenge rewards | `challenges`, `challenge_enrollments`, `settle_challenge` RPC |
| **ReferralService** | Issue codes, attribute signups, grant referral TP | `referrals` + `award_currency` |
| **CreatorStoreService** | Creator CRUD of store items; user redemptions | extends existing `rewards`/`redeem_reward` |
| **SeasonService** | Manage seasons, seasonal scoping of XP/leaderboards, rollover | `seasons`, `season_xp` (or scoped ledger reads) |
| **EventBus** | Append domain events; fan out to consumers | `domain_events` table + DB triggers / edge function |

In the local/demo backends these are TypeScript transactions inside
`LocalRepository` / `MockRepository`; in production they are Postgres RPCs +
(optionally) one edge function for asynchronous fan-out.

### 2.3 Event architecture

Extend the existing typed catalogue (`src/types/events.ts`) and the analytics
`track()` sink with a **persisted domain-event log** that gamification consumes.

- **`domain_events`** table (append-only): `id, user_id, type, payload jsonb,
  season_id, created_at, processed_at`. Written **in the same transaction** as
  the action that produced it (so it cannot be lost).
- **Event types (initial):** `workout.logged`, `set.logged`, `pr.achieved`,
  `currency.earned`, `currency.spent`, `streak.extended`, `streak.broken`,
  `challenge.joined`, `challenge.completed`, `badge.earned`,
  `referral.signup`, `referral.qualified`, `season.started`, `season.ended`.
- **Consumers** (badge eval, challenge progress, referral qualification,
  season aggregation) are **idempotent** and key off `domain_events.id` so
  re-processing is safe.
- **Two delivery modes:**
  - *Synchronous (MVP):* `log_workout` directly calls `evaluate_badges` /
    `update_challenge_progress` within the same transaction for instant UI.
  - *Asynchronous (scale):* a `pg_cron`/edge worker drains unprocessed
    `domain_events` for expensive rules — same consumer code, different trigger.

This is the bridge between the simple logging path and the rich reward systems.

### 2.4 XP / Trainr-Point transaction model

**Two currencies, one ledger.** The current `points_ledger` already stores
`xp_amount` and `points_amount` per row; generalize it to a
**`currency_ledger`** (rename for clarity) that is the **single source of truth**
for both balances:

- **XP** — non-spendable progression. Drives `level` (via the existing
  triangular curve in `leveling.ts` / `level_for_xp()`) and seasonal rank. Never
  decreases except via admin `adjust`. **Scoped to a season** (carries
  `season_id`) so seasonal leaderboards = `sum(xp) where season_id = current`,
  while **lifetime level** = `sum(xp) over all seasons`.
- **Trainr Points (TP)** — spendable currency. Earned from workouts, PRs,
  challenge payouts, streak milestones, referrals, and bonuses; **spent** in the
  creator reward store. Carried-over across seasons (a wallet, not a score).

**Invariants (enforced by RPC + constraints, mirrored in LocalRepository):**

1. Every balance change is an **append-only ledger row**; balances are never
   edited directly — only `user_profiles` *caches* (`xp`, `level`,
   `tp_balance_cache`, `lifetime_tp`) are updated in the same transaction.
2. `transaction_type ∈ {earn, spend, adjust, expire}`; `source` extends the
   existing enum with `workout_logged`, `pr_bonus`, `challenge_reward`,
   `streak_bonus`, `referral`, `season_reward`, `reward_redemption`,
   `admin_adjustment`, `bonus`.
3. **Spends require `tp_balance_cache >= cost`** checked under `FOR UPDATE` (the
   `redeem_reward` RPC already demonstrates this exact guard).
4. **Idempotency:** earn rows carry a `dedupe_key` (e.g.
   `workout:<id>`, `pr:<exercise>:<id>`, `referral:<referred_user>`) with a
   unique index, so retries/double-submits cannot double-grant.
5. XP and TP can be awarded **in the same row** (one workout grants both), or
   independently.

### 2.5 API boundaries

- **Client → data:** every screen continues to call `getRepository()` (or
  TanStack Query wrappers around it). No screen touches Supabase directly after
  the `AuthContext` reconciliation in §5.
- **Reads:** RLS-guarded selects / views (`user_profiles`, `personal_records`,
  `badges`, `challenges`, `creator_store_items`, seasonal leaderboard view).
- **Writes (atomic, server-authoritative):** RPCs only —
  `log_workout`, `redeem_store_item`, `join_challenge`, `claim_challenge_reward`,
  `redeem_referral`, `adjust_currency`. The client **cannot** insert into
  `currency_ledger`, `personal_records`, `badges_awarded`, or `domain_events`
  (no write policy; RPCs are `SECURITY DEFINER`).
- **Creator boundary:** creator CRUD scoped by `owns_creator()` (renamed
  `owns_partner()`); store/analytics reads aggregate-only.
- **Admin boundary:** `is_admin()` for moderation, manual adjustments, season
  management.

---

## 3. Database Plan

> Built **on top of the reconciled MVP schema** (layer B). Renames are cosmetic
> at the SQL level but should be done as a clean migration set (see §5).

### 3.1 Tables to rename / repurpose (no data-shape change)

| Existing | Becomes | Notes |
|---|---|---|
| `partners` | `creators` | keep `owner_user_id` RBAC |
| `quests` | `workouts` (templates) + `challenges` | split: a Trainr "workout template/program" vs a time-boxed "challenge" |
| `quest_completions` | `workout_sessions` | one row per logged session; relax the `unique(user,quest)` constraint (workouts repeat!) |
| `points_ledger` | `currency_ledger` | add `season_id`, `dedupe_key`; generalize `source` enum |
| `rewards` / `reward_redemptions` | `store_items` / `store_redemptions` | creator reward store |
| `community_notes` | `workout_notes` (optional/retain) | |
| `scan_events` | `checkin_events` (optional/retain) | gym check-in |

### 3.2 New tables

**Workout logging & PRs**
- **`exercises`** — catalog: `id, name, muscle_group, modality (barbell/dumbbell/
  machine/bodyweight/cardio), unit (kg/lb/reps/seconds/distance), is_global,
  creator_id (nullable for custom), created_at`.
- **`workout_sessions`** — `id, user_id, workout_template_id (nullable),
  creator_id (nullable), started_at, completed_at, duration_seconds, notes,
  season_id, xp_awarded, tp_awarded`.
- **`session_sets`** — `id, session_id, exercise_id, set_index, weight, reps,
  rpe (nullable), is_warmup, estimated_1rm, is_pr (bool)`.
- **`personal_records`** — current best per `(user_id, exercise_id, pr_type)`
  where `pr_type ∈ {1rm, max_weight, max_reps, max_volume, best_time}`;
  `value, achieved_at, session_set_id, previous_value`. One row per PR type per
  exercise per user (upserted when beaten); history lives in `domain_events`.

**Economy**
- **`currency_ledger`** (from `points_ledger`) — see §2.4. Append-only;
  unique `dedupe_key`.
- (`user_profiles` gains `tp_balance_cache`, `lifetime_tp`,
  `current_streak`, `longest_streak`, `last_workout_date`.)

**Badges**
- **`badges`** — definitions: `id, key, name, description, icon, tier
  (bronze/silver/gold/…), rule_type, rule_params jsonb, xp_reward, tp_reward,
  is_active`.
- **`user_badges`** — `id, user_id, badge_id, awarded_at, season_id (nullable),
  progress jsonb`; unique `(user_id, badge_id)` (or `(user_id, badge_id,
  season_id)` for repeatable seasonal badges).

**Challenges**
- **`challenges`** — `id, creator_id (nullable=platform), title, description,
  type (volume/streak/frequency/distance/pr), goal_params jsonb, starts_at,
  ends_at, xp_reward, tp_reward, badge_id (nullable), visibility, status`.
- **`challenge_enrollments`** — `id, challenge_id, user_id, joined_at, progress
  jsonb, progress_value, completed_at, reward_claimed_at`; unique
  `(challenge_id, user_id)`.

**Referrals**
- **`referrals`** — `id, referrer_user_id, code (unique), referred_user_id
  (nullable until claimed), status (issued/signed_up/qualified/rewarded),
  reward_tp, created_at, qualified_at`. (Add `referral_code` to
  `user_profiles` for each user's shareable code.)

**Seasons**
- **`seasons`** — `id, name, slug, starts_at, ends_at, status
  (upcoming/active/ended), theme jsonb, reward_table jsonb`.
- **`season_results`** (materialized at rollover) — `id, season_id, user_id,
  final_xp, final_rank, tier, rewards_granted jsonb`.

**Event backbone**
- **`domain_events`** — see §2.3.

### 3.3 Indexes & constraints (hot paths)

- `session_sets (exercise_id, user_id_via_session)` for PR queries;
  `workout_sessions (user_id, completed_at desc)` for history & streaks.
- `currency_ledger (user_id, created_at)`, partial index on `xp_amount > 0`,
  and `(season_id, user_id)` for seasonal leaderboards.
- Unique `currency_ledger(dedupe_key)`; unique
  `personal_records(user_id, exercise_id, pr_type)`.
- `challenge_enrollments(user_id)`, `referrals(code)`, `domain_events
  (processed_at) where processed_at is null` (worker queue).

### 3.4 RPCs to add (mirroring the `complete_quest` template)

`log_workout` (writes session + sets + PR detection + currency earn + streak
update + domain events, atomically), `redeem_store_item`, `join_challenge`,
`update_challenge_progress`, `claim_challenge_reward`, `evaluate_badges`,
`redeem_referral`, `rollover_season`, `adjust_currency` (admin).

### 3.5 RLS posture

- Users read **own** sessions/sets/PRs/badges/enrollments/ledger; creators read
  aggregate analytics for their own content; admins via `is_admin()`.
- Global `exercises`, `badges`, active `challenges`, `seasons`, and active
  `store_items` are publicly readable.
- All balance/PR/badge writes are RPC-only (no client write policy).

---

## 4. UI Plan

### 4.1 Branding migration (Gym Lift → Trainr)

- **Strings/i18n:** replace all "SideQuests" copy in `src/i18n/*.ts`, page
  metadata (`index.html`), README, `ARCHITECTURE.md`, manifest, and the
  `sq_*` / `sq.db` storage keys → `trainr_*`. (Audit found **zero** "Gym Lift"
  strings, so the "from" side is conceptual — treat as greenfield content.)
- **Design tokens:** re-skin `tailwind.config.ts` + `src/index.css` (palette,
  `glass-card`, gradients, fonts). Replace logo assets in `src/assets/` and
  `public/`.
- **Domain content:** delete Miami quest/neighborhood seed data
  (`src/data/miami/*`, `src/data/mock/*`, `supabase/seed.sql`) and reseed with
  exercises, sample programs, and demo creators.

### 4.2 Screens affected / added

| Screen | Change |
|---|---|
| **Onboarding** (`/onboarding`) | Rewrite all 6 steps for fitness: goals (strength/hypertrophy/endurance/weight-loss), experience level, equipment/gym access, units (kg/lb), schedule. Keep the strong guest-first + localStorage conversion pattern. First "quest preview" → **first workout preview**. |
| **Auth** (`/auth`) | Re-theme; add referral-code capture from URL (`?ref=`); finish OAuth. |
| **App Home** (`/app` index) | From "Explore quests" → dashboard: current streak, this-week volume, active challenge, season rank, "Log workout" CTA. |
| **Log Workout** (new, `/app/log`) | The core new screen: pick template or freestyle, add exercises, log sets (weight×reps, RPE), live PR flagging, finish → award animation. Replaces the QR check-in metaphor. |
| **Workout detail / session** | Replaces `QuestDetail`; shows sets, PRs hit, XP/TP earned. |
| **History** (`/app/history`) | Mount it (currently unrouted): session log, volume charts (recharts already present). |
| **PRs** (new, `/app/prs`) | Per-exercise best lifts + 1RM trends. |
| **Wallet** (`/app/wallet`) | Mount it; show **dual balance** (XP+level progress, TP balance) + ledger history. |
| **Store** (`/app/store`, was `/app/rewards`) | Creator reward store: browse items, redeem with TP, redemption codes. |
| **Challenges** (new, `/app/challenges`) | Browse/join, progress bars, claim rewards. |
| **Badges** (new, `/app/badges`) | Earned + locked grid with progress. |
| **Leaderboard** (`/app/leaderboard`) | Mount it; add **season** selector + tiers. |
| **Profile** (`/app/profile`) | Level, badges showcase, PR highlights, referral code/share. |
| **Referrals** (new, `/app/referrals`) | Share link, invite status, TP earned. |
| **Creator portal** (`/creator/*`) | Mount + rename from `/partner/*`: manage workout templates, challenges, store items, analytics. |
| **Admin** (`/admin/*`) | Mount; add season management, badge/challenge authoring, manual currency adjust, moderation. |
| **BottomNav** (`src/components/app/BottomNav.tsx`) | New IA: Home · Log · Challenges · Store · Profile. |

### 4.3 Reusable components already present

`DashboardLayout`/`MetricCard` (creator + admin dashboards), `recharts`
(`AnalyticsView`) for volume/1RM trends, `progress`/`badge` shadcn primitives
(XP bars, badge chips), `QuestProofCamera` (→ form-check video/photo), the
`glass-card` system, and the level/XP math in `leveling.ts` (reuse as-is).

---

## 5. Migration Plan

### 5.1 Phase 0 — Reconcile the data layers (must precede feature work)

1. **Choose layer B (`users` + `user_profiles` + Repository) as canonical.**
   Decommission the standalone `profiles` table by **merging its columns**
   (social links, privacy flags, onboarding fields, `streak`) into
   `user_profiles`, and migrating existing `profiles` rows into
   `users`/`user_profiles`.
2. **Single Supabase client:** delete `src/lib/supabase.ts`; point `AuthContext`
   at `src/lib/supabase/client.ts` and at `getRepository()` for profile reads.
3. **One signup trigger:** delete the duplicate `on_auth_user_created`; keep a
   single trigger that seeds `users` + `user_profiles` (+ `privacy_preferences`,
   referral code).
4. **Single role source of truth:** `users.role` + `is_admin()`/`owns_creator()`;
   stop reading role from `user_metadata`.
5. **Renumber migrations** into a clean, gapless, linearly-ordered set
   (resolves the colliding `0001/0002/0003` files). Verify on a fresh DB.
6. **Pick one package manager** (delete the other lockfile). Update
   `ARCHITECTURE.md`/README to reflect what actually ships.

### 5.2 Phase 1 — Branding & content swap (§4.1)

Pure rename/re-skin/reseed. Low risk, independently shippable, unblocks design.

### 5.3 Data migration mechanics

- New tables are **additive** — created by forward-only migrations; no
  destructive change to historical ledger rows (rename `points_ledger` →
  `currency_ledger` via `ALTER TABLE RENAME`, add nullable columns, backfill
  `season_id` to a "season 0", set `dedupe_key` for legacy rows from
  `id`).
- Mirror every schema change in `src/types/db.ts`, `LocalRepository`,
  `MockRepository`, and the seed builders **in the same PR** (the repo's
  existing discipline) so demo mode never drifts from prod.
- Provide a **rollback note** per migration; keep RPCs `CREATE OR REPLACE` so
  redeploys are idempotent (existing convention).

### 5.4 Sequencing constraint

Economy (`currency_ledger`) and `seasons` must land **before** badges,
challenges, referrals, and the store, because all of those *grant currency* and
*scope by season*.

---

## 6. Implementation Phases (recommended order)

> Each phase is independently shippable and leaves the app working. Earlier
> phases de-risk the foundational conflicts; later phases are additive
> gamification that plugs into the event/economy backbone.

**Phase 0 — Foundation reconciliation** *(blocker)*
Merge dual data layers, single client, single trigger, renumber migrations,
single lockfile. (§5.1). *Exit:* one user model, one client, clean migration run.

**Phase 1 — Trainr branding & content**
i18n/logo/token re-skin, storage-key rename, strip Miami data, seed exercises +
demo creators. (§4.1). *Exit:* app reads as "Trainr"; demo mode works.

**Phase 2 — Workout logging + PR detection** *(core value)*
`exercises`, `workout_sessions`, `session_sets`, `personal_records`;
`log_workout` RPC (atomic, with PR detection + estimated-1RM); Log Workout,
Session detail, History, PRs screens; relax the per-quest unique constraint.
*Exit:* a user can log a workout and see PRs.

**Phase 3 — Dual-currency economy + Seasons**
Generalize `points_ledger` → `currency_ledger` (XP + TP, `season_id`,
`dedupe_key`); `seasons`; `award_currency`/`spend_currency`; Wallet screen with
dual balance + ledger; `domain_events` backbone + emit from `log_workout`;
streak tracking. *Exit:* workouts grant XP+TP into a season; balances visible.

**Phase 4 — Creator reward store**
Rename `rewards`/`redemptions` → store; mount `/creator/*` portal (CRUD +
analytics) and `/app/store`; `redeem_store_item` spends TP. *Exit:* creators
list items; users redeem with TP.

**Phase 5 — Badges**
`badges` + `user_badges`; `evaluate_badges` as a `domain_events` consumer;
Badges screen + earn toasts; admin badge authoring. *Exit:* badges auto-award
from events.

**Phase 6 — Challenges**
`challenges` + `challenge_enrollments`; join/progress/claim RPCs (event-driven
progress); Challenges screens; creator/admin authoring. *Exit:* users join a
challenge and earn rewards on completion.

**Phase 7 — Referrals**
`referrals` + per-user codes; `?ref=` capture at signup; `redeem_referral`
grants TP on qualification (first workout); Referrals screen. *Exit:* invites
attribute and pay out.

**Phase 8 — Seasons rollover + leaderboards**
Mount `/app/leaderboard` with season selector + tiers; `rollover_season`
(materialize `season_results`, grant season rewards, start next season); admin
season management. *Exit:* seasons end, reward, and reset cleanly.

**Phase 9 — Hardening**
Async `domain_events` worker (pg_cron/edge), rate-limiting/abuse scoring on
logging, RLS policy tests, ledger/PR/level unit tests against `LocalRepository`,
warehouse analytics sink. (Mirrors `ARCHITECTURE.md` §15.)

---

### Appendix A — Open product decisions to confirm before build

1. **XP earning formula** for a workout (flat per session? volume-scaled?
   PR bonus magnitude?) and the **XP↔level curve** (keep triangular?).
2. **TP economy balance:** earn rates vs store prices (inflation control;
   should TP expire?).
3. **Workouts vs Challenges split** — is a "workout template" authored by
   creators, by users, or both? Does freestyle logging (no template) earn the
   same?
4. **PR types** to track for v1 (1RM/volume/reps/time) and the **estimated-1RM
   formula** (Epley/Brzycki).
5. **Season cadence** (monthly? quarterly?) and **what resets** (XP/leaderboard
   reset; TP and PRs persist — recommended).
6. **Referral qualification** event (signup vs first workout vs first paid
   action) and reward size.
7. Whether to **retain** social/community-notes and map/check-in features in
   Trainr v1 or defer them.
