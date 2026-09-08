-- JDPINTO — Gestão de Intervenções e Equipas
-- Schema inicial + RLS + Storage

create extension if not exists "pgcrypto";

-- Enums
create type public.collaborator_role as enum ('admin', 'field_tech', 'manager');
create type public.collaborator_status as enum ('active', 'inactive');
create type public.task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type public.photo_type as enum ('before', 'after', 'evidence');

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  vat_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- Collaborators (perfil ligado ao Auth)
create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  role public.collaborator_role not null default 'field_tech',
  phone text,
  status public.collaborator_status not null default 'active',
  created_at timestamptz not null default now()
);

create index collaborators_user_id_idx on public.collaborators (user_id);
create index collaborators_role_idx on public.collaborators (role);

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.collaborators (id) on delete set null,
  color_code text not null default '#0284c7',
  created_at timestamptz not null default now()
);

-- Team members
create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  collaborator_id uuid not null references public.collaborators (id) on delete cascade,
  primary key (team_id, collaborator_id)
);

create index team_members_collaborator_idx on public.team_members (collaborator_id);

-- Tasks (Intervenções)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_id uuid references public.clients (id) on delete set null,
  address text,
  contact_phone text,
  start_time timestamptz,
  end_time timestamptz,
  assigned_team_id uuid references public.teams (id) on delete set null,
  assigned_collaborator_id uuid references public.collaborators (id) on delete set null,
  status public.task_status not null default 'pending',
  report_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_time_range_check check (
    start_time is null or end_time is null or end_time >= start_time
  )
);

create index tasks_start_time_idx on public.tasks (start_time);
create index tasks_status_idx on public.tasks (status);
create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_assigned_team_id_idx on public.tasks (assigned_team_id);
create index tasks_assigned_collaborator_id_idx on public.tasks (assigned_collaborator_id);

-- Task photos
create table public.task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  photo_url text not null,
  photo_type public.photo_type not null default 'evidence',
  uploaded_at timestamptz not null default now()
);

create index task_photos_task_id_idx on public.task_photos (task_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- Auth helpers (security definer, schema private-ish via revoke)
create or replace function public.current_collaborator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.collaborators
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_collaborator_role()
returns public.collaborator_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.collaborators
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_office_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'manager') from public.collaborators
     where user_id = auth.uid() and status = 'active' limit 1),
    false
  );
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.collaborator_id = public.current_collaborator_id()
  );
$$;

revoke all on function public.current_collaborator_id() from public;
revoke all on function public.current_collaborator_role() from public;
revoke all on function public.is_office_staff() from public;
revoke all on function public.is_team_member(uuid) from public;

grant execute on function public.current_collaborator_id() to authenticated;
grant execute on function public.current_collaborator_role() to authenticated;
grant execute on function public.is_office_staff() to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;

-- RLS
alter table public.clients enable row level security;
alter table public.collaborators enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_photos enable row level security;

-- clients
create policy "clients_select_authenticated"
  on public.clients for select to authenticated
  using (true);

create policy "clients_write_office"
  on public.clients for all to authenticated
  using (public.is_office_staff())
  with check (public.is_office_staff());

-- collaborators
create policy "collaborators_select_authenticated"
  on public.collaborators for select to authenticated
  using (true);

create policy "collaborators_update_self"
  on public.collaborators for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "collaborators_write_admin"
  on public.collaborators for all to authenticated
  using (public.current_collaborator_role() = 'admin')
  with check (public.current_collaborator_role() = 'admin');

-- teams
create policy "teams_select_authenticated"
  on public.teams for select to authenticated
  using (true);

create policy "teams_write_office"
  on public.teams for all to authenticated
  using (public.is_office_staff())
  with check (public.is_office_staff());

-- team_members
create policy "team_members_select_authenticated"
  on public.team_members for select to authenticated
  using (true);

create policy "team_members_write_office"
  on public.team_members for all to authenticated
  using (public.is_office_staff())
  with check (public.is_office_staff());

-- tasks
create policy "tasks_select_scoped"
  on public.tasks for select to authenticated
  using (
    public.is_office_staff()
    or assigned_collaborator_id = public.current_collaborator_id()
    or (assigned_team_id is not null and public.is_team_member(assigned_team_id))
  );

create policy "tasks_insert_office"
  on public.tasks for insert to authenticated
  with check (public.is_office_staff());

create policy "tasks_update_scoped"
  on public.tasks for update to authenticated
  using (
    public.is_office_staff()
    or assigned_collaborator_id = public.current_collaborator_id()
    or (assigned_team_id is not null and public.is_team_member(assigned_team_id))
  )
  with check (
    public.is_office_staff()
    or assigned_collaborator_id = public.current_collaborator_id()
    or (assigned_team_id is not null and public.is_team_member(assigned_team_id))
  );

create policy "tasks_delete_office"
  on public.tasks for delete to authenticated
  using (public.is_office_staff());

-- task_photos
create policy "task_photos_select_scoped"
  on public.task_photos for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.is_office_staff()
          or t.assigned_collaborator_id = public.current_collaborator_id()
          or (t.assigned_team_id is not null and public.is_team_member(t.assigned_team_id))
        )
    )
  );

create policy "task_photos_insert_scoped"
  on public.task_photos for insert to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.is_office_staff()
          or t.assigned_collaborator_id = public.current_collaborator_id()
          or (t.assigned_team_id is not null and public.is_team_member(t.assigned_team_id))
        )
    )
  );

create policy "task_photos_delete_scoped"
  on public.task_photos for delete to authenticated
  using (
    public.is_office_staff()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_collaborator_id = public.current_collaborator_id()
          or (t.assigned_team_id is not null and public.is_team_member(t.assigned_team_id))
        )
    )
  );

-- Storage: bucket task-photos (privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "task_photos_storage_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'task-photos');

create policy "task_photos_storage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'task-photos');

create policy "task_photos_storage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'task-photos')
  with check (bucket_id = 'task-photos');

create policy "task_photos_storage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'task-photos' and public.is_office_staff());
