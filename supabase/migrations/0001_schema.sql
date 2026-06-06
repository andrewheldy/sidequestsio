-- ===========================================================================
-- SideQuests.io — Schema (Phase 5)
-- ===========================================================================
-- Mirrors src/types/db.ts. Run with the Supabase SQL editor or `supabase db push`.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type role as enum ('user', 'partner', 'admin');
  create type account_status as enum ('active', 'suspended', 'deleted');
  create type partner_type as enum ('venue', 'brand', 'event', 'nonprofit', 'other');
  create type partner_status as enum ('pending', 'active', 'suspended');
  create type entity_status as enum ('draft', 'active', 'paused', 'archived');
  create type quest_category as enum ('art','food','outdoors','culture','nightlife','shopping','fitness','hidden_gem');
  create type difficulty as enum ('easy', 'medium', 'hard');
  create type verification_type as enum ('qr','nfc','gps','venue_code','staff_approval');
  create type scan_conversion_state as enum ('scanned','viewed','authenticated','started','completed');
  create type attempt_status as enum ('in_progress','completed','failed','abandoned');
  create type ledger_transaction_type as enum ('earn','spend','adjust','expire');
  create type ledger_source as enum ('quest_completion','reward_redemption','admin_adjustment','bonus','referral');
  create type moderation_status as enum ('pending','approved','rejected','flagged');
  create type redemption_status as enum ('issued','redeemed','expired','cancelled');
  create type leaderboard_scope as enum ('global','city','venue','campaign');
  create type leaderboard_period as enum ('weekly','monthly','all_time');
  create type consent_type as enum ('analytics','marketing','location');
  create type visibility as enum ('public','friends','private');
  create type device_type as enum ('mobile','tablet','desktop','unknown');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
-- `users.id` references auth.users so app data is keyed to the Supabase session.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null,
  avatar_url text,
  role role not null default 'user',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  account_status account_status not null default 'active'
);

create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  home_city text,
  xp integer not null default 0,
  level integer not null default 1,
  points_balance_cache integer not null default 0,
  lifetime_points integer not null default 0,
  completed_quests_count integer not null default 0,
  community_notes_count integer not null default 0,
  rewards_redeemed_count integer not null default 0
);

create table if not exists privacy_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  analytics_consent boolean not null default true,
  marketing_consent boolean not null default false,
  location_consent boolean not null default false,
  leaderboard_visibility visibility not null default 'public',
  profile_visibility visibility not null default 'public'
);

-- ---------------------------------------------------------------------------
-- Partners & venues
-- ---------------------------------------------------------------------------
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type partner_type not null default 'other',
  contact_email text not null default '',
  status partner_status not null default 'pending',
  owner_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  name text not null,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  status entity_status not null default 'active'
);

-- ---------------------------------------------------------------------------
-- Quests & QR codes
-- ---------------------------------------------------------------------------
create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  title text not null,
  description text not null default '',
  category quest_category not null default 'hidden_gem',
  difficulty difficulty not null default 'easy',
  xp_reward integer not null default 50,
  points_reward integer not null default 100,
  status entity_status not null default 'draft',
  start_date timestamptz,
  end_date timestamptz,
  verification_type verification_type not null default 'qr',
  verification_secret text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  partner_id uuid not null references partners(id) on delete cascade,
  code text not null unique,
  destination_url text not null,
  status entity_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tracking & attempts
-- ---------------------------------------------------------------------------
create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid references qr_codes(id) on delete set null,
  quest_id uuid not null references quests(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  partner_id uuid not null references partners(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  anonymous_session_id text not null,
  timestamp timestamptz not null default now(),
  device_type device_type not null default 'unknown',
  browser text,
  operating_system text,
  referrer text,
  approximate_location text,
  location_permission_granted boolean not null default false,
  conversion_state scan_conversion_state not null default 'scanned'
);

create table if not exists quest_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status attempt_status not null default 'in_progress',
  verification_method verification_type,
  failure_reason text
);

create table if not exists quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  partner_id uuid not null references partners(id) on delete cascade,
  completed_at timestamptz not null default now(),
  xp_awarded integer not null,
  points_awarded integer not null,
  source_scan_id uuid references scan_events(id) on delete set null,
  -- A user may only complete a quest once (anti-farming).
  unique (user_id, quest_id)
);

-- ---------------------------------------------------------------------------
-- Community notes
-- ---------------------------------------------------------------------------
create table if not exists community_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  content text not null check (char_length(content) <= 280),
  image_url text,
  moderation_status moderation_status not null default 'approved',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Points ledger & rewards
-- ---------------------------------------------------------------------------
-- Append-only: the ledger is the source of truth for points & xp.
create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  transaction_type ledger_transaction_type not null,
  source ledger_source not null,
  points_amount integer not null,
  xp_amount integer not null default 0,
  quest_id uuid references quests(id) on delete set null,
  reward_id uuid, -- FK added after `rewards` table is created (see below)
  partner_id uuid references partners(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  title text not null,
  description text not null default '',
  points_cost integer not null,
  inventory integer,
  status entity_status not null default 'active',
  expiration_date timestamptz,
  image_url text
);

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reward_id uuid not null references rewards(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  points_spent integer not null,
  redemption_code text not null,
  status redemption_status not null default 'issued',
  redeemed_at timestamptz not null default now()
);

-- points_ledger.reward_id is declared before rewards exists above; add FK now.
do $$ begin
  alter table points_ledger
    add constraint points_ledger_reward_fk
    foreign key (reward_id) references rewards(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Leaderboards & analytics
-- ---------------------------------------------------------------------------
create table if not exists leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope_type leaderboard_scope not null,
  scope_id text,
  user_id uuid not null references users(id) on delete cascade,
  score integer not null,
  rank integer not null,
  period leaderboard_period not null,
  created_at timestamptz not null default now()
);

create table if not exists analytics_rollups (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  quest_id uuid references quests(id) on delete set null,
  date date not null,
  scans integer not null default 0,
  unique_visitors integer not null default 0,
  authenticated_users integer not null default 0,
  completions integer not null default 0,
  rewards_redeemed integer not null default 0,
  community_notes_created integer not null default 0,
  unique (partner_id, venue_id, quest_id, date)
);

-- ---------------------------------------------------------------------------
-- Governance: consent & audit
-- ---------------------------------------------------------------------------
create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  consent_type consent_type not null,
  granted boolean not null,
  timestamp timestamptz not null default now(),
  source text not null
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (hot paths)
-- ---------------------------------------------------------------------------
create index if not exists idx_quests_status on quests(status);
create index if not exists idx_quests_partner on quests(partner_id);
create index if not exists idx_scan_partner_time on scan_events(partner_id, timestamp desc);
create index if not exists idx_scan_quest on scan_events(quest_id);
create index if not exists idx_completions_user on quest_completions(user_id);
create index if not exists idx_completions_partner on quest_completions(partner_id);
create index if not exists idx_ledger_user_time on points_ledger(user_id, created_at desc);
create index if not exists idx_notes_quest on community_notes(quest_id, moderation_status);
create index if not exists idx_redemptions_partner on reward_redemptions(partner_id);

-- ---------------------------------------------------------------------------
-- View: notes joined with author display name (no email exposed)
-- ---------------------------------------------------------------------------
create or replace view community_notes_with_author as
  select n.*, u.display_name as author_display_name, u.avatar_url as author_avatar_url
  from community_notes n
  join users u on u.id = n.user_id;
