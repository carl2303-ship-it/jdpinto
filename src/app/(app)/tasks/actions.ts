"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, localDateAndTimeToIso, resolveTaskTimeRange } from "@/lib/forms";
import type { TaskStatus } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

function taskPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: emptyToNull(formData.get("description")),
    client_id: emptyToNull(formData.get("client_id")),
    address: emptyToNull(formData.get("address")),
    contact_name: emptyToNull(formData.get("contact_name")),
    contact_phone: emptyToNull(formData.get("contact_phone")),
    start_time: localDateAndTimeToIso(
      String(formData.get("start_date") ?? ""),
      String(formData.get("start_time") ?? ""),
    ),
    end_time: localDateAndTimeToIso(
      String(formData.get("end_date") ?? ""),
      String(formData.get("end_time") ?? ""),
    ),
    assigned_team_id: emptyToNull(formData.get("assigned_team_id")),
    assigned_collaborator_id: emptyToNull(
      formData.get("assigned_collaborator_id"),
    ),
    status: (emptyToNull(formData.get("status")) ?? "pending") as TaskStatus,
  };
}

export async function upsertTask(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  const payload = taskPayload(formData);

  if (!payload.title) {
    return { ok: false, error: "O título é obrigatório." };
  }

  const times = resolveTaskTimeRange({
    start: payload.start_time,
    end: payload.end_time,
  });
  if (!times.ok) return times;
  payload.start_time = times.start_time;
  payload.end_time = times.end_time;

  // Se morada/telefone vazios, copiar do cliente
  if (payload.client_id && (!payload.address || !payload.contact_phone)) {
    const { data: client } = await supabase
      .from("clients")
      .select("address, phone")
      .eq("id", payload.client_id)
      .maybeSingle();
    if (client) {
      if (!payload.address) payload.address = client.address;
      if (!payload.contact_phone) payload.contact_phone = client.phone;
    }
  }

  const query = id
    ? supabase.from("tasks").update(payload).eq("id", id)
    : supabase.from("tasks").insert(payload);

  const { error } = await query;
  if (error) {
    if (error.message.includes("tasks_time_range_check")) {
      return {
        ok: false,
        error: "A hora de fim tem de ser igual ou posterior à de início.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/mobile");
  revalidatePath("/tech");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/mobile");
  return { ok: true };
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/mobile");
  return { ok: true };
}

export async function completeTask(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  if (!id) return { ok: false, error: "Tarefa em falta." };

  const report_notes = emptyToNull(formData.get("report_notes"));
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", report_notes })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/mobile");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function uploadTaskPhoto(
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const file = formData.get("photo");
  const photoType = emptyToNull(formData.get("photo_type")) ?? "evidence";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Seleciona uma fotografia." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("task-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { error } = await supabase.from("task_photos").insert({
    task_id: taskId,
    photo_url: path,
    photo_type: photoType,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mobile");
  revalidatePath("/tasks");
  return { ok: true };
}
