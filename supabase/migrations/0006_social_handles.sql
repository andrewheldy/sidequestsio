-- SideQuests.io — social identity redesign: handle-based storage
-- Adds instagram_handle, tiktok_handle, x_handle columns.
-- Migrates any existing URL values to bare handles (preserves data).
-- Recreates public_profiles view to expose handle columns.
-- Idempotent: safe to run repeatedly.

-- 1. New handle columns -------------------------------------------------------
alter table public.profiles add column if not exists instagram_handle text;
alter table public.profiles add column if not exists tiktok_handle    text;
alter table public.profiles add column if not exists x_handle         text;

-- 2. Migrate existing URL values → bare handles --------------------------------

-- Instagram: strip https://(www.)instagram.com/ prefix and trailing path/query
update public.profiles
set instagram_handle = case
  when instagram_url is null then null
  when instagram_url ~* 'instagram\.com'
    then regexp_replace(
           regexp_replace(instagram_url, '^https?://(www\.)?instagram\.com/@?', '', 'i'),
           '[/?#&].*$', ''
         )
  when instagram_url like '@%'
    then substring(instagram_url, 2)
  else regexp_replace(instagram_url, '^@+', '')
end
where instagram_url is not null and instagram_handle is null;

-- TikTok: strip https://(www.)tiktok.com/@? prefix
update public.profiles
set tiktok_handle = case
  when tiktok_url is null then null
  when tiktok_url ~* 'tiktok\.com'
    then regexp_replace(
           regexp_replace(tiktok_url, '^https?://(www\.)?tiktok\.com/@?', '', 'i'),
           '[/?#&].*$', ''
         )
  when tiktok_url like '@%'
    then substring(tiktok_url, 2)
  else regexp_replace(tiktok_url, '^@+', '')
end
where tiktok_url is not null and tiktok_handle is null;

-- X / Twitter: strip https://(www.)(x|twitter).com/ prefix
update public.profiles
set x_handle = case
  when x_url is null then null
  when x_url ~* '(x|twitter)\.com'
    then regexp_replace(
           regexp_replace(x_url, '^https?://(www\.)?(x|twitter)\.com/@?', '', 'i'),
           '[/?#&].*$', ''
         )
  when x_url like '@%'
    then substring(x_url, 2)
  else regexp_replace(x_url, '^@+', '')
end
where x_url is not null and x_handle is null;

-- Clean up empty strings left by malformed URLs
update public.profiles set instagram_handle = null where instagram_handle = '';
update public.profiles set tiktok_handle    = null where tiktok_handle    = '';
update public.profiles set x_handle         = null where x_handle         = '';

-- 3. Recreate public_profiles view with handle columns -----------------------
-- phone_number is intentionally excluded — always private.
-- Old *_url columns are kept but no longer exposed; youtube/snapchat unchanged.
drop view if exists public.public_profiles;
create view public.public_profiles
  with (security_invoker = false)
as
select
  p.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.home_city,
  p.bio,
  p.level,
  p.xp,
  p.created_at,
  case when p.show_social_links then p.instagram_handle end as instagram_handle,
  case when p.show_social_links then p.tiktok_handle    end as tiktok_handle,
  case when p.show_social_links then p.x_handle         end as x_handle,
  case when p.show_social_links then p.youtube_url      end as youtube_url,
  case when p.show_social_links then p.snapchat_url     end as snapchat_url,
  p.show_completed_quests,
  p.show_breadcrumbs
from public.profiles p
where p.is_profile_public = true;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Privacy-safe public projection of profiles. Only opted-in (is_profile_public) '
  'rows are visible. Social handles are gated by show_social_links. '
  'Private columns (phone_number) are never selected.';
