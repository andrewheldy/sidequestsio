-- 0027_quest_media_bucket.sql — public bucket for curated quest hero images
--
-- WHY (2026-10-24): quest hero images (quests.image_url) have no Storage home.
-- `avatars` is per-user and `proofs` holds player submissions (personal data),
-- so editorial images must not share either. This adds a public-read bucket for
-- SideQuests-curated media only. First consumer: the Miami Essentials seed
-- (data/generated/miami-essentials/hero/*.webp, uploaded under
-- `miami-essentials/<slug>.webp`; provenance in image_manifest.csv).
--
-- Writes: no client policy is created on purpose. Only the service role
-- (dashboard upload / CLI, which bypasses RLS) can add or replace objects;
-- anon and authenticated users can only read. Mirrors 0013's idiom. Idempotent.
--
-- Reverse: delete the bucket's objects in the dashboard, then
--   drop policy if exists "Quest media is publicly readable" on storage.objects;
--   delete from storage.buckets where id = 'quest-media';

-- 1. Bucket -----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quest-media',
  'quest-media',
  true,                                   -- public read; quest pages embed public URLs
  2097152,                                -- 2 MB per hero (seed targets ≤ 250 KB)
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Object policies ----------------------------------------------------------
drop policy if exists "Quest media is publicly readable" on storage.objects;
create policy "Quest media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'quest-media');

-- Verification:
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'quest-media';
--   -- Then: anon/authenticated upload fails; public URL GET of an uploaded
--   --       object returns it:
--   -- <SUPABASE_URL>/storage/v1/object/public/quest-media/miami-essentials/<slug>.webp
