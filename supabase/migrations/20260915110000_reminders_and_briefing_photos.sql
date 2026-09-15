-- Lembretes 10/30 min + tipo de foto "briefing" (anexos do admin)
do $$ begin
  alter type public.photo_type add value 'briefing';
exception
  when duplicate_object then null;
end $$;

alter table public.tasks
  add column if not exists reminder_30_sent_at timestamptz,
  add column if not exists reminder_10_sent_at timestamptz;
