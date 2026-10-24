-- 0025_quest_image_attribution.sql — credit for licensed quest hero photos
--
-- WHY (2026-10-24): Miami Essentials heroes are Wikimedia Commons photos;
-- 32 of 39 are CC BY / CC BY-SA, which require visible credit (creator,
-- source link, license name + link, and whether the photo was changed).
-- The quest page and quest cards render it from this column when present
-- (src/lib/app/attribution.ts); public-domain / CC0 photos leave it NULL.
--
-- Shape: { creator, source_url, license, license_url, source_name?, modified? }
-- The UI shows nothing unless creator, license and both http(s) URLs exist.
--
-- Additive and idempotent. Readable through the existing quests SELECT grant.
--
-- Rollback:
--   alter table public.quests drop constraint if exists quests_image_attribution_object;
--   alter table public.quests drop column if exists image_attribution;

alter table public.quests add column if not exists image_attribution jsonb;

alter table public.quests drop constraint if exists quests_image_attribution_object;
alter table public.quests add constraint quests_image_attribution_object
  check (image_attribution is null or jsonb_typeof(image_attribution) = 'object');

comment on column public.quests.image_attribution is
  'Credit for quests.image_url when its license requires it: {creator, source_url, license, license_url, source_name?, modified?}. NULL = none required.';

-- Verification:
--   select count(*) filter (where image_attribution is not null) as credited
--     from public.quests;
