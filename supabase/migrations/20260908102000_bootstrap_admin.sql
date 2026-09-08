-- Bootstrap: primeiro utilizador autenticado torna-se admin
-- quando ainda não existem colaboradores.

create or replace function public.claim_bootstrap_admin(p_full_name text default 'Administrador')
returns public.collaborators
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.collaborators;
  clean_name text := nullif(trim(p_full_name), '');
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select * into rec
  from public.collaborators
  where user_id = auth.uid()
  limit 1;

  if found then
    return rec;
  end if;

  if exists (select 1 from public.collaborators) then
    raise exception 'Registo inicial fechado. Peça a um administrador para o adicionar.';
  end if;

  insert into public.collaborators (user_id, full_name, role, status)
  values (auth.uid(), coalesce(clean_name, 'Administrador'), 'admin', 'active')
  returning * into rec;

  return rec;
end;
$$;

revoke all on function public.claim_bootstrap_admin(text) from public;
grant execute on function public.claim_bootstrap_admin(text) to authenticated;

-- Perfil do utilizador autenticado
create or replace function public.get_my_collaborator()
returns public.collaborators
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.collaborators
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_collaborator() from public;
grant execute on function public.get_my_collaborator() to authenticated;
