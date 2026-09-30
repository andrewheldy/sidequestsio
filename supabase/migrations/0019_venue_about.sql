-- 0019_venue_about.sql — "About the venue" copy and photo for the quest page.
--
-- WHY: the redesigned quest page (src/pages/QuestDetail.tsx) ends with a
-- compact venue card — photo, a sentence or two about the place, and a
-- "Visit website" CTA. The website already lives in quests.links.website_url
-- (0012), hours/price/neighborhood in the 0014 venue columns, but nothing
-- stores descriptive venue copy or a landscape venue photo:
--   * quests.description is the quest intro under the hero, not venue copy;
--   * venues.logo_url is a square logo, not a photo.
--
-- Both columns are nullable text. The app already reads them optionally
-- (Venue.description / Venue.image_url in src/types/db.ts, via the existing
-- `venue:venues(*)` join), so deploying the app before or after this
-- migration is safe: the card simply omits what isn't there.
--
-- Idempotent and non-destructive. Reverse with:
--   alter table public.venues drop column if exists description,
--                             drop column if exists image_url;

alter table public.venues
  add column if not exists description text,
  add column if not exists image_url   text;

comment on column public.venues.description is
  'Short editorial "about" copy for the venue card on quest pages (1–2 sentences)';
comment on column public.venues.image_url is
  'Landscape venue photo for the venue card on quest pages (https URL)';

comment on column public.quests.links is
  'Business links JSON. Read by the quest page: website_url, reviews_url + reviews_source (google|yelp|other), google_reviews_url (legacy), instagram_url, tiktok_url, x_url, socials_url (single landing page) + socials_source, and action_points ({instagram, tiktok, x, google_review, website}: points advertised on Explore & Share cards — display only, nothing credits them yet).';

-- No new grants: venues is already publicly readable (RLS venues_public_read
-- + 0009 anon select grant), and the new columns inherit the table grant.

-- Verification:
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'venues'
--      and column_name in ('description', 'image_url');
--   -- 2 rows expected.
