# SideQuests.io — Supabase Backend

The application ships with two interchangeable backends behind one
`Repository` interface (`src/lib/db/repository.ts`):

| Mode      | When                                   | Storage                         |
| --------- | -------------------------------------- | ------------------------------- |
| **Local** | default (no env vars)                  | `localStorage`, seeded demo data |
| **Supabase** | `VITE_SUPABASE_URL` + anon key set | PostgreSQL + Auth + RLS         |

No application code changes between modes — only environment variables.

## Setup (production)

1. Create a Supabase project.
2. Run the migrations **in order** (SQL editor or `supabase db push`):
   - `migrations/0001_schema.sql` — tables, enums, indexes, views
   - `migrations/0002_rls.sql` — Row Level Security policies + helpers
   - `migrations/0003_functions.sql` — RPCs (completion, redemption, analytics…)
3. (Optional) Run `seed.sql` for catalog demo data.
4. Copy `.env.example` → `.env.local` and fill in the URL + anon key.
5. Enable the auth providers you want (Email magic link, Google, Apple) in
   **Authentication → Providers**.

## Design notes

- **Append-only ledger.** Points/XP truth lives in `points_ledger`;
  `user_profiles.points_balance_cache` is a denormalized cache updated inside
  the same transaction as the ledger insert.
- **Integrity in the database.** All abuse-sensitive mutations (`complete_quest`,
  `redeem_reward`, `create_community_note`, `record_scan`, `adjust_points`) are
  `SECURITY DEFINER` functions, so RLS can keep direct table writes locked down.
- **Anti-farming.** `quest_completions` has a `unique (user_id, quest_id)`
  constraint; completion is idempotent and double-awards are impossible.
- **Privacy-first analytics.** `partner_analytics()` returns aggregate counts
  only, suppresses per-segment breakdowns below 5 scans, and never exposes
  emails, individual profiles, or precise coordinates.
- **New-user bootstrap.** A trigger on `auth.users` creates the matching
  `users` / `user_profiles` / `privacy_preferences` rows on sign-up.
