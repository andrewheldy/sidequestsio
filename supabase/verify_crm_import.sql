-- =============================================================================
-- SideQuests.io — CRM Import Verification Queries
-- =============================================================================
-- Run these after executing the CRM import (--import or --sql mode) to confirm
-- data landed correctly.  All queries are read-only and safe to run repeatedly.
-- =============================================================================

-- ── 1. Row counts per table ───────────────────────────────────────────────────
-- Expected after a fresh CRM import (on top of seed_full.sql):
--   partners   : 157  (7 from seed + 150 CRM)
--   venues     : 159  (9 from seed + 150 CRM)
--   quests     : 159  (9 from seed + 150 CRM)
--   qr_codes   : 159  (9 from seed + 150 CRM)
--   rewards    : 160  (10 from seed + 150 CRM)

SELECT 'partners'   AS tbl, count(*) FROM public.partners   UNION ALL
SELECT 'venues'     AS tbl, count(*) FROM public.venues     UNION ALL
SELECT 'quests'     AS tbl, count(*) FROM public.quests     UNION ALL
SELECT 'qr_codes'   AS tbl, count(*) FROM public.qr_codes   UNION ALL
SELECT 'rewards'    AS tbl, count(*) FROM public.rewards
ORDER BY tbl;


-- ── 2. CRM partner spot-check (first 5 businesses) ───────────────────────────
-- Business names, UUIDs, coordinates.  Verify against miamiQuestLocations.geocoded.json.

SELECT
  p.id,
  p.name,
  v.latitude,
  v.longitude,
  v.address,
  v.city
FROM public.partners p
JOIN public.venues  v ON v.partner_id = p.id
WHERE p.id BETWEEN '70000000-0000-0000-0000-000000000001'
              AND '70000000-0000-0000-0000-000000000005'
ORDER BY p.id;


-- ── 3. Category distribution for CRM quests ──────────────────────────────────
-- Should match the --dry-run output:
--   culture    63 | food  46 | nightlife  14 | outdoors  14
--   hidden_gem 12 | fitness  1

SELECT category, count(*) AS n
FROM public.quests
WHERE id BETWEEN '90000000-0000-0000-0000-000000000001'
             AND '90000000-0000-0000-0000-000000000150'
GROUP BY category
ORDER BY n DESC;


-- ── 4. QR code uniqueness check ───────────────────────────────────────────────
-- Expect 0 rows (no duplicates within the CRM batch).

SELECT code, count(*) AS n
FROM public.qr_codes
WHERE id BETWEEN 'a0000000-0000-0000-0000-000000000001'
             AND 'a0000000-0000-0000-0000-000000000150'
GROUP BY code
HAVING count(*) > 1;


-- ── 5. Foreign-key integrity — every CRM quest links to its venue and partner ─
-- Expect 0 rows (no orphaned quests).

SELECT q.id, q.title
FROM public.quests q
LEFT JOIN public.venues   v ON v.id = q.venue_id
LEFT JOIN public.partners p ON p.id = q.partner_id
WHERE q.id BETWEEN '90000000-0000-0000-0000-000000000001'
               AND '90000000-0000-0000-0000-000000000150'
  AND (v.id IS NULL OR p.id IS NULL);


-- ── 6. Spot-check 5 specific businesses ──────────────────────────────────────
-- Panther Coffee (#1), Wynwood Brewing (#1 nightlife), Vizcaya (#1 culture),
-- Bayfront Park (#1 outdoor), The Salty Donut (#1 food)

SELECT p.name, q.title, q.category, q.xp_reward, v.latitude, v.longitude
FROM public.partners p
JOIN public.venues  v ON v.partner_id = p.id
JOIN public.quests  q ON q.venue_id   = v.id
WHERE p.id IN (
  '70000000-0000-0000-0000-000000000001',  -- Panther Coffee (#1)
  '70000000-0000-0000-0000-000000000003',  -- The Salty Donut (#3)
  '70000000-0000-0000-0000-000000000005'   -- 5th record
)
ORDER BY p.id;


-- ── 7. Address quality summary ────────────────────────────────────────────────
-- 38 venues should have a real street address; 112 will have NULL address.

SELECT
  sum(CASE WHEN address IS NOT NULL THEN 1 ELSE 0 END) AS with_address,
  sum(CASE WHEN address IS     NULL THEN 1 ELSE 0 END) AS address_null
FROM public.venues
WHERE id BETWEEN '80000000-0000-0000-0000-000000000001'
             AND '80000000-0000-0000-0000-000000000150';


-- ── 8. Reward count and point costs ──────────────────────────────────────────

SELECT min(points_cost), max(points_cost), avg(points_cost)::int AS avg_cost
FROM public.rewards
WHERE id BETWEEN 'b0000000-0000-0000-0000-000000000001'
             AND 'b0000000-0000-0000-0000-000000000150';


-- ── 9. Idempotency check — re-running import must not change counts ───────────
-- Note the counts from query 1 before re-running the import, then run query 1
-- again.  The numbers must be identical (ON CONFLICT DO NOTHING protects you).


-- ── 10. Full data sample for manual review ────────────────────────────────────
-- Returns the first 10 CRM rows with all linked entities in a single view.

SELECT
  row_number() OVER (ORDER BY p.id) AS "#",
  p.name                            AS business,
  v.address,
  v.city,
  v.latitude::numeric(8,4)          AS lat,
  v.longitude::numeric(8,4)         AS lng,
  q.title                           AS quest,
  q.category,
  q.xp_reward,
  qr.code                           AS qr_code,
  r.title                           AS reward
FROM public.partners   p
JOIN public.venues     v  ON v.partner_id  = p.id
JOIN public.quests     q  ON q.venue_id    = v.id
JOIN public.qr_codes   qr ON qr.quest_id   = q.id
JOIN public.rewards    r  ON r.partner_id  = p.id
WHERE p.id BETWEEN '70000000-0000-0000-0000-000000000001'
               AND '70000000-0000-0000-0000-000000000010'
ORDER BY p.id;
