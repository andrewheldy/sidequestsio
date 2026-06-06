-- =============================================================================
-- 0002_quests_venues_qr.sql
-- Quest catalogue: categories, host organizations, venues, quests, QR codes,
-- plus QR-scan / quest-view analytics. Also defines the shared host/admin
-- authorization helpers reused by later migrations.
--
-- All user references point at public.profiles(user_id) (defined in 0001).
-- Idempotent: safe to re-run.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Admin registry (admin-friendly architecture; does NOT touch profiles)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Quest categories
-- -----------------------------------------------------------------------------
create table if not exists public.quest_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  emoji       text,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Organizations (a host owns one or more)
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (user_id) on delete cascade,
  name          text not null,
  slug          text unique,
  description   text,
  logo_url      text,
  website       text,
  contact_email text,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Venues (physical locations belonging to an organization)
-- -----------------------------------------------------------------------------
create table if not exists public.venues (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  description     text,
  address         text,
  neighborhood    text,
  city            text not null default 'Miami',
  latitude        numeric(9, 6),
  longitude       numeric(9, 6),
  image_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Quests
-- -----------------------------------------------------------------------------
create table if not exists public.quests (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  venue_id          uuid references public.venues (id) on delete set null,
  category_id       uuid references public.quest_categories (id) on delete set null,
  created_by        uuid references public.profiles (user_id) on delete set null,
  title             text not null,
  slug              text,
  description       text,
  reward_text       text,
  xp                integer not null default 100 check (xp >= 0),
  points            integer not null default 0 check (points >= 0),
  distance_meters   integer check (distance_meters >= 0),
  estimated_minutes integer check (estimated_minutes >= 0),
  difficulty        text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  image_url         text,
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- QR codes (one quest may have several; scanning verifies completion)
-- -----------------------------------------------------------------------------
create table if not exists public.qr_codes (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests (id) on delete cascade,
  code       text not null unique,
  label      text,
  is_active  boolean not null default true,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Analytics: QR scans & quest views (append-only event logs)
-- -----------------------------------------------------------------------------
create table if not exists public.qr_scans (
  id         uuid primary key default gen_random_uuid(),
  qr_code_id uuid references public.qr_codes (id) on delete set null,
  quest_id   uuid references public.quests (id) on delete cascade,
  user_id    uuid references public.profiles (user_id) on delete set null,
  user_agent text,
  scanned_at timestamptz not null default now()
);

create table if not exists public.quest_views (
  id        uuid primary key default gen_random_uuid(),
  quest_id  uuid not null references public.quests (id) on delete cascade,
  user_id   uuid references public.profiles (user_id) on delete set null,
  source    text,
  viewed_at timestamptz not null default now()
);

-- =============================================================================
-- Authorization helpers (SECURITY DEFINER so they bypass RLS and never recurse)
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.owns_organization(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1 from public.organizations o
        where o.id = org and o.owner_id = auth.uid()
      );
$$;

create or replace function public.owns_quest(q uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1
        from public.quests qu
        join public.organizations o on o.id = qu.organization_id
        where qu.id = q and o.owner_id = auth.uid()
      );
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.admin_users      enable row level security;
alter table public.quest_categories enable row level security;
alter table public.organizations    enable row level security;
alter table public.venues           enable row level security;
alter table public.quests           enable row level security;
alter table public.qr_codes         enable row level security;
alter table public.qr_scans         enable row level security;
alter table public.quest_views      enable row level security;

-- admin_users: only admins may read; writes are service-role/dashboard only.
drop policy if exists "admins read admin list" on public.admin_users;
create policy "admins read admin list" on public.admin_users
  for select using (public.is_admin());

-- quest_categories: public read, admin write.
drop policy if exists "categories are public" on public.quest_categories;
create policy "categories are public" on public.quest_categories
  for select using (true);
drop policy if exists "admins manage categories" on public.quest_categories;
create policy "admins manage categories" on public.quest_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- organizations: public read; an authenticated user creates orgs they own;
-- owner/admin updates & deletes.
drop policy if exists "organizations are public" on public.organizations;
create policy "organizations are public" on public.organizations
  for select using (true);
drop policy if exists "users create their own organization" on public.organizations;
create policy "users create their own organization" on public.organizations
  for insert with check (owner_id = auth.uid());
drop policy if exists "owners update their organization" on public.organizations;
create policy "owners update their organization" on public.organizations
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists "owners delete their organization" on public.organizations;
create policy "owners delete their organization" on public.organizations
  for delete using (owner_id = auth.uid() or public.is_admin());

-- venues: public read; managed by the owning organization.
drop policy if exists "venues are public" on public.venues;
create policy "venues are public" on public.venues
  for select using (true);
drop policy if exists "hosts manage their venues" on public.venues;
create policy "hosts manage their venues" on public.venues
  for all using (public.owns_organization(organization_id))
  with check (public.owns_organization(organization_id));

-- quests: published quests are public; hosts/admins see & manage their own.
drop policy if exists "published quests are public" on public.quests;
create policy "published quests are public" on public.quests
  for select using (status = 'published' or public.owns_organization(organization_id));
drop policy if exists "hosts create quests" on public.quests;
create policy "hosts create quests" on public.quests
  for insert with check (public.owns_organization(organization_id));
drop policy if exists "hosts update their quests" on public.quests;
create policy "hosts update their quests" on public.quests
  for update using (public.owns_organization(organization_id))
  with check (public.owns_organization(organization_id));
drop policy if exists "hosts delete their quests" on public.quests;
create policy "hosts delete their quests" on public.quests
  for delete using (public.owns_organization(organization_id));

-- qr_codes: codes are verification secrets — NOT readable by players. Only the
-- owning host/admin can read/manage them. Players verify a scanned code via the
-- SECURITY DEFINER RPC public.complete_quest_by_qr() (migration 0006), which
-- runs as owner and bypasses this policy.
drop policy if exists "active qr codes readable" on public.qr_codes;
drop policy if exists "hosts manage qr codes" on public.qr_codes;
create policy "hosts manage qr codes" on public.qr_codes
  for all using (public.owns_quest(quest_id))
  with check (public.owns_quest(quest_id));

-- qr_scans: anyone authenticated may log their own scan; hosts/admins read
-- analytics for their quests.
drop policy if exists "users log their scans" on public.qr_scans;
create policy "users log their scans" on public.qr_scans
  for insert with check (user_id = auth.uid() or user_id is null);
drop policy if exists "hosts read scan analytics" on public.qr_scans;
create policy "hosts read scan analytics" on public.qr_scans
  for select using (public.owns_quest(quest_id) or user_id = auth.uid());

-- quest_views: anyone may log a view; hosts/admins read analytics.
drop policy if exists "users log quest views" on public.quest_views;
create policy "users log quest views" on public.quest_views
  for insert with check (user_id = auth.uid() or user_id is null);
drop policy if exists "hosts read view analytics" on public.quest_views;
create policy "hosts read view analytics" on public.quest_views
  for select using (public.owns_quest(quest_id) or user_id = auth.uid());

-- =============================================================================
-- Indexes
-- =============================================================================
create index if not exists organizations_owner_idx     on public.organizations (owner_id);
create index if not exists venues_org_idx               on public.venues (organization_id);
create index if not exists venues_city_idx              on public.venues (city);
create index if not exists quests_org_idx               on public.quests (organization_id);
create index if not exists quests_venue_idx             on public.quests (venue_id);
create index if not exists quests_category_idx          on public.quests (category_id);
create index if not exists quests_status_idx            on public.quests (status);
-- Discovery feed: published quests newest-first (partial index keeps it small).
create index if not exists quests_discovery_idx         on public.quests (status, created_at desc) where status = 'published';
-- Coarse "nearby" filtering used by the mobile app (true geo needs PostGIS — see notes).
create index if not exists venues_neighborhood_idx      on public.venues (city, neighborhood);
create unique index if not exists quests_org_slug_uidx  on public.quests (organization_id, slug) where slug is not null;
create index if not exists qr_codes_quest_idx           on public.qr_codes (quest_id);
create index if not exists qr_scans_quest_idx           on public.qr_scans (quest_id);
create index if not exists qr_scans_qr_idx              on public.qr_scans (qr_code_id);
create index if not exists qr_scans_user_idx            on public.qr_scans (user_id);
create index if not exists qr_scans_quest_time_idx      on public.qr_scans (quest_id, scanned_at desc);
create index if not exists quest_views_quest_idx        on public.quest_views (quest_id);
create index if not exists quest_views_user_idx         on public.quest_views (user_id);
create index if not exists quest_views_quest_time_idx   on public.quest_views (quest_id, viewed_at desc);

-- =============================================================================
-- updated_at triggers (reuses public.set_updated_at() from 0001)
-- =============================================================================
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

drop trigger if exists quests_set_updated_at on public.quests;
create trigger quests_set_updated_at before update on public.quests
  for each row execute function public.set_updated_at();
