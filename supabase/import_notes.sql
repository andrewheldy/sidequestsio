-- =============================================================================
-- SideQuests.io — Community notes import (run AFTER real users exist)
-- =============================================================================
-- The 11 notes in src/data/mock/community-notes.json reference demo-user-*
-- placeholder IDs that have no real auth.users counterpart.
--
-- BEFORE running this script:
--   1. Sign up the demo user accounts in your Supabase project.
--   2. Find each user's UUID in auth.users (Dashboard → Authentication → Users).
--   3. Replace the PLACEHOLDER_* values below with the real UUIDs.
--   4. Each user must also have a row in public.users — the sign-up trigger
--      creates it automatically if you use Supabase Auth.
--   5. Each user must have a quest_completion row for the relevant quest before
--      community_notes.user_id can be set (FK requires completion via RPC or
--      direct insert if bypassing RLS for seeding).
--
-- To seed completions for a demo user (run as service-role / superuser):
-- =============================================================================

-- Step 1 — Replace these with real UUIDs from auth.users
\set DEMO_USER_1   'PLACEHOLDER_UUID_1'
\set DEMO_USER_2   'PLACEHOLDER_UUID_2'
\set DEMO_USER_3   'PLACEHOLDER_UUID_3'
\set DEMO_USER_4   'PLACEHOLDER_UUID_4'
\set DEMO_USER_5   'PLACEHOLDER_UUID_5'
\set DEMO_USER_6   'PLACEHOLDER_UUID_6'

-- Step 2 — Seed required quest_completions (service-role only)
-- Users must have completed the quest before they can post a note.
-- Adjust xp_awarded / points_awarded to match the quest's actual reward values.
insert into public.quest_completions
  (user_id, quest_id, venue_id, partner_id, xp_awarded, points_awarded)
values
  (:'DEMO_USER_1', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 100, 50),
  (:'DEMO_USER_2', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 100, 50),
  (:'DEMO_USER_3', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 100, 50),
  (:'DEMO_USER_4', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 110, 55),
  (:'DEMO_USER_1', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 110, 55),
  (:'DEMO_USER_5', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 130, 65),
  (:'DEMO_USER_2', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 130, 65),
  (:'DEMO_USER_3', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 120, 60),
  (:'DEMO_USER_6', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 120, 60),
  (:'DEMO_USER_4', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 150, 75),
  (:'DEMO_USER_5', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 150, 75)
on conflict (user_id, quest_id) do nothing;

-- Step 3 — Import community notes
insert into public.community_notes
  (id, user_id, quest_id, venue_id, content, moderation_status, created_at)
values
  ('60000000-0000-0000-0000-000000000001',
   :'DEMO_USER_1',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'Go early on weekdays — the hidden back patio at the third stop is only open before noon and it''s totally worth it.',
   'approved', '2024-02-03T09:15:00Z'),
  ('60000000-0000-0000-0000-000000000002',
   :'DEMO_USER_2',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'The second stop has a secret menu — ask for the ''Wynwood Cold Brew'' and they''ll hook you up. It''s not on the board.',
   'approved', '2024-02-10T14:30:00Z'),
  ('60000000-0000-0000-0000-000000000003',
   :'DEMO_USER_3',
   '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'Bring cash for the first stop — they''re card-only at the last spot but cash gets you a free pastry at stop one!',
   'approved', '2024-02-18T11:00:00Z'),
  ('60000000-0000-0000-0000-000000000004',
   :'DEMO_USER_4',
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'Start at 6:30am for the best light — the Art Deco buildings glow orange and pink and it''s completely empty. Pure magic.',
   'approved', '2024-02-07T06:45:00Z'),
  ('60000000-0000-0000-0000-000000000005',
   :'DEMO_USER_1',
   '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'The smoothie spot opens at 7am sharp. I made the mistake of arriving before they opened — show up at 7:15 to avoid the wait.',
   'approved', '2024-02-14T07:30:00Z'),
  ('60000000-0000-0000-0000-000000000006',
   :'DEMO_USER_5',
   '30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000003',
   'The eight details are trickier than they look — hint: look low near the base of the murals. Most people scan from the top.',
   'approved', '2024-02-12T15:20:00Z'),
  ('60000000-0000-0000-0000-000000000007',
   :'DEMO_USER_2',
   '30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000003',
   'Weekday afternoons are perfect — weekends get packed and it''s hard to study the murals with crowds. Wednesday around 3pm is the sweet spot.',
   'approved', '2024-02-20T16:00:00Z'),
  ('60000000-0000-0000-0000-000000000008',
   :'DEMO_USER_3',
   '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000004',
   'Order your cafecito with a pastelito de guayaba at the second stop. The combination is unreal and the local guide there tells the best stories.',
   'approved', '2024-03-01T10:30:00Z'),
  ('60000000-0000-0000-0000-000000000009',
   :'DEMO_USER_6',
   '30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000004',
   'The domino park is right near the trail — stop in and watch the old timers play. It''s an iconic Calle Ocho experience you won''t want to miss.',
   'approved', '2024-03-08T11:45:00Z'),
  ('60000000-0000-0000-0000-000000000010',
   :'DEMO_USER_4',
   '30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000005',
   'The bridge over the Miami River at night is the best photo spot on the loop. Stop there for 10 minutes and soak in the skyline reflections.',
   'approved', '2024-03-05T21:00:00Z'),
  ('60000000-0000-0000-0000-000000000011',
   :'DEMO_USER_5',
   '30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000005',
   'Wear comfortable shoes — the loop is longer than it looks on paper and some sidewalks in Brickell Key have uneven pavement.',
   'approved', '2024-03-12T22:15:00Z')
on conflict (id) do nothing;
