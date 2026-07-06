-- 0013_proofs_bucket.sql — quest-proof storage bucket + policies
--
-- WHY (verified live 2026-07-06): src/lib/media.ts uploads quest proof media
-- to a `proofs` bucket that has never existed (only `avatars` does), and the
-- proof camera currently swallows the failure — users think they posted a
-- photo that was never stored. This creates the bucket the code already
-- targets. Mirrors the 0003_avatars_storage.sql idiom. Idempotent.
--
-- Sizing/MIME: media.ts emits webp images and webm/mp4 video clips
-- (jpeg/png allowed for device fallbacks). Video needs headroom → 25 MB cap.
-- Public read: community notes render proof images via getPublicUrl <img>.

-- 1. Bucket -----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  true,                                   -- public read; notes embed public URLs
  26214400,                               -- 25 MB (video headroom)
  array['image/webp', 'image/jpeg', 'image/png', 'video/webm', 'video/mp4']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Object policies ----------------------------------------------------------
-- Upload path is `${userId}/quests/${questId}/proof-<ts>.<ext>` (media.ts),
-- so (storage.foldername(name))[1] is the uploader's uid — same convention
-- as avatars.

drop policy if exists "Proof media is publicly readable" on storage.objects;
create policy "Proof media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'proofs');

drop policy if exists "Users upload proofs to their own folder" on storage.objects;
create policy "Users upload proofs to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own proofs" on storage.objects;
create policy "Users update their own proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own proofs" on storage.objects;
create policy "Users delete their own proofs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verification:
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id in ('avatars','proofs');
--   -- Then: authenticated test upload under own uid folder succeeds;
--   --       upload under another uid folder fails; anon upload fails;
--   --       public URL GET returns the object.
