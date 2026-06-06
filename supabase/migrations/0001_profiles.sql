-- SideQuests.io — profiles
-- Single-user-ownership profile table backing auth + onboarding.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE / idempotent policies).

-- 1. Table -------------------------------------------------------------------
create table if not exists public.profiles (
  -- Matches auth.users.id so each user owns exactly one profile row.
  user_id              uuid primary key references auth.users (id) on delete cascade,
  display_name         text,
  username             text unique,
  avatar_url           text,
  home_city            text not null default 'Miami',

  -- Onboarding selections.
  interests            text[] not null default '{}',          -- "choose your vibe" cards
  quest_style          text,                                  -- explorer archetype (single select)
  quest_energy         text,                                  -- "quest energy" (chill / social / ...)
  starting_area        text,                                  -- chosen neighborhood

  -- Lightweight gamification shown on the starter profile screen.
  xp                   integer not null default 0,
  level                integer not null default 1,
  streak               integer not null default 0,

  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2. Row Level Security ------------------------------------------------------
alter table public.profiles enable row level security;

-- Users can read only their own profile (profiles are NOT public yet).
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own profile row.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Users can update only their own profile.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. updated_at trigger ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Auto-create a profile row when a new auth user signs up -----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
