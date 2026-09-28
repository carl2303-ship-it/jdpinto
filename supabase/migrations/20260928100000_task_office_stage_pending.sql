-- Pendentes entre Intervenções e A faturar
do $$ begin
  alter type public.task_office_stage add value 'pending';
exception
  when duplicate_object then null;
end $$;

comment on column public.tasks.office_stage is
  'active = Intervenções; pending = Pendentes; to_invoice = A faturar; done = Terminadas';
