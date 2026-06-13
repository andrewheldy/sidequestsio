-- ============================================================================
-- SideQuests.io — PRE-PR#3 BACKUP VERIFICATION  (READ-ONLY)
-- ============================================================================
-- PURPOSE
--   Produce a fingerprint (row count + content checksum) of every backed-up
--   table so you can prove:
--     (1) the CSV/dump you captured matches the live DB at backup time, and
--     (2) after any future RESTORE, the DB matches the fingerprint exactly.
--
-- SAFETY CONTRACT
--   * READ-ONLY. SELECT statements only. No \copy, no writes, no catalog
--     mutations. Running this changes NOTHING.
--
-- HOW TO USE
--   1. Run SECTION 1 (the combined fingerprint) and save the result alongside
--      your exports. Paste it into PRE_PR3_BACKUP_PROCEDURE.md → "Fingerprint".
--   2. Compare each row_count to the row count of the matching CSV
--      (CSV data rows = lines minus 1 header).
--   3. After a restore (now or in the future), re-run SECTION 1 against the
--      restored DB; every (table, row_count, content_md5) must match.
--
-- NOTE ON CHECKSUM STABILITY
--   content_md5 = md5 over per-row md5(row::text), aggregated in PRIMARY-KEY
--   order, so it is deterministic and order-independent of query plan. It WILL
--   change if any column value changes — that is the point. timestamptz columns
--   render deterministically; this is stable across a dump/restore of the same
--   data. (If a future schema migration adds/removes columns, the checksum
--   legitimately changes — fingerprint BEFORE and AFTER the same schema state.)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SECTION 1 — COMBINED FINGERPRINT (one result set; save this)
-- If any line errors because a table is unexpectedly absent, delete that line
-- and note it in the procedure doc.
-- ----------------------------------------------------------------------------
select 'auth.users'                  as table_name, count(*) as row_count,
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), '')) as content_md5
from auth.users t
union all
select 'public.users', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.users t
union all
select 'public.partners', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.partners t
union all
select 'public.venues', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.venues t
union all
select 'public.quests', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.quests t
union all
select 'public.qr_codes', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.qr_codes t
union all
select 'public.user_profiles', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.user_id), ''))
from public.user_profiles t
union all
select 'public.privacy_preferences', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.user_id), ''))
from public.privacy_preferences t
union all
select 'public.profiles', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.user_id), ''))
from public.profiles t
union all
select 'public.rewards', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.rewards t
union all
select 'public.scan_events', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.scan_events t
union all
select 'public.quest_completions', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.quest_completions t
union all
select 'public.points_ledger', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.points_ledger t
union all
select 'public.reward_redemptions', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.reward_redemptions t
union all
select 'public.community_notes', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.community_notes t
union all
select 'public.note_reports', count(*),
       md5(coalesce(string_agg(md5(t.*::text), '' order by t.id), ''))
from public.note_reports t
order by table_name;


-- ----------------------------------------------------------------------------
-- SECTION 2 — PER-TABLE FALLBACK (run individually if SECTION 1 errors out)
-- ----------------------------------------------------------------------------
-- select count(*) from auth.users;
-- select count(*) from public.users;
-- select count(*) from public.partners;
-- select count(*) from public.venues;
-- select count(*) from public.quests;
-- select count(*) from public.qr_codes;
-- select count(*) from public.user_profiles;
-- select count(*) from public.privacy_preferences;
-- select count(*) from public.profiles;
-- select count(*) from public.rewards;
-- select count(*) from public.scan_events;
-- select count(*) from public.quest_completions;
-- select count(*) from public.points_ledger;
-- select count(*) from public.reward_redemptions;
-- select count(*) from public.community_notes;
-- select count(*) from public.note_reports;


-- ----------------------------------------------------------------------------
-- SECTION 3 — REFERENTIAL SANITY (read-only; should all be 0)
-- Confirms the backup captures a self-consistent identity graph. Mirrors the
-- Reality Report §10 orphan checks; expected per the completed report:
--   auth_without_profiles = 1 (the rentwithheldy gap), everything else = 0.
-- ----------------------------------------------------------------------------
select
  (select count(*) from auth.users au
     left join public.users u on u.id = au.id where u.id is null)                as auth_without_users,
  (select count(*) from auth.users au
     left join public.user_profiles up on up.user_id = au.id where up.user_id is null) as auth_without_user_profiles,
  (select count(*) from auth.users au
     left join public.profiles p on p.user_id = au.id where p.user_id is null)   as auth_without_profiles,
  (select count(*) from public.user_profiles up
     left join public.users u on u.id = up.user_id where u.id is null)           as user_profiles_without_users,
  (select count(*) from public.points_ledger l
     left join public.users u on u.id = l.user_id where u.id is null)            as ledger_without_users,
  (select count(*) from public.quest_completions qc
     left join public.users u on u.id = qc.user_id where u.id is null)           as completions_without_users;

-- ============================================================================
-- END — READ-ONLY VERIFICATION
-- ============================================================================
