-- Duração estimada da intervenção (minutos)
alter table public.tasks
  add column if not exists duration_minutes integer
  check (duration_minutes is null or duration_minutes > 0);
