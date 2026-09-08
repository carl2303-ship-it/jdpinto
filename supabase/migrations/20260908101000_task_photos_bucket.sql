-- Storage: bucket task-photos + policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "task_photos_storage_select" on storage.objects;
drop policy if exists "task_photos_storage_insert" on storage.objects;
drop policy if exists "task_photos_storage_update" on storage.objects;
drop policy if exists "task_photos_storage_delete" on storage.objects;

create policy "task_photos_storage_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'task-photos');

create policy "task_photos_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'task-photos');

create policy "task_photos_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'task-photos')
  with check (bucket_id = 'task-photos');

create policy "task_photos_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'task-photos' and public.is_office_staff());
