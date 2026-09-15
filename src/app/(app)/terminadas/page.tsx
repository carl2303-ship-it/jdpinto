import { createClient } from "@/lib/supabase/server";
import type { Client, Collaborator, Task, Team } from "@/types/database";
import { BillingTasksBoard } from "../billing/billing-tasks-board";

export const metadata = { title: "Terminadas" };

type TaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
  teams?: Pick<Team, "id" | "name"> | null;
  collaborators?: Pick<Collaborator, "id" | "full_name"> | null;
};

export default async function DoneTasksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, clients:client_id(id,name), teams:assigned_team_id(id,name), collaborators:assigned_collaborator_id(id,full_name)",
    )
    .eq("office_stage", "done")
    .eq("status", "completed")
    .order("end_time", { ascending: false, nullsFirst: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro: {error.message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Terminadas
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Intervenções faturadas. Usa pesquisa e período para encontrar
          rapidamente.
        </p>
      </div>
      <BillingTasksBoard mode="done" tasks={(data ?? []) as TaskRow[]} />
    </div>
  );
}
