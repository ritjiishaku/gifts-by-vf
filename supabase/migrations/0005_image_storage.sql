-- Public Supabase Storage bucket for product / portfolio / site images.
-- Run in the Supabase SQL editor (or via `supabase db push`).
--
-- Uploads are performed server-side with the service-role key, so no write
-- policy is required for the admin flow. The SELECT policy makes the public
-- object URLs readable by the site and by next/image.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Public read for objects in the "images" bucket.
drop policy if exists "Public read images" on storage.objects;
create policy "Public read images"
  on storage.objects
  for select
  using (bucket_id = 'images');
