-- Pessoa de contacto na intervenção
alter table public.tasks
  add column if not exists contact_name text;
