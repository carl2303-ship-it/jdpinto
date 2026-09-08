import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Client, Collaborator, Task, Team } from "@/types/database";
import { TasksManager } from "./tasks-manager";

export const metadata = { title: "Intervenções" };

export default async function TasksPage() {
  const supabase = await createClient();

  const [tasksRes, clientsRes, teamsRes, collabRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "*, clients:client_id(id,name), teams:assigned_team_id(id,name,color_code), collaborators:assigned_collaborator_id(id,full_name)",
      )
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase.from("clients").select("*").order("name"),
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("collaborators")
      .select("*")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const error =
    tasksRes.error || clientsRes.error || teamsRes.error || collabRes.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar intervenções: {error.message}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">A carregar…</div>}>
      <TasksManager
        tasks={(tasksRes.data ?? []) as Task[]}
        clients={(clientsRes.data ?? []) as Client[]}
        teams={(teamsRes.data ?? []) as Team[]}
        collaborators={(collabRes.data ?? []) as Collaborator[]}
      />
    </Suspense>
  );
}
