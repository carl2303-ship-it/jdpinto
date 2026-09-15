"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator, isOfficeRole } from "@/lib/auth";
import type { TaskOfficeStage } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function assertOffice() {
  const me = await getMyCollaborator();
  if (!me || !isOfficeRole(me.role)) {
    return { ok: false as const, error: "Apenas administradores." };
  }
  return { ok: true as const, me };
}

async function setOfficeStage(
  taskId: string,
  stage: TaskOfficeStage,
  requireCompleted: boolean,
): Promise<ActionResult> {
  const gate = await assertOffice();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, status, office_stage")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchError || !task) {
    return { ok: false, error: "Tarefa não encontrada." };
  }
  if (requireCompleted && task.status !== "completed") {
    return { ok: false, error: "Só intervenções concluídas." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ office_stage: stage })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/a-faturar");
  revalidatePath("/terminadas");
  revalidatePath(`/tech/${taskId}`);
  revalidatePath("/calendar");
  return { ok: true };
}

/** Admin viu o relatório → sai de Intervenções e vai para A faturar */
export async function markTaskViewed(taskId: string): Promise<ActionResult> {
  return setOfficeStage(taskId, "to_invoice", true);
}

/** Marcada como faturada → Terminadas */
export async function markTaskInvoiced(taskId: string): Promise<ActionResult> {
  return setOfficeStage(taskId, "done", true);
}

/** Reabrir para A faturar (correção) */
export async function markTaskToInvoice(taskId: string): Promise<ActionResult> {
  return setOfficeStage(taskId, "to_invoice", true);
}
