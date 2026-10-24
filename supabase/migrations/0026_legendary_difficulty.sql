-- 0026_legendary_difficulty.sql — Legendary difficulty; Hard tier 300 XP / 150 Points
--
-- WHY: product-owner decision 2026-10-24 (docs/product/PRODUCT_DECISION_LOG.md,
-- "Reward tiers"). Tiers are now Easy 50/25, Medium 150/75, Hard 300/150 and
-- Legendary 500/300 (XP / Points). The `difficulty` enum had no 'legendary'.
--
-- What changes
--   1. difficulty += 'legendary' (reserved for special activations; curated only).
--   2. Hard quests still on the exact old default tier (400 XP / 200 Points)
--      move to 300 / 150. Quests with any other hand-set reward are left alone,
--      and nothing already earned changes: completions and points_ledger rows
--      keep the rewards they were awarded with. Quest frameworks/instances keep
--      their own overrides.
--
-- Rewards stay per-quest data (quests.xp_reward / points_reward); there is no
-- reward calculator. complete_quest() reads them at completion time.
--
-- Idempotent and non-destructive. ALTER TYPE ... ADD VALUE runs outside an
-- explicit transaction, and the new value is not used in this file, so it is
-- safe on Postgres 12+ in one run. Run in the SQL editor / CLI after a backup.

alter type public.difficulty add value if not exists 'legendary';

update public.quests
   set xp_reward = 300,
       points_reward = 150
 where difficulty = 'hard'
   and xp_reward = 400
   and points_reward = 200;

-- Verification (run after applying):
--   select enum_range(null::public.difficulty);          -- {easy,medium,hard,legendary}
--   select id, title, xp_reward, points_reward from public.quests
--    where difficulty = 'hard' and (xp_reward, points_reward) <> (300, 150);
--   -- any rows are deliberately hand-tuned; review them with curators.
--
-- Rollback: enum values cannot be dropped in place. Leave 'legendary' unused
-- (no quest may reference it), and restore any changed Hard rewards from the
-- backup: update public.quests set xp_reward = 400, points_reward = 200 where id in (...);
