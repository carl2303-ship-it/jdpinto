-- Anexos PDF no bucket + garantir enum briefing
do $$ begin
  alter type public.photo_type add value 'briefing';
exception
  when duplicate_object then null;
end $$;

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ],
  file_size_limit = 10485760
where id = 'task-photos';

alter table public.task_photos
  add column if not exists file_name text;
