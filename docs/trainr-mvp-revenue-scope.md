# Trainr — Minimum Revenue MVP Scope (MVP-1 … MVP-10)

> Re-scope of [`trainr-execution-roadmap.md`](./trainr-execution-roadmap.md)
> optimized for **speed to first revenue**, not architectural completeness.
> Target: launch with **5 fitness creators + ~100 users**, supporting workout
> tracking, creator profiles, creator onboarding, paid programs, subscriptions,
> and a basic streak.
>
> **No code yet** — this is the reduced build plan.

---

## 1. The decision that reshapes everything: payments are new

The original roadmap's economy was **virtual** currency (XP + Trainr Points) —
there is **no real-money path** in the codebase or in tickets TR-001…TR-106. A
revenue MVP needs the opposite: **drop the virtual economy entirely** and add
**Stripe subscriptions + entitlements**. So this is not a strict subset of the
37 — it cuts ~30 of them and adds one new capability (payments).

### Two speed levers applied

1. **Build on the *live* data layer, don't reconcile both.** The audit found two
   parallel stacks (`profiles`+`AuthContext` vs `users`+Repository). Reconciling
   them (old TR-001, an L) is architecturally right but slow. For revenue speed
   we **commit to the live `profiles`/`AuthContext` layer**, add new tables
   beside it with direct typed Supabase calls + RLS + a few RPCs, and **delete**
   the unmounted quest/partner/repository code instead of merging it.
2. **Platform-collects billing, manual creator payout for the first 5.** Stripe
   **Connect** (per-creator payouts + KYC) is the slow part of marketplace
   payments. For 5 hand-picked creators we **collect all revenue on one platform
   Stripe account and pay the 5 creators off-platform** initially. This removes
   creator KYC/payout onboarding from the critical path. Connect is a fast-follow.

> ⚠️ These are deliberate debts. They trade architectural completeness for
> launch speed and are called out in §5 (Deferred) with where they get repaid.

---

## 2. What we cut, keep, and add (vs the 37)

| Original | Disposition | Why |
|---|---|---|
| TR-001 data-layer merge | **Cut → replaced** by MVP-1 (pick live layer, delete the other) | Merge is slow; commit + delete is fast |
| TR-002 single client | **Folded** into MVP-1 | Delete the unused repository client |
| TR-003 trigger/role | **Reduced** → MVP-3 | Just need deterministic signup + athlete/creator role |
| TR-004 renumber migrations | **Folded** into MVP-1 | Linearize as we strip |
| TR-005 lockfile/docs | **Folded** into MVP-1 | Trivial |
| TR-010/011/012 branding | **Reduced** → MVP-2 | English-only, core surfaces only |
| TR-013 seed swap | **Folded** into MVP-1 | Strip Miami/quest data |
| TR-020 exercise catalog | **Cut** | Programs use free-text exercise prescriptions in v1 |
| TR-021 sessions/sets | **Reduced** → MVP-9 | Log "done" + optional weight against program workouts |
| TR-022 PR detection | **Cut** → later | Not required for revenue |
| TR-023/024 log_workout RPC + parity | **Reduced** → MVP-9 | Simpler logging; skip local/mock parity |
| TR-025/026 log/session UI | **Reduced** → MVP-9 | |
| TR-027 history | **Cut** → later | |
| TR-028 PRs screen | **Cut** → later | |
| TR-030/032/033/035 currency ledger/RPCs/events/wallet | **Cut** | Virtual economy removed for v1 |
| TR-031 seasons | **Cut** → later | |
| TR-034 streak | **Reduced** → MVP-9 | Simple counter on session completion |
| TR-036 onboarding | **Split:** athlete → MVP-8; creator → MVP-4 | |
| TR-040/041 store items + TP spend | **Cut → replaced** by real payments (MVP-6/7) | Paid programs, not TP store |
| TR-042 creator portal mount | **Reduced** → MVP-4/MVP-5 | Just profile + program authoring |
| TR-043/044/045 store CRUD/analytics/store UI | **Cut** → later | |
| E5 Badges (TR-050…053) | **Cut** → Gamification | |
| E6 Challenges (TR-060…063) | **Cut** → Gamification | |
| E7 Referrals (TR-070…072) | **Cut** → Gamification | |
| E8 Seasons/Leaderboards (TR-080…083) | **Cut** → Gamification | |
| E9 Hardening (TR-090…094) | **Reduced** → MVP-10 | Only payment/RLS/abuse essentials |
| E10 AI Coach (TR-100…106) | **Cut** → AI launch | |
| — | **NEW: MVP-6, MVP-7 (Stripe subscriptions + entitlements)** | The revenue engine |

**Net: 37 → 10 tickets.**

---

## 3. The 10 MVP tickets

> Complexity: **S** ≤1 day · **M** 2–4 days · **L** 1–2 weeks. Capability tags
> map to the six required: `[track] [creator-profile] [creator-onboard]
> [paid-programs] [subscriptions] [streak]`.

### MVP-1 — Commit to one data layer & strip dead code  *(foundation-lite)*
- **Objective:** Make the live `profiles`/`AuthContext` layer canonical. Delete the unmounted quest/partner/admin + Repository code, the second Supabase client, the conflicting signup trigger, and Miami/quest seed data. Linearize remaining migrations.
- **Files affected:** delete `src/lib/db/**`, `src/pages/app/{QuestBrowser,Explore,MapView,CheckIn,Favorites,AppCommunityNotes,...}`, `src/pages/partner/**`, `src/pages/admin/**`, `src/pages/{QuestDetail,QrLanding,ScanResolve}.tsx`, `src/data/miami/**`, `src/data/mock/**`, `src/lib/supabase/client.ts`, `src/types/db.ts`, `src/types/events.ts`; trim `src/App.tsx`; one lockfile; `supabase/migrations/*` (drop MVP-schema files + their trigger).
- **Database changes:** Drop the duplicate `on_auth_user_created` trigger (keep the `profiles` one); drop unused MVP tables (`quests`, `partners`, `points_ledger`, …) if present; renumber migrations.
- **Acceptance criteria:** App builds with only the live layer; `/auth` + `/onboarding` still work; no dead routes; fresh `db reset` applies cleanly; one signup path creates exactly one `profiles` row.
- **Complexity:** M
- **Dependencies:** —

### MVP-2 — Trainr branding-lite
- **Objective:** Rebrand the surfaces users/creators actually see. English only; defer other locales.
- **Files affected:** `tailwind.config.ts`, `src/index.css`, `src/assets/*`, `public/*`, `index.html`, `src/i18n/en.ts`, `src/lib/onboarding.ts` (storage keys `sq_*→trainr_*`).
- **Database changes:** none.
- **Acceptance criteria:** No "SideQuests" string on Home/Auth/Onboarding/Creator/Program/Profile; Trainr logo + palette applied; old localStorage keys migrated.
- **Complexity:** S
- **Dependencies:** — (parallel with MVP-1)

### MVP-3 — Athlete/creator roles + deterministic signup
- **Objective:** Distinguish creators from athletes; one reliable signup → profile path.
- **Files affected:** `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, signup trigger migration.
- **Database changes:** Add `profiles.role` (`athlete` | `creator` | `admin`) and `profiles.is_creator`; trigger seeds role from signup metadata.
- **Acceptance criteria:** A new signup lands as athlete by default; a creator-flagged signup routes to creator onboarding; role available in `AuthContext`.
- **Complexity:** S
- **Dependencies:** MVP-1

### MVP-4 — Creator accounts: profile + onboarding  `[creator-profile][creator-onboard]`
- **Objective:** A creator can sign up, complete a short onboarding (display name/handle, bio, specialty, profile image), and get a public profile page.
- **Files affected:** new `src/pages/creator/CreatorOnboarding.tsx`, `src/pages/CreatorProfile.tsx` (`/c/:handle`), creator dashboard shell (reuse `DashboardLayout`), routes in `src/App.tsx`.
- **Database changes:** `creators(user_id PK → profiles, handle unique, display_name, bio, specialty, avatar_url, status, created_at)`; RLS: owner-write, public-read of active creators.
- **Acceptance criteria:** A creator completes onboarding and their public `/c/:handle` renders bio/specialty/programs; handle uniqueness enforced.
- **Complexity:** M
- **Dependencies:** MVP-3

### MVP-5 — Paid program authoring  `[paid-programs]`
- **Objective:** Creators create/edit/publish a structured program with a price and a sequence of workouts (free-text exercise prescriptions for v1).
- **Files affected:** new `src/pages/creator/CreatorPrograms.tsx`, `src/pages/creator/ProgramEditor.tsx`.
- **Database changes:** `programs(id, creator_id, title, description, cover_url, price_cents, billing_interval (month/one_time), status (draft/published), created_at)`; `program_workouts(id, program_id, week, day, title, order)`; `workout_prescriptions(id, program_workout_id, exercise_name, sets, reps, notes, order)`; RLS owner-write, public-read of published.
- **Acceptance criteria:** Creator publishes a multi-workout priced program; it appears on their public profile with a price and a "Subscribe" CTA.
- **Complexity:** L
- **Dependencies:** MVP-4

### MVP-6 — Stripe subscriptions (platform-collect)  `[subscriptions]`  **← FIRST REVENUE**
- **Objective:** A user can pay to subscribe to a program via Stripe Checkout; webhooks record the subscription. Platform collects; creators paid off-platform initially.
- **Files affected:** new `supabase/functions/stripe-checkout/*` and `supabase/functions/stripe-webhook/*`; `src/lib/billing/client.ts`; `src/pages/CreatorProfile.tsx`/program page "Subscribe" button; env (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- **Database changes:** `subscriptions(id, user_id, program_id, creator_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at)`; unique `(user_id, program_id)`; write-only via webhook (no client writes).
- **Acceptance criteria:** Test-mode purchase creates an `active` subscription via webhook; idempotent on webhook retries; cancel/expire updates status. **A real (test-mode) dollar can be charged for a program.**
- **Complexity:** L
- **Dependencies:** MVP-5
- **Notes:** Use Stripe Checkout (hosted) + Customer Portal to avoid building card UI/PCI scope. Connect/payouts deferred (§5).

### MVP-7 — Entitlement & program content gating  `[subscriptions]`
- **Objective:** Gate program workout content behind an active subscription; show owned programs.
- **Files affected:** new `src/lib/billing/useEntitlement.ts`, `src/pages/app/Program.tsx` (`/app/program/:id`), gating in program views.
- **Database changes:** `has_active_subscription(user_id, program_id)` SQL helper / RLS predicate on `program_workouts`/`workout_prescriptions` reads.
- **Acceptance criteria:** Non-subscribers see a paywall/preview; active subscribers see full workout content; access revoked when subscription lapses.
- **Complexity:** M
- **Dependencies:** MVP-6

### MVP-8 — Athlete onboarding-lite + home  `[creator-onboard counterpart]`
- **Objective:** Replace the 6-step quest wizard with a minimal fitness intake (goal, experience, units) and a home that lists subscribed programs + today's workout.
- **Files affected:** `src/pages/Onboarding.tsx`, `src/lib/onboarding.ts`, new `src/pages/app/Home.tsx`, `src/components/app/BottomNav.tsx`, `src/App.tsx`.
- **Database changes:** Add `profiles.goal`, `experience`, `unit_pref` (kg/lb).
- **Acceptance criteria:** New athlete completes intake; `/app` home shows their subscribed programs and the next workout; empty state links to creators.
- **Complexity:** M
- **Dependencies:** MVP-3 (content needs MVP-7 to be meaningful)

### MVP-9 — Workout tracking + basic streak  `[track][streak]`
- **Objective:** Athlete opens a program workout, logs it as completed (optionally recording weights/reps against prescriptions), and a simple streak updates.
- **Files affected:** new `src/pages/app/LogWorkout.tsx`, `src/pages/app/WorkoutDetail.tsx`, routes; streak read on Home/Profile.
- **Database changes:** `workout_sessions(id, user_id, program_workout_id, completed_at, notes)`; `session_entries(id, session_id, prescription_id, weight, reps, done)`; `profiles.current_streak, longest_streak, last_workout_date` updated on completion (RPC or trigger for atomicity).
- **Acceptance criteria:** Completing a workout writes a session, optional per-exercise entries, and advances the streak; consecutive-day logic correct; a gap resets current streak (longest preserved).
- **Complexity:** L
- **Dependencies:** MVP-7
- **Notes:** No PR detection, no charts, no local/mock parity in v1.

### MVP-10 — Launch hardening + legal
- **Objective:** Make payments + new tables safe to run with real users/money.
- **Files affected:** `supabase/migrations/*` (RLS), `supabase/functions/stripe-webhook/*` (signature + idempotency), basic rate-limit on logging, error monitoring init, `src/pages/{TermsOfService,PrivacyPolicy}.tsx` (+ refund/billing terms), Stripe tax/receipt settings.
- **Database changes:** RLS policies on `creators`, `programs`, `program_workouts`, `workout_prescriptions`, `subscriptions`, `workout_sessions`, `session_entries`; webhook idempotency table/constraint.
- **Acceptance criteria:** Users can only read/write their own data; subscription/program content is server-enforced (not just UI); webhook verifies signatures and is idempotent; billing/refund terms published; errors are monitored.
- **Complexity:** M
- **Dependencies:** MVP-6, MVP-9

---

## 4. Build order (optimized for speed to first revenue)

```
Track A (backend critical path → revenue):
  MVP-1 ─▶ MVP-3 ─▶ MVP-4 ─▶ MVP-5 ─▶ MVP-6 ─▶ MVP-7
                                       ▲
                              ★ FIRST REVENUE POSSIBLE
Track B (parallel, non-blocking):
  MVP-2 (branding)  ──────────────┐
Track C (athlete retention, after gating works):
  MVP-8 ─▶ MVP-9                  │
Then converge:
  MVP-10 (hardening) ◀── needs MVP-6 + MVP-9
```

**Rationale — money before retention.** The shortest path to a charged dollar is
MVP-1 → 3 → 4 → 5 → 6 → 7. Workout tracking and streaks (MVP-8/9) are the
*retention* layer; they make the subscription worth keeping but are **not on the
revenue critical path**, so they run after gating works (and can overlap MVP-6/7
once MVP-5 lands). Branding (MVP-2) is independent and parallelizes throughout.

**Recommended sequence (single-threaded):**
`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10`
**Two-dev sequence:** Dev A drives `1→3→4→5→6→7`; Dev B does `2`, then `8→9`,
then both land `10`.

**First-revenue checkpoint:** after **MVP-7**, with 5 creators' programs seeded
(creators can be onboarded via MVP-4 or hand-seeded), a user can subscribe and be
charged. MVP-8/9/10 harden the experience for the 100-user cohort.

| Ticket | Capability | Cx | On revenue critical path? |
|---|---|---|---|
| MVP-1 | foundation | M | yes (enabler) |
| MVP-2 | branding | S | no (parallel) |
| MVP-3 | roles | S | yes |
| MVP-4 | creator profile + onboarding | M | yes |
| MVP-5 | paid programs | L | yes |
| MVP-6 | subscriptions (Stripe) | L | **yes ★** |
| MVP-7 | entitlement/gating | M | **yes ★** |
| MVP-8 | athlete onboarding + home | M | no |
| MVP-9 | tracking + streak | L | no (retention) |
| MVP-10 | hardening + legal | M | yes (ship gate) |

**Estimated effort:** ~3×L + 4×M + 2×S ≈ **6–9 focused dev-weeks** solo;
~**4–5 weeks** with two devs given the parallel tracks.

---

## 5. Explicitly deferred (and where the debt is repaid)

| Deferred | Repaid in |
|---|---|
| Data-layer reconciliation, Repository abstraction, local/demo parity | Post-revenue refactor / Creator launch hardening |
| Stripe **Connect** (per-creator payouts, KYC, tax) — *manual payout to 5 creators in v1* | Creator launch (before scaling past ~10 creators) |
| Virtual currency (XP/Trainr Points), wallet, ledger | Gamification launch (re-evaluate vs real money) |
| PR detection, history charts, exercise catalog | Fast-follow after MVP |
| Badges, challenges, referrals, seasons, leaderboards | Gamification launch |
| AI coach | AI coach launch |
| Full i18n (8 locales) | When expanding beyond English market |

---

## 6. Decisions to confirm before build

1. **Payout model:** confirm *platform-collect + manual payout to 5 creators* for
   v1 (recommended), or require Stripe Connect at launch (adds ~1 L ticket + KYC).
2. **Billing shape:** per-program **monthly subscription** (assumed) vs one-time
   purchase vs all-access platform subscription. Affects MVP-5/6 schema.
3. **Revenue split & refunds:** platform take rate and refund policy (needed for
   MVP-10 legal copy and creator agreements).
4. **Creator vetting:** are the 5 creators hand-onboarded (so MVP-4 can be thin)
   or fully self-serve at launch?
5. **Free content:** can creators publish a free program / free preview workouts
   to drive top-of-funnel before paywall? (Small tweak to MVP-5/7.)
