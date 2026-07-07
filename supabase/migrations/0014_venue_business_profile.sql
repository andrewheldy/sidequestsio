-- 0014_venue_business_profile.sql — venue business-profile fields for the
-- redesigned Quest Detail page (commit 72fb929).
--
-- WHY (verified live 2026-07-07): the quests table already carries every
-- quest-level field the new UI reads (image_url as hero, funky_action as the
-- objective, estimated_time, links jsonb — see 0012). The only gap is the
-- business-profile block rendered from the venue: circular logo, neighborhood
-- line, hours and price range. Partners stay untouched — they are the B2B
-- account shell (one partner owns several venue brands), while the venue is
-- the customer-facing business the quester actually visits.
--
-- All columns are nullable text; the UI hides each card gracefully when the
-- value is missing. Content is populated via scripts/import-quest-content.ts
-- (see docs/QUEST_CONTENT_IMPORT.md), not by this migration.
--
-- Canonical quests.links shape (documented here; no DDL needed — column
-- exists since 0012):
--   { website_url, reviews_url, reviews_source: google|yelp|other,
--     socials_url, socials_source: linktree|linkme|other }
-- socials_url is ONE external landing page (Linktree/Linkme style); there are
-- deliberately no per-platform social keys.
--
-- Idempotent; every clause is a no-op where the column already exists.

alter table public.venues
  add column if not exists logo_url     text,
  add column if not exists neighborhood text,
  add column if not exists hours        text,
  add column if not exists hours_note   text,
  add column if not exists price_range  text;

comment on column public.venues.logo_url     is 'Business logo/profile image shown as the circular avatar on the quest hero';
comment on column public.venues.neighborhood is 'Human neighborhood name, e.g. "Wynwood" (city remains the secondary line)';
comment on column public.venues.hours        is 'Display hours string, e.g. "7:00 AM – 9:00 PM"';
comment on column public.venues.hours_note   is 'Secondary hours line, e.g. "Daily" or "Closed Mondays"';
comment on column public.venues.price_range  is 'Price tier as dollar signs: $, $$, $$$ or $$$$';

comment on column public.quests.links is
  'Business links JSON: { website_url, reviews_url, reviews_source: google|yelp|other, socials_url (single Linktree/Linkme-style landing page), socials_source: linktree|linkme|other }. Legacy keys (google_reviews_url, instagram_url, …) remain readable by the UI fallback path.';

-- Verification:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='venues'
--      and column_name in ('logo_url','neighborhood','hours','hours_note','price_range');
--   -- 5 rows expected.
