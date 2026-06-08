# Trainr — Execution Roadmap (Tickets & Milestones)

> Companion to [`trainr-audit-and-plan.md`](./trainr-audit-and-plan.md). This
> breaks the plan into dependency-ordered tickets and groups them into four
> launch milestones. **No code yet** — this is the execution roadmap.
>
> **Conventions.** IDs are `TR-0xx`. Complexity is **S** (≤1 day), **M** (2–4
> days), **L** (1–2 weeks). "Files affected" lists primary touch points, not an
> exhaustive set. Dependencies reference other `TR-` IDs. Tickets are listed in
> recommended execution order; the milestone table at the end maps them to the
> four launches.

---

## Epic index

| Epic | Tickets | Theme |
|---|---|---|
| **E0 Foundation** | TR-001…005 | Reconcile dual data layers (blocker) |
| **E1 Branding** | TR-010…013 | Gym Lift → Trainr re-skin & content |
| **E2 Workout + PR** | TR-020…028 | Core logging value |
| **E3 Economy + Seasons base** | TR-030…036 | Dual currency, events, onboarding |
| **E4 Creator store** | TR-040…045 | Creator portal + reward store |
| **E5 Badges** | TR-050…053 | Achievements |
| **E6 Challenges** | TR-060…063 | Time-boxed goals |
| **E7 Referrals** | TR-070…072 | Viral loop |
| **E8 Seasons + Leaderboards** | TR-080…083 | Competitive layer + rollover |
| **E9 Hardening** | TR-090…094 | Scale, abuse, tests |
| **E10 AI Coach** | TR-100…106 | Claude-powered coaching |

---

## E0 — Foundation reconciliation *(blocks everything)*

### TR-001 — Consolidate dual user models (`profiles` → `user_profiles`)
- **Objective:** Make `users` + `user_profiles` the single canonical user model; merge the live `profiles` columns (social links, privacy flags, onboarding fields, `streak`) into it and migrate existing rows.
- **Files affected:** `src/contexts/AuthContext.tsx`, `src/types/db.ts`, `src/lib/db/supabase/SupabaseRepository.ts`, `src/lib/db/local/*`, `src/pages/app/Profile.tsx`, `src/components/app/profile/*`.
- **Database changes:** Add merged columns to `user_profiles`; data migration `profiles → users`/`user_profiles`; drop `profiles` (after backfill) and recreate `public_profiles` view over `user_profiles`.
- **Acceptance criteria:** App reads/writes profile data only through `user_profiles`; existing demo + (if present) real users load; public profile view still privacy-gated; no reference to `from('profiles')` remains.
- **Complexity:** L
- **Dependencies:** —

### TR-002 — Single Supabase client
- **Objective:** Remove the duplicate client so there is one source of truth.
- **Files affected:** delete `src/lib/supabase.ts`; repoint `src/contexts/AuthContext.tsx` to `src/lib/supabase/client.ts`; `src/lib/demo.ts`.
- **Database changes:** none.
- **Acceptance criteria:** One client module imported everywhere; auth + repository share it; env-gated guest mode still works.
- **Complexity:** S
- **Dependencies:** TR-001

### TR-003 — Single signup trigger + unified role source
- **Objective:** Eliminate the conflicting `on_auth_user_created` triggers; derive role from `users.role` (+ `is_admin()`/`owns_partner()`), not `user_metadata`.
- **Files affected:** `supabase/migrations/*` (consolidated trigger), `src/contexts/AuthContext.tsx` (role logic), `src/components/ProtectedRoute.tsx`, `src/components/app/Guards.tsx`.
- **Database changes:** Drop both old triggers; one trigger seeds `users` + `user_profiles` + `privacy_preferences` (+ referral code placeholder).
- **Acceptance criteria:** A fresh signup creates exactly one consistent set of rows; role guards read `users.role`; no duplicate-trigger drift.
- **Complexity:** M
- **Dependencies:** TR-001

### TR-004 — Renumber & linearize migrations
- **Objective:** Resolve colliding `0001/0002/0003` filenames into a gapless, ordered set that applies cleanly on a fresh DB.
- **Files affected:** `supabase/migrations/*`, `supabase/README.md`.
- **Database changes:** Re-sequenced migration files (no schema change beyond E0 work folded in).
- **Acceptance criteria:** `supabase db reset` on an empty project applies in order with no errors; documented apply order matches filenames.
- **Complexity:** M
- **Dependencies:** TR-001, TR-002, TR-003

### TR-005 — Single package manager + doc truth-up
- **Objective:** Remove lockfile ambiguity; correct `ARCHITECTURE.md`/README to reflect what actually ships (unmounted routes, etc.).
- **Files affected:** delete one of `bun.lockb`/`package-lock.json`; `README.md`, `ARCHITECTURE.md`.
- **Database changes:** none.
- **Acceptance criteria:** One lockfile; CI/docs reference one manager; docs no longer claim unmounted features as live.
- **Complexity:** S
- **Dependencies:** —

---

## E1 — Trainr branding & content

### TR-010 — Design tokens & asset re-skin
- **Objective:** Replace the SideQuests palette/logo with the Trainr brand system.
- **Files affected:** `tailwind.config.ts`, `src/index.css`, `src/assets/*`, `public/*`, `index.html`.
- **Database changes:** none.
- **Acceptance criteria:** App renders Trainr palette/logo/typography; `glass-card`/gradient utilities updated; no SideQuests logo remains.
- **Complexity:** M
- **Dependencies:** —

### TR-011 — Copy & i18n rewrite
- **Objective:** Replace all "SideQuests" strings and quest-domain copy with Trainr fitness copy across locales.
- **Files affected:** `src/i18n/{en,es,fr,de,pt,ja,zh,ru}.ts`, marketing pages under `src/pages/*`, metadata.
- **Database changes:** none.
- **Acceptance criteria:** No "SideQuests" string in `src/`; primary `en` locale fully rewritten; other locales at least key-complete.
- **Complexity:** M
- **Dependencies:** —

### TR-012 — Storage-key namespace migration
- **Objective:** Rename `sq_*` / `sq.db` localStorage keys to `trainr_*` with a one-time migration so existing local/demo state isn't lost.
- **Files affected:** `src/lib/onboarding.ts`, `src/lib/db/local/store.ts`, `src/lib/app/session.ts`, `src/lib/demo.ts`.
- **Database changes:** none.
- **Acceptance criteria:** New keys used everywhere; old keys migrated/cleared on first load; guest onboarding persistence still works.
- **Complexity:** S
- **Dependencies:** —

### TR-013 — Strip quest seed data; seed exercises + demo creators
- **Objective:** Remove Miami/quest demo data; seed a starter exercise catalog and demo creators for local/demo/prod.
- **Files affected:** delete `src/data/miami/*`, `src/data/mock/*`; `src/lib/db/local/seed.ts`, `supabase/seed.sql`.
- **Database changes:** New seed rows (exercises, demo creators) — depends on TR-020 catalog shape.
- **Acceptance criteria:** Demo mode boots with exercises + at least one demo creator; no Miami references remain.
- **Complexity:** M
- **Dependencies:** TR-020

---

## E2 — Workout logging & PR detection *(core MVP value)*

### TR-020 — `exercises` catalog
- **Objective:** Add a global + creator-extensible exercise catalog.
- **Files affected:** `src/types/db.ts`, `src/lib/db/repository.ts`, `src/lib/db/local/*`, `SupabaseRepository.ts`.
- **Database changes:** `exercises(id, name, muscle_group, modality, unit, is_global, creator_id, created_at)`; public read RLS; index on `muscle_group`.
- **Acceptance criteria:** Catalog is queryable via `getRepository()`; global exercises seeded; custom (creator) exercises supported by schema.
- **Complexity:** M
- **Dependencies:** TR-004

### TR-021 — `workout_sessions` + `session_sets`
- **Objective:** Persist logged sessions and their sets.
- **Files affected:** `src/types/db.ts`, repository contract + impls.
- **Database changes:** `workout_sessions(id, user_id, workout_template_id?, creator_id?, started_at, completed_at, duration_seconds, notes, season_id?, xp_awarded, tp_awarded)`; `session_sets(id, session_id, exercise_id, set_index, weight, reps, rpe?, is_warmup, estimated_1rm, is_pr)`; indexes on `(user_id, completed_at desc)` and session_id; RLS owner-read.
- **Acceptance criteria:** A session with sets can be written and read back per-user; **the old `unique(user_id, quest_id)` completion constraint is removed** (workouts repeat).
- **Complexity:** M
- **Dependencies:** TR-020

### TR-022 — `personal_records` + PR detection
- **Objective:** Track current best per `(user, exercise, pr_type)` and the estimated-1RM math.
- **Files affected:** `src/lib/app/` (new `pr.ts` for 1RM formula + detection), `src/types/db.ts`, repository impls.
- **Database changes:** `personal_records(id, user_id, exercise_id, pr_type, value, achieved_at, session_set_id, previous_value)`; unique `(user_id, exercise_id, pr_type)`.
- **Acceptance criteria:** Given a set that beats a prior best, a PR row upserts and the set is flagged `is_pr`; 1RM formula unit-covered (Epley or chosen).
- **Complexity:** M
- **Dependencies:** TR-021

### TR-023 — `log_workout` RPC (atomic)
- **Objective:** Single atomic mutation: write session + sets, run PR detection, award currency, update streak, emit events. Models the existing `complete_quest` pattern.
- **Files affected:** `supabase/migrations/*` (RPC), `SupabaseRepository.ts`.
- **Database changes:** `log_workout(...)` `SECURITY DEFINER`; writes `workout_sessions`, `session_sets`, `personal_records`, `currency_ledger`, `domain_events`, updates `user_profiles` caches.
- **Acceptance criteria:** One RPC call logs a full workout transactionally; partial failure rolls back; idempotent via `dedupe_key`.
- **Complexity:** L
- **Dependencies:** TR-022, TR-030, TR-033

### TR-024 — Local/Mock repository parity for logging
- **Objective:** Mirror `log_workout` logic in `LocalRepository`/`MockRepository` so demo mode matches prod.
- **Files affected:** `src/lib/db/local/*`, `src/lib/db/mock/MockRepository.ts`.
- **Database changes:** none (in-memory).
- **Acceptance criteria:** Logging a workout in demo mode produces identical PR/currency/streak outcomes to the RPC contract.
- **Complexity:** M
- **Dependencies:** TR-023

### TR-025 — Log Workout UI
- **Objective:** The core screen: pick template/freestyle, add exercises, log sets (weight×reps, RPE), live PR flag, finish + award animation.
- **Files affected:** new `src/pages/app/LogWorkout.tsx`, `src/App.tsx` route `/app/log`, `src/components/app/BottomNav.tsx`.
- **Database changes:** none.
- **Acceptance criteria:** A user can log a multi-exercise workout end-to-end and see XP/TP + PRs on finish; works in demo mode.
- **Complexity:** L
- **Dependencies:** TR-024

### TR-026 — Session detail screen
- **Objective:** Read-only view of a completed session (sets, PRs, currency earned).
- **Files affected:** new `src/pages/app/SessionDetail.tsx`, route `/app/session/:id`.
- **Database changes:** none.
- **Acceptance criteria:** Opening a past session shows its sets, PR badges, and rewards.
- **Complexity:** S
- **Dependencies:** TR-025

### TR-027 — History screen
- **Objective:** Mount the existing (unrouted) history page; list sessions + volume charts.
- **Files affected:** `src/pages/app/History.tsx`, `src/App.tsx`, reuse `recharts`/`AnalyticsView`.
- **Database changes:** none.
- **Acceptance criteria:** `/app/history` lists sessions chronologically with weekly-volume chart.
- **Complexity:** M
- **Dependencies:** TR-025

### TR-028 — PRs screen
- **Objective:** Per-exercise best lifts and 1RM trend.
- **Files affected:** new `src/pages/app/PRs.tsx`, route `/app/prs`.
- **Database changes:** none.
- **Acceptance criteria:** `/app/prs` shows current PRs per exercise with trend over time.
- **Complexity:** M
- **Dependencies:** TR-022, TR-025

---

## E3 — Dual-currency economy, events & seasons base

### TR-030 — `currency_ledger` generalization
- **Objective:** Evolve `points_ledger` into the dual-currency source of truth (XP + Trainr Points).
- **Files affected:** `src/types/db.ts`, repository impls, `src/pages/app/Wallet.tsx`.
- **Database changes:** Rename `points_ledger → currency_ledger`; add `season_id`, `dedupe_key` (unique); extend `ledger_source` enum (`workout_logged`, `pr_bonus`, `challenge_reward`, `streak_bonus`, `referral`, `season_reward`); add `user_profiles.tp_balance_cache`, `lifetime_tp`; backfill legacy rows.
- **Acceptance criteria:** Earn/spend of both currencies recorded as ledger rows; caches reconcile to `sum(ledger)`; duplicate `dedupe_key` rejected.
- **Complexity:** L
- **Dependencies:** TR-031

### TR-031 — `seasons` + current-season resolver
- **Objective:** Introduce seasons and a helper to resolve the active season.
- **Files affected:** `src/types/db.ts`, repository impls, `supabase/migrations/*`.
- **Database changes:** `seasons(id, name, slug, starts_at, ends_at, status, theme, reward_table)`; `current_season()` SQL helper; seed "Season 0".
- **Acceptance criteria:** Exactly one active season at a time; `current_season()` returns it; XP rows stamp `season_id`.
- **Complexity:** M
- **Dependencies:** TR-004

### TR-032 — `award_currency` / `spend_currency` RPCs
- **Objective:** Single guarded entry points for all economy mutations.
- **Files affected:** `supabase/migrations/*`, `SupabaseRepository.ts`, local/mock impls.
- **Database changes:** Two `SECURITY DEFINER` RPCs writing `currency_ledger` + cache; spend checks `tp_balance_cache >= cost` under `FOR UPDATE`.
- **Acceptance criteria:** No client can write `currency_ledger` directly; overspend rejected; awards idempotent.
- **Complexity:** M
- **Dependencies:** TR-030

### TR-033 — `domain_events` backbone
- **Objective:** Append-only event log emitted in-transaction; foundation for badges/challenges/referrals/seasons.
- **Files affected:** `src/types/events.ts`, repository impls, `supabase/migrations/*`.
- **Database changes:** `domain_events(id, user_id, type, payload, season_id, created_at, processed_at)`; partial index `where processed_at is null`.
- **Acceptance criteria:** `log_workout`/economy RPCs emit typed events atomically; events queryable; schema supports both sync + async consumers.
- **Complexity:** M
- **Dependencies:** TR-030

### TR-034 — Streak tracking
- **Objective:** Maintain current/longest streak and emit streak events + milestone bonuses.
- **Files affected:** `src/lib/app/streak.ts` (new), `log_workout` RPC, `user_profiles`.
- **Database changes:** `user_profiles.current_streak`, `longest_streak`, `last_workout_date`.
- **Acceptance criteria:** Logging on consecutive days extends streak; a gap resets it; milestone emits `streak.extended` + optional TP bonus.
- **Complexity:** M
- **Dependencies:** TR-023, TR-033

### TR-035 — Wallet UI (dual balance + ledger)
- **Objective:** Mount the wallet; show XP/level progress + TP balance + ledger history.
- **Files affected:** `src/pages/app/Wallet.tsx`, `src/App.tsx`, reuse `leveling.ts` + `progress` primitive.
- **Database changes:** none.
- **Acceptance criteria:** `/app/wallet` shows level/XP bar, TP balance, and a paginated ledger.
- **Complexity:** M
- **Dependencies:** TR-030

### TR-036 — Onboarding rewrite for fitness
- **Objective:** Re-author the 6-step wizard for Trainr (goals, experience, equipment/gym, units, schedule) keeping the guest-first + localStorage conversion pattern.
- **Files affected:** `src/pages/Onboarding.tsx`, `src/lib/onboarding.ts`, `AuthContext.completeOnboarding`.
- **Database changes:** Map selections onto `user_profiles` fitness fields (units, goal, experience, equipment).
- **Acceptance criteria:** Guest can complete fitness onboarding, convert at `/auth`, and land in `/app` with profile populated; first-workout preview replaces first-quest preview.
- **Complexity:** L
- **Dependencies:** TR-001, TR-013

---

## E4 — Creator reward store

### TR-040 — Rename rewards → store items
- **Objective:** Repurpose `rewards`/`reward_redemptions` as the creator store.
- **Files affected:** `src/types/db.ts`, repository impls, partner reward pages.
- **Database changes:** Rename `rewards → store_items`, `reward_redemptions → store_redemptions`; `points_cost → tp_cost`.
- **Acceptance criteria:** Existing redemption flow works against renamed tables; types updated.
- **Complexity:** M
- **Dependencies:** TR-030

### TR-041 — `redeem_store_item` RPC (TP spend)
- **Objective:** Atomic TP spend + inventory decrement + redemption code (from existing `redeem_reward`).
- **Files affected:** `supabase/migrations/*`, repository impls.
- **Database changes:** RPC writing `store_redemptions` + `currency_ledger` spend + inventory guard.
- **Acceptance criteria:** Redeem deducts TP, decrements stock, issues a code; insufficient TP / out-of-stock rejected.
- **Complexity:** M
- **Dependencies:** TR-032, TR-040

### TR-042 — Mount creator portal + `owns_creator()`
- **Objective:** Mount `/creator/*` (rename from `/partner/*`); rename `partners → creators` and `owns_partner → owns_creator`.
- **Files affected:** `src/App.tsx`, `src/pages/partner/* → creator/*`, `src/lib/partner/usePartner.ts`, RLS migrations, `src/components/dashboard/navs.ts`.
- **Database changes:** Rename `partners → creators`; rename RLS helper.
- **Acceptance criteria:** `/creator` routes reachable and role-guarded; creator dashboard loads analytics.
- **Complexity:** M
- **Dependencies:** TR-003

### TR-043 — Creator store CRUD UI
- **Objective:** Let creators create/edit/retire store items.
- **Files affected:** `src/pages/creator/CreatorStore.tsx` (from `PartnerRewards`).
- **Database changes:** none.
- **Acceptance criteria:** Creator can CRUD store items scoped by `owns_creator()`.
- **Complexity:** M
- **Dependencies:** TR-042, TR-041

### TR-044 — Creator analytics
- **Objective:** Aggregate, privacy-safe creator analytics (sessions using their templates, redemptions, challenge participation).
- **Files affected:** `src/pages/creator/CreatorAnalytics.tsx`, analytics RPC.
- **Database changes:** Extend/replace `partner_analytics` for fitness metrics.
- **Acceptance criteria:** Creator sees aggregate metrics; small samples suppressed.
- **Complexity:** M
- **Dependencies:** TR-042

### TR-045 — Store browse/redeem UI (`/app/store`)
- **Objective:** User-facing store: browse items, redeem with TP, view redemption codes.
- **Files affected:** `src/pages/app/Store.tsx` (from `Rewards.tsx`), `src/App.tsx`, BottomNav.
- **Database changes:** none.
- **Acceptance criteria:** `/app/store` lists items, redeem flow deducts TP and shows code; affordability reflected in UI.
- **Complexity:** M
- **Dependencies:** TR-041, TR-035

---

## E5 — Badges

### TR-050 — `badges` + `user_badges`
- **Objective:** Badge definitions + per-user awards.
- **Files affected:** `src/types/db.ts`, repository impls.
- **Database changes:** `badges(id, key, name, description, icon, tier, rule_type, rule_params, xp_reward, tp_reward, is_active)`; `user_badges(id, user_id, badge_id, awarded_at, season_id?, progress)` unique `(user_id, badge_id[, season_id])`.
- **Acceptance criteria:** Badges definable; awards queryable per user.
- **Complexity:** M
- **Dependencies:** TR-033

### TR-051 — `evaluate_badges` consumer
- **Objective:** Idempotent rule evaluation over `domain_events`; grants badges + currency.
- **Files affected:** `supabase/migrations/*` (RPC), local/mock consumer.
- **Database changes:** RPC reading events + writing `user_badges` + `award_currency`.
- **Acceptance criteria:** Qualifying events award the right badge exactly once; re-processing is safe.
- **Complexity:** L
- **Dependencies:** TR-050, TR-032
- **Notes:** Wire synchronous call from `log_workout` for MVP; async worker later (TR-090).

### TR-052 — Badges UI + earn toasts
- **Objective:** Earned/locked grid with progress + earn celebration.
- **Files affected:** new `src/pages/app/Badges.tsx`, route `/app/badges`, toast on earn.
- **Database changes:** none.
- **Acceptance criteria:** `/app/badges` shows earned + locked with progress; earning a badge surfaces a toast.
- **Complexity:** M
- **Dependencies:** TR-051

### TR-053 — Admin badge authoring
- **Objective:** Admin CRUD for badge definitions/rules.
- **Files affected:** `src/pages/admin/AdminBadges.tsx` (new), mount `/admin/*`.
- **Database changes:** none.
- **Acceptance criteria:** Admin can create/edit/disable badges with rule params.
- **Complexity:** M
- **Dependencies:** TR-050

---

## E6 — Challenges

### TR-060 — `challenges` + `challenge_enrollments`
- **Objective:** Schema for platform/creator challenges and user enrollment/progress.
- **Files affected:** `src/types/db.ts`, repository impls.
- **Database changes:** `challenges(id, creator_id?, title, description, type, goal_params, starts_at, ends_at, xp_reward, tp_reward, badge_id?, visibility, status)`; `challenge_enrollments(id, challenge_id, user_id, joined_at, progress, progress_value, completed_at, reward_claimed_at)` unique `(challenge_id, user_id)`.
- **Acceptance criteria:** Challenges definable; users enrollable; progress storable.
- **Complexity:** M
- **Dependencies:** TR-033

### TR-061 — Join / progress / claim RPCs
- **Objective:** `join_challenge`, event-driven `update_challenge_progress`, `claim_challenge_reward`.
- **Files affected:** `supabase/migrations/*`, repository impls.
- **Database changes:** Three RPCs; progress driven by `domain_events`; claim grants currency/badge once.
- **Acceptance criteria:** Joining, automatic progress on relevant events, and one-time reward claim all work; double-claim rejected.
- **Complexity:** L
- **Dependencies:** TR-060, TR-032
- **Notes:** Synchronous progress from `log_workout` for MVP; async later.

### TR-062 — Challenges UI
- **Objective:** Browse/join, progress bars, claim rewards.
- **Files affected:** new `src/pages/app/Challenges.tsx`, route `/app/challenges`, BottomNav.
- **Database changes:** none.
- **Acceptance criteria:** `/app/challenges` lists active challenges, shows progress, allows join + claim.
- **Complexity:** M
- **Dependencies:** TR-061

### TR-063 — Creator/admin challenge authoring
- **Objective:** Let creators/admins author challenges.
- **Files affected:** `src/pages/creator/CreatorChallenges.tsx`, `src/pages/admin/AdminChallenges.tsx`.
- **Database changes:** none.
- **Acceptance criteria:** Creator/admin can create/schedule challenges scoped appropriately.
- **Complexity:** M
- **Dependencies:** TR-060, TR-042

---

## E7 — Referrals

### TR-070 — `referrals` + per-user codes
- **Objective:** Referral records and a shareable code per user.
- **Files affected:** `src/types/db.ts`, repository impls, signup trigger.
- **Database changes:** `referrals(id, referrer_user_id, code unique, referred_user_id?, status, reward_tp, created_at, qualified_at)`; `user_profiles.referral_code`.
- **Acceptance criteria:** Each user has a unique code; referral rows creatable.
- **Complexity:** M
- **Dependencies:** TR-003

### TR-071 — `?ref=` capture + `redeem_referral` RPC
- **Objective:** Capture referral on signup; grant TP on qualification (first workout).
- **Files affected:** `src/pages/Auth.tsx`, `AuthContext`, `supabase/migrations/*`, `log_workout` (qualification hook).
- **Database changes:** `redeem_referral` RPC writing `award_currency` + updating referral status; emits `referral.qualified`.
- **Acceptance criteria:** A signup via `?ref=` attributes the referrer; first workout qualifies and pays out TP once.
- **Complexity:** M
- **Dependencies:** TR-070, TR-032, TR-023

### TR-072 — Referrals UI
- **Objective:** Share link, invite status, TP earned.
- **Files affected:** new `src/pages/app/Referrals.tsx`, route `/app/referrals`, Profile entry point.
- **Database changes:** none.
- **Acceptance criteria:** `/app/referrals` shows code/share link, invite states, and cumulative TP earned.
- **Complexity:** S
- **Dependencies:** TR-071

---

## E8 — Seasons rollover & leaderboards

### TR-080 — Seasonal leaderboard view + RPC
- **Objective:** Season-scoped XP leaderboard honoring privacy opt-out (from existing `get_leaderboard`).
- **Files affected:** `supabase/migrations/*`, repository impls.
- **Database changes:** Leaderboard query scoped by `season_id`; index `(season_id, user_id)` on ledger.
- **Acceptance criteria:** Leaderboard reflects current-season XP; private users excluded.
- **Complexity:** M
- **Dependencies:** TR-030, TR-031

### TR-081 — Leaderboard UI (season selector + tiers)
- **Objective:** Mount leaderboard with season selector and tier display.
- **Files affected:** `src/pages/app/Leaderboard.tsx`, `src/App.tsx`, BottomNav/Profile.
- **Database changes:** none.
- **Acceptance criteria:** `/app/leaderboard` shows ranked users for a selectable season with tier badges.
- **Complexity:** M
- **Dependencies:** TR-080

### TR-082 — `rollover_season` RPC + `season_results`
- **Objective:** End a season: materialize final ranks/tiers, grant season rewards, start the next.
- **Files affected:** `supabase/migrations/*`, repository impls.
- **Database changes:** `season_results(id, season_id, user_id, final_xp, final_rank, tier, rewards_granted)`; rollover RPC (idempotent).
- **Acceptance criteria:** Running rollover freezes results, pays season rewards once, activates the next season; XP resets seasonally while TP/PRs persist.
- **Complexity:** L
- **Dependencies:** TR-080, TR-032

### TR-083 — Admin season management
- **Objective:** Admin CRUD/schedule for seasons + manual rollover trigger.
- **Files affected:** `src/pages/admin/AdminSeasons.tsx` (new).
- **Database changes:** none.
- **Acceptance criteria:** Admin can create/schedule seasons and trigger rollover with confirmation.
- **Complexity:** M
- **Dependencies:** TR-082

---

## E9 — Hardening

### TR-090 — Async `domain_events` worker
- **Objective:** Drain unprocessed events via pg_cron/edge for expensive rules; same consumer code as sync path.
- **Files affected:** `supabase/functions/*` (or pg_cron), consumers.
- **Database changes:** Worker reads `domain_events where processed_at is null`, stamps processed.
- **Acceptance criteria:** Events processed within SLA; idempotent; sync path can be switched to async without behavior change.
- **Complexity:** L
- **Dependencies:** TR-051, TR-061

### TR-091 — Rate limiting & abuse scoring
- **Objective:** Throttle workout logging / referral qualification; velocity checks.
- **Files affected:** RPCs (`log_workout`, `redeem_referral`), edge middleware.
- **Database changes:** Rate-limit/velocity tracking (table or counters).
- **Acceptance criteria:** Abnormal logging velocity is throttled/flagged without blocking normal users.
- **Complexity:** M
- **Dependencies:** TR-023, TR-071

### TR-092 — RLS policy tests
- **Objective:** Automated tests asserting users can't read/write others' data or write protected tables.
- **Files affected:** `supabase/tests/*`.
- **Database changes:** none.
- **Acceptance criteria:** Test suite proves owner-scoping + RPC-only writes for ledger/PRs/badges.
- **Complexity:** M
- **Dependencies:** TR-004

### TR-093 — Unit tests: ledger / PR / level / streak
- **Objective:** Cover the economy/PR/level/streak math against `LocalRepository`.
- **Files affected:** test files alongside `src/lib/app/*`, `src/lib/db/local/*`.
- **Database changes:** none.
- **Acceptance criteria:** Deterministic tests for 1RM, PR detection, level curve, streak transitions, dedupe.
- **Complexity:** M
- **Dependencies:** TR-024

### TR-094 — Warehouse analytics sink
- **Objective:** Register a production `track()` sink for product analytics.
- **Files affected:** `src/lib/analytics/events.ts`.
- **Database changes:** none.
- **Acceptance criteria:** Events forwarded to the chosen warehouse without PII.
- **Complexity:** S
- **Dependencies:** —

---

## E10 — AI Coach *(Claude-powered)*

> Built on Claude (Anthropic) — default to the latest models (Opus for program
> reasoning, Sonnet/Haiku for chat/low-latency). All AI calls go through a
> **server-side edge function** (never the browser) to protect the API key and
> enforce rate/cost limits. Confirm model IDs/pricing against the `claude-api`
> reference at implementation time.

### TR-100 — Training-history aggregation layer
- **Objective:** Build a queryable, summarized view of a user's training (recent volume, PRs, frequency, muscle balance) as coach context.
- **Files affected:** `supabase/migrations/*` (views), `src/lib/coach/context.ts` (new).
- **Database changes:** Materialized/SQL views over `workout_sessions`/`session_sets`/`personal_records`.
- **Acceptance criteria:** A compact, token-bounded training summary can be assembled per user on demand.
- **Complexity:** M
- **Dependencies:** TR-022, TR-027

### TR-101 — Coach edge function + safety guardrails
- **Objective:** Server-side Claude proxy with auth, prompt templates, rate limits, cost caps, and safety/medical-disclaimer guardrails.
- **Files affected:** `supabase/functions/coach/*`, `src/lib/coach/client.ts`.
- **Database changes:** `coach_usage(user_id, tokens, cost, created_at)` for metering.
- **Acceptance criteria:** Browser never sees the API key; requests are authenticated, rate-limited, and metered; unsafe asks get safe responses.
- **Complexity:** L
- **Dependencies:** TR-100

### TR-102 — Program generation service
- **Objective:** Generate a structured, editable training program from goals/experience/equipment + history.
- **Files affected:** `supabase/functions/coach/*`, `src/lib/coach/program.ts`, `workout_templates` schema.
- **Database changes:** `workout_templates` + `template_exercises` (structured program output; creator templates reuse this).
- **Acceptance criteria:** Coach returns a validated, schema-conformant program the user can save and log against.
- **Complexity:** L
- **Dependencies:** TR-101, TR-021, TR-036

### TR-103 — Adaptive recommendations & deloads
- **Objective:** Per-session suggestions (load/volume progression, deload prompts) from recent performance + RPE.
- **Files affected:** `src/lib/coach/recommend.ts`, Log Workout integration.
- **Database changes:** none (reads history views).
- **Acceptance criteria:** Next-session targets and deload prompts appear in Log Workout, grounded in the user's data.
- **Complexity:** M
- **Dependencies:** TR-102
- **Notes:** Tool-use / structured outputs keep suggestions machine-parseable.

### TR-104 — Form-check feedback (vision)
- **Objective:** Reuse `QuestProofCamera` to capture a lift photo/clip and return Claude form feedback.
- **Files affected:** `src/components/app/QuestProofCamera.tsx` → `FormCheckCamera`, coach function, Storage.
- **Database changes:** `form_checks(id, user_id, exercise_id, media_url, feedback, created_at)`; Storage bucket.
- **Acceptance criteria:** User submits media and receives structured, safe form feedback; media access is owner-scoped.
- **Complexity:** L
- **Dependencies:** TR-101
- **Notes:** Confirm current vision-capable model + input limits via `claude-api`.

### TR-105 — Coach chat UI
- **Objective:** Conversational coach with streaming + history grounded in training context.
- **Files affected:** new `src/pages/app/Coach.tsx`, route `/app/coach`, BottomNav.
- **Database changes:** `coach_threads` / `coach_messages` for persistence.
- **Acceptance criteria:** Streaming chat that references the user's real history; threads persist; rate-limited.
- **Complexity:** L
- **Dependencies:** TR-101

### TR-106 — Coach monetization hook (optional)
- **Objective:** Gate premium coach features behind TP or subscription; meter usage.
- **Files affected:** `src/lib/coach/*`, Wallet/Store integration.
- **Database changes:** entitlement flags on `user_profiles` or a `subscriptions` table.
- **Acceptance criteria:** Premium coach access enforced server-side; usage metered against entitlement.
- **Complexity:** M
- **Dependencies:** TR-101, TR-045

---

## Milestone roadmap

> Each milestone is independently shippable and leaves a coherent product. The
> blocker epic **E0** is implicit in M1 (nothing ships without it).

### M1 — MVP launch  *(solo training that feels great)*
**Goal:** A lifter can onboard, log workouts, hit PRs, and earn XP + Trainr Points with streaks.
**Tickets:** TR-001 → TR-005 (foundation), TR-010 → TR-013 (branding), TR-020 → TR-028 (workout + PR), TR-030 → TR-036 (economy + seasons base + onboarding).
**Exit criteria:** Log a workout → PRs detected → XP/TP awarded → streak updates → wallet + history + PRs screens populated; demo mode at parity; clean migration on a fresh DB.
**Rough size:** ~22 tickets (heaviest milestone).

### M2 — Creator launch  *(supply side + spend sink)*
**Goal:** Creators onboard, publish templates/store items; users spend TP.
**Tickets:** TR-040 → TR-045 (store + creator portal), TR-044 (creator analytics). Pulls forward `workout_templates` only if not already created in M1.
**Exit criteria:** Creator portal mounted + role-guarded; store items redeemable with TP (atomic spend, inventory, codes); creator analytics aggregate-safe.
**Rough size:** ~6 tickets.

### M3 — Gamification launch  *(retention + competition + virality)*
**Goal:** Badges, challenges, referrals, and seasonal leaderboards with rollover.
**Tickets:** TR-050 → TR-053 (badges), TR-060 → TR-063 (challenges), TR-070 → TR-072 (referrals), TR-080 → TR-083 (seasons + leaderboards), plus hardening TR-090 → TR-094.
**Exit criteria:** Events auto-award badges; challenges join/progress/claim; referrals attribute + pay out; seasonal leaderboard with working rollover; async worker + tests in place.
**Rough size:** ~18 tickets.

### M4 — AI coach launch  *(differentiation)*
**Goal:** Claude-powered program generation, adaptive recommendations, form check, and chat.
**Tickets:** TR-100 → TR-106.
**Exit criteria:** Server-side coach with guardrails + metering; generates editable programs; per-session recommendations in Log Workout; form-check feedback; persistent chat; optional monetization gate.
**Rough size:** ~7 tickets.

### Dependency-flow summary

```
E0 Foundation ─┬─▶ E1 Branding ─┐
               ├─▶ E2 Workout+PR ─┬─▶ E3 Economy+Seasons ─┬─▶ E4 Creator store ─┐
               │                  │                        ├─▶ E5 Badges        │
               │                  │                        ├─▶ E6 Challenges    ├─▶ E8 Seasons+LB ─▶ E9 Hardening
               │                  │                        └─▶ E7 Referrals     │
               └──────────────────┴────────────────────────────────────────────┴─▶ E10 AI Coach
        M1 ───────────────────────────────────────────▶  M2 ─────▶  M3 ─────────────────────────▶  M4
```

---

### Notes for issue creation
- Suggested **labels:** `epic:E0`…`epic:E10`, `area:db`, `area:rpc`, `area:ui`,
  `area:auth`, `area:ai`, `complexity:S|M|L`, `milestone:M1|M2|M3|M4`.
- Suggested **GitHub milestones:** `MVP launch`, `Creator launch`,
  `Gamification launch`, `AI coach launch` (1:1 with M1–M4).
- Each `TR-` ID maps to one GitHub issue; `Dependencies` populate issue links /
  a tracking task list in the epic issue.
