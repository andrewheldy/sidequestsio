-- SideQuests.io — profile overhaul
-- Adds editable profile fields (bio, social links) + privacy/visibility flags,
-- and a privacy-safe public read path. Idempotent: safe to run repeatedly.
--
-- Notes:
--   * `home_city` (added in 0001) already covers "location / city" — reused here
--     instead of adding a duplicate `city` column, to preserve existing data.
--   * Base-table RLS stays OWNER-ONLY for SELECT. Public reads go through the
--     `public_profiles` view below, which is the ONLY place public/anon users
--     can read other people's profiles — and it exposes a hand-picked, flag-
--     gated subset of columns so private fields never leak.

-- 1. New columns ------------------------------------------------------------
alter table public.profiles add column if not exists bio                  text;
alter table public.profiles add column if not exists instagram_url        text;
alter table public.profiles add column if not exists tiktok_url           text;
alter table public.profiles add column if not exists x_url                text;

-- Privacy-conscious defaults: nothing is public until the user opts in.
alter table public.profiles add column if not exists is_profile_public    boolean not null default false;
alter table public.profiles add column if not exists show_social_links    boolean not null default false;
alter table public.profiles add column if not exists show_completed_quests boolean not null default false;
alter table public.profiles add column if not exists show_breadcrumbs     boolean not null default false;

-- Keep bios reasonable (defensive; the client also validates).
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add  constraint profiles_bio_len check (bio is null or char_length(bio) <= 280);

-- 2. Public, privacy-safe read view -----------------------------------------
-- SECURITY DEFINER view (security_invoker = false): it runs with the view
-- owner's privileges so anon/authenticated users can read PUBLIC profiles
-- without us opening up the base table. The WHERE clause limits rows to
-- opted-in profiles; the SELECT list limits columns; social links are nulled
-- unless the user chose to show them. This is intentional and reviewed.
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
  case when p.show_social_links then p.instagram_url end as instagram_url,
  case when p.show_social_links then p.tiktok_url    end as tiktok_url,
  case when p.show_social_links then p.x_url         end as x_url,
  p.show_completed_quests,
  p.show_breadcrumbs
from public.profiles p
where p.is_profile_public = true;

-- Only ever expose the curated view, never the base table, to the public.
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Privacy-safe public projection of profiles. Only opted-in (is_profile_public) '
  'rows are visible; social links are gated by show_social_links. Private columns '
  'are never selected here.';
