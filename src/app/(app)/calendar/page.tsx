import { createClient } from "@/lib/supabase/server";
import type { Client, Collaborator, Task, Team } from "@/types/database";
import { CalendarView, type CalendarTask } from "./calendar-view";

export const metadata = { title: "Calendário" };

export default async function CalendarPage() {
  const supabase = await createClient();

  const [tasksRes, clientsRes, teamsRes, collabRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase.from("clients").select("id, name"),
    supabase.from("teams").select("id, name"),
    supabase.from("collaborators").select("id, full_name"),
  ]);

  if (tasksRes.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar calendário: {tasksRes.error.message}
      </div>
    );
  }

  const clients = new Map(
    ((clientsRes.data ?? []) as Pick<Client, "id" | "name">[]).map((c) => [
      c.id,
      c.name,
    ]),
  );
  const teams = new Map(
    ((teamsRes.data ?? []) as Pick<Team, "id" | "name">[]).map((t) => [
      t.id,
      t.name,
    ]),
  );
  const collabs = new Map(
    ((collabRes.data ?? []) as Pick<Collaborator, "id" | "full_name">[]).map(
      (c) => [c.id, c.full_name],
    ),
  );

  const tasks: CalendarTask[] = ((tasksRes.data ?? []) as Task[]).map((t) => ({
    id: t.id,
    title: t.title,
    scheduled_date: t.scheduled_date,
    scheduled_at: t.scheduled_at,
    start_time: t.start_time,
    end_time: t.end_time,
    status: t.status,
    service_type: t.service_type,
    address: t.address,
    client_name: t.client_id ? clients.get(t.client_id) ?? null : null,
    team_name: t.assigned_team_id
      ? teams.get(t.assigned_team_id) ?? null
      : null,
    assignee_name: t.assigned_collaborator_id
      ? collabs.get(t.assigned_collaborator_id) ?? null
      : null,
  }));

  return <CalendarView tasks={tasks} />;
}
