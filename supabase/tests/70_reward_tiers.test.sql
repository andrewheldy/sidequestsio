-- 0026: Legendary difficulty exists; only Hard quests on the old 400/200 tier
-- move to 300/150; earned rewards are untouched.
\ir _helpers.sql
select pg_temp.ok(
  enum_range(null::public.difficulty)::text = '{easy,medium,hard,legendary}',
  'difficulty enum is easy|medium|hard|legendary');

do $$
declare p uuid; v uuid; u uuid;
begin
  p := pg_temp.mk_partner('Tier Partner');
  v := pg_temp.mk_venue(p, 'Tier Venue', 25.80, -80.20);
  u := pg_temp.mk_user('tiers@example.com');
  insert into public.quests (id, partner_id, venue_id, title, difficulty, xp_reward, points_reward, status) values
    ('70000000-0000-0000-0000-000000000001', p, v, 'Old-tier hard', 'hard', 400, 200, 'active'),
    ('70000000-0000-0000-0000-000000000002', p, v, 'Hand-tuned hard', 'hard', 350, 175, 'active'),
    ('70000000-0000-0000-0000-000000000003', p, v, 'Medium at 400', 'medium', 400, 200, 'active'),
    ('70000000-0000-0000-0000-000000000004', p, v, 'Festival', 'legendary', 500, 300, 'active');
  -- An earned reward on the old tier must not change.
  insert into public.points_ledger (user_id, transaction_type, source, points_amount, xp_amount, quest_id, partner_id)
  values (u, 'earn', 'quest_completion', 200, 400, '70000000-0000-0000-0000-000000000001', p);
end $$;

set client_min_messages = warning;
\ir ../migrations/0026_legendary_difficulty.sql
\ir ../migrations/0026_legendary_difficulty.sql
set client_min_messages = notice;

select pg_temp.ok((select (xp_reward, points_reward) = (300, 150) from public.quests where id = '70000000-0000-0000-0000-000000000001'),
  'old-tier Hard quest moves to 300 XP / 150 Points');
select pg_temp.ok((select (xp_reward, points_reward) = (350, 175) from public.quests where id = '70000000-0000-0000-0000-000000000002'),
  'hand-tuned Hard quest is left alone');
select pg_temp.ok((select (xp_reward, points_reward) = (400, 200) from public.quests where id = '70000000-0000-0000-0000-000000000003'),
  'non-Hard quest is left alone');
select pg_temp.ok((select (xp_reward, points_reward) = (500, 300) from public.quests where id = '70000000-0000-0000-0000-000000000004'),
  'Legendary quest stores 500 XP / 300 Points');
select pg_temp.ok((select (xp_amount, points_amount) = (400, 200) from public.points_ledger where quest_id = '70000000-0000-0000-0000-000000000001'),
  'already-earned ledger rewards are unchanged');
