-- Subscrições Web Push para alertas de tarefas em segundo plano
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.collaborators (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_collaborator_idx
  on public.push_subscriptions (collaborator_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (
    collaborator_id in (
      select id from public.collaborators where user_id = auth.uid()
    )
  );

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (
    collaborator_id in (
      select id from public.collaborators where user_id = auth.uid()
    )
  );

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update to authenticated
  using (
    collaborator_id in (
      select id from public.collaborators where user_id = auth.uid()
    )
  )
  with check (
    collaborator_id in (
      select id from public.collaborators where user_id = auth.uid()
    )
  );

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete to authenticated
  using (
    collaborator_id in (
      select id from public.collaborators where user_id = auth.uid()
    )
  );
