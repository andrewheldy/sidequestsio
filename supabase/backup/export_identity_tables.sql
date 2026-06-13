-- ============================================================================
-- SideQuests.io — PRE-PR#3 BACKUP EXPORT  (READ-ONLY)
-- ============================================================================
-- PURPOSE
--   Produce a complete, restorable logical copy of every identity- and
--   gameplay-critical table BEFORE any write-bearing migration (PR #2/#3/#4).
--   This exists because the project is on Supabase Free with NO scheduled
--   backups and NO PITR (Reality Report §16c → Stop condition S6).
--
-- SAFETY CONTRACT (do not violate)
--   * READ-ONLY. Every executable statement is a SELECT.
--   * NO create / alter / drop / insert / update / delete / truncate / grant /
--     revoke. Running this file changes NOTHING in the database.
--   * The only "writes" are CLIENT-SIDE files you download (CSV) — never to the
--     database or the server filesystem.
--
-- TWO WAYS TO USE THIS FILE (pick one; the procedure doc explains both)
--   A) psql + \copy  (RECOMMENDED — one command per table, writes a local CSV).
--      The \copy lines below are COMMENTED so this file stays pure-SELECT and
--      safe to paste into the web SQL Editor. To use them, run from a terminal:
--          psql "<your-connection-string>" -f export_identity_tables.sql
--      after UN-commenting the \copy block. \copy is a psql client meta-command;
--      it READS from the DB and WRITES the CSV on your machine (read-only on DB).
--
--   B) Supabase SQL Editor: run each `SELECT *` below ONE AT A TIME and click
--      "Download CSV" for each result. (The editor shows only the last result
--      when you run the whole file, so run section by section.)
--
-- COVERAGE: the 15 requested tables + auth.users (the identity root). Order is
--   PARENT-FIRST (safe for re-import; see RESTORE_PROCEDURE.md).
--
-- ⚠ SENSITIVE DATA: auth.users contains hashed passwords / tokens, and
--   profiles/users contain emails & PII. Store exports ENCRYPTED and OFF
--   Supabase. NEVER commit CSVs/dumps to git (see PRE_PR3_BACKUP_PROCEDURE.md
--   → "Where to store"). This directory must hold SCRIPTS ONLY.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- OPTION A — psql \copy block (UN-COMMENT to use from a terminal; DB read-only)
-- ----------------------------------------------------------------------------
-- \copy (select * from auth.users               order by id)        to 'backup/auth_users.csv'           with (format csv, header true)
-- \copy (select * from public.users             order by id)        to 'backup/users.csv'                with (format csv, header true)
-- \copy (select * from public.partners          order by id)        to 'backup/partners.csv'             with (format csv, header true)
-- \copy (select * from public.venues            order by id)        to 'backup/venues.csv'               with (format csv, header true)
-- \copy (select * from public.quests            order by id)        to 'backup/quests.csv'               with (format csv, header true)
-- \copy (select * from public.qr_codes          order by id)        to 'backup/qr_codes.csv'             with (format csv, header true)
-- \copy (select * from public.user_profiles     order by user_id)   to 'backup/user_profiles.csv'        with (format csv, header true)
-- \copy (select * from public.privacy_preferences order by user_id) to 'backup/privacy_preferences.csv'  with (format csv, header true)
-- \copy (select * from public.profiles          order by user_id)   to 'backup/profiles.csv'             with (format csv, header true)
-- \copy (select * from public.rewards           order by id)        to 'backup/rewards.csv'              with (format csv, header true)
-- \copy (select * from public.scan_events       order by id)        to 'backup/scan_events.csv'          with (format csv, header true)
-- \copy (select * from public.quest_completions order by id)        to 'backup/quest_completions.csv'    with (format csv, header true)
-- \copy (select * from public.points_ledger     order by id)        to 'backup/points_ledger.csv'        with (format csv, header true)
-- \copy (select * from public.reward_redemptions order by id)       to 'backup/reward_redemptions.csv'   with (format csv, header true)
-- \copy (select * from public.community_notes   order by id)        to 'backup/community_notes.csv'       with (format csv, header true)
-- \copy (select * from public.note_reports      order by id)        to 'backup/note_reports.csv'         with (format csv, header true)


-- ----------------------------------------------------------------------------
-- OPTION B — SQL Editor: run each statement individually, then Download CSV.
-- Parent-first order. (auth.users first — the identity root.)
-- ----------------------------------------------------------------------------

-- 01. auth.users  (⚠ sensitive: password hashes / tokens)
select * from auth.users order by id;

-- 02. public.users  (canonical identity)
select * from public.users order by id;

-- 03. public.partners
select * from public.partners order by id;

-- 04. public.venues
select * from public.venues order by id;

-- 05. public.quests
select * from public.quests order by id;

-- 06. public.qr_codes
select * from public.qr_codes order by id;

-- 07. public.user_profiles  (game stats — convergence target)
select * from public.user_profiles order by user_id;

-- 08. public.privacy_preferences
select * from public.privacy_preferences order by user_id;

-- 09. public.profiles  (auth/UI island — source for the text/social/onboarding backfill)
select * from public.profiles order by user_id;

-- 10. public.rewards
select * from public.rewards order by id;

-- 11. public.scan_events
select * from public.scan_events order by id;

-- 12. public.quest_completions
select * from public.quest_completions order by id;

-- 13. public.points_ledger  (declared source of truth for XP/points)
select * from public.points_ledger order by id;

-- 14. public.reward_redemptions
select * from public.reward_redemptions order by id;

-- 15. public.community_notes
select * from public.community_notes order by id;

-- 16. public.note_reports
select * from public.note_reports order by id;

-- ============================================================================
-- After exporting: run verify_backup_exports.sql and record the row counts +
-- checksums in PRE_PR3_BACKUP_PROCEDURE.md. The backup is not "done" until
-- verification passes AND a restore dry-run has been rehearsed on a throwaway
-- target (see RESTORE_PROCEDURE.md).
-- ============================================================================
-- END — READ-ONLY EXPORT
-- ============================================================================
