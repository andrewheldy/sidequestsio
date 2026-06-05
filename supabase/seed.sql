-- ===========================================================================
-- SideQuests.io — Seed catalog data (Phase 15 test data)
-- ===========================================================================
-- Catalog rows (partners/venues/quests/qr/rewards) have no auth dependency and
-- can be seeded directly. User-scoped data (completions, notes, ledger) is
-- created naturally once real auth users exist, or via the in-browser
-- LocalRepository seed (src/lib/db/local/seed.ts).
-- ===========================================================================

insert into partners (id, name, type, contact_email, status) values
  ('11111111-1111-1111-1111-111111111111', 'Wynwood Arts District', 'venue', 'partner@wynwood.example', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Vice City Coffee Co.', 'brand', 'hello@vicecity.example', 'active')
on conflict (id) do nothing;

insert into venues (id, partner_id, name, address, city, latitude, longitude, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Wynwood Walls', '2516 NW 2nd Ave', 'Miami, FL', 25.8011, -80.1994, 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Vice City Beans', '120 Collins Ave', 'Miami, FL', 25.7825, -80.1303, 'active'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'South Pointe Park', '1 Washington Ave', 'Miami, FL', 25.7617, -80.1308, 'active')
on conflict (id) do nothing;

insert into quests (id, partner_id, venue_id, title, description, category, difficulty, xp_reward, points_reward, status, verification_type, verification_secret, image_url) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Wynwood Walls', 'Explore iconic street art & leave your mark.', 'art', 'easy', 50, 100, 'active', 'qr', null,
   'https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=800&h=600&fit=crop'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000002',
   'Vice City Beans', 'Find the secret menu item and check in.', 'food', 'medium', 40, 80, 'active', 'venue_code', 'SUNRISE',
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'Sunset Chase', 'Catch the sunset and leave a Community Note.', 'outdoors', 'easy', 60, 120, 'active', 'gps', null,
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop')
on conflict (id) do nothing;

insert into qr_codes (quest_id, venue_id, partner_id, code, destination_url, status) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'WYNWOOD1', '/q/bbbbbbbb-0000-0000-0000-000000000001', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'BEANS1', '/q/bbbbbbbb-0000-0000-0000-000000000002', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'SUNSET1', '/q/bbbbbbbb-0000-0000-0000-000000000003', 'active')
on conflict (code) do nothing;

insert into rewards (partner_id, title, description, points_cost, inventory, status) values
  ('22222222-2222-2222-2222-222222222222', 'Free Cold Brew', 'Redeem for one free cold brew at Vice City Beans.', 500, 50, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Limited Art Print', 'A signed Wynwood Walls art print.', 1500, 10, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'VIP Gallery Tour', 'Skip-the-line guided gallery tour.', 2500, 5, 'active')
on conflict do nothing;
