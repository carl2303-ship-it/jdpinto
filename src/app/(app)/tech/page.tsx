import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator, isOfficeRole } from "@/lib/auth";
import type { Client, Task } from "@/types/database";
import { TechTaskList } from "@/components/tech/tech-task-list";

export const metadata = { title: "As minhas tarefas" };

type TaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
};

export default async function TechDashboardPage() {
  const supabase = await createClient();
  const me = await getMyCollaborator();

  if (!me) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        A tua conta Auth ainda não está ligada a um colaborador. Pede ao admin
        para criar o teu perfil em Equipas com o teu email e acesso.
      </div>
    );
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("collaborator_id", me.id);
  const teamIds = (memberships ?? []).map((m) => m.team_id);
  const office = isOfficeRole(me.role);

  let query = supabase
    .from("tasks")
    .select("*")
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (!office) {
    const filters = [`assigned_collaborator_id.eq.${me.id}`];
    if (teamIds.length > 0) {
      filters.push(`assigned_team_id.in.(${teamIds.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro: {error.message}
      </div>
    );
  }

  const rawTasks = (data ?? []) as Task[];
  const clientIds = [
    ...new Set(rawTasks.map((t) => t.client_id).filter(Boolean)),
  ] as string[];

  const clientsMap = new Map<string, Pick<Client, "id" | "name">>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", clientIds);
    for (const c of clients ?? []) {
      clientsMap.set(c.id, c);
    }
  }

  const tasks: TaskRow[] = rawTasks.map((t) => ({
    ...t,
    clients: t.client_id ? clientsMap.get(t.client_id) ?? null : null,
  }));
  const openCount = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Olá, {me.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          As tuas intervenções atribuídas · {openCount} em aberto
        </p>
      </div>

      <TechTaskList
        initialTasks={tasks}
        collaboratorId={me.id}
        teamIds={teamIds}
        isOffice={office}
      />
    </div>
  );
}
