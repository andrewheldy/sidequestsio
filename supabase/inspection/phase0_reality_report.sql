-- ============================================================================
-- SideQuests.io — Phase 0 Reality Report — READ-ONLY INSPECTION
-- ============================================================================
-- PURPOSE
--   Replace the assumptions in SUPABASE_AUDIT.md / PHASE0_PLAN.md with facts
--   about the LIVE Supabase project, so the team can ratify (or revise) the
--   "unify on users + user_profiles" decision and choose the correct backfill
--   direction BEFORE any schema change.
--
-- SAFETY CONTRACT  (do not violate)
--   * This file is READ-ONLY. Every statement is a SELECT.
--   * It contains NO create / alter / drop / insert / update / delete /
--     truncate / grant / revoke. Running it changes NOTHING.
--   * If a question cannot be answered read-only, it is marked
--     "REQUIRES MANUAL INSPECTION" with instructions instead of SQL.
--
-- HOW TO RUN
--   Supabase SQL Editor returns only the LAST result set when you run a whole
--   script. RUN ONE SECTION AT A TIME (select the section, click Run) and paste
--   each result into the matching section of
--   PHASE0_REALITY_REPORT_TEMPLATE.md.
--
--   Sections 1–8 and 16–18 use only catalog views (information_schema /
--   pg_catalog) and are ALWAYS SAFE to run — they never error even if a table
--   is missing.
--
--   Sections 9–15 are DATA queries that reference the identity tables directly.
--   Run them ONLY for tables that Section 2 confirmed exist; skip the rest.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — MIGRATION HISTORY / IS THIS CLI-MANAGED?  (always safe)
-- ============================================================================
-- 1a. Does a Supabase CLI migration-history table exist?
--     Non-null reg* => CLI-managed => DO NOT renumber applied migrations
--     (PHASE0_PLAN.md challenge A3). Null => likely hand-run in SQL editor.
select
  to_regclass('supabase_migrations.schema_migrations') as schema_migrations_table,
  to_regclass('supabase_migrations.seed_files')        as seed_files_table;

-- 1b. IF 1a returned a non-null schema_migrations_table, run this to see which
--     migration versions the project believes are applied. (If 1a was null,
--     SKIP — the table does not exist.)
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 1c. REQUIRES MANUAL INSPECTION: confirm the team's actual workflow
--     (`supabase db push` / CI vs pasting SQL into the editor). The DB can only
--     show whether the history table exists, not how humans deploy. Ask the team
--     and record the answer in the template.


-- ============================================================================
-- SECTION 2 — DO THE IDENTITY OBJECTS EXIST?  (always safe)
-- ============================================================================
-- Tables/views of interest. NULL in the "exists_as" column = object is absent.
select obj as object_name,
       to_regclass('public.' || obj) as exists_as
from (values
  ('profiles'),
  ('users'),
  ('user_profiles'),
  ('privacy_preferences'),
  ('points_ledger'),
  ('quest_completions'),
  ('community_notes'),
  ('public_profiles'),
  ('community_notes_with_author')
) as t(obj)
order by obj;

-- auth.users always exists in Supabase, but confirm visibility from this role:
select to_regclass('auth.users') as auth_users;


-- ============================================================================
-- SECTION 3 — COLUMN INVENTORY: WHERE DOES EACH FIELD LIVE?  (always safe)
-- ============================================================================
-- 3a. Full column list for the identity tables, side by side.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles','users','user_profiles','privacy_preferences')
order by table_name, ordinal_position;

-- 3b. WHERE is onboarding_completed? (expect: profiles; possibly user_profiles)
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name = 'onboarding_completed'
  and table_name in ('profiles','user_profiles')
order by table_name;

-- 3c. WHERE do the social / privacy / onboarding-selection / gamification fields
--     live? (Drives the column-relocation list for PR #2.)
select column_name, table_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles','user_profiles')
  and column_name in (
    'username','bio','phone_number',
    'instagram_url','tiktok_url','x_url','youtube_url','snapchat_url',
    'is_public','is_profile_public','show_social_links',
    'show_completed_quests','show_breadcrumbs',
    'interests','quest_style','quest_energy','starting_area',
    'streak','xp','level',
    'points_balance_cache','lifetime_points',
    'completed_quests_count','community_notes_count','rewards_redeemed_count',
    'display_name','avatar_url','home_city'
  )
order by column_name, table_name;


-- ============================================================================
-- SECTION 4 — SIGNUP TRIGGERS ON auth.users  (always safe)
-- ============================================================================
-- 4a. Every (non-internal) trigger on auth.users and the function it calls.
--     More than one row here = DUPLICATE signup triggers (the conflict).
select t.tgname                                   as trigger_name,
       case t.tgenabled when 'O' then 'enabled'
                        when 'D' then 'disabled'
                        else t.tgenabled::text end as status,
       np.nspname || '.' || p.proname             as calls_function
from pg_trigger t
join pg_class c       on c.oid = t.tgrelid
join pg_namespace cn  on cn.oid = c.relnamespace
join pg_proc p        on p.oid = t.tgfoid
join pg_namespace np  on np.oid = p.pronamespace
where cn.nspname = 'auth'
  and c.relname  = 'users'
  and not t.tgisinternal
order by t.tgname;


-- ============================================================================
-- SECTION 5 — SIGNUP FUNCTION BODIES  (always safe)
-- ============================================================================
-- 5a. Do handle_new_user / handle_new_auth_user exist, and what do they insert?
--     Read each body: note which target tables it inserts into (esp. whether it
--     creates a public.profiles row vs users/user_profiles/privacy_preferences).
select n.nspname            as schema,
       p.proname            as function_name,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('handle_new_user','handle_new_auth_user')
order by p.proname;


-- ============================================================================
-- SECTION 6 — VIEW DEFINITIONS: public_profiles & community_notes_with_author
--             (always safe)
-- ============================================================================
-- 6a. Exact view bodies — shows which BASE TABLES each view reads from and which
--     columns it exposes (pin PR #4's rebuild to this output shape).
select c.relname               as view_name,
       pg_get_viewdef(c.oid, true) as definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in ('public_profiles','community_notes_with_author')
order by c.relname;

-- 6b. security_invoker setting on public_profiles (false/absent => definer view,
--     bypasses RLS — intended for the privacy-safe public projection).
select c.relname as view_name, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('public_profiles','community_notes_with_author')
order by c.relname;

-- 6c. Base-table dependency map for the two views (corroborates 6a).
select v.relname as view_name, src.relname as reads_from
from pg_depend d
join pg_rewrite r   on r.oid = d.objid
join pg_class v     on v.oid = r.ev_class
join pg_class src   on src.oid = d.refobjid
join pg_namespace sn on sn.oid = src.relnamespace
where v.relname in ('public_profiles','community_notes_with_author')
  and src.relkind in ('r','v')
  and sn.nspname = 'public'
  and v.relname <> src.relname
order by v.relname, src.relname;


-- ============================================================================
-- SECTION 7 — RLS STATE & POLICIES ON IDENTITY TABLES  (always safe)
-- ============================================================================
-- 7a. Is RLS enabled / forced on each identity table?
select c.relname as table_name,
       c.relrowsecurity   as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles','users','user_profiles','privacy_preferences',
                    'points_ledger','quest_completions','community_notes')
order by c.relname;

-- 7b. Every policy on those tables (so PR #4 knows what must stay invariant).
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','users','user_profiles','privacy_preferences')
order by tablename, policyname;


-- ============================================================================
-- SECTION 8 — GRANTS ON THE PUBLIC VIEWS  (always safe)
-- ============================================================================
-- 8a. Do anon / authenticated have SELECT on the public-facing views?
--     (Missing grant on public_profiles => /u/:username breaks for visitors.)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('public_profiles','community_notes_with_author')
  and grantee in ('anon','authenticated','public')
order by table_name, grantee, privilege_type;

-- 8b. REQUIRES MANUAL INSPECTION (behavioural): confirm anon can actually read
--     public_profiles and only sees opted-in rows. Do this from the app
--     (logged-out visit to /u/:username) or with an anon-key REST call, NOT by
--     changing roles in this editor. Record pass/fail in the template.


-- ============================================================================
-- ============================================================================
-- DATA QUERIES (Sections 9–15)
-- RUN ONLY FOR TABLES THAT SECTION 2 CONFIRMED EXIST. A query that references a
-- missing table will error (harmlessly) — just skip it for absent tables.
-- ============================================================================
-- ============================================================================


-- ============================================================================
-- SECTION 9 — IDENTITY ROW COUNTS  (data)
-- ============================================================================
-- 9a. ALWAYS-SAFE approximate counts from the planner stats (no error even if a
--     table is absent — absent tables simply don't appear). Approximate; depends
--     on last ANALYZE.
select c.relname as table_name, c.reltuples::bigint as approx_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','users','user_profiles','privacy_preferences',
                    'points_ledger','quest_completions','community_notes')
order by c.relname;

-- 9b. EXACT auth.users count (auth.users always exists).
select count(*) as auth_users_total from auth.users;

-- 9c. EXACT counts — run each line only for a table confirmed present in §2:
select count(*) as profiles_total            from public.profiles;
select count(*) as users_total               from public.users;
select count(*) as user_profiles_total       from public.user_profiles;
select count(*) as privacy_preferences_total from public.privacy_preferences;
select count(*) as points_ledger_total       from public.points_ledger;


-- ============================================================================
-- SECTION 10 — ORPHANS BETWEEN auth.users AND THE IDENTITY TABLES  (data)
-- ============================================================================
-- Assumes the convention users.id = user_profiles.user_id = profiles.user_id =
-- auth.users.id. Run each block only if BOTH referenced tables exist.

-- 10a. auth.users missing a public.profiles row.
select count(*) as auth_without_profiles
from auth.users au
left join public.profiles p on p.user_id = au.id
where p.user_id is null;

-- 10b. auth.users missing a public.users row.
select count(*) as auth_without_users
from auth.users au
left join public.users u on u.id = au.id
where u.id is null;

-- 10c. auth.users missing a public.user_profiles row.
select count(*) as auth_without_user_profiles
from auth.users au
left join public.user_profiles up on up.user_id = au.id
where up.user_id is null;

-- 10d. auth.users missing a public.privacy_preferences row.
select count(*) as auth_without_privacy
from auth.users au
left join public.privacy_preferences pp on pp.user_id = au.id
where pp.user_id is null;

-- 10e. user_profiles rows whose user_id has no matching public.users row
--      (would break the users(id) FK assumption).
select count(*) as user_profiles_without_users
from public.user_profiles up
left join public.users u on u.id = up.user_id
where u.id is null;

-- 10f. public.users rows whose id is not in auth.users (out-of-band/seed rows;
--      relevant to the deferred users.id -> auth.users FK in PHASE0_PLAN A5).
select count(*) as users_not_in_auth
from public.users u
left join auth.users au on au.id = u.id
where au.id is null;


-- ============================================================================
-- SECTION 11 — POPULATION SPLIT: profiles vs user_profiles vs both  (data)
-- ============================================================================
-- 11a. Coverage matrix (run only if BOTH profiles and user_profiles exist).
select
  (select count(*) from auth.users) as auth_users,
  count(*) filter (where has_p and not has_up) as only_profiles,
  count(*) filter (where has_up and not has_p) as only_user_profiles,
  count(*) filter (where has_p and has_up)     as both,
  count(*) filter (where not has_p and not has_up) as neither
from (
  select au.id,
         exists(select 1 from public.profiles p       where p.user_id = au.id)  as has_p,
         exists(select 1 from public.user_profiles up where up.user_id = au.id) as has_up
  from auth.users au
) s;


-- ============================================================================
-- SECTION 12 — IS XP/LEVEL/POINTS ACTUALLY POPULATED?  (data)
-- ============================================================================
-- 12a. profiles gamification fill (run only if profiles has xp/level).
select count(*)                               as rows_total,
       count(*) filter (where xp is not null) as xp_not_null,
       count(*) filter (where xp > 0)         as xp_gt_0,
       max(xp)                                as xp_max,
       round(avg(xp), 1)                      as xp_avg,
       count(*) filter (where level > 1)      as level_gt_1
from public.profiles;

-- 12b. user_profiles gamification fill.
select count(*)                                            as rows_total,
       count(*) filter (where xp > 0)                      as xp_gt_0,
       max(xp)                                             as xp_max,
       count(*) filter (where points_balance_cache > 0)    as points_gt_0,
       max(points_balance_cache)                           as points_max,
       count(*) filter (where completed_quests_count > 0)  as completers,
       count(*) filter (where community_notes_count > 0)   as note_authors
from public.user_profiles;

-- 12c. points_ledger fill (the declared source of truth).
select count(*)                          as ledger_rows,
       count(distinct user_id)           as distinct_users,
       sum(xp_amount)                     as total_xp,
       sum(points_amount)                 as net_points,
       min(created_at)                    as first_entry,
       max(created_at)                    as last_entry
from public.points_ledger;


-- ============================================================================
-- SECTION 13 — CAN WE RECOMPUTE CANONICAL XP/POINTS FROM THE LEDGER?  (data)
-- ============================================================================
-- This is the core of PHASE0_PLAN challenge A2: prefer recomputing from the
-- append-only ledger over trusting either cached xp column.

-- 13a. Users whose user_profiles cache DIVERGES from the ledger sum.
with ledger as (
  select user_id,
         sum(xp_amount)     as xp,
         sum(points_amount) as pts
  from public.points_ledger
  group by user_id
)
select count(*) as diverging_users
from public.user_profiles up
full join ledger l on l.user_id = up.user_id
where coalesce(up.xp, 0)                   <> coalesce(l.xp, 0)
   or coalesce(up.points_balance_cache, 0) <> coalesce(l.pts, 0);

-- 13b. completed_quests_count cache vs actual quest_completions.
select count(*) as count_mismatches
from (
  select up.user_id,
         up.completed_quests_count as cached,
         (select count(*) from public.quest_completions qc where qc.user_id = up.user_id) as actual
  from public.user_profiles up
) s
where cached <> actual;

-- 13c. profiles.xp vs ledger (shows how stale the auth-island xp is).
with ledger as (
  select user_id, sum(xp_amount) as xp from public.points_ledger group by user_id
)
select count(*) as profiles_xp_diverging_from_ledger
from public.profiles p
left join ledger l on l.user_id = p.user_id
where coalesce(p.xp, 0) <> coalesce(l.xp, 0);


-- ============================================================================
-- SECTION 14 — USERNAME COLLISIONS (current + future)  (data)
-- ============================================================================
-- 14a. profiles.username health: total, null, distinct, case-insensitive dups.
select count(*)                                   as rows_total,
       count(username)                            as username_not_null,
       count(distinct lower(username))            as distinct_ci,
       count(username) - count(distinct lower(username)) as case_insensitive_collisions
from public.profiles;

-- 14b. The actual colliding handles (so dedupe has a worklist). Empty = clean.
select lower(username) as username_ci, count(*) as n
from public.profiles
where username is not null
group by lower(username)
having count(*) > 1
order by n desc, username_ci;

-- 14c. REQUIRES MANUAL CHECK FIRST: does user_profiles already have a username
--      column? (Section 3c tells you.) If YES, also run a cross-table collision
--      check before adding UNIQUE in PR #3. If NO (expected today), 14a/14b
--      cover it.


-- ============================================================================
-- SECTION 15 — DISPLAY NAME / AVATAR DUPLICATION DRIFT  (data)
-- ============================================================================
-- 15a. Where profiles and users disagree on the duplicated fields (informs which
--      table becomes canonical — PHASE0_PLAN/SUPABASE_AUDIT pick users.*).
--      Run only if BOTH profiles and users exist.
select
  count(*) filter (
    where coalesce(p.display_name,'') <> coalesce(u.display_name,'')
  ) as display_name_mismatches,
  count(*) filter (
    where coalesce(p.avatar_url,'') <> coalesce(u.avatar_url,'')
  ) as avatar_url_mismatches
from auth.users au
left join public.profiles p on p.user_id = au.id
left join public.users    u on u.id      = au.id;


-- ============================================================================
-- SECTION 16 — REQUIRES MANUAL INSPECTION (cannot be answered read-only here)
-- ============================================================================
-- 16a. Deployment workflow: CLI/CI (`supabase db push`) vs SQL-editor paste.
--      (Section 1 shows only whether the history table exists.)
-- 16b. Whether anon REST access to public_profiles returns only opted-in rows
--      with social links gated — verify from the app or an anon-key request
--      (Section 8b), not by switching roles in this editor.
-- 16c. Whether a point-in-time backup / snapshot is available before PR #3/#4
--      (check Supabase Dashboard → Database → Backups / PITR).
-- ============================================================================
-- END OF READ-ONLY INSPECTION
-- ============================================================================
