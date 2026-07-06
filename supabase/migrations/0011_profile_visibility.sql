-- 0011_profile_visibility.sql — one canonical visibility field: is_public
--
-- WHY (verified live 2026-07-06): profiles carries BOTH is_public and
-- is_profile_public. The Settings toggle writes is_public; the public_profiles
-- view filters is_profile_public — so the toggle has no effect on actual
-- visibility. Live drift compounds it: is_public is nullable DEFAULT TRUE live,
-- while the checked-in 0008 says NOT NULL DEFAULT FALSE (opt-in, matching the
-- product's privacy-first stance).
--
-- Live data at migration time: all 5 profiles have is_profile_public = false
-- (nobody is publicly visible today) and is_public = true (untouched default).
-- Copying is_profile_public → is_public therefore preserves every profile's
-- CURRENT actual visibility, and restores opt-in as the default going forward.
-- Users opt in via the existing Settings toggle. Idempotent; safe to re-run.

-- 1. Backfill canonical field from the field the view has been enforcing.
update public.profiles
set is_public = is_profile_public
where is_public is distinct from is_profile_public;

-- 2. Canonical shape: opt-in by default, never null (matches 0008's intent).
alter table public.profiles alter column is_public set default false;
alter table public.profiles alter column is_public set not null;

-- 3. Point the public view at the canonical field.
-- Column list/order matches the live view exactly (create or replace requires
-- it, and it preserves the view's existing grants). is_profile_public is kept
-- as a dead column for now; dropping it is deferred until no code references
-- remain (tracked as post-launch cleanup).
create or replace view public.public_profiles as
select
  user_id,
  display_name,
  username,
  avatar_url,
  home_city,
  bio,
  level,
  xp,
  created_at,
  case when show_social_links then instagram_url else null::text end as instagram_url,
  case when show_social_links then tiktok_url    else null::text end as tiktok_url,
  case when show_social_links then x_url         else null::text end as x_url,
  case when show_social_links then youtube_url   else null::text end as youtube_url,
  case when show_social_links then snapchat_url  else null::text end as snapchat_url,
  show_completed_quests,
  show_breadcrumbs
from public.profiles p
where is_public = true;

-- Verification:
--   select pg_get_viewdef('public.public_profiles'::regclass, true);
--   -- WHERE clause must read: is_public = true
--   select count(*) from public.profiles where is_public is null;  -- 0
--   -- Toggle "Profile Visibility" in Settings on a test account, then:
--   --   /u/<username> appears (on) / 404s (off).
