-- 0015_legal_consent.sql — signup consent capture (Terms/Privacy acceptance,
-- marketing opt-in) for the legal/compliance foundation added in this change.
-- See docs/legal/README.md ("How consent versions map to the database") for
-- the full picture of how these columns are populated and maintained.
--
-- Idempotent; safe to re-run. Additive only — no existing column, table, or
-- row is altered or removed.
--
-- Sequencing: until this migration is applied, the *live* handle_new_auth_user()
-- is still the 0010_auth_bootstrap.sql version, which simply ignores the extra
-- signup metadata (terms_version/privacy_version/marketing_opt_in) the
-- frontend now always sends — so shipping the frontend change ahead of this
-- migration is safe and will not break signups.
--
-- No backfill: existing accounts keep null/false in these new columns. We
-- have no record of what (if anything) pre-existing users agreed to, so we
-- don't fabricate a consent timestamp for them.

-- 1. New columns on public.profiles --------------------------------------------
alter table public.profiles add column if not exists accepted_terms_at    timestamptz;
alter table public.profiles add column if not exists accepted_privacy_at  timestamptz;
alter table public.profiles add column if not exists terms_version       text;
alter table public.profiles add column if not exists privacy_version     text;
alter table public.profiles add column if not exists marketing_opt_in    boolean not null default false;
alter table public.profiles add column if not exists marketing_opt_in_at timestamptz;

-- 2. Extend the canonical signup trigger ----------------------------------------
-- Same function as 0010_auth_bootstrap.sql, plus:
--   * profiles gets the consent snapshot, sourced from auth.users.raw_user_meta_data
--     (the same place display_name already comes from). accepted_terms_at /
--     accepted_privacy_at are stamped unconditionally at insert time because
--     the client (src/pages/Auth.tsx) blocks signUp() unless the required
--     "I agree to the Terms of Service and Privacy Policy" checkbox is checked
--     — so a new profiles row only ever gets created here after that gate.
--     (Caveat: this trigger fires for *any* new auth.users row, including ones
--     not created through the app's signup form, e.g. via the Supabase
--     dashboard — those still get an accepted_terms_at stamp with no real
--     consent behind it. Acceptable for MVP scope; flagged here rather than
--     silently assumed away.)
--   * privacy_preferences.marketing_consent is seeded from the same signup
--     choice, so the Settings toggle starts in sync with what the user picked
--     at signup instead of the column's default.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1),
    'Quester'
  );
  v_marketing_opt_in boolean := coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false);
  v_terms_version    text    := coalesce(new.raw_user_meta_data ->> 'terms_version', '1.0.0');
  v_privacy_version  text    := coalesce(new.raw_user_meta_data ->> 'privacy_version', '1.0.0');
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, v_name)
  on conflict (id) do nothing;

  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict do nothing;

  insert into public.privacy_preferences (user_id, marketing_consent)
  values (new.id, v_marketing_opt_in)
  on conflict do nothing;

  insert into public.profiles (
    user_id, display_name,
    accepted_terms_at, accepted_privacy_at,
    terms_version, privacy_version,
    marketing_opt_in, marketing_opt_in_at
  )
  values (
    new.id, v_name,
    now(), now(),
    v_terms_version, v_privacy_version,
    v_marketing_opt_in, case when v_marketing_opt_in then now() else null end
  )
  on conflict (user_id) do nothing;

  return new;
end $$;

-- No trigger changes needed: 0010_auth_bootstrap.sql already binds exactly one
-- trigger (on_auth_user_created) to this function name; CREATE OR REPLACE
-- FUNCTION updates its behavior in place.

-- Verification (run after applying, against a fresh test signup):
--   select user_id, terms_version, privacy_version, accepted_terms_at,
--          accepted_privacy_at, marketing_opt_in, marketing_opt_in_at
--     from public.profiles
--    where user_id = '<new user id>';
--   select user_id, marketing_consent from public.privacy_preferences
--    where user_id = '<new user id>';
-- -- marketing_consent should match marketing_opt_in above.
