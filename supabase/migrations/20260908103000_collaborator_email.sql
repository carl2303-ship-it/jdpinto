-- Email do colaborador (para login / convite)
alter table public.collaborators
  add column if not exists email text;

create unique index if not exists collaborators_email_unique
  on public.collaborators (lower(email))
  where email is not null;
