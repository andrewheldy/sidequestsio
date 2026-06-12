# Phase 0 — Challenge & Implementation Plan

> Goal: safely reach a unified **`users` + `user_profiles`** architecture with
> **zero data loss** and **no interruption** to onboarding, Community Notes,
> quest completion, rewards, analytics, or public profiles.
>
> Sources of truth: `AUDIT.md`, `SUPABASE_AUDIT.md`. This document **challenges**
> those recommendations first, then gives the execution plan. **No SQL, no
> migrations, no code here — plan only.**

---

## Part A — Challenging `SUPABASE_AUDIT.md`

I do **not** accept the audit's recommendations as-is. Five of its assumptions
are unproven or wrong for an *existing* project, and two materially change the
plan.

### A1. 🔴 The model decision was made *before* looking at the live data — and the data could flip it
`SUPABASE_AUDIT.md §4` declares "standardize on `users`+`user_profiles`, it's not
close." The argument (11 FKs + RPCs + RLS point there) is about **code
topology**, which is real. But it never establishes **where the actual
production data lives**, and that is the variable that decides the *direction* of
the backfill and the size of the risk:

- If prod only ever applied the **profiles lineage** (the README says
  `0001_profiles` "already applied"), then `user_profiles` may be **empty or
  not exist**, and `profiles` holds the only real user data. In that world the
  game spine is *aspirational*, and the "split-brain in production" is partly
  theoretical.
- If prod applied **both**, you have genuine divergence and the dangerous
  backfill the audit warns about.

**The architectural call is still right** (the game spine is where the product
must converge), **but it must be ratified by inspection, not assumed.** Phase 0
treats the decision as *provisional-pending-PR#1*, with an explicit branch point
if the data contradicts it.

### A2. 🔴 The backfill rule "never overwrite `user_profiles.xp`" may be exactly backwards
`SUPABASE_AUDIT.md §7.1` says the #1 risk is overwriting `user_profiles.xp` with
stale `profiles.xp`, and mandates "never touch xp/points." That is correct **only
if `user_profiles` is the populated system of record.** If `profiles.xp` is the
real value (A1), then *not* backfilling xp into `user_profiles` means rebuilding
`public_profiles` over `user_profiles` shows **everyone 0 XP** — a public
regression, which violates the "no interruption to public profiles" objective.

**Better answer the audit missed:** `points_ledger` is the *declared* append-only
source of truth (`ARCHITECTURE.md`, `SUPABASE_AUDIT.md §1`). The safest
reconciliation is to **recompute `user_profiles.xp` / `points_balance_cache` /
`lifetime_points` / `completed_quests_count` from `points_ledger` +
`quest_completions`**, and treat *both* cached `xp` columns as untrusted. That
makes the backfill **direction-independent and self-correcting**, and turns the
"don't clobber XP" coin-flip into a deterministic rebuild. This should replace
§7.1's rule for the gamification numbers; the text/social/onboarding fields still
come from `profiles`.

### A3. 🟠 "Collapse / renumber migrations to a linear baseline" is dangerous on an *existing* project
`SUPABASE_AUDIT.md §2/§8` recommends renumbering the applied files into a clean
linear sequence. If prod is managed via the **Supabase CLI** (the
`supabase_migrations.schema_migrations` history table keys on the version
string), **renaming/renumbering already-applied migrations causes drift** — the
CLI will see "new" versions and try to re-apply, or flag missing ones. Renumber
only what is safe for a *fresh* DB; for prod you **only add forward
migrations**. We cannot know which regime we're in until we inspect how prod was
actually migrated (CLI vs hand-run SQL editor). **The renumber/archive cleanup is
therefore moved out of Phase 0 entirely** — it is cosmetic and must not gate the
data fix.

### A4. 🟠 The `profiles` compatibility view + `INSTEAD OF` triggers is probably over-engineering
`SUPABASE_AUDIT.md §9 step 7` builds a multi-table updatable view so
`AuthContext` can keep calling `from('profiles')` unchanged. That is real, fiddly
machinery (partial-update semantics, `RETURNING`/`.select()` shapes that
supabase-js depends on, two-table write routing) — and it exists only to avoid
editing **three functions** in one file (`fetchProfile`, `updateProfile`,
`completeOnboarding`, per `SUPABASE_AUDIT.md §13.10`).

This is a single-bundle SPA on Vercel: **DB and app can be deployed together.**
The simpler path is to **repoint those three functions** at the unified tables
and ship the DB migration + app change as a coordinated release. Reserve the
shim **only** as a fallback if inspection shows we cannot co-deploy (e.g., other
unknown consumers of `profiles`). Default to the simpler option; the audit's shim
becomes plan B, not plan A.

### A5. 🟡 Defer the `users.id → auth.users(id)` FK; it's risk in the critical path
`SUPABASE_AUDIT.md §3/§5` wants to add this FK. Adding a *validated* FK can fail
if any `users.id` isn't in `auth.users` (possible if seed/import created rows
out-of-band — `seed_full.sql` inserts partners/quests but check users). It's a
good hardening, but it is **not required** to unify profiles and it can abort a
migration. Move it to a later hardening PR, behind an inspection check.

### A6. 🟡 Unverified factual claims to confirm, not assume
- "complete_quest is being exercised in prod" — unproven. If `user_profiles`
  rows were never created (the trigger bug), `complete_quest`'s
  `UPDATE user_profiles … WHERE user_id` silently updates 0 rows, so even
  completions may not be reflected anywhere. Confirm via row counts.
- "`profiles.username` is populated and unique-able after relocation" — confirm
  null/dup counts before committing to the `UNIQUE` add.
- "two visibility systems" — `SUPABASE_AUDIT.md §4` defers merging them; agreed,
  but confirm which one the leaderboard RPC actually reads in the live function
  bodies (it reads `privacy_preferences`), so relocating the `profiles` booleans
  is cosmetic-safe.

### What survives the challenge (keep)
- The end-state target (`users`+`user_profiles` as the single spine). ✅
- `community_notes_with_author` needs no change. ✅
- Only `public_profiles` must be rebuilt. ✅
- RLS is largely invariant; only `public_profiles`'s filter column moves. ✅
- Forward-only, additive-first, reversible-until-cleanup discipline. ✅
- Idempotent migrations. ✅

### Net changes to the audit's plan
1. **Inspection first; model decision ratified, not assumed** (A1).
2. **Reconcile gamification from `points_ledger`, not from either cache** (A2).
3. **No renumbering of applied migrations in Phase 0** (A3).
4. **Repoint 3 AuthContext functions; shim is plan B** (A4).
5. **FK hardening deferred** (A5).

---

## Part B — Phase 0 Implementation Plan

### 1. Exact sequence of work
1. **Inspect** the live Supabase project (read-only) → produce a Reality Report.
2. **Ratify or revise** the model decision and the backfill direction based on
   the report (explicit go/no-go).
3. **Land additive schema** on `user_profiles` (nullable columns, no constraints
   that can fail, no drops) — non-breaking, reversible.
4. **Backfill + reconcile** (text/social/onboarding from `profiles`;
   gamification recomputed from `points_ledger`), then add `UNIQUE(username)`
   after dedupe — all idempotent and validated.
5. **Unify signup trigger + rebuild `public_profiles`** over the unified spine
   (output shape preserved).
6. *(Phase 1, out of these 4 PRs):* repoint `AuthContext`/types and cut the app
   over; soak; then the cosmetic migration-folder cleanup.

> Phase 0 = PRs #1–#4 below. They take the **database** to the unified shape with
> the app still functioning unchanged. The **app cutover is Phase 1** and is
> called out explicitly so the boundary is unambiguous.

### 2. PR breakdown (overview — details in Part C)
- **PR #1 — Reality Report (read-only inspection).** No schema change.
- **PR #2 — Additive schema on `user_profiles`.** Nullable columns only.
- **PR #3 — Backfill + reconcile + `UNIQUE(username)`.** Data, validated.
- **PR #4 — Unify trigger + rebuild `public_profiles`.** Single trigger; view.

### 3. Live Supabase inspection plan (PR #1 content — described, not written)
Read-only introspection covering:
- **Migration regime:** is `supabase_migrations.schema_migrations` present and
  populated? Which versions? (Decides A3 — CLI vs manual.)
- **Object existence:** do `users`, `user_profiles`, `privacy_preferences`,
  `profiles`, `public_profiles`, `community_notes_with_author` exist? Column
  lists for each.
- **Trigger reality:** which triggers exist on `auth.users` and which function
  bodies are live (`pg_trigger` / `pg_proc`) — confirm whether the live
  `handle_new_auth_user` creates a `profiles` row or not.
- **Row counts & coverage:** counts of `auth.users` vs `profiles` vs
  `user_profiles`; how many `auth.users` lack a `profiles` row; how many lack a
  `user_profiles` row; how many have both.
- **Data divergence:** per-user comparison of `profiles.xp/level` vs
  `user_profiles.xp/level`; count of rows where they differ and by how much.
- **Ledger truth:** can `xp`/points be recomputed from `points_ledger` +
  `quest_completions`? Compare recomputed totals to each cache.
- **Username health:** null count, duplicate count (case-insensitive) across the
  population that would land in `user_profiles`.
- **Public-profile dependents:** confirm only `PublicProfile.tsx` reads
  `public_profiles`; confirm nothing else reads `profiles` besides AuthContext.
- **RLS snapshot:** current policies on `profiles`, `user_profiles`, `users`.
- **Volume:** total user count (sizes the migration window/risk).
Deliverable: `PHASE0_REALITY_REPORT.md` + the go/no-go decision note.

### 4. Data validation plan
- **Pre-flight (before PR #3 runs):** dedupe report for usernames; orphan report
  (auth users missing either profile row); divergence report (cache vs ledger).
- **Backfill invariants (assert in PR #3):**
  - Every `auth.users` row ⇒ exactly one `user_profiles` row (no orphans, no
    dupes). *(maps A22)*
  - For gamification: post-backfill `user_profiles.xp/points_balance_cache/
    lifetime_points/completed_quests_count` **equal the values recomputed from
    `points_ledger`/`quest_completions`** (deterministic, not "unchanged").
    *(supersedes audit A21 per challenge A2)*
  - Text/social/onboarding fields in `user_profiles` equal the corresponding
    `profiles` values for every user that had a `profiles` row.
  - `UNIQUE(username)` holds (0 dup, post-dedupe).
- **Behavioural validation (before/after each of PR #3, #4):** run the relevant
  acceptance tests from `SUPABASE_AUDIT.md §12` (A4–A19) on a **prod-clone**, not
  prod.
- **Post-deploy smoke (prod, after PR #4):** A13–A15 (public profile privacy),
  A9 (notes author), A16–A17 (analytics/leaderboard shapes) — all read-only.

### 5. Acceptance criteria (Phase 0 done = all true)
- PR #1: Reality Report merged; model decision **ratified or revised in
  writing**; backfill direction chosen with evidence.
- PR #2: additive columns exist on `user_profiles`; **no** behavioural change;
  app still green; migration re-runnable (idempotent).
- PR #3: validation invariants (Part B.4) all pass on prod-clone **and** prod;
  **zero rows lost**; `auth.users` ↔ `user_profiles` is 1:1; usernames unique.
- PR #4: one signup trigger; new signups provision `users`+`user_profiles`+
  `privacy_preferences`; `public_profiles` returns the **same column shape** and
  now sources xp/level from gameplay; `/u/:username` privacy gating unchanged
  (A13–A15); `community_notes_with_author` unchanged (A9).
- Throughout: onboarding, completion, notes, rewards, analytics, public profiles
  remain functional at every merge (the app still reads `profiles` until Phase 1).

### 6. Rollback strategy
- **PR #1:** nothing to roll back (read-only).
- **PR #2:** additive + nullable ⇒ revert = drop the new columns; zero data
  impact.
- **PR #3:** **snapshot/backup immediately before.** Backfill is idempotent and
  re-runnable; if invariants fail, **do not proceed**, restore from snapshot if
  any write occurred. The `UNIQUE` add is the only step that can hard-fail —
  gate it behind the passing dedupe report.
- **PR #4:** the old trigger function is left defined-but-untriggered for one
  release so it can be re-armed; `public_profiles` can be swapped back to the old
  definition (kept in version control); **`profiles` table and its data remain
  physically intact** through all of Phase 0 — it is the ultimate fallback.
- **Global:** the app still reads/writes `profiles` until Phase 1, so any Phase 0
  DB issue cannot break the live user experience; we can pause after any PR.

### 7. Stop conditions (halt and escalate — do not proceed)
- Inspection cannot determine the migration regime (CLI vs manual) ⇒ stop; the
  cleanup/trigger strategy depends on it.
- **Both** `profiles` and `user_profiles` contain materially divergent gameplay
  data **and** `points_ledger` cannot reproduce it ⇒ stop; needs a
  human-designed reconciliation rule before any backfill.
- Duplicate usernames cannot be auto-resolved by a deterministic rule ⇒ stop;
  needs a product decision (who keeps the handle).
- Backfill validation shows any orphaned/duplicated `user_profiles`, nonzero
  unexplained data loss, or a gamification figure that can't be reconciled to the
  ledger ⇒ stop; restore.
- Any unknown third consumer of `profiles` (beyond AuthContext/`public_profiles`)
  is discovered ⇒ stop; re-scope the app cutover (and reconsider the shim, A4).
- Production has no backup/snapshot capability available for PR #3/#4 ⇒ stop.

### 8. Estimated effort (engineering, excludes review/soak latency)
- **PR #1 — Reality Report:** ~0.5–1 day (mostly read-only queries + write-up).
- **PR #2 — Additive schema:** ~0.5 day (mechanical, low risk).
- **PR #3 — Backfill + reconcile + unique:** ~1.5–2.5 days (the hard one:
  ledger-recompute logic, dedupe, exhaustive validation, prod-clone dry run).
- **PR #4 — Trigger + `public_profiles`:** ~1 day.
- **Phase 0 total:** ~3.5–5 days eng + ~1 release soak.
- *(Phase 1 app cutover, not counted here: ~1–1.5 days.)*

### 9. Risks by PR
- **PR #1 (Low):** main risk is *acting* on it — easy to over-interpret thin
  data. Mitigation: explicit decision note, peer-reviewed.
- **PR #2 (Low):** column-name collision with an existing `user_profiles` column;
  bloat. Mitigation: cross-check against the inspected column list.
- **PR #3 (High):** wrong backfill direction (A2) → silent XP wipe or public 0-XP
  regression; `UNIQUE` add aborts mid-migration; partial writes. Mitigations:
  ledger-recompute (direction-independent), snapshot, dedupe-gated unique,
  idempotent + dry-run on clone, hard invariant asserts.
- **PR #4 (Medium):** `public_profiles` output-shape drift breaks
  `PublicProfile.tsx`; double-trigger or trigger that fails on signup → broken
  account creation; grant omission breaks anon read. Mitigations: pin the view's
  column list to the page's `select`, test signup on clone, verify grants
  (A14/A15), keep old trigger re-armable.

### 10. What can be safely delegated to Claude Code
**Safe to delegate (well-specified, reviewable):**
- Writing the **read-only inspection queries** and assembling the Reality Report
  (PR #1).
- Drafting the **additive migration** from the inspected column list (PR #2).
- Drafting the **backfill + ledger-recompute + dedupe + validation queries**
  (PR #3) — *as a proposal for human review*, run only against a **clone** first.
- Drafting the **trigger consolidation + `public_profiles` rebuild** (PR #4),
  pinning the view shape to `PublicProfile.tsx`.
- Generating the **prod-clone test runs** of `SUPABASE_AUDIT.md §12` tests.

**Must stay human (judgement / irreversible / prod):**
- **Interpreting** the Reality Report and **ratifying/revising the model
  decision** and backfill direction.
- **Running any migration against production**, and the **go/no-go** at each PR.
- **Taking/restoring snapshots** and any destructive step.
- Resolving **duplicate-username** ownership (product call).
- Deciding the **migration-folder cleanup** regime (depends on A3 finding).

---

## Part C — The Four PRs (exact goals & boundaries)

> All four are **database-only**; the app keeps reading/writing `profiles`
> throughout Phase 0. Each PR is independently revertible. None writes app code
> (that is Phase 1).

### PR #1 — Reality Report (read-only inspection)
- **Goal:** replace assumptions with facts; ratify or revise the
  `users`+`user_profiles` decision and the backfill direction.
- **In scope:** read-only introspection (Part B.3); `PHASE0_REALITY_REPORT.md`;
  a written go/no-go decision note.
- **Out of scope:** any DDL/DML; any app change; any cleanup/renumber.
- **Done when:** report merged; decision ratified/revised with evidence; backfill
  direction chosen; stop-conditions checked.
- **Boundary guardrail:** **must not write to the database.**

### PR #2 — Additive schema on `user_profiles`
- **Goal:** create the destination columns for the relocated profile fields,
  non-breaking.
- **In scope:** add **nullable / defaulted** columns to `user_profiles`
  (username, bio, phone, the five social URLs, `is_public`/`is_profile_public`/
  `show_*`, interests, quest_style/energy, starting_area, streak,
  `onboarding_completed`, `updated_at`); add `updated_at` maintenance. Idempotent.
- **Out of scope:** **no** `UNIQUE`/`NOT NULL` constraints; **no** backfill;
  **no** drops; **no** view/trigger/app changes; **no** `users.id` FK.
- **Done when:** columns exist; app unchanged & green; migration re-runs cleanly.
- **Boundary guardrail:** **no constraint that can fail, no data writes.**

### PR #3 — Backfill + reconcile + `UNIQUE(username)`
- **Goal:** populate the new columns with **zero data loss** and a
  ledger-true gamification state; make username unique.
- **In scope:** ensure one `user_profiles` row per `auth.users` (create missing);
  copy text/social/onboarding from `profiles`; **recompute**
  xp/points/counts from `points_ledger`+`quest_completions` (per A2); dedupe
  usernames by a deterministic rule; then add `UNIQUE(username)`; ship the
  validation invariants (Part B.4) as part of the PR. Idempotent; snapshot first;
  dry-run on clone.
- **Out of scope:** dropping/altering `profiles`; trigger/view changes; app
  changes.
- **Done when:** all invariants pass on clone **and** prod; 1:1
  `auth.users`↔`user_profiles`; usernames unique; gamification reconciles to the
  ledger.
- **Boundary guardrail:** **do not run if the dedupe or orphan reports fail; back
  up before execution; abort (don't force) on any failed invariant.**

### PR #4 — Unify signup trigger + rebuild `public_profiles`
- **Goal:** one canonical signup path and a public profile that reflects real
  gameplay — without changing the app yet.
- **In scope:** replace the triple-trigger mess with **one**
  `on_auth_user_created` → one function provisioning `users`+`user_profiles`+
  `privacy_preferences`; **rebuild `public_profiles`** over `users`+
  `user_profiles` with the **exact same output columns** `PublicProfile.tsx`
  selects, sourcing xp/level from `user_profiles`, gating socials by the relocated
  flags, re-granting to `anon, authenticated`; leave the old trigger function
  defined-but-untriggered for one release.
- **Out of scope:** dropping `profiles` (kept as fallback through Phase 0);
  `users.id` FK; migration renumber/archive; **AuthContext/types/app code (Phase
  1)**; the compatibility shim (plan B only).
- **Done when:** new signup provisions the spine via one trigger;
  `public_profiles` shape unchanged and now gameplay-sourced; A9, A13–A17 pass;
  `community_notes_with_author` unchanged.
- **Boundary guardrail:** **pin the view’s column list to the page’s `select`;
  verify signup succeeds on a clone before prod; keep the prior view + trigger
  re-armable.**

---

### Phase boundary (explicit)
- **Phase 0 (these 4 PRs):** database reaches the unified shape; `profiles`
  remains the live app read/write path and the data fallback. **No user-visible
  change except public profiles now showing real XP** (the intended fix).
- **Phase 1 (next, not in this plan):** repoint `AuthContext` (3 functions) +
  `UserProfile`/`Profile` types to the unified spine and co-deploy; soak; then the
  cosmetic migration-folder cleanup and `profiles` retirement (governed by the A3
  finding). The shim (audit §9.7) is built **only if** PR #1 found a co-deploy
  blocker.
