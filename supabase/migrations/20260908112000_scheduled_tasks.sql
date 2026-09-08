-- pending → scheduled; data de agendamento (admin)
alter type public.task_status rename value 'pending' to 'scheduled';

alter table public.tasks
  alter column status set default 'scheduled';

alter table public.tasks
  add column if not exists scheduled_date date;

-- Preencher a partir do início já existente
update public.tasks
set scheduled_date = (start_time at time zone 'Europe/Lisbon')::date
where scheduled_date is null
  and start_time is not null;

create index if not exists tasks_scheduled_date_idx on public.tasks (scheduled_date);
