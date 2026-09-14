-- Duração prevista (planeamento de equipas)
alter table public.tasks
  add column if not exists planned_duration_minutes integer;

do $$
begin
  alter table public.tasks
    add constraint tasks_planned_duration_minutes_check
    check (
      planned_duration_minutes is null
      or planned_duration_minutes > 0
    );
exception
  when duplicate_object then null;
end $$;
