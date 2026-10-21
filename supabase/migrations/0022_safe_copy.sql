-- 0022_safe_copy.sql — bring LIVE content in line with the safe-copy pass
--
-- Intent: the repo seed files (seed_full.sql, frost_museum_quest.sql) were
-- rewritten so quests no longer promise rewards, name businesses as taking part,
-- or imply a venue endorsed us. Seed files only affect fresh projects, so this
-- migration applies the same changes to the live database.
--
-- Run in the SQL editor / CLI AFTER A BACKUP (the Supabase MCP is read-only).
-- Non-destructive: nothing is deleted. Idempotent: every update is guarded, so
-- re-running is a no-op, and any quest text that was already hand-edited in
-- production (it does not match the old seed text) is left alone.
--
-- Undo: set the statuses back ('active') and restore text from the backup.
--
-- Enum reminders: partner_status = pending|active|suspended;
--                 entity_status (quests, rewards, venues) = draft|active|paused|archived.

begin;

-- 1. Rewards: no venue has agreed to honour any reward, so hide every reward.
--    (Hidden, not deleted: public read policies only expose status = 'active'.)
update public.rewards set status = 'paused' where status = 'active';

-- 2. Partners: none of the seeded partners has agreed to take part yet.
--    The Rewards/Quest pages do not filter on partner status, so this only
--    records the truth in the data (and in the partner dashboards).
update public.partners
   set status = 'pending'
 where status = 'active'
   and id in (
     '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
     '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
     '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008'  -- Frost
   );

-- 3. Quest text. Each update only fires while the old seed title is still in
--    place, so curated edits made directly in production are not overwritten.
update public.quests set
  title = 'Wynwood Side-Street Wander',
  description = 'Wander the streets between Wynwood''s murals and galleries and look for the spots locals talk about. Notice what makes each stop different, and leave a tip for the next explorer.'
where id = '30000000-0000-0000-0000-000000000001' and title = 'Hidden Wynwood Coffee Crawl';

update public.quests set
  description = 'Walk the South Beach boardwalk at sunrise. Watch the light hit the Art Deco buildings and the Atlantic, and take a photo of the moment.'
where id = '30000000-0000-0000-0000-000000000002' and title = 'South Beach Sunrise Reset';

update public.quests set
  title = 'Wynwood Mural Hunt',
  description = 'Look for eight small details hidden in the murals around Wynwood''s streets. Use the clues to find each one, and read up on the story behind the piece.'
where id = '30000000-0000-0000-0000-000000000003' and title = 'Wynwood Walls Mural Hunt';

update public.quests set
  title = 'Calle Ocho Walk',
  description = 'Walk Calle Ocho and take in the murals, the music, and the domino park. Stop wherever looks good for a cafecito, and note what you''d tell the next explorer.'
where id = '30000000-0000-0000-0000-000000000004' and title = 'Little Havana Cafecito Trail';

update public.quests set
  description = 'Take an evening walk from the Miami River to Brickell Key and find the skyline view you like best.'
where id = '30000000-0000-0000-0000-000000000005' and title = 'Brickell Skyline Night Walk';

update public.quests set
  description = 'Walk the Coconut Grove bayfront, through Peacock Park and along the tree-lined streets, at an easy pace.'
where id = '30000000-0000-0000-0000-000000000006' and title = 'Coconut Grove Bayfront Loop';

update public.quests set
  title = 'Design District Public Art Walk',
  description = 'Walk the Design District''s streets and look for the public art installations. Take a photo of your favorite.'
where id = '30000000-0000-0000-0000-000000000007' and title = 'Design District Gallery Walk';

update public.quests set
  description = 'Walk from the Freedom Tower to the Bayside waterfront and read the plaques and markers along the way. Pick the story that surprised you most.'
where id = '30000000-0000-0000-0000-000000000008' and title = 'Downtown Local Legends Quest';

update public.quests set
  title = 'Karaoke Night in Wynwood',
  description = 'Find a karaoke night in Wynwood, put your name down for a slot, and sing one song you know every word to. Cheering for other singers counts too.'
where id = '30000000-0000-0000-0000-000000000009' and title = 'Sweet Caroline Karaoke Night';

-- 4. Venues named after a business, or with an address we could not verify.
update public.venues set name = 'Wynwood Arts District'
 where id = '20000000-0000-0000-0000-000000000001' and name = 'Wynwood Coffee Quarter';
update public.venues set name = 'Wynwood Murals', address = 'Wynwood, Miami, FL 33127'
 where id = '20000000-0000-0000-0000-000000000003' and name = 'Wynwood Walls';
update public.venues set name = 'Calle Ocho', address = 'SW 8th St, Miami, FL 33135'
 where id = '20000000-0000-0000-0000-000000000004' and name = 'Calle Ocho Cultural Center';
update public.venues set name = 'Brickell Key', address = 'Brickell Key, Miami, FL 33131', latitude = 25.7680, longitude = -80.1865
 where id = '20000000-0000-0000-0000-000000000005' and name = 'Brickell City Centre';
update public.venues set name = 'Design District', address = 'Design District, Miami, FL 33137'
 where id = '20000000-0000-0000-0000-000000000007' and name = 'Institute of Contemporary Art';
update public.venues set name = 'Downtown Miami Waterfront', address = 'Biscayne Blvd, Miami, FL 33132'
 where id = '20000000-0000-0000-0000-000000000008' and name = 'Bayside Marketplace';
update public.venues set name = 'Wynwood Karaoke Night', address = 'Wynwood, Miami, FL', latitude = 25.8008, longitude = -80.1990
 where id = '20000000-0000-0000-0000-000000000009' and name = 'Sweet Caroline Karaoke Bar';

-- 5. Frost Museum quest: no implied endorsement, no museum social links, no
--    advertised share points. The quest is also unpublished (draft) until the
--    museum agrees; set status back to 'active' to publish it.
update public.quests set
  status = 'draft',
  description = 'A photo quest inside a Miami science museum. sidequests is independent and isn''t affiliated with or endorsed by the museum. Admission is separate.',
  social_share_prompt = 'Found something that sparked my curiosity at the Frost Museum of Science 🔭 #sidequests #Miami',
  links = coalesce(links, '{}'::jsonb) - 'instagram_url' - 'tiktok_url' - 'x_url' - 'action_points'
where id = '30000000-0000-0000-0000-000000000010';

update public.venues set description = 'Science museum on Biscayne Bay.'
 where id = '20000000-0000-0000-0000-000000000010';

commit;

-- Not handled here (needs a human look at the live rows): any quest or reward
-- text edited directly in production that still promises a reward or names a
-- business. Check with:
--   select id, title, description from public.quests
--    where description ~* '(free|complimentary|discount|print|pastelito|smoothie|skip|bike|badge|drinks|reward|stationed)';
