-- verify-db.sql — read-only reality gate for the SideQuests Supabase project
--
-- Run after applying each migration batch (Supabase SQL editor, or via the
-- read-only MCP). Returns one row per check with pass = true/false.
-- Expected: every row passes once migrations 0009–0013 and 0016–0018 are applied.
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

  -- ── 0016 RLS hardening ───────────────────────────────────────────────────
  union all
  select 18, '0016: RLS helpers are SECURITY DEFINER (anon reads survive hidden rows)',
    (select count(*) = 3 from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname in ('is_admin', 'owns_partner', 'app_uid') and prosecdef),
    null
  union all
  select 19, '0016: venue-code secrets are server-only',
    case when to_regclass('public.quest_secrets') is null then false
         else not has_table_privilege('anon', 'public.quest_secrets', 'SELECT')
          and not has_table_privilege('authenticated', 'public.quest_secrets', 'SELECT')
          and not exists (select 1 from quests where verification_secret is not null)
    end,
    (select count(*)::text || ' quests still carry a verification_secret'
       from quests where verification_secret is not null)
  union all
  select 20, '0016: notes author view applies moderation filter',
    pg_get_viewdef('public.community_notes_with_author'::regclass, true) ilike '%where%moderation_status%',
    null

  -- ── 0017 quest frameworks ────────────────────────────────────────────────
  union all
  select 21, '0017: framework + instance tables exist, instances private',
    to_regclass('public.quest_frameworks') is not null
      and case when to_regclass('public.quest_instances') is null then false
               else not has_table_privilege('anon', 'public.quest_instances', 'SELECT') end,
    null
  union all
  select 22, '0017: complete_quest takes p_instance_id; generate_quest_instance exists',
    exists (select 1 from pg_proc
             where pronamespace = 'public'::regnamespace and proname = 'complete_quest'
               and pg_get_function_identity_arguments(oid) like '%p_instance_id%')
      and exists (select 1 from pg_proc
                   where pronamespace = 'public'::regnamespace and proname = 'generate_quest_instance'),
    (select string_agg(pg_get_function_identity_arguments(oid), ' | ')
       from pg_proc where pronamespace = 'public'::regnamespace and proname = 'complete_quest')
  union all
  select 23, '0017: repeatable completions (unique user+quest dropped)',
    not exists (select 1 from pg_constraint
                 where conrelid = 'public.quest_completions'::regclass
                   and pg_get_constraintdef(oid) = 'UNIQUE (user_id, quest_id)'),
    null

  -- ── 0018 scan verification ───────────────────────────────────────────────
  union all
  select 24, '0018: venue codes are private and point at /scan/<code>',
    not has_table_privilege('anon', 'public.qr_codes', 'SELECT')
      and not exists (select 1 from public.qr_codes where destination_url is distinct from '/scan/' || code),
    (select count(*)::text || ' codes not pointing at /scan/<code>'
       from public.qr_codes where destination_url is distinct from '/scan/' || code)
  union all
  select 25, '0018: record_code_scan exists; scans carry code_verified',
    exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'record_code_scan')
      and exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'scan_events' and column_name = 'code_verified'),
    null
  union all
  select 26, '0018: complete_quest requires a verified scan for QR/NFC quests',
    exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'complete_quest'
             and prosrc like '%scan_required%'),
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
