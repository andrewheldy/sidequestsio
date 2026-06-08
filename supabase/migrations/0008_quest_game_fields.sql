-- =============================================================================
-- SideQuests.io — Quest game-play fields
-- =============================================================================
-- Adds the funky-action / proof-method columns that the app reads from
-- QuestWithContext. Idempotent: uses ADD COLUMN IF NOT EXISTS throughout.
-- Run BEFORE seed_demo.sql.
-- =============================================================================

-- Funky action text shown on the quest detail page
alter table public.quests
  add column if not exists funky_action text;

-- Broad category of the action (social, taste, explore, …)
alter table public.quests
  add column if not exists action_type text;

-- How the user proves they completed the quest
-- (camera | photo | staff_phrase | breadcrumb | qr | manual)
alter table public.quests
  add column if not exists proof_method text;

-- Phrase the user shows / tells staff (staff_phrase proof method)
alter table public.quests
  add column if not exists staff_phrase text;

-- Suggested social share caption, pre-populated for sharing UX
alter table public.quests
  add column if not exists social_share_prompt text;

-- Human-readable time estimate displayed on the card ("5 min")
alter table public.quests
  add column if not exists estimated_time text;

-- JSONB bag of optional business / partner links
-- (website, menu, reservation, delivery, instagram, tiktok, x, facebook,
--  google_reviews_url, contact_phone, special_deals, …)
alter table public.quests
  add column if not exists links jsonb;
