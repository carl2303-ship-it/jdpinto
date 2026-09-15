-- Tipo de serviço / marcação (independente do estado workflow)
do $$ begin
  create type public.task_service_type as enum (
    'agendado_com_marcacao',
    'agendado_sem_marcacao',
    'sem_marcacao',
    'urgente',
    'nao_urgente'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.tasks
  add column if not exists service_type public.task_service_type
    not null default 'agendado_com_marcacao';

comment on column public.tasks.service_type is
  'Tipo de marcação/prioridade do serviço (pedido do cliente)';

create index if not exists tasks_service_type_idx
  on public.tasks (service_type);
