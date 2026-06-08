-- =============================================================================
-- SideQuests.io — Demo / MVP seed  (all 15 launch quests)
-- =============================================================================
-- Run AFTER 0008_quest_game_fields.sql (adds funky_action etc. columns).
--
-- Idempotent: every insert uses ON CONFLICT (id) DO UPDATE so re-running is safe.
--
-- ID ranges used here (all valid UUIDs, hex only):
--   da000000-0000-0000-0000-00000000000X  partners   (14 venues)
--   db000000-0000-0000-0000-00000000000X  venues     (15 locations)
--   de000000-0000-0000-0000-00000000000X  quests     (15 quests)
--
-- These IDs are mirrored in:
--   src/data/demo/demoQuests.ts
--   src/lib/db/local/seed.ts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Partners  (14 distinct venues/brands)
-- ---------------------------------------------------------------------------
insert into public.partners (id, name, type, contact_email, status) values
  ('da000000-0000-0000-0000-000000000001', 'Wynwood Arts District',       'venue',     'hello@wynwoodwalls.com',           'active'),
  ('da000000-0000-0000-0000-000000000002', 'Panther Coffee',              'brand',     'hello@panthercoffee.com',          'active'),
  ('da000000-0000-0000-0000-000000000003', 'KYU Miami',                   'venue',     'hello@kyurestaurants.com',         'active'),
  ('da000000-0000-0000-0000-000000000004', 'Coyo Taco',                   'venue',     'hello@coyotaco.com',               'active'),
  ('da000000-0000-0000-0000-000000000005', 'Boxelder Craft Beer Market',  'venue',     'hello@boxelderbar.com',            'active'),
  ('da000000-0000-0000-0000-000000000006', 'Gramps',                      'venue',     'hello@gramps.com',                 'active'),
  ('da000000-0000-0000-0000-000000000007', 'Wood Tavern',                 'venue',     'hello@woodtavern.com',             'active'),
  ('da000000-0000-0000-0000-000000000008', 'Vice City Beans',             'brand',     'hello@vicecitybeans.com',          'active'),
  ('da000000-0000-0000-0000-000000000009', 'Art Deco Historic District',  'nonprofit', 'info@mdpl.org',                    'active'),
  ('da000000-0000-0000-0000-000000000010', 'Pérez Art Museum Miami',      'nonprofit', 'info@pamm.org',                    'active'),
  ('da000000-0000-0000-0000-000000000011', 'Frost Science Museum',        'nonprofit', 'info@frostscience.org',            'active'),
  ('da000000-0000-0000-0000-000000000012', 'Vizcaya Museum & Gardens',   'nonprofit', 'info@vizcaya.org',                 'active'),
  ('da000000-0000-0000-0000-000000000013', 'Bass Museum of Art',          'nonprofit', 'info@bassmuseum.org',              'active'),
  ('da000000-0000-0000-0000-000000000014', 'Brickell Key',                'other',     'info@brickellkey.com',             'active')
on conflict (id) do update set
  name   = excluded.name,
  status = excluded.status;

-- ---------------------------------------------------------------------------
-- Venues  (15 physical locations)
-- ---------------------------------------------------------------------------
insert into public.venues (id, partner_id, name, address, city, latitude, longitude, status) values
  ('db000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'Wynwood Walls',               '2516 NW 2nd Ave',    'Miami, FL',       25.8011, -80.1994, 'active'),
  ('db000000-0000-0000-0000-000000000002', 'da000000-0000-0000-0000-000000000002', 'Panther Coffee Wynwood',      '2390 NW 2nd Ave',    'Miami, FL',       25.8002, -80.1982, 'active'),
  ('db000000-0000-0000-0000-000000000003', 'da000000-0000-0000-0000-000000000003', 'KYU Miami',                   '251 NW 25th St',     'Miami, FL',       25.8042, -80.1982, 'active'),
  ('db000000-0000-0000-0000-000000000004', 'da000000-0000-0000-0000-000000000004', 'Coyo Taco Wynwood',           '2300 NW 2nd Ave',    'Miami, FL',       25.8008, -80.1983, 'active'),
  ('db000000-0000-0000-0000-000000000005', 'da000000-0000-0000-0000-000000000005', 'Boxelder Craft Beer Market',  '2817 NW 2nd Ave',    'Miami, FL',       25.8074, -80.1985, 'active'),
  ('db000000-0000-0000-0000-000000000006', 'da000000-0000-0000-0000-000000000006', 'Gramps',                      '176 NW 24th St',     'Miami, FL',       25.8027, -80.1997, 'active'),
  ('db000000-0000-0000-0000-000000000007', 'da000000-0000-0000-0000-000000000007', 'Wood Tavern',                 '2531 NW 2nd Ave',    'Miami, FL',       25.8044, -80.1984, 'active'),
  ('db000000-0000-0000-0000-000000000008', 'da000000-0000-0000-0000-000000000008', 'Vice City Beans',             '120 Collins Ave',    'Miami, FL',       25.7825, -80.1303, 'active'),
  ('db000000-0000-0000-0000-000000000009', 'da000000-0000-0000-0000-000000000001', 'South Pointe Park',           '1 Washington Ave',   'Miami, FL',       25.7617, -80.1308, 'active'),
  ('db000000-0000-0000-0000-000000000010', 'da000000-0000-0000-0000-000000000009', 'Ocean Drive Art Deco Strip',  'Ocean Drive',        'Miami Beach, FL', 25.7836, -80.1301, 'active'),
  ('db000000-0000-0000-0000-000000000011', 'da000000-0000-0000-0000-000000000010', 'Pérez Art Museum Miami',      '1103 Biscayne Blvd', 'Miami, FL',       25.7737, -80.1865, 'active'),
  ('db000000-0000-0000-0000-000000000012', 'da000000-0000-0000-0000-000000000011', 'Frost Science Museum',        '1101 Biscayne Blvd', 'Miami, FL',       25.7730, -80.1875, 'active'),
  ('db000000-0000-0000-0000-000000000013', 'da000000-0000-0000-0000-000000000012', 'Vizcaya Museum & Gardens',   '3251 S Miami Ave',   'Miami, FL',       25.7442, -80.2099, 'active'),
  ('db000000-0000-0000-0000-000000000014', 'da000000-0000-0000-0000-000000000013', 'Bass Museum of Art',          '2100 Collins Ave',   'Miami Beach, FL', 25.7930, -80.1305, 'active'),
  ('db000000-0000-0000-0000-000000000015', 'da000000-0000-0000-0000-000000000014', 'Brickell Key Park',           '900 Brickell Key Dr','Miami, FL',       25.7642, -80.1868, 'active')
on conflict (id) do update set
  name    = excluded.name,
  address = excluded.address,
  city    = excluded.city,
  status  = excluded.status;

-- ---------------------------------------------------------------------------
-- Quests  (15 demo quests — full game fields)
-- ---------------------------------------------------------------------------
insert into public.quests (
  id, partner_id, venue_id,
  title, description, category, difficulty,
  xp_reward, points_reward, status,
  verification_type, verification_secret,
  image_url, created_at,
  funky_action, action_type, proof_method, staff_phrase,
  social_share_prompt, estimated_time
) values

-- 1. Wynwood Walls
('de000000-0000-0000-0000-000000000001',
 'da000000-0000-0000-0000-000000000001',
 'db000000-0000-0000-0000-000000000001',
 'Wynwood Walls',
 'Explore iconic street art and leave your mark. Find your favorite mural, then say ''I feel seen'' in front of it — with complete sincerity.',
 'art', 'easy', 130, 260, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=800&h=600&fit=crop',
 now(),
 'Stand in front of your favorite piece and say ''I feel seen'' with complete sincerity',
 'social', 'camera', null,
 'Just stood in front of my favorite mural at Wynwood Walls and said ''I feel seen'' 🎨 #SideQuests #WynwoodWalls #Miami',
 '5 min'),

-- 2. Panther Coffee
('de000000-0000-0000-0000-000000000002',
 'da000000-0000-0000-0000-000000000002',
 'db000000-0000-0000-0000-000000000002',
 'Panther Coffee: Single-Origin Ritual',
 'Order the house cortadito and describe the bean''s flavor to the barista using only geography — then ask for the passphrase.',
 'food', 'easy', 100, 150, 'active', 'venue_code', 'CORTADO',
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop',
 now(),
 'Describe the coffee''s flavor to the barista using only geography (''tastes like altitude'')',
 'taste', 'staff_phrase', 'CORTADO',
 'Described my Panther Coffee order using only geography and honestly... it worked ☕ #SideQuests #PantherCoffee #Wynwood',
 '5 min'),

-- 3. KYU Miami
('de000000-0000-0000-0000-000000000003',
 'da000000-0000-0000-0000-000000000003',
 'db000000-0000-0000-0000-000000000003',
 'KYU: Art of the Binchotan',
 'KYU''s wood-fired kitchen is a Wynwood institution. Ask your server for the chef''s most underrated dish and actually order it.',
 'food', 'medium', 100, 200, 'active', 'venue_code', 'BINCHO',
 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
 now(),
 'Ask the chef for their most underrated dish — then actually order it',
 'taste', 'staff_phrase', 'BINCHO',
 'Ordered the chef''s secret pick at KYU Miami and it was absolutely fire 🔥 #SideQuests #KYUMiami #Wynwood',
 '10 min'),

-- 4. Coyo Taco
('de000000-0000-0000-0000-000000000004',
 'da000000-0000-0000-0000-000000000004',
 'db000000-0000-0000-0000-000000000004',
 'Coyo Taco: Spice Declaration',
 'At Coyo Taco you have to commit. Before you order, announce your spice level to the table — then stick with it. No take-backs.',
 'food', 'easy', 100, 100, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop',
 now(),
 'Announce your spice level to the table before ordering — no take-backs',
 'social', 'manual', null,
 'Announced my spice level at Coyo Taco and held my ground 🌶️ #SideQuests #CoyoTaco #Wynwood',
 '2 min'),

-- 5. Boxelder
('de000000-0000-0000-0000-000000000005',
 'da000000-0000-0000-0000-000000000005',
 'db000000-0000-0000-0000-000000000005',
 'Boxelder: The Tap Room Ritual',
 'Boxelder has one of Miami''s best tap lists. Find the logo sign, clink your glass against it before your first sip, then scan in.',
 'nightlife', 'easy', 120, 180, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop',
 now(),
 'Clink your glass against the brewery''s logo sign before your first sip',
 'social', 'camera', null,
 'Clinked my glass against the Boxelder sign before my first sip 🍺 #SideQuests #Boxelder #Wynwood',
 '5 min'),

-- 6. Gramps
('de000000-0000-0000-0000-000000000006',
 'da000000-0000-0000-0000-000000000006',
 'db000000-0000-0000-0000-000000000006',
 'Gramps: Backyard Frequency',
 'Gramps is Wynwood''s living room — part dive bar, part outdoor music venue. Nod your head to the beat for 30 solid seconds and log the genre.',
 'nightlife', 'easy', 120, 180, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=600&fit=crop',
 now(),
 'Nod your head to the beat for 30 solid seconds before logging the genre',
 'social', 'manual', null,
 'Nodded to the beat at Gramps for 30 whole seconds and I''m not ashamed 🎵 #SideQuests #Gramps #Wynwood',
 '1 min'),

-- 7. Wood Tavern
('de000000-0000-0000-0000-000000000007',
 'da000000-0000-0000-0000-000000000007',
 'db000000-0000-0000-0000-000000000007',
 'Wood Tavern: Terroir Hours',
 'Wood Tavern''s natural wine list is quietly one of Wynwood''s best. Pick a glass, swirl it, and deliver your verdict to the table.',
 'nightlife', 'easy', 120, 180, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800&h=600&fit=crop',
 now(),
 'Swirl your natural wine and say ''it''s giving terroir'' whether you know what that means or not',
 'social', 'manual', null,
 'Said ''it''s giving terroir'' at Wood Tavern and honestly I was right 🍷 #SideQuests #WoodTavern #Wynwood',
 '2 min'),

-- 8. Vice City Beans
('de000000-0000-0000-0000-000000000008',
 'da000000-0000-0000-0000-000000000008',
 'db000000-0000-0000-0000-000000000008',
 'Vice City Beans: Secret Menu',
 'Find the secret menu item and check in. Ask the barista for the passphrase and describe the coffee using only geography.',
 'food', 'easy', 100, 80, 'active', 'venue_code', 'SUNRISE',
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop',
 now(),
 'Describe the coffee''s flavor to the barista using only geography (''tastes like altitude'')',
 'taste', 'staff_phrase', 'SUNRISE',
 'Ordered coffee at Vice City Beans and described it using only geography ☕ #SideQuests #ViceCityBeans #Miami',
 '5 min'),

-- 9. Sunset Chase at South Pointe
('de000000-0000-0000-0000-000000000009',
 'da000000-0000-0000-0000-000000000001',
 'db000000-0000-0000-0000-000000000009',
 'Sunset Chase at South Pointe',
 'Catch the Miami sunset at South Pointe Park and leave a Community Note. Spread your arms wide and face the horizon.',
 'outdoors', 'easy', 115, 120, 'active', 'gps', null,
 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
 now(),
 'Spread your arms out wide when you reach the park and face the horizon',
 'explore', 'camera', null,
 'Arms out wide at South Pointe Park, soaking in the Miami sunset 🌅 #SideQuests #SouthPointe #Miami',
 '2 min'),

-- 10. Ocean Drive Art Deco
('de000000-0000-0000-0000-000000000010',
 'da000000-0000-0000-0000-000000000009',
 'db000000-0000-0000-0000-000000000010',
 'Ocean Drive: Art Deco Sizing',
 'Ocean Drive is the world''s most celebrated Art Deco mile. Stand at one end and size it up — slowly — before you sit anywhere.',
 'culture', 'easy', 110, 110, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
 now(),
 'Look up and down Ocean Drive slowly before you sit, like you''re sizing it up',
 'explore', 'camera', null,
 'Sizing up Ocean Drive like I own it 🌴 #SideQuests #ArtDeco #SouthBeach #Miami',
 '5 min'),

-- 11. PAMM
('de000000-0000-0000-0000-000000000011',
 'da000000-0000-0000-0000-000000000010',
 'db000000-0000-0000-0000-000000000011',
 'PAMM: 60 Seconds with a Masterpiece',
 'Pérez Art Museum Miami hangs over Biscayne Bay. Stand in front of a painting for 60 full seconds — no phone, just the art.',
 'culture', 'easy', 130, 130, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&h=600&fit=crop',
 now(),
 'Stand in front of the painting for 60 seconds without looking at your phone',
 'explore', 'manual', null,
 'Stood in front of a painting at PAMM for 60 full seconds. No phone. Just vibes 🎨 #SideQuests #PAMM #Miami',
 '1 min'),

-- 12. Frost Science
('de000000-0000-0000-0000-000000000012',
 'da000000-0000-0000-0000-000000000011',
 'db000000-0000-0000-0000-000000000012',
 'Frost Science: Deep Sea Portal',
 'Frost Science''s five-story aquarium is one of the largest in the world. Find the main tank, press your hand to the glass, and count to five.',
 'culture', 'easy', 130, 130, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&h=600&fit=crop',
 now(),
 'Press your hand flat on the tank glass and count to five',
 'explore', 'camera', null,
 'Put my hand on the Frost Science aquarium glass and the fish looked back at me 🐟 #SideQuests #FrostScience #Miami',
 '2 min'),

-- 13. Vizcaya
('de000000-0000-0000-0000-000000000013',
 'da000000-0000-0000-0000-000000000012',
 'db000000-0000-0000-0000-000000000013',
 'Vizcaya: Salute the Stone Barge',
 'Built in 1916, Vizcaya''s stone barge juts into Biscayne Bay like a frozen ship. Pay your respects before you photograph it.',
 'culture', 'easy', 130, 130, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&h=600&fit=crop',
 now(),
 'Salute the stone barge before you photograph it',
 'explore', 'camera', null,
 'Saluted the stone barge at Vizcaya like the sea captain I was born to be ⛵ #SideQuests #Vizcaya #Miami',
 '3 min'),

-- 14. Bass Museum
('de000000-0000-0000-0000-000000000014',
 'da000000-0000-0000-0000-000000000013',
 'db000000-0000-0000-0000-000000000014',
 'Bass Museum: Provocation Hunt',
 'The Bass on Collins Ave has been challenging Miami Beach since 1964. Find the piece that makes you react — then react. Gasp audibly.',
 'culture', 'medium', 130, 130, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=600&fit=crop',
 now(),
 'Gasp audibly when you find the most provocative piece',
 'explore', 'manual', null,
 'Gasped audibly at the Bass Museum and I have zero regrets 😮 #SideQuests #BassMuseum #MiamiBeach',
 '15 min'),

-- 15. Brickell Key
('de000000-0000-0000-0000-000000000015',
 'da000000-0000-0000-0000-000000000014',
 'db000000-0000-0000-0000-000000000015',
 'Brickell Key: The Skyline Claim',
 'Brickell Key is a man-made island with unobstructed views of one of the fastest-growing skylines in America. Walk to the waterfront and claim it.',
 'outdoors', 'easy', 115, 115, 'active', 'qr', null,
 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop',
 now(),
 'Point dramatically at the Miami skyline and say ''that''s mine''',
 'explore', 'camera', null,
 'Pointed at the Miami skyline and said ''that''s mine'' with full conviction 🏙️ #SideQuests #BrickellKey #Miami',
 '2 min')

on conflict (id) do update set
  title               = excluded.title,
  description         = excluded.description,
  category            = excluded.category,
  difficulty          = excluded.difficulty,
  xp_reward           = excluded.xp_reward,
  points_reward       = excluded.points_reward,
  status              = excluded.status,
  verification_type   = excluded.verification_type,
  verification_secret = excluded.verification_secret,
  image_url           = excluded.image_url,
  funky_action        = excluded.funky_action,
  action_type         = excluded.action_type,
  proof_method        = excluded.proof_method,
  staff_phrase        = excluded.staff_phrase,
  social_share_prompt = excluded.social_share_prompt,
  estimated_time      = excluded.estimated_time;

-- ---------------------------------------------------------------------------
-- QR codes  (one per quest that uses QR verification)
-- ---------------------------------------------------------------------------
insert into public.qr_codes (quest_id, venue_id, partner_id, code, destination_url, status) values
  ('de000000-0000-0000-0000-000000000001', 'db000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'WYNWOOD-WALLS',   '/q/de000000-0000-0000-0000-000000000001', 'active'),
  ('de000000-0000-0000-0000-000000000004', 'db000000-0000-0000-0000-000000000004', 'da000000-0000-0000-0000-000000000004', 'COYO-SPICE',      '/q/de000000-0000-0000-0000-000000000004', 'active'),
  ('de000000-0000-0000-0000-000000000005', 'db000000-0000-0000-0000-000000000005', 'da000000-0000-0000-0000-000000000005', 'BOXELDER-TAP',    '/q/de000000-0000-0000-0000-000000000005', 'active'),
  ('de000000-0000-0000-0000-000000000006', 'db000000-0000-0000-0000-000000000006', 'da000000-0000-0000-0000-000000000006', 'GRAMPS-FREQ',     '/q/de000000-0000-0000-0000-000000000006', 'active'),
  ('de000000-0000-0000-0000-000000000007', 'db000000-0000-0000-0000-000000000007', 'da000000-0000-0000-0000-000000000007', 'WOOD-TERROIR',    '/q/de000000-0000-0000-0000-000000000007', 'active'),
  ('de000000-0000-0000-0000-000000000010', 'db000000-0000-0000-0000-000000000010', 'da000000-0000-0000-0000-000000000009', 'ARTDECO-SIZE',    '/q/de000000-0000-0000-0000-000000000010', 'active'),
  ('de000000-0000-0000-0000-000000000011', 'db000000-0000-0000-0000-000000000011', 'da000000-0000-0000-0000-000000000010', 'PAMM-60SEC',      '/q/de000000-0000-0000-0000-000000000011', 'active'),
  ('de000000-0000-0000-0000-000000000012', 'db000000-0000-0000-0000-000000000012', 'da000000-0000-0000-0000-000000000011', 'FROST-PORTAL',    '/q/de000000-0000-0000-0000-000000000012', 'active'),
  ('de000000-0000-0000-0000-000000000013', 'db000000-0000-0000-0000-000000000013', 'da000000-0000-0000-0000-000000000012', 'VIZCAYA-BARGE',   '/q/de000000-0000-0000-0000-000000000013', 'active'),
  ('de000000-0000-0000-0000-000000000014', 'db000000-0000-0000-0000-000000000014', 'da000000-0000-0000-0000-000000000013', 'BASS-GASP',       '/q/de000000-0000-0000-0000-000000000014', 'active'),
  ('de000000-0000-0000-0000-000000000015', 'db000000-0000-0000-0000-000000000015', 'da000000-0000-0000-0000-000000000014', 'BRICKELL-CLAIM',  '/q/de000000-0000-0000-0000-000000000015', 'active')
on conflict (code) do nothing;
