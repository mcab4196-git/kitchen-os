-- Kitchen OS — receipt image storage setup.
-- Run in the Supabase SQL Editor (or: psql "$DIRECT_URL" -f prisma/storage.sql).
--
-- Creates a PRIVATE bucket "receipts" and restricts every object to its owner's
-- folder: files are stored at "<user-id>/<hash>.<ext>", and the policies below
-- only let a user touch objects whose first path segment equals their auth uid.

-- 1. Private bucket (id = name = "receipts").
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 2. Per-user access policies on storage.objects.
--    (storage.foldername(name))[1] is the first path segment, i.e. the user id.

drop policy if exists "receipts read own" on storage.objects;
create policy "receipts read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts insert own" on storage.objects;
create policy "receipts insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts update own" on storage.objects;
create policy "receipts update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts delete own" on storage.objects;
create policy "receipts delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
