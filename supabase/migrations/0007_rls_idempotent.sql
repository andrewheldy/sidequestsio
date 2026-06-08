-- =============================================================================
-- SideQuests.io — Row Level Security (idempotent)
-- =============================================================================
-- DROP POLICY IF EXISTS before every CREATE POLICY so this file is safe to
-- re-run on any existing database. Mirrors 0002_rls.sql but fully idempotent.
--
-- Principles:
--   * Users can only read/edit their own rows.
--   * Active quests/rewards/venues/partners are world-readable for QR landing.
--   * Approved community notes are world-readable; authoring requires completion
--     (enforced inside create_community_note SECURITY DEFINER function).
--   * Partners see only their own organisation's data.
--   * Admins bypass everything via is_admin().
--   * Append-only tables (ledger, scans, audit) have no client-INSERT policy;
--     all writes go through SECURITY DEFINER functions in 0006_game_schema.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.app_uid() returns uuid
language sql stable as $$
  select id from public.users where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.owns_partner(p_partner_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.partners
    where id = p_partner_id and owner_user_id = auth.uid()
  ) or public.is_admin()
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS (idempotent: no-op if already enabled)
-- ---------------------------------------------------------------------------
alter table public.users                 enable row level security;
alter table public.user_profiles         enable row level security;
alter table public.privacy_preferences   enable row level security;
alter table public.partners              enable row level security;
alter table public.venues                enable row level security;
alter table public.quests                enable row level security;
alter table public.qr_codes              enable row level security;
alter table public.scan_events           enable row level security;
alter table public.quest_attempts        enable row level security;
alter table public.quest_completions     enable row level security;
alter table public.community_notes       enable row level security;
alter table public.points_ledger         enable row level security;
alter table public.rewards               enable row level security;
alter table public.reward_redemptions    enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.analytics_rollups     enable row level security;
alter table public.consent_events        enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.note_reports          enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists users_self_read   on public.users;
drop policy if exists users_self_update on public.users;

create policy users_self_read on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy users_self_update on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_self_read   on public.user_profiles;
drop policy if exists profiles_self_update on public.user_profiles;

create policy profiles_self_read on public.user_profiles for select
  using (user_id = auth.uid() or public.is_admin());

create policy profiles_self_update on public.user_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- privacy_preferences
-- ---------------------------------------------------------------------------
drop policy if exists privacy_self_all on public.privacy_preferences;

create policy privacy_self_all on public.privacy_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- partners (public read; partner-owner or admin manage)
-- ---------------------------------------------------------------------------
drop policy if exists partners_public_read on public.partners;
drop policy if exists partners_manage      on public.partners;

create policy partners_public_read on public.partners for select
  using (true);

create policy partners_manage on public.partners for all
  using (public.owns_partner(id))
  with check (public.owns_partner(id));

-- ---------------------------------------------------------------------------
-- venues (public read; partner-owner or admin manage)
-- ---------------------------------------------------------------------------
drop policy if exists venues_public_read on public.venues;
drop policy if exists venues_manage      on public.venues;

create policy venues_public_read on public.venues for select
  using (true);

create policy venues_manage on public.venues for all
  using (public.owns_partner(partner_id))
  with check (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- quests (active quests public read; partner/admin manage)
-- ---------------------------------------------------------------------------
drop policy if exists quests_public_read on public.quests;
drop policy if exists quests_manage      on public.quests;

create policy quests_public_read on public.quests for select
  using (status = 'active' or public.owns_partner(partner_id));

create policy quests_manage on public.quests for all
  using (public.owns_partner(partner_id))
  with check (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- qr_codes (active codes public for QR resolution; partner/admin manage)
-- ---------------------------------------------------------------------------
drop policy if exists qr_public_read on public.qr_codes;
drop policy if exists qr_manage      on public.qr_codes;

create policy qr_public_read on public.qr_codes for select
  using (status = 'active' or public.owns_partner(partner_id));

create policy qr_manage on public.qr_codes for all
  using (public.owns_partner(partner_id))
  with check (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- scan_events (partner/admin read; INSERT only via record_scan() RPC)
-- ---------------------------------------------------------------------------
drop policy if exists scans_partner_read on public.scan_events;

create policy scans_partner_read on public.scan_events for select
  using (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- quest_attempts (self read; writes only via start_quest() RPC)
-- ---------------------------------------------------------------------------
drop policy if exists attempts_self_read on public.quest_attempts;

create policy attempts_self_read on public.quest_attempts for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- quest_completions (self read + partner read; writes via complete_quest() RPC)
-- ---------------------------------------------------------------------------
drop policy if exists completions_self_read on public.quest_completions;

create policy completions_self_read on public.quest_completions for select
  using (user_id = auth.uid() or public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- community_notes (approved notes world-readable; authoring via RPC)
-- ---------------------------------------------------------------------------
drop policy if exists notes_public_read  on public.community_notes;
drop policy if exists notes_admin_update on public.community_notes;

create policy notes_public_read on public.community_notes for select
  using (moderation_status = 'approved' or user_id = auth.uid() or public.is_admin());

create policy notes_admin_update on public.community_notes for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- points_ledger (self read; append-only via RPC)
-- ---------------------------------------------------------------------------
drop policy if exists ledger_self_read on public.points_ledger;

create policy ledger_self_read on public.points_ledger for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- rewards (active rewards world-readable; partner/admin manage)
-- ---------------------------------------------------------------------------
drop policy if exists rewards_public_read on public.rewards;
drop policy if exists rewards_manage      on public.rewards;

create policy rewards_public_read on public.rewards for select
  using (status = 'active' or public.owns_partner(partner_id));

create policy rewards_manage on public.rewards for all
  using (public.owns_partner(partner_id))
  with check (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- reward_redemptions (self read + partner read own)
-- ---------------------------------------------------------------------------
drop policy if exists redemptions_self_read on public.reward_redemptions;

create policy redemptions_self_read on public.reward_redemptions for select
  using (user_id = auth.uid() or public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- leaderboard_snapshots (public read)
-- ---------------------------------------------------------------------------
drop policy if exists leaderboard_public_read on public.leaderboard_snapshots;

create policy leaderboard_public_read on public.leaderboard_snapshots for select
  using (true);

-- ---------------------------------------------------------------------------
-- analytics_rollups (partner/admin read)
-- ---------------------------------------------------------------------------
drop policy if exists rollups_partner_read on public.analytics_rollups;

create policy rollups_partner_read on public.analytics_rollups for select
  using (public.owns_partner(partner_id));

-- ---------------------------------------------------------------------------
-- consent_events (self all)
-- ---------------------------------------------------------------------------
drop policy if exists consent_self on public.consent_events;

create policy consent_self on public.consent_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_logs (admin read only)
-- ---------------------------------------------------------------------------
drop policy if exists audit_admin_read on public.audit_logs;

create policy audit_admin_read on public.audit_logs for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- note_reports (file own; read own + admin; resolve admin only)
-- ---------------------------------------------------------------------------
drop policy if exists note_reports_file    on public.note_reports;
drop policy if exists note_reports_read    on public.note_reports;
drop policy if exists note_reports_resolve on public.note_reports;

create policy note_reports_file on public.note_reports for insert
  with check (reporter_id = auth.uid());

create policy note_reports_read on public.note_reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy note_reports_resolve on public.note_reports for update
  using (public.is_admin())
  with check (public.is_admin());
