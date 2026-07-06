-- verify-db.sql — read-only reality gate for the SideQuests Supabase project
--
-- Run after applying each migration batch (Supabase SQL editor, or via the
-- read-only MCP). Returns one row per check with pass = true/false.
-- Expected: every row passes once migrations 0009–0013 are applied.
-- This script mutates nothing.

with checks (ord, check_name, pass, details) as (

  -- ── 0009 grants ──────────────────────────────────────────────────────────
  select 1, '0009: anon can SELECT quests',
    has_table_privilege('anon', 'public.quests', 'SELECT'),
    'public discovery read'
  union all
  select 2, '0009: anon can SELECT venues/partners/qr_codes/rewards',
    has_table_privilege('anon', 'public.venues', 'SELECT')
      and has_table_privilege('anon', 'public.partners', 'SELECT')
      and has_table_privilege('anon', 'public.qr_codes', 'SELECT')
      and has_table_privilege('anon', 'public.rewards', 'SELECT'),
    'QR resolution + rewards discovery'
  union all
  select 3, '0009: anon can SELECT notes table + author view',
    has_table_privilege('anon', 'public.community_notes', 'SELECT')
      and has_table_privilege('anon', 'public.community_notes_with_author', 'SELECT'),
    'community notes surfaces'
  union all
  select 4, '0009: authenticated own-history reads',
    has_table_privilege('authenticated', 'public.quest_completions', 'SELECT')
      and has_table_privilege('authenticated', 'public.points_ledger', 'SELECT')
      and has_table_privilege('authenticated', 'public.reward_redemptions', 'SELECT')
      and has_table_privilege('authenticated', 'public.quest_attempts', 'SELECT'),
    'wallet/history/rewards data'
  union all
  select 5, '0009: privacy upsert + consent insert grants',
    has_table_privilege('authenticated', 'public.privacy_preferences', 'INSERT')
      and has_table_privilege('authenticated', 'public.privacy_preferences', 'UPDATE')
      and has_table_privilege('authenticated', 'public.consent_events', 'INSERT'),
    'settings privacy toggles'
  union all
  select 6, '0009: scan conversion_state column UPDATE (interim path)',
    has_column_privilege('authenticated', 'public.scan_events', 'conversion_state', 'UPDATE'),
    'markScanConverted no longer throws'
  union all
  select 7, '0009: ledger/audit stay locked for anon',
    not has_table_privilege('anon', 'public.points_ledger', 'SELECT')
      and not has_table_privilege('anon', 'public.audit_logs', 'SELECT')
      and not has_table_privilege('anon', 'public.scan_events', 'SELECT'),
    'least-privilege spot check'

  -- ── 0010 auth bootstrap ──────────────────────────────────────────────────
  union all
  select 8, '0010: exactly one auth.users trigger (on_auth_user_created)',
    (select count(*) = 1
       and bool_and(t.tgname = 'on_auth_user_created')
     from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal),
    (select string_agg(t.tgname, ', ')
     from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal)
  union all
  select 9, '0010: canonical function inserts profiles row',
    (select prosrc like '%public.profiles%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'handle_new_auth_user'),
    'handle_new_auth_user body references public.profiles'
  union all
  select 10, '0010: orphaned handle_new_user dropped',
    not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'handle_new_user'),
    null
  union all
  select 11, '0010: backfill complete (auth.users == users == profiles)',
    (select count(*) from auth.users) = (select count(*) from public.users)
      and (select count(*) from auth.users) = (select count(*) from public.profiles)
      and (select count(*) from auth.users) = (select count(*) from public.user_profiles)
      and (select count(*) from auth.users) = (select count(*) from public.privacy_preferences),
    format('auth=%s users=%s profiles=%s',
      (select count(*) from auth.users),
      (select count(*) from public.users),
      (select count(*) from public.profiles))

  -- ── 0011 profile visibility ──────────────────────────────────────────────
  union all
  select 12, '0011: public_profiles view filters is_public',
    pg_get_viewdef('public.public_profiles'::regclass, true) ilike '%is_public = true%',
    null
  union all
  select 13, '0011: is_public NOT NULL, default false',
    (select is_nullable = 'NO' and column_default = 'false'
     from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'is_public'),
    (select 'nullable=' || is_nullable || ' default=' || coalesce(column_default, 'NULL')
     from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'is_public')

  -- ── 0012 fable fields ────────────────────────────────────────────────────
  union all
  select 14, '0012: all 8 Fable columns exist on quests',
    (select count(*) = 8
     from information_schema.columns
     where table_schema = 'public' and table_name = 'quests'
       and column_name in ('funky_action','action_type','action_prompt','proof_method',
                           'staff_phrase','social_share_prompt','estimated_time','links')),
    (select count(*)::text || ' of 8 present'
     from information_schema.columns
     where table_schema = 'public' and table_name = 'quests'
       and column_name in ('funky_action','action_type','action_prompt','proof_method',
                           'staff_phrase','social_share_prompt','estimated_time','links'))

  -- ── 0013 proofs bucket ───────────────────────────────────────────────────
  union all
  select 15, '0013: proofs bucket exists (public, 25MB, image+video MIME)',
    exists (
      select 1 from storage.buckets
      where id = 'proofs' and public
        and file_size_limit = 26214400
        and allowed_mime_types @> array['image/webp','video/webm','video/mp4']),
    (select 'buckets: ' || string_agg(id, ', ') from storage.buckets)
  union all
  select 16, '0013: proofs object policies present (4)',
    (select count(*) = 4 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (qual ilike '%proofs%' or with_check ilike '%proofs%')),
    null

  -- ── content readiness (informational; passes after T-CONTENT-1) ─────────
  union all
  select 17, 'content: quests with Fable content authored',
    (select count(*) = count(funky_action) from quests where status = 'active'),
    (select count(funky_action)::text || ' of ' || count(*)::text || ' active quests'
     from quests where status = 'active')
)
select ord, check_name, pass, details
from checks
order by ord;
