# SideQuests.io — Supabase Architecture Audit & Migration Strategy

> **Scope.** This is the deep-dive promised by `AUDIT.md §0/§2/§4`. It answers a
> single question: **how do we get to one clean user/profile/auth architecture
> without breaking onboarding, quest completion, Community Notes, rewards,
> analytics, or public profiles?**
>
> **No SQL here by design.** This is the decision + strategy. DDL comes in the
> next phase, once the decisions below are accepted.
>
> Source of truth: the code as read on branch
> `claude/sidequests-codebase-audit-r9v8l6`. Brutally honest throughout.

---

## 1. Current Supabase Architecture (identity layer)

There are **four** identity-ish tables/objects, owned by **two lineages** that
were never reconciled:

```
auth.users  (Supabase-managed)
   │  id = the only real, authoritative user id
   │
   ├──(FK)──►  public.profiles            ← AUTH/UI ISLAND  (profiles lineage)
   │            user_id PK → auth.users(id) ON DELETE CASCADE
   │            • display_name, username(UNIQUE), avatar_url
   │            • home_city, bio, phone_number
   │            • instagram/tiktok/x/youtube/snapchat _url
   │            • is_public, is_profile_public, show_social_links,
   │              show_completed_quests, show_breadcrumbs
   │            • interests[], quest_style, quest_energy, starting_area
   │            • xp, level, streak                ← SEEDED 100/1/1 at onboarding,
   │            • onboarding_completed               NEVER updated by gameplay
   │            • created_at, updated_at
   │            Read/written by: AuthContext, Onboarding, Settings, Profile,
   │            public_profiles view → PublicProfile page.
   │
   └──(no FK; id set = auth.uid by trigger)──►  public.users   ← GAME ISLAND (game lineage)
                id PK  default gen_random_uuid()   ⚠ NOT a FK to auth.users
                • email(UNIQUE), display_name, avatar_url
                • role  (← RLS & RPC read THIS), account_status, last_active_at
                   │
                   ├──► public.user_profiles  (stats ONLY)
                   │      user_id PK → users(id)
                   │      • home_city, xp, level
                   │      • points_balance_cache, lifetime_points
                   │      • completed_quests_count, community_notes_count,
                   │        rewards_redeemed_count
                   │      Written by: complete_quest / redeem_reward /
                   │      create_community_note / adjust_points RPCs.
                   │      Read by: SupabaseRepository.getProfile().
                   │
                   ├──► public.privacy_preferences (user_id → users)
                   └──► every game table FKs to users: partners.owner_user_id,
                        scan_events, quest_attempts, quest_completions,
                        community_notes, points_ledger, reward_redemptions,
                        consent_events, audit_logs, note_reports, leaderboard_snapshots
```

**Two clients, two code paths, two truths:**

| Concern | Auth/UI path | Game path |
|---|---|---|
| Supabase client | `src/lib/supabase.ts` (eager) | `src/lib/supabase/client.ts` (lazy) |
| "Profile" table | `profiles` | `user_profiles` (+`users`) |
| Role source | `user.user_metadata.role` | `users.role` (column) |
| XP / level | `profiles.xp` / `profiles.level` | `user_profiles.xp` / `user_profiles.level` |
| Points | *(not shown in UI profile)* | `user_profiles.points_balance_cache` + `points_ledger` |
| Public profile | `public_profiles` view → over `profiles` | — |
| Display name / avatar | `profiles.display_name/avatar_url` **and** `users.display_name/avatar_url` (duplicated) | `users.*` |

### The split-brain, stated bluntly
- A user completes a quest → `complete_quest` RPC writes `user_profiles.xp +=`,
  `points_balance_cache +=`, `completed_quests_count +=`.
- The Profile screen and the public `/u/:username` page both read **`profiles.xp`
  / `profiles.level`**, which were set to **100 / 1 at onboarding and are never
  touched again.**
- **Net effect: gameplay is invisible on every profile surface.** Points have no
  profile surface at all. `completed_quests_count` / `community_notes_count` live
  on `user_profiles` but the UI reads `profiles` (which lacks them — the
  `AuthContext.Profile` type declares them optional and they are always
  `undefined`).

This is not a cosmetic bug. It means **the core loop (do a quest → see progress)
does not work end-to-end in production**, independent of the routing gaps.

---

## 2. Migration Conflict Report

Eleven files, **two collide on numbers**, and the folder is **not safe to apply
in filename order**.

| File | Lineage | Verdict |
|---|---|---|
| `0001_profiles.sql` | profiles | **Keep** as historical baseline (already applied in prod). |
| `0001_schema.sql` | game | **Archive** — superseded by `0006`. Duplicate `0001`. |
| `0002_profile_overhaul.sql` | profiles | **Archive** — folded into `0006`. |
| `0002_rls.sql` | game | **Archive** — superseded by `0007`. Duplicate `0002`. |
| `0003_avatars_storage.sql` | profiles | **Keep / merge** into canonical baseline (storage bucket). |
| `0003_functions.sql` | game | **Keep / merge** into canonical baseline (the RPCs) — but its trigger block must be **rewritten** (see §3). Duplicate `0003`. |
| `0004_phone_social.sql` | profiles | **Archive** — folded into `0006`. |
| `0005_note_reports.sql` | game | **Archive** — folded into `0006`. |
| `0006_game_schema.sql` | consolidated | **Keep** as the game baseline. |
| `0007_rls_idempotent.sql` | consolidated | **Keep** as the RLS baseline. |
| `0008_profile_is_public.sql` | profiles | **Keep / merge** (adds `profiles.is_public`). Missing from README order. |

**Why filename order breaks it:** running `0001_profiles → 0001_schema →
0002_profile_overhaul → 0002_rls → 0003_avatars → 0003_functions → …` executes
**both** signup-trigger definitions, leaving the trigger state dependent on file
ordering within the same number (see §3). The `supabase/README.md` "correct
order" (`0001_profiles → 0006 → 0007 → 0003_functions → 0003_avatars`) is an
out-of-band instruction that contradicts the folder; a fresh operator running
`supabase db push` over the directory gets a different, broken result.

**Recommendation:** collapse to a **single linear baseline** (renumbered, one
sequence) and move the five "Archive" files to `supabase/migrations/_archive/`
for history. The new unification work becomes the next forward migration on top.

---

## 3. Trigger Conflict Report

Three trigger definitions on `auth.users`, two functions of overlapping name:

| Defined in | Trigger name | Function | Inserts into |
|---|---|---|---|
| `0001_profiles.sql` | `on_auth_user_created` | `handle_new_user()` | `profiles` only |
| `0003_functions.sql` | `on_auth_user_created` (drops+recreates) | `handle_new_auth_user()` **v1** | `users`, `user_profiles`, `privacy_preferences` — **NOT `profiles`** |
| `0006_game_schema.sql` | `on_auth_user_created_game` | `handle_new_auth_user()` **v2** | `users`, `user_profiles`, `privacy_preferences`, **and `profiles`** |

Two independent problems:

1. **Same function name, two bodies.** `0003_functions` and `0006` both
   `CREATE OR REPLACE FUNCTION handle_new_auth_user()`. Whichever runs **last**
   wins. Per the README order, `0003_functions` runs last → **v1 wins → no
   `profiles` row is created on signup.**
2. **Two triggers can both survive.** `on_auth_user_created` (from `0003`) and
   `on_auth_user_created_game` (from `0006`) are different names, so both can
   exist and both fire the same function — harmless duplication (the inserts are
   `ON CONFLICT DO NOTHING`) but it signals the mess.

**Downstream failure (already documented in `AUDIT.md §4`, restated for
completeness):** with no `profiles` row, `AuthContext.fetchProfile` returns
`null`; `completeOnboarding`/`updateProfile` do `UPDATE profiles … WHERE
user_id` → **0 rows, no error** → onboarding silently never persists, the user
can be let past the onboarding gate with `profile = null`, and the session is
broken.

**Canonical signup flow (target):** exactly **one** trigger
(`on_auth_user_created`) → **one** function that provisions the **unified**
tables in one shot:
- insert `users(id=new.id, email, display_name=coalesce(metadata.display_name,
  split_part(email,'@','1')), role='user')`,
- insert `user_profiles(user_id=new.id)` with defaults (xp 0, level 1,
  onboarding_completed false, …),
- insert `privacy_preferences(user_id=new.id)` with defaults.

No `profiles` insert — because `profiles` ceases to be a base table (see §4/§5).
`users.id` should also become a **real FK to `auth.users(id)` ON DELETE CASCADE**
(today it is only `default gen_random_uuid()` set equal by the trigger — a latent
integrity hole if any row is ever inserted outside the trigger).

---

## 4. Profile Model Decision

**Standardize on `users` + `user_profiles`. Demote `profiles` to a
compatibility view, then retire it.**

Rationale — this is not close:

| Criterion | `profiles` (island) | `users` + `user_profiles` (game) |
|---|---|---|
| What FKs point at it | `auth.users` only | **11 game tables** (completions, ledger, notes, redemptions, scans, partners, …) |
| What the integrity-critical RPCs write | nothing | **all of them** (`complete_quest`, `redeem_reward`, `adjust_points`, …) |
| What RLS helpers read | nothing | `users.role` (`is_admin`, `owns_partner`) |
| What the Repository reads | nothing | `getProfile()` → `user_profiles` |
| Leaderboard source | nothing | `points_ledger` + `users` + `privacy_preferences` |
| Has the user-facing text fields | **yes** (username, bio, social, privacy flags, onboarding) | no |

`profiles` wins on exactly one axis: it currently holds the editable
text/social/privacy/onboarding fields. That is a **column-placement problem**, not
an architecture choice. Moving those columns onto `user_profiles` is far cheaper
and lower-risk than repointing 11 FKs, every RPC, all RLS, and the leaderboard at
`profiles`.

**Decision in one line:** *keep the game spine; relocate the profile fields onto
it; make `profiles` a thin compatibility shim so the auth/UI code keeps working
during the transition.*

### Where each field lands (canonical home)
- **`users`** (account/identity): `email`, `display_name`, `avatar_url`, `role`,
  `account_status`, `created_at`, `last_active_at`.
  *(`avatar_url`/`display_name` are duplicated on `profiles` today — `users`
  becomes the single home.)*
- **`user_profiles`** (profile + gamification): existing stats
  **plus relocated** `username (UNIQUE)`, `bio`, `phone_number`,
  `instagram_url`, `tiktok_url`, `x_url`, `youtube_url`, `snapchat_url`,
  `is_public`/`is_profile_public`, `show_social_links`,
  `show_completed_quests`, `show_breadcrumbs`, `interests[]`, `quest_style`,
  `quest_energy`, `starting_area`, `streak`, `onboarding_completed`,
  `updated_at`. `home_city` already exists here. **`xp`/`level` already exist
  here and are canonical — `profiles.xp/level` are discarded.**
- **`privacy_preferences`**: unchanged (consent + visibility enums) — note there
  is overlap with the `profiles.*` boolean flags; see "Honest wrinkle" below.

> **Honest wrinkle — two visibility systems.** Visibility is encoded twice:
> `privacy_preferences.profile_visibility/leaderboard_visibility` (enum
> public/friends/private) **and** `profiles.is_public/is_profile_public/show_*`
> (booleans). The UI uses the `profiles` booleans; the RPCs/RLS use the
> `privacy_preferences` enums (e.g. leaderboard opt-out reads
> `privacy_preferences.leaderboard_visibility`). **Do not try to merge these in
> this phase** — the prompt says don't redesign unrelated systems. Relocate the
> `profiles` booleans as-is onto `user_profiles`, keep `privacy_preferences` as
> the RLS/RPC source, and file the de-duplication as a follow-up. Flag it, don't
> fix it now.

---

## 5. Table-by-Table Impact Analysis

| Table / object | Change | Risk | Notes |
|---|---|---|---|
| `auth.users` | none | — | Authoritative id source. |
| `public.users` | add FK `id → auth.users(id)`; trigger sets `display_name` from metadata | Low–Med | FK add must be validated against existing rows first. |
| `public.user_profiles` | **+~19 columns** relocated from `profiles`; add `UNIQUE(username)`, `updated_at` trigger | **Med** | Username dedupe required before unique constraint. xp/level untouched. |
| `public.profiles` | **becomes a VIEW** over `users`+`user_profiles` (+ `INSTEAD OF` triggers for UPDATE) → later **dropped** | **High** | The shim must reproduce the exact column set AuthContext selects, so `from('profiles')` keeps working unchanged. |
| `public.privacy_preferences` | none | — | Stays the RLS/RPC visibility source. |
| `public.partners`/`venues`/`quests`/`qr_codes` | none | — | Already FK to `users`. |
| `scan_events`, `quest_attempts`, `quest_completions` | none | — | FK to `users` — unaffected. |
| `points_ledger`, `rewards`, `reward_redemptions` | none | — | Unaffected. |
| `community_notes`, `note_reports` | none | — | FK to `users` — unaffected. |
| `leaderboard_snapshots`, `analytics_rollups` | none | — | Unused today (see `AUDIT.md §6 #8`). |
| `consent_events`, `audit_logs` | none | — | Unaffected. |
| **view** `public_profiles` | **rebuild** over `users`+`user_profiles` | **Med** | Must keep the **same output columns** (PublicProfile.tsx selects a fixed shape); xp/level now come from `user_profiles` → public profiles finally reflect gameplay. |
| **view** `community_notes_with_author` | **no change** | — | Already joins `users` — unaffected by unification. ✅ |
| **trigger** signup | collapse to one | Med | See §3. |
| **storage** `avatars` | none | — | Path is `{auth.uid}/…`; still valid. |

**Repository / type impact:** `SupabaseRepository.getProfile()` already targets
`user_profiles`; after the column move it can `select('*')` and get the full
profile (today it returns only stats). The `UserProfile` TS type
(`src/types/db.ts`) must gain the relocated fields. `AuthContext.Profile` and
`UserProfile` can then converge.

---

## 6. RLS Impact Analysis

| Object | Today | After unification | Action |
|---|---|---|---|
| `profiles` | owner-only SELECT/INSERT/UPDATE (`auth.uid()=user_id`) | becomes a view | Views don't take RLS; the underlying `user_profiles` RLS governs. Drop the `profiles` table policies when the table is dropped. |
| `user_profiles` | `profiles_self_read` (self or admin), `profiles_self_update` (self) | unchanged predicates, now also guards the relocated fields incl. `username` | **Verify** self-UPDATE covers the new columns (it does — row-level, all columns). No INSERT policy exists → inserts only via the SECURITY DEFINER signup trigger (fine). |
| `users` | `users_self_read` (self/admin), `users_self_update` (self) | unchanged | Adding the auth FK doesn't change policies. |
| `public_profiles` view | `security_invoker=false` (definer), granted to anon/auth; filtered by `is_profile_public` | rebuilt definer view filtered by relocated `user_profiles.is_profile_public` | Re-grant `select` to `anon, authenticated`; re-`revoke` from public. Behaviour identical. |
| `privacy_preferences` | `privacy_self_all` | unchanged | — |
| All game-table policies (`owns_partner`, `is_admin`, self-read) | reference `users.role` / `auth.uid()` | unchanged | **Unaffected** — the whole point of choosing this spine. ✅ |

**RLS risk callout:** the only behavioural RLS change is *where* the
public-profile filter column lives. Everything else is invariant. The
client-vs-server **role mismatch** (`user_metadata.role` vs `users.role`) is
orthogonal to unification — note it, fix it when routing admin/partner (per
`AUDIT.md §8 step 3`), not here.

---

## 7. Data Migration Risks (ranked)

1. **🔴 Clobbering real XP/points (Critical).** Existing users may have BOTH a
   `profiles` row (xp seeded 100, untouched) AND a `user_profiles` row (xp grown
   by gameplay). The backfill must take **text/social/privacy/onboarding fields
   from `profiles`** but **must NOT overwrite `user_profiles.xp/level/points`
   with `profiles.xp/level`.** Getting this backwards silently resets every
   player's progress. This is the single most dangerous step.
2. **🔴 Username uniqueness collisions (Critical).** `profiles.username` is
   unique within `profiles`, but after relocation it must be unique within
   `user_profiles`. If any `user_profiles` row already had a value, or two
   `profiles` map oddly, the `UNIQUE` add fails. **Dedupe/validate first**;
   migration must be abortable without partial state.
3. **🟠 Missing counterpart rows (High).** Because of the trigger bug, prod may
   contain users with a `profiles` row but no `user_profiles` row (or vice
   versa). Backfill must **create the missing `user_profiles` row** (defaults +
   carried-over fields) for every `auth.users`, not just update existing ones.
4. **🟠 `onboarding_completed` loss (High).** If this flag isn't carried over,
   every existing user is bounced back into onboarding. Must map
   `profiles.onboarding_completed → user_profiles.onboarding_completed`.
5. **🟠 Unknown live state (High).** We do **not** know which migrations are
   actually applied in the live project, nor whether `profiles` or
   `user_profiles` is the one being written. **Step zero is inspection**
   (`information_schema`, `pg_trigger`, row counts, sample rows) before any DDL.
6. **🟡 Compatibility-view UPDATE semantics (Medium).** A multi-table view is not
   updatable without `INSTEAD OF` triggers. `AuthContext.updateProfile` /
   `completeOnboarding` issue `UPDATE profiles SET …`. The shim must route those
   writes to `user_profiles` (and `users.display_name/avatar_url`) correctly, or
   writes silently no-op again — the exact failure we're fixing.
7. **🟡 `avatar_url`/`display_name` duplication drift (Medium).** Both tables
   carry these today; pick `users` as canonical and ensure the view reads from
   `users`, the shim writes to `users`.
8. **🟢 View grants (Low).** Forgetting to re-`grant select` on the rebuilt
   `public_profiles` breaks `/u/:username` for anon. Easy to test.

---

## 8. Recommended Canonical Schema (target end-state)

```
auth.users ──(FK)──► public.users ──(FK)──► public.user_profiles   ← ONE profile row/user
                          │                     (stats + text + social + privacy flags
                          │                      + interests/quest_style + onboarding)
                          ├──► public.privacy_preferences  (consent + visibility enums)
                          └──► all game tables (unchanged)

VIEWS:
  public_profiles            = definer view over users+user_profiles (privacy-gated)
  community_notes_with_author = unchanged (users join)

TRIGGER:
  on_auth_user_created → handle_new_user_v2()  (users + user_profiles + privacy_preferences)

REMOVED (after transition):
  public.profiles (table)        → compatibility view → dropped
  handle_new_user(), handle_new_auth_user() v1/v2, on_auth_user_created_game
```

Canonical migration set (renumbered, linear):
```
_archive/  ← 0001_schema, 0002_rls, 0002_profile_overhaul, 0004_phone_social, 0005_note_reports
0001_baseline_identity.sql      (users, user_profiles, privacy_preferences, enums)  [from 0006]
0002_baseline_game.sql          (partners…audit_logs, indexes, note_reports)        [from 0006]
0003_baseline_rls.sql           (helpers + all policies)                            [from 0007]
0004_baseline_functions.sql     (RPCs, signup trigger — REWRITTEN single trigger)   [from 0003_functions]
0005_baseline_storage.sql       (avatars bucket)                                    [from 0003_avatars]
0006_profile_unification.sql    (NEW: relocate columns, backfill, rebuild views, compat shim)
0007_profile_cleanup.sql        (NEW, later: drop profiles table + legacy triggers)
```

---

## 9. Recommended Migration Order (forward-only, safe)

> Forward-only: every step is additive or replace-in-place; no destructive op
> runs until the app is proven on the new shape.

1. **Inspect live DB** (no DDL). Confirm applied migrations, which table is
   written, username uniqueness, presence of orphan rows, row counts.
2. **Additive columns**: add the relocated columns to `user_profiles` (nullable /
   defaulted). No constraint yet. Non-breaking.
3. **Backfill**: per-user, copy text/social/privacy/onboarding fields
   `profiles → user_profiles`; **create** missing `user_profiles` rows for every
   `auth.users`; **never touch xp/level/points** (rule from §7.1).
4. **Dedupe usernames**, then add `UNIQUE(username)` + `updated_at` trigger to
   `user_profiles`.
5. **Rebuild `public_profiles`** over `users`+`user_profiles`, same output shape,
   re-grant. Test `/u/:username` against it (read-only, reversible).
6. **Rewrite the signup trigger** to the single `handle_new_user_v2`; drop
   `on_auth_user_created_game`; leave the old function defined but un-triggered
   for one release.
7. **Replace `profiles` with a compatibility view** (+ `INSTEAD OF` UPDATE
   triggers routing writes to `users`/`user_profiles`). The **table data stays**
   physically until step 10. AuthContext is now reading/writing the unified spine
   *through the shim, with no app code change yet*.
8. **App cutover (code):** point `AuthContext` and the `UserProfile`/`Profile`
   types at `user_profiles` directly (or keep the shim — your call), confirm
   onboarding persists and gameplay updates the visible profile.
9. **Soak** (one release): monitor for write no-ops, null profiles, leaderboard,
   public-profile correctness.
10. **Cleanup migration:** drop the `profiles` compatibility view + materialized
    table, the legacy trigger functions; archive superseded SQL.

---

## 10. Rollback / Compatibility Strategy

- **Each step is reversible until step 10.** Steps 2–4 are additive (drop the new
  columns to revert). Step 5 view can be swapped back to the old definition. Step
  6 can re-enable the old trigger. Step 7's shim means **old and new app code
  both work simultaneously** — the core compatibility guarantee.
- **No data is destroyed before step 10.** `profiles` rows persist as the source
  of truth for the backfill until the new shape is proven; if anything is wrong,
  re-run the (idempotent) backfill.
- **Feature-flag the app cutover (step 8)** so the client can be reverted
  independently of the DB (the shim keeps `from('profiles')` working either way).
- **Backups:** snapshot before steps 3, 4, and 10 (the only steps that can lose
  data if logic is wrong).
- **Idempotency:** every migration uses `IF NOT EXISTS` / `CREATE OR REPLACE` /
  `ON CONFLICT` so re-running is a no-op — consistent with the existing
  convention.

---

## 11. Implementation Phases

| Phase | Goal | Contents | Exit criterion |
|---|---|---|---|
| **P0 — Inspect** | Know reality | Live-DB introspection script (read-only) | Documented: applied migrations, written table, dup usernames, orphan rows |
| **P1 — Schema additive** | Land columns safely | order steps 2–4 | New columns exist + backfilled; unique(username) on; **zero xp/points deltas** |
| **P2 — Views + trigger** | Single source readable | steps 5–6 | `public_profiles` returns gameplay xp; one signup trigger |
| **P3 — Compat shim** | Old app keeps working | step 7 | `from('profiles')` read+write works against unified data |
| **P4 — App cutover** | Code on canonical spine | step 8 + type unification | Onboarding persists; quest completion changes visible profile |
| **P5 — Cleanup** | Remove the island | steps 9–10 + archive SQL | `profiles` gone; one linear migration set; soak clean |

Phases P0–P3 touch **only the database** and are invisible to users. The
user-visible fix lands in **P4**.

---

## 12. Exact Acceptance Tests

> Each must pass in **Supabase (production) mode** against a clean DB built from
> the canonical migration set, plus a backfilled copy of prod-like data.

**Signup & bootstrap**
- A1. New email signup → exactly **one** trigger fires → `users` + `user_profiles`
  + `privacy_preferences` rows exist; **no `profiles` base table is required**.
- A2. `user_profiles.onboarding_completed = false`, `xp = 0`, `level = 1` at
  creation; `users.display_name` = signup metadata (or email local-part).
- A3. No duplicate provisioning; re-running the trigger path is a no-op.

**Onboarding (the bug that started this)**
- A4. Complete onboarding → `user_profiles.{interests, quest_style, quest_energy,
  starting_area, onboarding_completed=true}` persist; **re-login does not
  re-trigger onboarding.**
- A5. `AuthContext.updateProfile({username,bio,social,privacy})` persists and is
  re-read correctly (through shim in P3, directly in P4).

**Quest completion → visible progress (split-brain fix)**
- A6. Complete a quest → `quest_completions` +1 (unique still enforced),
  `points_ledger` +1 earn row, `user_profiles.xp/points_balance_cache/
  completed_quests_count` increment, `level` recomputed.
- A7. **The Profile screen and `/u/:username` now show the increased XP/level**
  (this fails today). `completed_quests_count` shows the real number.
- A8. Double-complete is still rejected (`already_completed`).

**Community Notes**
- A9. A completer posts a note → `create_community_note` succeeds;
  `community_notes_with_author` returns the author `display_name`/`avatar_url`
  from `users` (unchanged behaviour).
- A10. Non-completer is rejected (`not_completed`). Moderation status flow intact.

**Rewards**
- A11. Redeem with sufficient balance → ledger spend row, inventory decrement,
  `user_profiles.points_balance_cache` decremented, redemption code issued.
- A12. Insufficient balance / out-of-stock / expired rejected atomically.

**Public profiles & privacy**
- A13. `is_profile_public=false` → `/u/:username` returns nothing for anon.
- A14. `is_profile_public=true`, `show_social_links=false` → social fields null in
  `public_profiles`; `=true` → present. `phone_number` **never** exposed.
- A15. `public_profiles` is selectable by `anon` and `authenticated`; base
  `user_profiles` is **not** selectable cross-user (RLS self-only holds).

**Analytics & leaderboard (must not regress)**
- A16. `partner_analytics` / `platform_analytics` return the same shapes;
  small-sample suppression intact.
- A17. `get_leaderboard` ranks by in-period ledger XP, honours
  `privacy_preferences.leaderboard_visibility='private'` opt-out, excludes
  non-`user` roles.

**RLS invariants**
- A18. User A cannot read/update User B's `user_profiles` row.
- A19. `is_admin()` / `owns_partner()` still resolve from `users.role` /
  `partners.owner_user_id` (unchanged).

**Migration safety**
- A20. Re-running every migration is idempotent (no error, no data change).
- A21. Backfill on a prod-like dataset produces **zero** change to any existing
  `user_profiles.xp/level/points_balance_cache/lifetime_points` (diff = 0).
- A22. Every `auth.users` row has exactly one `user_profiles` row after backfill
  (no orphans, no duplicates).

---

## 13. Direct Answers to the Ten Focus Questions

1. **Split-brain (`profiles` vs `users` vs `user_profiles`):** `users` =
   account/identity (+role used by RLS), `user_profiles` = stats only, `profiles`
   = a parallel island holding all editable text/social/privacy/onboarding +
   stale xp/level. Gameplay writes `user_profiles`; UI reads `profiles`; they
   never sync. → §1.
2. **Migration/trigger conflict:** duplicate `0001/0002/0003`, two functions
   named `handle_new_auth_user`, three trigger defs; README order makes the
   `profiles`-less version win. → §2, §3.
3. **Correct canonical signup flow:** one trigger `on_auth_user_created` → one
   function provisioning `users` + `user_profiles` + `privacy_preferences`; add
   `users.id → auth.users(id)` FK. → §3, §8.
4. **Standardize on:** **`users` + `user_profiles`** (relocate `profiles`
   columns onto `user_profiles`). → §4.
5. **Safest forward-only strategy:** additive columns → backfill (never touch
   xp/points) → unique(username) → rebuild views → single trigger → `profiles`
   compatibility view → app cutover → drop. → §9, §10.
6. **Preserve fields while unifying truth:** move text/social/privacy/onboarding
   to `user_profiles`; keep `user_profiles.xp/level/points` as the gameplay
   truth; rebuild `public_profiles` so public xp comes from gameplay. → §4, §5.
7. **Archive/rewrite/merge/supersede:** archive `0001_schema, 0002_rls,
   0002_profile_overhaul, 0004_phone_social, 0005_note_reports`; merge
   `0006+0007+0003_functions+0003_avatars+0008` into a linear baseline; rewrite
   the signup trigger; add `0006_profile_unification` + `0007_profile_cleanup`.
   → §2, §8.
8. **RLS that must change:** only the `public_profiles` filter column location and
   dropping `profiles` policies; all game-table/`user_profiles`/`users` policies
   are unchanged. → §6.
9. **Views to rebuild:** `public_profiles` (rebuild over the unified spine);
   `community_notes_with_author` (**no change**). → §5, §6.
10. **Routes/components/services to update after the decision:**
    - `src/contexts/AuthContext.tsx` — read/write target (the `Profile` shape).
    - `src/types/db.ts` — extend `UserProfile`; converge with `AuthContext.Profile`.
    - `src/lib/db/supabase/SupabaseRepository.ts` — `getProfile/updateProfile`
      can now return/accept the full profile.
    - `src/pages/Onboarding.tsx` + `src/contexts/AuthContext.completeOnboarding`
      — write to `user_profiles`.
    - `src/pages/app/Settings.tsx`, `src/pages/app/Profile.tsx` — unchanged if the
      shim/`Profile` shape is preserved; otherwise repoint reads.
    - `src/pages/PublicProfile.tsx` — unchanged **iff** `public_profiles` keeps
      its output shape (it should).
    - No change needed: scanFlow, rewards, leaderboard, analytics, community
      notes, partner/admin pages (they already use the game spine).

---

## 14. The One-Sentence Answer

Keep the game spine (`users` + `user_profiles`) that every quest, note, reward,
ledger, and analytics path already depends on; **relocate the profile/onboarding/
social fields onto `user_profiles`, backfill without ever overwriting real
XP/points, expose `profiles` as a temporary compatibility view, collapse the
duplicate migrations and triple signup triggers into one linear baseline with one
trigger, and rebuild only `public_profiles`** — and SideQuests reaches one clean
user/profile/auth architecture with onboarding, completion, notes, rewards,
analytics, and public profiles all reading the same truth.
