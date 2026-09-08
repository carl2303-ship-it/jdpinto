-- Morada do cliente em 3 campos
alter table public.clients
  add column if not exists street text,
  add column if not exists postal_code text,
  add column if not exists locality text;

-- Migrar morada antiga para Rua quando os novos campos estão vazios
update public.clients
set street = address
where address is not null
  and street is null
  and postal_code is null
  and locality is null;
