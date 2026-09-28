-- frost_museum_quest.sql — adds the Frost Museum of Science quest to production
--
-- The reference quest for the redesigned quest page (see
-- docs/DECISIONS.md, 2026-09-28). Run once in the Supabase SQL editor.
-- Requires migration 0019_venue_about.sql (venues.description/image_url).
--
-- Idempotent: fixed ids in the documented ranges (supabase/import_mapping.json
-- legend), upserted, so re-running updates the content in place. The venue
-- code is generated once, the same way create_qr_code() does it (0018), and is
-- never written into this file — it proves a visit, so it stays server-side.
--
--   partner  10000000-0000-0000-0000-000000000008
--   venue    20000000-0000-0000-0000-000000000010
--   quest    30000000-0000-0000-0000-000000000010
--
-- Before launch: confirm the social handles, and that Frost is happy to be
-- featured (docs/business/PARTNERSHIP_PLAYBOOK.md). Photos are public-domain
-- (Wikimedia Commons: "Frost Science.jpg", "Water is wet!.jpg").
--
-- Undo:
--   delete from public.qr_codes where quest_id = '30000000-0000-0000-0000-000000000010';
--   delete from public.quests   where id       = '30000000-0000-0000-0000-000000000010';
--   delete from public.venues   where id       = '20000000-0000-0000-0000-000000000010';
--   delete from public.partners where id       = '10000000-0000-0000-0000-000000000008';
-- (Only while the quest has no completions or scans; those reference it.)

begin;

insert into public.partners (id, name, type, contact_email, status)
values (
  '10000000-0000-0000-0000-000000000008',
  'Frost Museum of Science',
  'nonprofit',
  'info@frostscience.org',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  contact_email = excluded.contact_email;

insert into public.venues (
  id, partner_id, name, address, city, latitude, longitude, status,
  neighborhood, description, image_url
)
values (
  '20000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000008',
  'Frost Museum of Science',
  '1101 Biscayne Blvd, Miami, FL 33132',
  'Miami',
  25.7853,
  -80.1880,
  'active',
  'Downtown Miami',
  'A leading science museum with interactive exhibitions, a planetarium, and an aquarium in the heart of Miami.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Water_is_wet%21.jpg/960px-Water_is_wet%21.jpg'
)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  neighborhood = excluded.neighborhood,
  description = excluded.description,
  image_url = excluded.image_url;

insert into public.quests (
  id, partner_id, venue_id, title, description, category, difficulty,
  xp_reward, points_reward, status, verification_type, image_url,
  funky_action, action_type, action_prompt, proof_method,
  social_share_prompt, estimated_time, links
)
values (
  '30000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000010',
  'Frost Museum: Spark of Curiosity',
  'Explore a universe of discovery at Miami''s Frost Museum of Science. From the planetarium to the aquarium, this is curiosity in real life.',
  'culture',
  'easy',
  130,
  100,
  'active',
  'qr',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Frost_Science.jpg/1280px-Frost_Science.jpg',
  'Take a photo inside the Frost Museum',
  'explore',
  'Capture something that sparks your curiosity — an exhibit, view, or moment.',
  'camera',
  'Found something that sparked my curiosity at the Frost Museum of Science 🔭 #sidequests #FrostScience #Miami',
  '45 min',
  jsonb_build_object(
    'website_url',    'https://www.frostscience.org',
    'instagram_url',  'https://www.instagram.com/frostscience/',
    'tiktok_url',     'https://www.tiktok.com/@frostscience',
    'x_url',          'https://x.com/FrostScience',
    'reviews_url',    'https://www.google.com/maps/search/?api=1&query=Phillip+and+Patricia+Frost+Museum+of+Science',
    'reviews_source', 'google'
    -- Advertised Explore & Share points (display only; nothing credits them
    -- yet — see docs/QUEST_CONTENT_IMPORT.md). Uncomment to show them:
    -- , 'action_points', jsonb_build_object('instagram', 50, 'tiktok', 50, 'x', 25, 'google_review', 75, 'website', 25)
  )
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  difficulty = excluded.difficulty,
  xp_reward = excluded.xp_reward,
  points_reward = excluded.points_reward,
  verification_type = excluded.verification_type,
  image_url = excluded.image_url,
  funky_action = excluded.funky_action,
  action_type = excluded.action_type,
  action_prompt = excluded.action_prompt,
  proof_method = excluded.proof_method,
  social_share_prompt = excluded.social_share_prompt,
  estimated_time = excluded.estimated_time,
  links = excluded.links;

-- One venue code (QR sticker; add an NFC tag later with create_qr_code(..., 'nfc')).
insert into public.qr_codes (quest_id, partner_id, venue_id, code, destination_url, kind)
select q.id, q.partner_id, q.venue_id, c.code, '/scan/' || c.code, 'qr'
  from public.quests q
  cross join lateral (
    select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) as code
  ) c
 where q.id = '30000000-0000-0000-0000-000000000010'
   and not exists (
     select 1 from public.qr_codes where quest_id = q.id and kind = 'qr'
   );

commit;

-- The sticker must encode this URL (see PARTNERSHIP_PLAYBOOK.md, "Venue codes"):
select 'https://miamisidequests.io' || destination_url as sticker_url, code
  from public.qr_codes
 where quest_id = '30000000-0000-0000-0000-000000000010';
