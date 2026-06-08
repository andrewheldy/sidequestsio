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
-- Partners (7)
-- ---------------------------------------------------------------------------
insert into public.partners (id, name, type, contact_email, status, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'Wynwood Collective',          'venue', 'hello@wynwoodcollective.com',       'active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000002', 'South Beach Experience',       'venue', 'info@southbeachexperience.com',     'active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000003', 'Little Havana Cultural Hub',   'venue', 'hola@littlehavanacultural.com',     'active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000004', 'Brickell City Partners',       'venue', 'contact@brickellcitypartners.com',  'active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000005', 'Coconut Grove Adventures',     'venue', 'explore@coconutgroveadventures.com','active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000006', 'Miami Design District',        'venue', 'arts@miamidesigndistrict.com',      'active', '2024-01-15T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000007', 'Downtown Miami Alliance',      'venue', 'info@downtownmiamialliance.com',    'active', '2024-01-15T10:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Venues (9)
-- ---------------------------------------------------------------------------
insert into public.venues (id, partner_id, name, address, city, latitude, longitude, status) values
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Wynwood Coffee Quarter',        '2600 NW 2nd Ave, Miami, FL 33127',         'Miami',       25.8002, -80.1986, 'active'),
  ('20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'South Beach Boardwalk',         'Ocean Dr & 8th St, Miami Beach, FL 33139', 'Miami Beach', 25.7854, -80.1303, 'active'),
  ('20000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   'Wynwood Walls',                 '2520 NW 2nd Ave, Miami, FL 33127',         'Miami',       25.8058, -80.1997, 'active'),
  ('20000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   'Calle Ocho Cultural Center',    '1637 SW 8th St, Miami, FL 33135',          'Miami',       25.7679, -80.2268, 'active'),
  ('20000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   'Brickell City Centre',          '701 S Miami Ave, Miami, FL 33131',         'Miami',       25.7616, -80.1927, 'active'),
  ('20000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   'Coconut Grove Waterfront Park', '2901 S Bayshore Dr, Miami, FL 33133',      'Miami',       25.7283, -80.2381, 'active'),
  ('20000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   'Institute of Contemporary Art', '61 NE 41st St, Miami, FL 33137',           'Miami',       25.8149, -80.1866, 'active'),
  ('20000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   'Bayside Marketplace',           '401 Biscayne Blvd, Miami, FL 33132',       'Miami',       25.7745, -80.1903, 'active'),
  ('20000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   'Sweet Caroline Karaoke Bar',    '2541 NW 2nd Ave, Miami, FL 33127',         'Miami',       25.8025, -80.1998, 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quests (9)
-- ---------------------------------------------------------------------------
insert into public.quests (
  id, partner_id, venue_id, title, description,
  category, difficulty, xp_reward, points_reward,
  status, verification_type, image_url, created_at
) values
  -- 1. Wynwood Coffee Crawl
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'Hidden Wynwood Coffee Crawl',
   'Discover the secret specialty coffee shops tucked between Wynwood''s famous murals and galleries. Hit three hidden gem cafes, each with their own unique roast and vibe. Complete the crawl and unlock a free specialty coffee reward at the final stop.',
   'hidden_gem', 'easy', 100, 50, 'active', 'qr',
   'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 2. South Beach Sunrise
  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'South Beach Sunrise Reset',
   'Start your day with a transformative sunrise walk along South Beach''s iconic boardwalk. Take in the golden light hitting Art Deco buildings and the calm Atlantic, then reward your body with a complimentary smoothie at the finishing café. The perfect way to reset your mind and fuel your Miami adventure.',
   'fitness', 'easy', 110, 55, 'active', 'qr',
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 3. Wynwood Mural Hunt
  ('30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000003',
   'Wynwood Walls Mural Hunt',
   'Embark on a self-guided tour through the world-famous Wynwood Walls, seeking out eight hidden details within the massive murals painted by international artists. Use the clues to find each detail and learn the story behind each piece. Finish the hunt to claim your exclusive gallery print.',
   'culture', 'medium', 130, 65, 'active', 'qr',
   'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 4. Little Havana Cafecito Trail
  ('30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000004',
   'Little Havana Cafecito Trail',
   'Walk the legendary Calle Ocho, stopping at three iconic Cuban bakeries to sample the region''s best cafecito and pastelito. Learn about the neighborhood''s rich cultural heritage from local guides stationed at each stop. Complete the trail and take home a free pastelito to remember the flavors of Little Havana.',
   'food', 'easy', 120, 60, 'active', 'qr',
   'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 5. Brickell Skyline Night Walk
  ('30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000005',
   'Brickell Skyline Night Walk',
   'Experience Miami''s glittering financial district after dark on this curated nighttime walking loop past rooftop bars and illuminated skyscrapers. Navigate from the Miami River to Brickell Key, taking in some of the city''s most spectacular skyline views. Flash the QR at the final checkpoint to get your skip-the-line pass for one of Brickell''s hottest nightlife spots.',
   'nightlife', 'medium', 150, 75, 'active', 'qr',
   'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 6. Coconut Grove Bayfront Loop
  ('30000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000006',
   'Coconut Grove Bayfront Loop',
   'Explore the lush bayside parks and tree-lined streets of one of Miami''s most charming historic neighborhoods. This scenic loop takes you along Biscayne Bay, through Peacock Park, and past the village''s bohemian boutiques and waterside cafes. Complete the loop and redeem one free hour at the local bike rental shop.',
   'outdoors', 'easy', 110, 55, 'active', 'qr',
   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 7. Design District Gallery Walk
  ('30000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000007',
   'Design District Gallery Walk',
   'Immerse yourself in Miami''s premier arts and fashion destination with a guided gallery walk through the Design District''s most innovative spaces. Discover cutting-edge contemporary art alongside luxury flagships and public art installations that make this neighborhood a world-class cultural destination. Finish at ICA Miami for a designer discount at participating boutiques.',
   'art', 'medium', 140, 70, 'active', 'qr',
   'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 8. Downtown Local Legends
  ('30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000008',
   'Downtown Local Legends Quest',
   'Uncover the stories of Miami''s most iconic downtown landmarks and the legendary figures who shaped this city by the bay. From the historic Freedom Tower to the bustling Bayside waterfront, this quest connects you with the soul of Miami''s civic identity. Complete the quest to earn your Community Explorer badge.',
   'culture', 'easy', 90, 45, 'active', 'qr',
   'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
   '2024-01-20T10:00:00Z'),
  -- 9. Sweet Caroline Karaoke Night
  ('30000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000009',
   'Sweet Caroline Karaoke Night',
   'Hit the stage at Sweet Caroline, Wynwood''s beloved karaoke bar where legends are made and friendships are forged over classic anthems. Sign up for a slot, belt out your go-to banger, and soak up the electrifying energy of Miami''s most enthusiastic karaoke crowd. Finish the night strong and claim your free round of drinks on the house.',
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
-- Rewards (one per partner, 10 total)
-- ---------------------------------------------------------------------------
insert into public.rewards (id, partner_id, title, description, points_cost, inventory, status) values
  -- Wynwood Collective
  ('50000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Exclusive Wynwood Art Print',
   'A signed, limited-edition print from a Wynwood Walls featured artist.',
   1500, 20, 'active'),
  ('50000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   'Free Round at Sweet Caroline',
   'One complimentary round of drinks at Sweet Caroline Karaoke Bar.',
   700, 50, 'active'),
  -- South Beach Experience
  ('50000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002',
   'Complimentary Smoothie',
   'Redeem for one free house smoothie at the South Beach boardwalk café.',
   300, 100, 'active'),
  -- Little Havana Cultural Hub
  ('50000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   'Free Pastelito Bundle',
   'Take home a box of fresh pastelitos from the trail''s final bakery stop.',
   400, 75, 'active'),
  -- Brickell City Partners
  ('50000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004',
   'Skip-the-Line Nightlife Pass',
   'Priority entry at one of Brickell''s featured rooftop venues.',
   800, 30, 'active'),
  -- Coconut Grove Adventures
  ('50000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000005',
   '1 Hour Free Bike Rental',
   'Redeem for one complimentary hour at the Grove bike rental shop.',
   500, 40, 'active'),
  -- Miami Design District
  ('50000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000006',
   'Designer Boutique Discount',
   '15% off at participating Miami Design District boutiques.',
   1200, null, 'active'),
  ('50000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000006',
   'ICA Miami Members-Day Pass',
   'Complimentary entry to ICA Miami during members-only preview hours.',
   2000, 15, 'active'),
  -- Downtown Miami Alliance
  ('50000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000007',
   'Community Explorer Badge Pack',
   'Collectible enamel pin set celebrating Downtown Miami''s landmark history.',
   600, 60, 'active'),
  ('50000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000007',
   'Bayside Sunset Cruise Ticket',
   'One ticket to the Bayside Marketplace sunset bay cruise.',
   1800, 25, 'active')
on conflict (id) do nothing;
