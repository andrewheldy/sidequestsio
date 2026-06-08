# Trainr — Supabase Backend

Auth, profiles, and storage are backed by Supabase (PostgreSQL + Auth + RLS +
Storage). The client talks to it through `src/lib/supabase.ts` and the
`AuthContext`. When the `VITE_SUPABASE_*` env vars are unset the app still boots
in a guest/demo mode (auth actions surface a friendly message).

## Setup (production)

1. Create a Supabase project.
2. Run the migrations **in order** (SQL editor or `supabase db push`):
   - `migrations/0001_profiles.sql` — `profiles` table, RLS, signup trigger
   - `migrations/0002_profile_overhaul.sql` — bio/social columns + `public_profiles` view
   - `migrations/0003_avatars_storage.sql` — avatars storage bucket + policies
   - `migrations/0004_phone_social.sql` — phone + extra social columns
   - `migrations/0005_note_reports.sql` — note reporting
3. Copy `.env.example` → `.env.local` and fill in the URL + anon key.
4. Enable the auth providers you want (Email, Google, Apple) in
   **Authentication → Providers**.

## Design notes

- **One user model.** Each `auth.users` row owns exactly one `public.profiles`
  row, created by a single `on_auth_user_created` trigger
  (`handle_new_user`). Profile fields cover identity, onboarding selections,
  social links, privacy/visibility flags, and lightweight gamification
  (`xp`, `level`, `streak`).
- **Privacy-safe public reads.** Other users' profiles are only ever read
  through the `public_profiles` view, which exposes a hand-picked, flag-gated
  subset of columns for opted-in (`is_profile_public`) profiles.
- **RLS everywhere.** The `profiles` base table is owner-only for select/update;
  the public view is the single public read path.

> The Trainr feature tables (creators, programs, subscriptions, workout
> sessions, …) are introduced by later MVP migrations — see
> `docs/trainr-mvp-revenue-scope.md`.
