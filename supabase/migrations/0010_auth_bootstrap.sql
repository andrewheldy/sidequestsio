-- 0010_auth_bootstrap.sql — one canonical signup bootstrap + backfill
--
-- WHY (verified live 2026-07-06): the live handle_new_auth_user() omits the
-- public.profiles insert (the 0003_functions.sql version won the migration-
-- order race), and BOTH auth.users triggers (on_auth_user_created,
-- on_auth_user_created_game) point at it. handle_new_user() — the variant
-- that does create profiles rows — has no trigger bound to it at all.
-- Observed damage: 6 users rows vs 5 profiles rows; new signups get no
-- profile, which also lets them bypass the onboarding guard in the app.
--
-- This migration is order-proof: wherever an environment currently stands,
-- running it last yields one canonical function, one trigger, and no missing
-- rows. Idempotent; safe to re-run.

-- 1. Canonical bootstrap function -------------------------------------------
-- Union of both prior variants: game identity rows (users, user_profiles,
-- privacy_preferences) AND the app profile row (profiles).
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
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, v_name)
  on conflict (id) do nothing;

  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict do nothing;

  insert into public.privacy_preferences (user_id)
  values (new.id)
  on conflict do nothing;

  insert into public.profiles (user_id, display_name)
  values (new.id, v_name)
  on conflict (user_id) do nothing;

  return new;
end $$;

-- 2. Exactly one trigger ------------------------------------------------------
-- Drop the duplicate; (re)create the canonical one. Both currently fire the
-- same function, so dropping the duplicate also halves redundant work.
drop trigger if exists on_auth_user_created_game on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 3. Retire the orphaned variant ---------------------------------------------
-- Verified live: no trigger references handle_new_user(); its behavior is
-- folded into the canonical function above.
drop function if exists public.handle_new_user();

-- 4. Backfill existing auth users ---------------------------------------------
-- Repairs every account created while the broken function was live.
insert into public.users (id, email, display_name)
select
  au.id,
  au.email,
  coalesce(
    nullif(trim(au.raw_user_meta_data ->> 'display_name'), ''),
    split_part(au.email, '@', 1),
    'Quester'
  )
from auth.users au
on conflict (id) do nothing;

insert into public.user_profiles (user_id)
select id from auth.users
on conflict do nothing;

insert into public.privacy_preferences (user_id)
select id from auth.users
on conflict do nothing;

insert into public.profiles (user_id, display_name)
select
  au.id,
  coalesce(
    nullif(trim(au.raw_user_meta_data ->> 'display_name'), ''),
    split_part(au.email, '@', 1),
    'Quester'
  )
from auth.users au
on conflict (user_id) do nothing;

-- Verification:
--   select
--     (select count(*) from auth.users)      as auth_users,
--     (select count(*) from public.users)    as users,
--     (select count(*) from public.profiles) as profiles;  -- all three equal
--   select tgname from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal;
--   -- exactly: on_auth_user_created
