import { createClient } from "@/lib/supabase/server";
import type { Client, Collaborator, Task, Team } from "@/types/database";
import { BillingTasksBoard } from "../billing/billing-tasks-board";

export const metadata = { title: "A faturar" };

type TaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
  teams?: Pick<Team, "id" | "name"> | null;
  collaborators?: Pick<Collaborator, "id" | "full_name"> | null;
};

export default async function ToInvoicePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, clients:client_id(id,name), teams:assigned_team_id(id,name), collaborators:assigned_collaborator_id(id,full_name)",
    )
    .eq("office_stage", "to_invoice")
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
          A faturar
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Relatórios já vistos — marca como <strong>Faturado</strong> para
          enviar para Terminadas.
        </p>
      </div>
      <BillingTasksBoard
        mode="to_invoice"
        tasks={(data ?? []) as TaskRow[]}
      />
    </div>
  );
}
