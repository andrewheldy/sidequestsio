-- =============================================================================
-- SideQuests.io — Full MVP seed
-- =============================================================================
-- Imports all mock data from src/data/mock/quests.json with stable UUIDs.
-- String-ID → UUID mapping is documented in supabase/import_mapping.json.
--
-- Catalog rows (partners/venues/quests/qr_codes/rewards) have no auth
-- dependency and can be seeded on a fresh project.
--
-- User-scoped rows (completions, notes, ledger) require real auth users;
-- run the LocalRepository seed in-browser (src/lib/db/local/seed.ts) or
-- use import_notes.sql once real users exist.
--
-- Idempotent: all inserts use ON CONFLICT DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ID constants (matches import_mapping.json)
-- ---------------------------------------------------------------------------
-- Partner UUIDs  10000000-0000-0000-0000-0000000000xx
-- Venue UUIDs    20000000-0000-0000-0000-0000000000xx
-- Quest UUIDs    30000000-0000-0000-0000-0000000000xx
-- QR code UUIDs  40000000-0000-0000-0000-0000000000xx
-- Reward UUIDs   50000000-0000-0000-0000-0000000000xx

-- ---------------------------------------------------------------------------
-- Partners (7) — status 'pending': none have agreed to take part yet
-- ---------------------------------------------------------------------------
insert into public.partners (id, name, type, contact_email, status, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'Wynwood Collective',          'venue', 'hello@wynwoodcollective.com',       'pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000002', 'South Beach Experience',       'venue', 'info@southbeachexperience.com',     'pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000003', 'Little Havana Cultural Hub',   'venue', 'hola@littlehavanacultural.com',     'pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000004', 'Brickell City Partners',       'venue', 'contact@brickellcitypartners.com',  'pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000005', 'Coconut Grove Adventures',     'venue', 'explore@coconutgroveadventures.com','pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000006', 'Miami Design District',        'venue', 'arts@miamidesigndistrict.com',      'pending', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000007', 'Downtown Miami Alliance',      'venue', 'info@downtownmiamialliance.com',    'pending', '2024-01-15T10:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Venues (9)
-- ---------------------------------------------------------------------------
insert into public.venues (id, partner_id, name, address, city, latitude, longitude, status) values
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Wynwood Arts District',        '2600 NW 2nd Ave, Miami, FL 33127',         'Miami',       25.8002, -80.1986, 'active'),
  ('20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'South Beach Boardwalk',         'Ocean Dr & 8th St, Miami Beach, FL 33139', 'Miami Beach', 25.7854, -80.1303, 'active'),
  ('20000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   'Wynwood Murals',        'Wynwood, Miami, FL 33127',         'Miami',       25.8058, -80.1997, 'active'),
  ('20000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   'Calle Ocho',        'SW 8th St, Miami, FL 33135',         'Miami',       25.7679, -80.2268, 'active'),
  ('20000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   'Brickell Key',        'Brickell Key, Miami, FL 33131',         'Miami',       25.768, -80.1865, 'active'),
  ('20000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   'Coconut Grove Waterfront Park', '2901 S Bayshore Dr, Miami, FL 33133',      'Miami',       25.7283, -80.2381, 'active'),
  ('20000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   'Design District',        'Design District, Miami, FL 33137',         'Miami',       25.8149, -80.1866, 'active'),
  ('20000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   'Downtown Miami Waterfront',        'Biscayne Blvd, Miami, FL 33132',         'Miami',       25.7745, -80.1903, 'active'),
  ('20000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   'Wynwood Karaoke Night',        'Wynwood, Miami, FL',         'Miami',       25.8008, -80.199, 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quests (9)
-- ---------------------------------------------------------------------------
insert into public.quests (
  id, partner_id, venue_id, title, description,
  category, difficulty, xp_reward, points_reward,
  status, verification_type, image_url, created_at
) values
  -- 1. Wynwood Side-Street Wander
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'Wynwood Side-Street Wander',
   'Wander the streets between Wynwood''s murals and galleries and look for the spots locals talk about. Notice what makes each stop different, and leave a tip for the next explorer.',
   'hidden_gem', 'easy', 100, 50, 'active', 'qr',
   'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 2. South Beach Sunrise
  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'South Beach Sunrise Reset',
   'Walk the South Beach boardwalk at sunrise. Watch the light hit the Art Deco buildings and the Atlantic, and take a photo of the moment.',
   'fitness', 'easy', 110, 55, 'active', 'qr',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 3. Wynwood Mural Hunt
  ('30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000003',
   'Wynwood Mural Hunt',
   'Look for eight small details hidden in the murals around Wynwood''s streets. Use the clues to find each one, and read up on the story behind the piece.',
   'culture', 'medium', 130, 65, 'active', 'qr',
   'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 4. Calle Ocho Walk
  ('30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000004',
   'Calle Ocho Walk',
   'Walk Calle Ocho and take in the murals, the music, and the domino park. Stop wherever looks good for a cafecito, and note what you''d tell the next explorer.',
   'food', 'easy', 120, 60, 'active', 'qr',
   'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 5. Brickell Skyline Night Walk
  ('30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000005',
   'Brickell Skyline Night Walk',
   'Take an evening walk from the Miami River to Brickell Key and find the skyline view you like best.',
   'nightlife', 'medium', 150, 75, 'active', 'qr',
   'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 6. Coconut Grove Bayfront Loop
  ('30000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000006',
   'Coconut Grove Bayfront Loop',
   'Walk the Coconut Grove bayfront, through Peacock Park and along the tree-lined streets, at an easy pace.',
   'outdoors', 'easy', 110, 55, 'active', 'qr',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 7. Design District Public Art Walk
  ('30000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000007',
   'Design District Public Art Walk',
   'Walk the Design District''s streets and look for the public art installations. Take a photo of your favorite.',
   'art', 'medium', 140, 70, 'active', 'qr',
   'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 8. Downtown Local Legends
  ('30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000008',
   'Downtown Local Legends Quest',
   'Walk from the Freedom Tower to the Bayside waterfront and read the plaques and markers along the way. Pick the story that surprised you most.',
   'culture', 'easy', 90, 45, 'active', 'qr',
   'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 9. Karaoke Night in Wynwood
  ('30000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000009',
   'Karaoke Night in Wynwood',
   'Find a karaoke night in Wynwood, put your name down for a slot, and sing one song you know every word to. Cheering for other singers counts too.',
   'nightlife', 'easy', 130, 65, 'active', 'qr',
   'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- QR codes (9 — one per quest)
-- ---------------------------------------------------------------------------
insert into public.qr_codes (id, quest_id, venue_id, partner_id, code, destination_url, status, created_at) values
  ('40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'WYND-COF1', '/q/30000000-0000-0000-0000-000000000001', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'SOBE-SUN1', '/q/30000000-0000-0000-0000-000000000002', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   'WYND-MUR1', '/q/30000000-0000-0000-0000-000000000003', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   'LHAV-CAF1', '/q/30000000-0000-0000-0000-000000000004', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   'BRKL-SKY1', '/q/30000000-0000-0000-0000-000000000005', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   'CGRO-BAY1', '/q/30000000-0000-0000-0000-000000000006', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000007',
   '30000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   'DSGN-GAL1', '/q/30000000-0000-0000-0000-000000000007', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000008',
   '30000000-0000-0000-0000-000000000008',
   '20000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   'DTWN-LEG1', '/q/30000000-0000-0000-0000-000000000008', 'active', '2024-01-20T10:00:00Z'),
  ('40000000-0000-0000-0000-000000000009',
   '30000000-0000-0000-0000-000000000009',
   '20000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   'WYND-KAR1', '/q/30000000-0000-0000-0000-000000000009', 'active', '2024-01-20T10:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Rewards: intentionally none.
-- No venue has agreed to offer a reward yet, so nothing is seeded. Add rewards
-- here (or in the partner portal) only once a venue has agreed to honour them.
-- ---------------------------------------------------------------------------
