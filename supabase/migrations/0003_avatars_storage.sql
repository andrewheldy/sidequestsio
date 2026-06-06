-- SideQuests.io — avatar storage bucket + policies
-- Idempotent. Creates a public-read `avatars` bucket and scopes writes so a
-- user can only touch files inside their own `{user_id}/...` folder.

-- 1. Bucket -----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,                                   -- public read so <img> works without signed URLs
  5242880,                                -- 5 MB hard cap (client compresses well below this)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Object policies --------------------------------------------------------
-- Anyone can read avatars (they back a public <img>).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- A user may only write/replace/remove files under their own uid folder:
--   avatars/<auth.uid()>/avatar-<ts>.<ext>
drop policy if exists "Users manage their own avatar (insert)" on storage.objects;
create policy "Users manage their own avatar (insert)"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users manage their own avatar (update)" on storage.objects;
create policy "Users manage their own avatar (update)"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users manage their own avatar (delete)" on storage.objects;
create policy "Users manage their own avatar (delete)"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
