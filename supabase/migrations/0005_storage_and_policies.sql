-- =============================================================================
-- 0005_storage_and_policies.sql
-- Storage buckets + RLS policies for user/host-uploaded media.
--
-- Buckets (all public-read; writes restricted by folder ownership):
--   avatars                — profile pictures            (per-user)
--   quest-media            — quest cover images/media    (per-host)
--   community-note-photos  — photos attached to notes    (per-user)
--   reward-assets          — reward artwork              (per-host)
--
-- Folder convention: every object is stored under a top-level folder equal to
-- the uploader's auth uid, e.g.  `<uid>/cover.jpg`. Policies enforce that the
-- first path segment matches auth.uid(), so users can only write their own
-- files while everyone can read.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets (5 MiB limit, images only). Adjust limits/mime types as needed.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',               'avatars',               true, 5242880,
     array['image/png','image/jpeg','image/webp','image/gif']),
  ('quest-media',           'quest-media',           true, 5242880,
     array['image/png','image/jpeg','image/webp','image/gif']),
  ('community-note-photos', 'community-note-photos', true, 5242880,
     array['image/png','image/jpeg','image/webp']),
  ('reward-assets',         'reward-assets',         true, 5242880,
     array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Public read for all four buckets.
-- -----------------------------------------------------------------------------
drop policy if exists "Public read media" on storage.objects;
create policy "Public read media" on storage.objects
  for select
  using (bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets'));

-- -----------------------------------------------------------------------------
-- Authenticated users may write into their own top-level folder in any of the
-- buckets ( `<auth.uid()>/...` ). Covers insert / update / delete.
-- -----------------------------------------------------------------------------
drop policy if exists "Users upload own media" on storage.objects;
create policy "Users upload own media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own media" on storage.objects;
create policy "Users update own media" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own media" on storage.objects;
create policy "Users delete own media" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- Admins (see 0002 public.is_admin()) may manage any object in these buckets,
-- which keeps moderation/cleanup possible from the app rather than only the
-- dashboard.
-- -----------------------------------------------------------------------------
drop policy if exists "Admins manage media" on storage.objects;
create policy "Admins manage media" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and public.is_admin()
  )
  with check (
    bucket_id in ('avatars', 'quest-media', 'community-note-photos', 'reward-assets')
    and public.is_admin()
  );
