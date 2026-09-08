-- Pessoa de contacto no cliente
alter table public.clients
  add column if not exists contact_name text;
