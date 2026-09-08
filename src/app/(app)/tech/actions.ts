"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator } from "@/lib/auth";
import { emptyToNull, localDateAndTimeToIso, resolveTaskTimeRange } from "@/lib/forms";
import type { PhotoType, TaskStatus } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function assertCanEditTask(taskId: string) {
  const supabase = await createClient();
  const me = await getMyCollaborator();
  if (!me) return { ok: false as const, error: "Sem perfil de colaborador." };

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, assigned_collaborator_id, assigned_team_id, start_time")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    return { ok: false as const, error: "Tarefa não encontrada." };
  }

  if (me.role === "admin" || me.role === "manager") {
    return { ok: true as const, supabase, me, task };
  }

  if (task.assigned_collaborator_id === me.id) {
    return { ok: true as const, supabase, me, task };
  }

  if (task.assigned_team_id) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", task.assigned_team_id)
      .eq("collaborator_id", me.id)
      .maybeSingle();
    if (membership) return { ok: true as const, supabase, me, task };
  }

  return { ok: false as const, error: "Sem permissão para esta tarefa." };
}

export async function saveTechIntervention(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const taskId = emptyToNull(formData.get("id"));
  if (!taskId) return { ok: false, error: "Tarefa em falta." };

  const access = await assertCanEditTask(taskId);
  if (!access.ok) return access;

  const intent = emptyToNull(formData.get("intent")) ?? "save";
  const completing = intent === "complete";

  let status = (emptyToNull(formData.get("status")) ??
    "in_progress") as TaskStatus;

  const formStart = localDateAndTimeToIso(
    String(formData.get("start_date") ?? ""),
    String(formData.get("start_time") ?? ""),
  );
  const formEnd = localDateAndTimeToIso(
    String(formData.get("end_date") ?? ""),
    String(formData.get("end_time") ?? ""),
  );

  const times = resolveTaskTimeRange({
    start: formStart ?? access.task.start_time ?? null,
    end: formEnd,
    completing,
  });

  if (!times.ok) return times;

  if (completing) {
    status = "completed";
  }

  const payload = {
    report_notes: emptyToNull(formData.get("report_notes")),
    description: emptyToNull(formData.get("description")),
    start_time: times.start_time,
    end_time: times.end_time,
    status,
  };

  const { error } = await access.supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId);

  if (error) {
    if (error.message.includes("tasks_time_range_check")) {
      return {
        ok: false,
        error: "A hora de fim tem de ser igual ou posterior à de início.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/tech");
  revalidatePath(`/tech/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/mobile");
  return { ok: true };
}

export async function uploadTechPhotos(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const taskId = emptyToNull(formData.get("task_id"));
  if (!taskId) return { ok: false, error: "Tarefa em falta." };

  const access = await assertCanEditTask(taskId);
  if (!access.ok) return access;

  const photoType = (emptyToNull(formData.get("photo_type")) ??
    "evidence") as PhotoType;
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { ok: false, error: "Seleciona pelo menos uma fotografia." };
  }

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await access.supabase.storage
      .from("task-photos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { error } = await access.supabase.from("task_photos").insert({
      task_id: taskId,
      photo_url: path,
      photo_type: photoType,
    });

    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/tech/${taskId}`);
  revalidatePath("/tech");
  return { ok: true };
}

export async function startMyTask(taskId: string): Promise<ActionResult> {
  const access = await assertCanEditTask(taskId);
  if (!access.ok) return access;

  const { error } = await access.supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tech");
  revalidatePath(`/tech/${taskId}`);
  return { ok: true };
}
