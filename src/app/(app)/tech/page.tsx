import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator, isOfficeRole } from "@/lib/auth";
import type { Client, Task } from "@/types/database";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatDurationMinutes, formatScheduledDate } from "@/lib/forms";

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

  let query = supabase
    .from("tasks")
    .select("*")
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (!isOfficeRole(me.role)) {
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
  const open = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Olá, {me.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          As tuas intervenções atribuídas · {open.length} em aberto
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Em aberto
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Sem tarefas atribuídas de momento.
            </CardContent>
          </Card>
        ) : (
          open.map((task) => (
            <Link key={task.id} href={`/tech/${task.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <CardDescription>
                        {task.clients?.name ?? "Sem cliente"} ·{" "}
                        {formatScheduledDate(task.scheduled_date)}
                        {task.duration_minutes
                          ? ` · ${formatDurationMinutes(task.duration_minutes)}`
                          : ""}
                        {task.start_time
                          ? ` · ${formatDateTime(task.start_time)}`
                          : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} />
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </CardHeader>
                {task.address && (
                  <CardContent className="pt-0">
                    <p className="flex items-start gap-1.5 text-sm text-slate-600">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {task.address}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Concluídas
          </h2>
          {done.map((task) => (
            <Link key={task.id} href={`/tech/${task.id}`} className="block opacity-80">
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium">
                      {task.title}
                    </CardTitle>
                    <StatusBadge status={task.status} />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
