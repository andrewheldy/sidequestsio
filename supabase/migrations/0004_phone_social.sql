-- SideQuests.io — phone number + social platform expansion
-- Adds phone_number, youtube_url, snapchat_url.
-- Recreates public_profiles view to gate youtube/snapchat via show_social_links.
-- Idempotent.

-- 1. New columns -----------------------------------------------------------
alter table public.profiles add column if not exists phone_number  text;
alter table public.profiles add column if not exists youtube_url   text;
alter table public.profiles add column if not exists snapchat_url  text;

-- Basic length guard on phone (E.164 international max is 15 digits + '+').
alter table public.profiles drop constraint if exists profiles_phone_len;
alter table public.profiles add  constraint profiles_phone_len
  check (phone_number is null or char_length(phone_number) <= 20);

-- 2. Recreate public_profiles view with new social columns -----------------
-- phone_number is intentionally excluded — it is private always.
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
  case when p.show_social_links then p.instagram_url  end as instagram_url,
  case when p.show_social_links then p.tiktok_url     end as tiktok_url,
  case when p.show_social_links then p.x_url          end as x_url,
  case when p.show_social_links then p.youtube_url    end as youtube_url,
  case when p.show_social_links then p.snapchat_url   end as snapchat_url,
  p.show_completed_quests,
  p.show_breadcrumbs
from public.profiles p
where p.is_profile_public = true;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;
