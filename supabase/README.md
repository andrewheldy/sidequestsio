# SideQuests.io — Supabase Backend

The application ships with two interchangeable backends behind one
`Repository` interface (`src/lib/db/repository.ts`):

| Mode         | When                                   | Storage                          |
| ------------ | -------------------------------------- | -------------------------------- |
| **Local**    | default (no env vars)                  | `localStorage`, seeded demo data |
| **Supabase** | `VITE_SUPABASE_URL` + anon key set     | PostgreSQL + Auth + RLS          |

Supabase is selected automatically when the env vars are set; otherwise the
app falls back to the fully functional in-browser `LocalRepository`. The
static `MockRepository` is **dev-build-only** (`import.meta.env.DEV`) and can
never be enabled in a production build (see `docs/DECISIONS.md`, 2026-07-06).

---

## Migration execution order

Run each file in the Supabase SQL editor (or `supabase db push`) **in this
exact order**. All files are idempotent and safe to re-run.

| # | File | What it does |
|---|------|-------------|
| 1 | `migrations/0001_profiles.sql` | `profiles` table + auth trigger (already applied) |
| 2 | `migrations/0006_game_schema.sql` | All game tables, enums, indexes, views, profile columns, note_reports, auth trigger |
| 3 | `migrations/0007_rls_idempotent.sql` | Full RLS — helper functions + all policies (drop-before-create) |
| 4 | `migrations/0003_functions.sql` | SECURITY DEFINER RPCs (complete_quest, redeem_reward, analytics…) |
| 5 | `migrations/0003_avatars_storage.sql` | Avatar storage bucket + object policies |
| 6 | `migrations/0008_profile_is_public.sql` | Adds `profiles.is_public` (canonical visibility flag) |
| 7 | `migrations/0009_grants.sql` | **Required.** PostgREST grants for `anon`/`authenticated` — without this every SPA read of the game tables is permission-denied, RLS notwithstanding |
| 8 | `migrations/0010_auth_bootstrap.sql` | **Required, must run after `0003_functions.sql`.** One canonical `handle_new_auth_user` (creates `users`, `user_profiles`, `privacy_preferences` **and** `profiles`), one trigger, backfill for existing users |
| 9 | `migrations/0011_profile_visibility.sql` | Canonicalizes visibility on `is_public`; points `public_profiles` view at it |
| 10 | `migrations/0012_quest_fable_fields.sql` | Fable quest columns (incl. `action_prompt`, `links`) — captures prior live drift |
| 11 | `migrations/0013_proofs_bucket.sql` | `proofs` storage bucket + policies for quest proof photos/videos |

> ⚠️ **History note:** `0003_functions.sql` and `0006_game_schema.sql` both
> define `handle_new_auth_user()` with different behavior — running `0003`
> after `0006` used to silently break profile creation on signup (this
> happened on the live project; see `docs/PRODUCTION_SPRINT_PLAN.md` §0).
> `0010_auth_bootstrap.sql` resolves this order trap permanently: whatever
> state an environment is in, running it last yields the canonical function.
>
> Files `0001_schema.sql`, `0002_rls.sql`, `0002_profile_overhaul.sql`,
> `0004_phone_social.sql`, `0005_note_reports.sql` are **superseded** by
> `0006_game_schema.sql` + `0007_rls_idempotent.sql`. They exist as history
> but do not need to be run separately if you start from scratch.

After applying any migration batch, run the read-only reality gate
`scripts/verify-db.sql` in the SQL editor (every check should pass) and
`npm run smoke:supabase` locally (anon-client read paths).

---

## Seeding data

### Catalog data (no auth required)

```sql
-- Run in the SQL editor or psql:
\i supabase/seed_full.sql
```

Inserts 7 partners, 9 venues, 9 quests, 9 QR codes, and 10 rewards using
stable UUIDs documented in `import_mapping.json`.

### Community notes (real users required)

Community notes have `user_id` foreign keys — they require real `auth.users`
rows. After your demo accounts have signed up:

1. Open `supabase/import_notes.sql`.
2. Replace the six `PLACEHOLDER_UUID_*` values with the real auth UUIDs.
3. Run the script as **service-role** (bypasses RLS for seeding).

---

## ID mapping

`supabase/import_mapping.json` documents every mock string ID from
`src/data/mock/` and its corresponding stable UUID used in `seed_full.sql`.
This is the canonical reference for the JSON → Supabase import.

UUID ranges:

| Prefix      | Entity        |
| ----------- | ------------- |
| `10000000-` | partners      |
| `20000000-` | venues        |
| `30000000-` | quests        |
| `40000000-` | qr_codes      |
| `50000000-` | rewards       |
| `60000000-` | community_notes (import_notes.sql) |

---

## Full setup (production)

1. Create a Supabase project.
2. Run migrations 1–5 in the order above.
3. Run `seed_full.sql` for catalog data.
4. Enable auth providers (Email magic link, Google, Apple) in
   **Authentication → Providers**.
5. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` +
   `VITE_SUPABASE_ANON_KEY`.
6. Once demo users have signed up, run `import_notes.sql` for community notes.

---

## Design notes

- **Append-only ledger.** Points/XP truth lives in `points_ledger`;
  `user_profiles.points_balance_cache` is a denormalized cache updated inside
  the same transaction as the ledger insert.
- **Integrity in the database.** All abuse-sensitive mutations
  (`complete_quest`, `redeem_reward`, `create_community_note`, `record_scan`,
  `adjust_points`) are `SECURITY DEFINER` functions, so RLS keeps direct table
  writes locked down.
- **Anti-farming.** `quest_completions` has a `unique (user_id, quest_id)`
  constraint; completion is idempotent and double-awards are impossible.
- **Privacy-first analytics.** `partner_analytics()` returns aggregate counts
  only, suppresses per-segment breakdowns below 5 scans, and never exposes
  emails, individual profiles, or precise coordinates.
- **New-user bootstrap.** A trigger on `auth.users` creates matching
  `users` / `user_profiles` / `privacy_preferences` rows on sign-up.
- **Public profiles opt-in.** `public_profiles` view only exposes rows where
  `is_profile_public = true`; social links are further gated by
  `show_social_links`.
