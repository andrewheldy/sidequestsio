-- =============================================================================
-- SideQuests.io — Complete game schema
-- =============================================================================
-- Applies the entire game schema on top of a Supabase project that currently
-- only has `0001_profiles.sql` (the auth profiles table) applied.
--
-- Idempotent: safe to re-run. All DDL uses IF NOT EXISTS / CREATE OR REPLACE /
-- ADD COLUMN IF NOT EXISTS so it is a no-op on an already-migrated database.
--
-- Execution order:
--   1. Enums
--   2. Core identity tables (users, user_profiles, privacy_preferences)
--   3. Partners & venues
--   4. Quests & QR codes
--   5. Tracking tables (scan_events, quest_attempts, quest_completions)
--   6. Community notes + flag_count column + note_reports
--   7. Points ledger & rewards
--   8. Leaderboards & analytics rollups
--   9. Governance (consent_events, audit_logs)
--  10. Profile overhaul columns (bio, social links, privacy flags)
--  11. Phone / extra-social columns
--  12. Indexes
--  13. Views (community_notes_with_author, public_profiles)
--  14. Auth trigger: auto-provision game rows on signup
--  15. Server-side SECURITY DEFINER functions
--  16. Avatar storage bucket + policies
--  17. Note-report trigger
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type role as enum ('user', 'partner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'suspended', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_type as enum ('venue', 'brand', 'event', 'nonprofit', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_status as enum ('draft', 'active', 'paused', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quest_category as enum ('art','food','outdoors','culture','nightlife','shopping','fitness','hidden_gem');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_type as enum ('qr','nfc','gps','venue_code','staff_approval');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scan_conversion_state as enum ('scanned','viewed','authenticated','started','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attempt_status as enum ('in_progress','completed','failed','abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_transaction_type as enum ('earn','spend','adjust','expire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_source as enum ('quest_completion','reward_redemption','admin_adjustment','bonus','referral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('pending','approved','rejected','flagged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type redemption_status as enum ('issued','redeemed','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leaderboard_scope as enum ('global','city','venue','campaign');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leaderboard_period as enum ('weekly','monthly','all_time');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consent_type as enum ('analytics','marketing','location');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility as enum ('public','friends','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_type as enum ('mobile','tablet','desktop','unknown');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. Core identity
-- ---------------------------------------------------------------------------
-- users.id = auth.uid() so all game data is keyed to the Supabase session.
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique,
  display_name    text not null,
  avatar_url      text,
  role            role not null default 'user',
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  account_status  account_status not null default 'active'
);

create table if not exists public.user_profiles (
  user_id                  uuid primary key references public.users(id) on delete cascade,
  home_city                text,
  xp                       integer not null default 0,
  level                    integer not null default 1,
  points_balance_cache     integer not null default 0,
  lifetime_points          integer not null default 0,
  completed_quests_count   integer not null default 0,
  community_notes_count    integer not null default 0,
  rewards_redeemed_count   integer not null default 0
);

create table if not exists public.privacy_preferences (
  user_id                  uuid primary key references public.users(id) on delete cascade,
  analytics_consent        boolean not null default true,
  marketing_consent        boolean not null default false,
  location_consent         boolean not null default false,
  leaderboard_visibility   visibility not null default 'public',
  profile_visibility       visibility not null default 'public'
);

-- ---------------------------------------------------------------------------
-- 4. Partners & venues
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            partner_type not null default 'other',
  contact_email   text not null default '',
  status          partner_status not null default 'pending',
  owner_user_id   uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners(id) on delete cascade,
  name        text not null,
  address     text,
  city        text,
  latitude    double precision,
  longitude   double precision,
  status      entity_status not null default 'active'
);

-- ---------------------------------------------------------------------------
-- 5. Quests & QR codes
-- ---------------------------------------------------------------------------
create table if not exists public.quests (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.partners(id) on delete cascade,
  venue_id            uuid references public.venues(id) on delete set null,
  title               text not null,
  description         text not null default '',
  category            quest_category not null default 'hidden_gem',
  difficulty          difficulty not null default 'easy',
  xp_reward           integer not null default 50,
  points_reward       integer not null default 100,
  status              entity_status not null default 'draft',
  start_date          timestamptz,
  end_date            timestamptz,
  verification_type   verification_type not null default 'qr',
  verification_secret text,
  image_url           text,
  created_at          timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id              uuid primary key default gen_random_uuid(),
  quest_id        uuid not null references public.quests(id) on delete cascade,
  venue_id        uuid references public.venues(id) on delete set null,
  partner_id      uuid not null references public.partners(id) on delete cascade,
  code            text not null unique,
  destination_url text not null,
  status          entity_status not null default 'active',
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Tracking: scan events, attempts, completions
-- ---------------------------------------------------------------------------
create table if not exists public.scan_events (
  id                          uuid primary key default gen_random_uuid(),
  qr_code_id                  uuid references public.qr_codes(id) on delete set null,
  quest_id                    uuid not null references public.quests(id) on delete cascade,
  venue_id                    uuid references public.venues(id) on delete set null,
  partner_id                  uuid not null references public.partners(id) on delete cascade,
  user_id                     uuid references public.users(id) on delete set null,
  anonymous_session_id        text not null,
  timestamp                   timestamptz not null default now(),
  device_type                 device_type not null default 'unknown',
  browser                     text,
  operating_system            text,
  referrer                    text,
  approximate_location        text,
  location_permission_granted boolean not null default false,
  conversion_state            scan_conversion_state not null default 'scanned'
);

create table if not exists public.quest_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  quest_id            uuid not null references public.quests(id) on delete cascade,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  status              attempt_status not null default 'in_progress',
  verification_method verification_type,
  failure_reason      text
);

create table if not exists public.quest_completions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  quest_id        uuid not null references public.quests(id) on delete cascade,
  venue_id        uuid references public.venues(id) on delete set null,
  partner_id      uuid not null references public.partners(id) on delete cascade,
  completed_at    timestamptz not null default now(),
  xp_awarded      integer not null,
  points_awarded  integer not null,
  source_scan_id  uuid references public.scan_events(id) on delete set null,
  -- Prevents farming: one completion per user per quest.
  unique (user_id, quest_id)
);

-- ---------------------------------------------------------------------------
-- 7. Community notes (flag_count additive; safe to add if missing)
-- ---------------------------------------------------------------------------
create table if not exists public.community_notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  quest_id          uuid not null references public.quests(id) on delete cascade,
  venue_id          uuid references public.venues(id) on delete set null,
  content           text not null check (char_length(content) <= 280),
  image_url         text,
  moderation_status moderation_status not null default 'approved',
  flag_count        integer not null default 0,
  created_at        timestamptz not null default now()
);

-- flag_count may be missing on a DB that ran 0001_schema.sql without 0005.
alter table public.community_notes add column if not exists flag_count integer not null default 0;

-- Note reports (crowd-sourced abuse reporting).
create table if not exists public.note_reports (
  id          uuid primary key default gen_random_uuid(),
  note_id     uuid not null references public.community_notes(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'inappropriate', 'inaccurate', 'offensive', 'other')),
  details     text,
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint note_reports_unique_per_user unique (note_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- 8. Points ledger & rewards
-- ---------------------------------------------------------------------------
-- Append-only: source of truth for points and XP.
create table if not exists public.points_ledger (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  transaction_type ledger_transaction_type not null,
  source           ledger_source not null,
  points_amount    integer not null,
  xp_amount        integer not null default 0,
  quest_id         uuid references public.quests(id) on delete set null,
  reward_id        uuid,  -- FK added after rewards table below
  partner_id       uuid references public.partners(id) on delete set null,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);

create table if not exists public.rewards (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partners(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  points_cost     integer not null,
  inventory       integer,
  status          entity_status not null default 'active',
  expiration_date timestamptz,
  image_url       text
);

create table if not exists public.reward_redemptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  reward_id        uuid not null references public.rewards(id) on delete cascade,
  partner_id       uuid not null references public.partners(id) on delete cascade,
  points_spent     integer not null,
  redemption_code  text not null,
  status           redemption_status not null default 'issued',
  redeemed_at      timestamptz not null default now()
);

-- Deferred FK: points_ledger.reward_id declared before rewards; add constraint now.
do $$ begin
  alter table public.points_ledger
    add constraint points_ledger_reward_fk
    foreign key (reward_id) references public.rewards(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 9. Leaderboards & analytics rollups
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard_snapshots (
  id          uuid primary key default gen_random_uuid(),
  scope_type  leaderboard_scope not null,
  scope_id    text,
  user_id     uuid not null references public.users(id) on delete cascade,
  score       integer not null,
  rank        integer not null,
  period      leaderboard_period not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.analytics_rollups (
  id                       uuid primary key default gen_random_uuid(),
  partner_id               uuid not null references public.partners(id) on delete cascade,
  venue_id                 uuid references public.venues(id) on delete set null,
  quest_id                 uuid references public.quests(id) on delete set null,
  date                     date not null,
  scans                    integer not null default 0,
  unique_visitors          integer not null default 0,
  authenticated_users      integer not null default 0,
  completions              integer not null default 0,
  rewards_redeemed         integer not null default 0,
  community_notes_created  integer not null default 0,
  unique (partner_id, venue_id, quest_id, date)
);

-- ---------------------------------------------------------------------------
-- 10. Governance: consent events & audit logs
-- ---------------------------------------------------------------------------
create table if not exists public.consent_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  consent_type consent_type not null,
  granted      boolean not null,
  timestamp    timestamptz not null default now(),
  source       text not null
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11. Profile overhaul: bio, social links, privacy flags
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists bio                     text;
alter table public.profiles add column if not exists instagram_url           text;
alter table public.profiles add column if not exists tiktok_url              text;
alter table public.profiles add column if not exists x_url                   text;
alter table public.profiles add column if not exists youtube_url             text;
alter table public.profiles add column if not exists snapchat_url            text;
alter table public.profiles add column if not exists phone_number            text;
alter table public.profiles add column if not exists is_profile_public       boolean not null default false;
alter table public.profiles add column if not exists show_social_links       boolean not null default false;
alter table public.profiles add column if not exists show_completed_quests   boolean not null default false;
alter table public.profiles add column if not exists show_breadcrumbs        boolean not null default false;

alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add  constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 280);

alter table public.profiles drop constraint if exists profiles_phone_len;
alter table public.profiles add  constraint profiles_phone_len
  check (phone_number is null or char_length(phone_number) <= 20);

-- ---------------------------------------------------------------------------
-- 12. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_quests_status          on public.quests(status);
create index if not exists idx_quests_partner         on public.quests(partner_id);
create index if not exists idx_scan_partner_time      on public.scan_events(partner_id, timestamp desc);
create index if not exists idx_scan_quest             on public.scan_events(quest_id);
create index if not exists idx_completions_user       on public.quest_completions(user_id);
create index if not exists idx_completions_partner    on public.quest_completions(partner_id);
create index if not exists idx_ledger_user_time       on public.points_ledger(user_id, created_at desc);
create index if not exists idx_notes_quest            on public.community_notes(quest_id, moderation_status);
create index if not exists idx_redemptions_partner    on public.reward_redemptions(partner_id);
create index if not exists note_reports_note_idx      on public.note_reports(note_id);
create index if not exists note_reports_reporter_idx  on public.note_reports(reporter_id);
create index if not exists note_reports_status_idx    on public.note_reports(status);

-- ---------------------------------------------------------------------------
-- 13. Views
-- ---------------------------------------------------------------------------
-- community_notes_with_author: exposes display_name/avatar without raw email.
create or replace view public.community_notes_with_author as
  select
    n.*,
    u.display_name as author_display_name,
    u.avatar_url   as author_avatar_url
  from public.community_notes n
  join public.users u on u.id = n.user_id;

-- public_profiles: privacy-safe projection; only opted-in users are visible.
-- phone_number is intentionally excluded — always private.
drop view if exists public.public_profiles;
create view public.public_profiles
  with (security_invoker = false)
as
select
  p.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.home_city,
  p.bio,
  p.level,
  p.xp,
  p.created_at,
  case when p.show_social_links then p.instagram_url  end as instagram_url,
  case when p.show_social_links then p.tiktok_url     end as tiktok_url,
  case when p.show_social_links then p.x_url          end as x_url,
  case when p.show_social_links then p.youtube_url    end as youtube_url,
  case when p.show_social_links then p.snapchat_url   end as snapchat_url,
  p.show_completed_quests,
  p.show_breadcrumbs
from public.profiles p
where p.is_profile_public = true;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Privacy-safe public projection. Only opted-in (is_profile_public) rows visible; '
  'social links gated by show_social_links; phone_number never exposed.';

-- ---------------------------------------------------------------------------
-- 14. Auth trigger: auto-provision game rows on new sign-up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Quester')
  )
  on conflict (id) do nothing;

  insert into public.user_profiles(user_id) values (new.id) on conflict do nothing;
  insert into public.privacy_preferences(user_id) values (new.id) on conflict do nothing;

  -- Also create the auth-profile row if not already done by the profiles trigger.
  insert into public.profiles(user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created_game on auth.users;
create trigger on_auth_user_created_game
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
