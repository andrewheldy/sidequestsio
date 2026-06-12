# Phase 0 Reality Report — `<fill: project ref / env / date / operator>`

> Companion to `supabase/inspection/phase0_reality_report.sql`.
> Run that script **section by section** in the Supabase SQL Editor (it returns
> only the last result set when run whole), paste each result below, then read
> the **Interpretation** notes to fill in the **Decision checklist** and check
> the **Stop conditions** at the end.
>
> This report is **read-only** — producing it changes nothing in the database.
> Its only job: turn the assumptions in `SUPABASE_AUDIT.md` / `PHASE0_PLAN.md`
> into facts, and decide whether Phase 0 proceeds.

**Run metadata**
- Project ref / environment: `<fill>` (⚠ run against the **live** project, or a
  same-shape clone — state which)
- Date / time (UTC): `<fill>`
- Operator: `<fill>`
- Postgres role used (e.g. `postgres` / service): `<fill>`

---

## §1 Migration history / CLI-managed?
**Result (1a):**
```
schema_migrations_table = <fill>
seed_files_table        = <fill>
```
**Result (1b, only if 1a non-null):**
```
<paste version/name rows, or "table absent">
```
**Manual (1c) — deployment workflow:** `<CLI/CI | SQL-editor paste | unknown>`

**Interpretation**
- `schema_migrations_table` **non-null** ⇒ **CLI-managed** ⇒ per
  `PHASE0_PLAN` A3, **do NOT renumber applied migrations**; add forward
  migrations only. Record which versions are present (gaps vs the repo files
  reveal what's actually live).
- **null** ⇒ history hand-managed; renumbering is *less* dangerous but still out
  of Phase 0 scope.
- → Sets **Decision D5**.

---

## §2 Identity objects exist?
**Result:**
```
profiles                    = <fill>
users                       = <fill>
user_profiles               = <fill>
privacy_preferences         = <fill>
points_ledger               = <fill>
quest_completions           = <fill>
community_notes             = <fill>
public_profiles             = <fill>
community_notes_with_author = <fill>
auth.users                  = <fill>
```
**Interpretation**
- This is the gate for Sections 9–15: **only run data queries for tables that are
  non-null here.**
- If `user_profiles` is **absent** ⇒ the game spine was never deployed to this
  env ⇒ the "split-brain" is largely theoretical here and the backfill becomes a
  *populate from scratch*, not a *reconcile* (changes D2 and PR #3 shape).
- If `profiles` is **absent** ⇒ the auth island was never deployed ⇒ re-examine
  what AuthContext is actually reading in prod (possible misconfig). **Stop
  condition S-unexpected.**

---

## §3 Column inventory — where each field lives
**Result (3a — paste the column lists):**
```
<fill: per-table column list>
```
**Result (3b — onboarding_completed):**
```
<fill: which table(s)>
```
**Result (3c — social/privacy/gamification field homes):**
```
<fill: column_name -> table_name rows>
```
**Interpretation**
- Confirms the **relocation list for PR #2** (every field present on `profiles`
  but not `user_profiles`).
- Confirm `xp`/`level` exist on **both** (expected) — that, plus §13, is why we
  recompute from the ledger rather than copy a cache.
- If `user_profiles` already has any of the relocate-target columns, **trim PR
  #2** accordingly (don't re-add) and check §14c for username.

---

## §4 Signup triggers on `auth.users`
**Result:**
```
<fill: trigger_name | status | calls_function rows>
```
**Interpretation**
- **0 rows** ⇒ no signup automation ⇒ new users get **no** app rows ⇒ onboarding
  was relying on something else (or is broken). Investigate before proceeding.
- **1 row** ⇒ already consolidated — verify it provisions the right tables (§5).
- **≥2 rows** ⇒ the duplicate-trigger conflict from `SUPABASE_AUDIT.md §3` is
  **live**. Record names (expected suspects: `on_auth_user_created`,
  `on_auth_user_created_game`). → PR #4 collapses these.

---

## §5 Signup function bodies
**Result:**
```
<fill: definition of handle_new_user and/or handle_new_auth_user, or "absent">
```
**Interpretation** — for **each** function that a §4 trigger calls, note the
INSERT targets:
- creates `public.profiles`? `<yes/no>`
- creates `public.users`? `<yes/no>`
- creates `public.user_profiles`? `<yes/no>`
- creates `public.privacy_preferences`? `<yes/no>`

If the **live** function does **not** create `profiles` (the
`SUPABASE_AUDIT.md §3` failure), expect §10a to show `auth_without_profiles > 0`
and confirms the onboarding-persistence bug is real in this env.

---

## §6 View definitions (`public_profiles`, `community_notes_with_author`)
**Result (6a — view bodies):**
```
<fill>
```
**Result (6b — security_invoker / reloptions):**
```
<fill>
```
**Result (6c — base-table dependency map):**
```
<fill>
```
**Interpretation**
- Record the **exact output column list of `public_profiles`** — PR #4 must
  reproduce it byte-for-byte (it is what `PublicProfile.tsx` selects).
- Confirm `public_profiles` reads from **`profiles`** today (expected) and that
  `community_notes_with_author` reads from **`users`+`community_notes`**
  (expected — so it needs **no** change).
- `security_invoker` false/absent ⇒ definer view (correct for the privacy-safe
  public projection).

---

## §7 RLS state & policies
**Result (7a — rls_enabled/forced):**
```
<fill>
```
**Result (7b — policies on identity tables):**
```
<fill>
```
**Interpretation**
- Confirm RLS is **enabled** on `profiles`, `users`, `user_profiles`,
  `privacy_preferences`. Any `rls_enabled = false` on a user-data table is a
  security finding — note it (out of Phase 0 scope to fix, but record).
- Capture the `user_profiles` self-read/self-update policies — PR #4 must leave
  these **invariant** (they already govern the relocated columns).

---

## §8 Grants on the public views
**Result (8a):**
```
<fill: table_name | grantee | privilege rows>
```
**Manual (8b) — anon read behaves safely:** `<pass/fail/not-tested>`
**Interpretation**
- `public_profiles` must grant `SELECT` to `anon` **and** `authenticated`.
  Missing ⇒ `/u/:username` is already broken for visitors; PR #4 must restore it.
- 8b is a **behavioural** check (logged-out visit / anon-key request) — do not
  switch roles in the editor.

---

## §9 Identity row counts
**Result (9a — approx):**
```
<fill>
```
**Result (9b–9c — exact, per existing table):**
```
auth.users           = <fill>
profiles             = <fill>
users                = <fill>
user_profiles        = <fill>
privacy_preferences  = <fill>
points_ledger        = <fill>
```
**Interpretation** — sizes the migration window and risk; cross-check against §10
and §11. Large `auth.users` with tiny `points_ledger` ⇒ little real gameplay ⇒
lower backfill risk.

---

## §10 Orphans
**Result:**
```
auth_without_profiles        = <fill>
auth_without_users           = <fill>
auth_without_user_profiles   = <fill>
auth_without_privacy         = <fill>
user_profiles_without_users  = <fill>
users_not_in_auth            = <fill>
```
**Interpretation**
- `auth_without_user_profiles > 0` ⇒ PR #3 must **create** missing
  `user_profiles` rows (not just update). Expected if the trigger omitted them.
- `auth_without_profiles > 0` ⇒ confirms the live trigger doesn't create
  `profiles` (ties to §5) — explains broken onboarding.
- `user_profiles_without_users > 0` ⇒ FK assumption is violated ⇒ **Stop
  condition S3**.
- `users_not_in_auth > 0` ⇒ out-of-band rows ⇒ keep the `users.id→auth.users`
  FK **deferred** (A5) and note for the hardening PR.

---

## §11 Population split
**Result:**
```
auth_users         = <fill>
only_profiles      = <fill>
only_user_profiles = <fill>
both               = <fill>
neither            = <fill>
```
**Interpretation** — **this drives the model decision (D1) and backfill direction
(D2):**
- Mostly `only_profiles` ⇒ data lives in the auth island; backfill **populates**
  `user_profiles` from `profiles` + ledger. End-state target unchanged.
- Mostly `both` with divergence (see §13) ⇒ genuine split-brain; ledger-recompute
  is essential.
- `neither > 0` ⇒ users with no app rows at all ⇒ PR #3 provisions them.

---

## §12 Is XP/level/points populated?
**Result (12a profiles / 12b user_profiles / 12c ledger):**
```
profiles:      <fill>
user_profiles: <fill>
points_ledger: <fill>
```
**Interpretation**
- If `profiles.xp_gt_0` is high but `user_profiles.xp_gt_0` ~0 ⇒ rebuilding
  `public_profiles` over `user_profiles` **without backfill** would show 0 XP —
  the regression `PHASE0_PLAN` A2 warns about. Backfill/recompute is mandatory
  before PR #4 flips the view.
- If `points_ledger` is essentially empty ⇒ there is no real gameplay to lose ⇒
  PR #3 risk is low (seed/initialise instead of reconcile).

---

## §13 Ledger recompute feasibility
**Result:**
```
diverging_users (13a)                      = <fill>
count_mismatches (13b)                     = <fill>
profiles_xp_diverging_from_ledger (13c)    = <fill>
```
**Interpretation**
- These quantify the split-brain. The recommended rule (A2): **recompute
  `user_profiles.xp/points/counts` from the ledger + `quest_completions`** so the
  backfill is direction-independent.
- If the ledger sum reproduces gameplay cleanly ⇒ recompute is the canonical
  backfill ✔.
- If the ledger **cannot** reproduce known gameplay (e.g. completions exist with
  no ledger rows) ⇒ **Stop condition S2** (needs a human reconciliation rule).

---

## §14 Username collisions
**Result (14a):**
```
rows_total / not_null / distinct_ci / collisions = <fill>
```
**Result (14b — colliding handles):**
```
<fill: list, or "none">
```
**Manual (14c):** does `user_profiles.username` already exist? `<yes/no>` (from
§3c). If yes, cross-table collision check done? `<yes/no/n-a>`
**Interpretation**
- `case_insensitive_collisions = 0` ⇒ safe to add `UNIQUE(username)` in PR #3.
- `> 0` ⇒ needs a **deterministic dedupe rule**; if it can't be automated, **Stop
  condition S4** (product decides who keeps the handle).

---

## §15 Display-name / avatar drift
**Result:**
```
display_name_mismatches = <fill>
avatar_url_mismatches   = <fill>
```
**Interpretation** — confirms picking `users.*` as canonical is safe; large
mismatch counts mean PR #3 should prefer the **more recently updated** source
(record which, or default to `profiles` since that's what the UI edits today).

---

## §16 Manual items
- 16a deployment workflow: `<fill>`
- 16b anon read of `public_profiles` safe: `<pass/fail/not-tested>`
- 16c backup / PITR available before PR #3/#4: `<yes/no>` (Dashboard → Database →
  Backups)

---

# Decision checklist — can Phase 0 proceed?

Mark each ✅ / ❌ / ⚠ with the evidence section in brackets.

- [ ] **D1. Model decision ratified.** Evidence (§2, §11, §13) supports
  converging on **`users` + `user_profiles`**. *If the data argues otherwise,
  write the revised decision here:* `<fill>`
- [ ] **D2. Backfill direction chosen.** One of:
  (a) populate `user_profiles` from `profiles` + ledger (env is `only_profiles`);
  (b) recompute gamification from the **ledger** and copy text/social/onboarding
  from `profiles` (env is `both`/divergent);
  (c) initialise fresh (no real gameplay). Chosen: `<a/b/c>` — evidence: `<§>`.
- [ ] **D3. Orphan handling defined.** PR #3 will create missing `user_profiles`
  rows for `auth_without_user_profiles = <n>` (§10c) and `neither = <n>` (§11).
- [ ] **D4. Username uniqueness path clear.** Collisions `= <n>` (§14); dedupe
  rule = `<fill / none needed>`.
- [ ] **D5. Migration regime known.** CLI-managed = `<yes/no>` (§1); renumbering
  stays **out of Phase 0** either way.
- [ ] **D6. View shape pinned.** `public_profiles` output columns recorded (§6)
  for PR #4 to reproduce exactly; `community_notes_with_author` needs no change.
- [ ] **D7. RLS/grants baseline captured.** Policies (§7) + view grants (§8)
  recorded so PR #4 keeps them invariant.
- [ ] **D8. Backup available.** PITR/snapshot confirmed (§16c) before any
  write-bearing PR (#3/#4).
- [ ] **D9. No stop condition triggered** (see below).

**Go / No-Go:** `<GO / NO-GO>` — decided by `<name>` on `<date>`.
If GO, next step = **PR #2 (additive schema)**, scoped from §3/§14.

---

# Stop conditions (any one ⇒ HALT, escalate, do not start PR #2/#3/#4)

- **S1 — Regime unknown.** §1 + 16a cannot establish CLI vs manual.
- **S2 — Irreconcilable gamification.** §13 shows the ledger cannot reproduce
  known gameplay (completions/rewards without matching ledger rows), and both
  caches diverge ⇒ needs a human-designed reconciliation rule.
- **S3 — Broken FK assumption.** §10e `user_profiles_without_users > 0` (the
  `users.id = user_profiles.user_id` convention doesn't hold).
- **S4 — Username collisions unresolvable.** §14 collisions can't be auto-deduped
  ⇒ product decision required before `UNIQUE`.
- **S5 — Unexpected topology.** §2 shows `profiles` or `user_profiles` missing in
  a way that contradicts `SUPABASE_AUDIT.md`, or §6 shows an extra/unknown
  consumer of `profiles` beyond AuthContext + `public_profiles` ⇒ re-scope the
  app cutover (and reconsider the compatibility shim, `PHASE0_PLAN` A4).
- **S6 — No backup.** §16c shows no snapshot/PITR available ⇒ do not run any
  write-bearing PR.

> Record the disposition of every stop condition (cleared / triggered) before
> declaring GO. A blank stop-condition section is **not** a GO.
