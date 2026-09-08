import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator } from "@/lib/auth";
import type { Task } from "@/types/database";
import { MobileToday } from "./mobile-today";

export const metadata = { title: "Portal Técnico" };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export default async function MobilePortalPage() {
  const supabase = await createClient();
  const me = await getMyCollaborator();

  let query = supabase
    .from("tasks")
    .select("*, clients:client_id(id,name)")
    .gte("start_time", startOfDay())
    .lte("start_time", endOfDay())
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  // Técnicos veem sobretudo as suas; office staff vê todas as de hoje
  if (me && me.role === "field_tech") {
    query = query.or(
      `assigned_collaborator_id.eq.${me.id},assigned_team_id.not.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar agenda: {error.message}
      </div>
    );
  }

  let tasks = (data ?? []) as Task[];

  // Filtrar por equipa do técnico no cliente (RLS já restringe; refinamos UX)
  if (me?.role === "field_tech") {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("collaborator_id", me.id);
    const teamIds = new Set((memberships ?? []).map((m) => m.team_id));
    tasks = tasks.filter(
      (t) =>
        t.assigned_collaborator_id === me.id ||
        (t.assigned_team_id && teamIds.has(t.assigned_team_id)),
    );
  }

  return <MobileToday tasks={tasks} />;
}
