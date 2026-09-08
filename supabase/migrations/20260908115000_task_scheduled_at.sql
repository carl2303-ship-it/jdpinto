-- Data/hora de agendamento (admin)
alter table public.tasks
  add column if not exists scheduled_at timestamptz;

update public.tasks
set scheduled_at = (scheduled_date::timestamp + time '09:00')
  at time zone 'Europe/Lisbon'
where scheduled_at is null
  and scheduled_date is not null;

create index if not exists tasks_scheduled_at_idx on public.tasks (scheduled_at);
