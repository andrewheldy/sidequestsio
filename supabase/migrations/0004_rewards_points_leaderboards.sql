-- =============================================================================
-- 0004_rewards_points_leaderboards.sql
-- Rewards & redemptions, the points ledger, XP events, and leaderboard
-- snapshots (city + global scopes).
--
-- Depends on 0002 (organizations, quests, helpers) and 0001 (profiles).
-- Idempotent: safe to re-run.
--
-- Integrity note: points_ledger and xp_events are append-only and have NO
-- insert/update/delete policies — they are written only by SECURITY DEFINER
-- functions or the service_role (both bypass RLS). This stops users from
-- minting their own points/XP.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rewards (offered by an organization, optionally tied to a quest)
-- -----------------------------------------------------------------------------
create table if not exists public.rewards (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quest_id        uuid references public.quests (id) on delete set null,
  title           text not null,
  description     text,
  image_url       text,
  type            text not null default 'discount'
                    check (type in ('discount', 'freebie', 'experience', 'badge')),
  cost_points     integer not null default 0 check (cost_points >= 0),
  inventory       integer check (inventory >= 0),       -- null = unlimited
  per_user_limit  integer not null default 1 check (per_user_limit >= 1),
  is_active       boolean not null default true,
  valid_from      timestamptz,
  valid_until     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Reward redemptions
-- -----------------------------------------------------------------------------
create table if not exists public.reward_redemptions (
  id           uuid primary key default gen_random_uuid(),
  reward_id    uuid not null references public.rewards (id) on delete cascade,
  user_id      uuid not null references public.profiles (user_id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'fulfilled', 'cancelled')),
  points_spent integer not null default 0 check (points_spent >= 0),
  code         text,
  fulfilled_by uuid references public.profiles (user_id) on delete set null,
  fulfilled_at timestamptz,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Points ledger (append-only running balance)
-- -----------------------------------------------------------------------------
create table if not exists public.points_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (user_id) on delete cascade,
  delta         integer not null,
  balance_after integer,
  reason        text,
  ref_type      text,    -- e.g. 'quest_completion', 'reward_redemption'
  ref_id        uuid,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- XP events (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  xp         integer not null,
  event_type text,
  ref_type   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Leaderboard snapshots (precomputed rankings; city + global scopes)
-- -----------------------------------------------------------------------------
create table if not exists public.leaderboard_snapshots (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('global', 'city')),
  city          text,    -- required when scope = 'city'
  period        text not null default 'all_time'
                  check (period in ('daily', 'weekly', 'monthly', 'all_time')),
  user_id       uuid not null references public.profiles (user_id) on delete cascade,
  rank          integer not null,
  points        integer not null default 0,
  xp            integer not null default 0,
  snapshot_date date not null default current_date,
  created_at    timestamptz not null default now(),
  constraint leaderboard_scope_city_chk
    check ((scope = 'city' and city is not null) or (scope = 'global' and city is null))
);

-- =============================================================================
-- Reward ownership helper
-- =============================================================================
create or replace function public.owns_reward(r uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1
        from public.rewards rw
        join public.organizations o on o.id = rw.organization_id
        where rw.id = r and o.owner_id = auth.uid()
      );
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.rewards               enable row level security;
alter table public.reward_redemptions    enable row level security;
alter table public.points_ledger         enable row level security;
alter table public.xp_events             enable row level security;
alter table public.leaderboard_snapshots enable row level security;

-- rewards: active rewards are public; managed by the owning organization.
drop policy if exists "active rewards are public" on public.rewards;
create policy "active rewards are public" on public.rewards
  for select using (is_active or public.owns_organization(organization_id));
drop policy if exists "hosts manage rewards" on public.rewards;
create policy "hosts manage rewards" on public.rewards
  for all using (public.owns_organization(organization_id))
  with check (public.owns_organization(organization_id));

-- reward_redemptions: a user reads their own; the issuing host/admin reads &
-- fulfills them. There is intentionally NO client insert policy and users
-- cannot update their own rows — redeeming spends points and must be atomic, so
-- it goes exclusively through public.redeem_reward() (migration 0006), which
-- validates balance / inventory / limits / validity window. This prevents users
-- from self-issuing or self-fulfilling rewards.
drop policy if exists "users read their redemptions" on public.reward_redemptions;
create policy "users read their redemptions" on public.reward_redemptions
  for select using (user_id = auth.uid() or public.owns_reward(reward_id));
drop policy if exists "users create redemptions" on public.reward_redemptions;
drop policy if exists "users or hosts update redemptions" on public.reward_redemptions;
drop policy if exists "hosts update redemptions" on public.reward_redemptions;
create policy "hosts update redemptions" on public.reward_redemptions
  for update using (public.owns_reward(reward_id))
  with check (public.owns_reward(reward_id));
drop policy if exists "hosts delete redemptions" on public.reward_redemptions;
create policy "hosts delete redemptions" on public.reward_redemptions
  for delete using (public.owns_reward(reward_id));

-- points_ledger: read-only to the owner & admins (no write policies on purpose).
drop policy if exists "users read their points" on public.points_ledger;
create policy "users read their points" on public.points_ledger
  for select using (user_id = auth.uid() or public.is_admin());

-- xp_events: read-only to the owner & admins (no write policies on purpose).
drop policy if exists "users read their xp" on public.xp_events;
create policy "users read their xp" on public.xp_events
  for select using (user_id = auth.uid() or public.is_admin());

-- leaderboard_snapshots: public read; admin-managed (jobs use service_role).
drop policy if exists "leaderboards are public" on public.leaderboard_snapshots;
create policy "leaderboards are public" on public.leaderboard_snapshots
  for select using (true);
drop policy if exists "admins manage leaderboards" on public.leaderboard_snapshots;
create policy "admins manage leaderboards" on public.leaderboard_snapshots
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Indexes
-- =============================================================================
create index if not exists rewards_org_idx              on public.rewards (organization_id);
create index if not exists rewards_quest_idx            on public.rewards (quest_id);
create index if not exists rewards_active_idx           on public.rewards (is_active);
create index if not exists reward_redemptions_reward_idx on public.reward_redemptions (reward_id);
create index if not exists reward_redemptions_user_idx   on public.reward_redemptions (user_id);
create index if not exists reward_redemptions_status_idx on public.reward_redemptions (status);
-- per-user-limit / inventory counting in redeem_reward()
create index if not exists reward_redemptions_reward_user_idx on public.reward_redemptions (reward_id, user_id);
create index if not exists points_ledger_user_idx       on public.points_ledger (user_id, created_at desc);
create index if not exists xp_events_user_idx           on public.xp_events (user_id, created_at desc);
create index if not exists leaderboard_lookup_idx
  on public.leaderboard_snapshots (scope, period, snapshot_date, rank);
create unique index if not exists leaderboard_unique_entry_idx
  on public.leaderboard_snapshots (scope, coalesce(city, ''), period, snapshot_date, user_id);

-- =============================================================================
-- updated_at trigger
-- =============================================================================
drop trigger if exists rewards_set_updated_at on public.rewards;
create trigger rewards_set_updated_at before update on public.rewards
  for each row execute function public.set_updated_at();
