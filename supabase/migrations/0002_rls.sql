-- ===========================================================================
-- SideQuests.io — Row Level Security (Phase 14)
-- ===========================================================================
-- Principles:
--  * Users see and edit only their own rows.
--  * Public, active quests/rewards/venues/partners are world-readable so the
--    QR landing + discovery work pre-auth.
--  * Approved community notes are world-readable; authoring requires completion
--    (enforced in the create_community_note function).
--  * Partners see only their own org's data (partner isolation).
--  * Admins bypass via the is_admin() helper.
--  * Append-only tables (ledger, scans, audit) are never client-updatable;
--    writes go through SECURITY DEFINER functions in 0003_functions.sql.
-- ===========================================================================

-- Helper: current app user id (maps auth.uid() -> users.id by email/uuid).
create or replace function app_uid() returns uuid language sql stable as $$
  select id from users where id = auth.uid()
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin')
$$;

create or replace function owns_partner(p_partner_id uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from partners
    where id = p_partner_id and owner_user_id = auth.uid()
  ) or is_admin()
$$;

-- Enable RLS on all tables.
alter table users enable row level security;
alter table user_profiles enable row level security;
alter table privacy_preferences enable row level security;
alter table partners enable row level security;
alter table venues enable row level security;
alter table quests enable row level security;
alter table qr_codes enable row level security;
alter table scan_events enable row level security;
alter table quest_attempts enable row level security;
alter table quest_completions enable row level security;
alter table community_notes enable row level security;
alter table points_ledger enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table leaderboard_snapshots enable row level security;
alter table analytics_rollups enable row level security;
alter table consent_events enable row level security;
alter table audit_logs enable row level security;

-- ---- Users -----------------------------------------------------------------
create policy users_self_read on users for select
  using (id = auth.uid() or is_admin());
create policy users_self_update on users for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Public can read display_name/avatar via the leaderboard RPC, not the table.

-- ---- Profiles --------------------------------------------------------------
create policy profiles_self_read on user_profiles for select
  using (user_id = auth.uid() or is_admin());
create policy profiles_self_update on user_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Privacy ---------------------------------------------------------------
create policy privacy_self_all on privacy_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Partners / venues (public read of active; partner/admin manage) --------
create policy partners_public_read on partners for select using (true);
create policy partners_manage on partners for all
  using (owns_partner(id)) with check (owns_partner(id));

create policy venues_public_read on venues for select using (true);
create policy venues_manage on venues for all
  using (owns_partner(partner_id)) with check (owns_partner(partner_id));

-- ---- Quests (public read active; partner/admin manage own) ------------------
create policy quests_public_read on quests for select
  using (status = 'active' or owns_partner(partner_id));
create policy quests_manage on quests for all
  using (owns_partner(partner_id)) with check (owns_partner(partner_id));

-- ---- QR codes (public read active for resolution; partner manage) -----------
create policy qr_public_read on qr_codes for select
  using (status = 'active' or owns_partner(partner_id));
create policy qr_manage on qr_codes for all
  using (owns_partner(partner_id)) with check (owns_partner(partner_id));

-- ---- Scan events (insert via RPC; partner/admin read own) -------------------
create policy scans_partner_read on scan_events for select
  using (owns_partner(partner_id));
-- No client INSERT/UPDATE policy: record_scan() runs SECURITY DEFINER.

-- ---- Attempts / completions (self read; writes via RPC) ---------------------
create policy attempts_self_read on quest_attempts for select
  using (user_id = auth.uid() or is_admin());
create policy completions_self_read on quest_completions for select
  using (user_id = auth.uid() or owns_partner(partner_id));

-- ---- Community notes --------------------------------------------------------
create policy notes_public_read on community_notes for select
  using (moderation_status = 'approved' or user_id = auth.uid() or is_admin());
create policy notes_admin_update on community_notes for update
  using (is_admin()) with check (is_admin());
-- Authoring happens via create_community_note() (verifies completion).

-- ---- Points ledger (self read only; append-only via RPC) --------------------
create policy ledger_self_read on points_ledger for select
  using (user_id = auth.uid() or is_admin());

-- ---- Rewards (public read active; partner manage) --------------------------
create policy rewards_public_read on rewards for select
  using (status = 'active' or owns_partner(partner_id));
create policy rewards_manage on rewards for all
  using (owns_partner(partner_id)) with check (owns_partner(partner_id));

-- ---- Redemptions (self read; partner read own) -----------------------------
create policy redemptions_self_read on reward_redemptions for select
  using (user_id = auth.uid() or owns_partner(partner_id));

-- ---- Leaderboard snapshots (public read) -----------------------------------
create policy leaderboard_public_read on leaderboard_snapshots for select using (true);

-- ---- Analytics rollups (partner/admin) -------------------------------------
create policy rollups_partner_read on analytics_rollups for select
  using (owns_partner(partner_id));

-- ---- Consent (self) --------------------------------------------------------
create policy consent_self on consent_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Audit logs (admin read only) ------------------------------------------
create policy audit_admin_read on audit_logs for select using (is_admin());
