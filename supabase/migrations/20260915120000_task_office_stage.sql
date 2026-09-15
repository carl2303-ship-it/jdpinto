-- Fluxo admin: Intervenções → Vista! → A faturar → Faturado → Terminadas
do $$ begin
  create type public.task_office_stage as enum (
    'active',
    'to_invoice',
    'done'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.tasks
  add column if not exists office_stage public.task_office_stage
    not null default 'active';

comment on column public.tasks.office_stage is
  'active = Intervenções; to_invoice = A faturar; done = Terminadas';

create index if not exists tasks_office_stage_idx
  on public.tasks (office_stage);

-- Concluídas antigas ficam em active até o admin marcar Vista!
