"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  emptyToNull,
  formatClientAddress,
  localDateAndTimeToIso,
} from "@/lib/forms";
import { parsePlannedDurationFromForm } from "@/lib/team-availability";
import { notifyTaskAssignees } from "@/lib/push-server";
import type { PhotoType, TaskServiceType, TaskStatus } from "@/types/database";
import {
  serviceTypeRequiresDate,
  serviceTypeRequiresSlot,
} from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function uploadAdminPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  formData: FormData,
) {
  const files = formData
    .getAll("admin_photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return null as string | null;

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("task-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return uploadError.message;

    const { error } = await supabase.from("task_photos").insert({
      task_id: taskId,
      photo_url: path,
      photo_type: "briefing" as PhotoType,
    });
    if (error) return error.message;
  }
  return null;
}

function taskPayload(formData: FormData) {
  const scheduledDate = emptyToNull(formData.get("scheduled_date"));
  const scheduledTime = String(formData.get("scheduled_time") ?? "").trim();
  const scheduledAt = localDateAndTimeToIso(
    String(formData.get("scheduled_date") ?? ""),
    scheduledTime,
  );
  const serviceType = (emptyToNull(formData.get("service_type")) ??
    "agendado_com_marcacao") as TaskServiceType;

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: emptyToNull(formData.get("description")),
    client_id: emptyToNull(formData.get("client_id")),
    address: null as string | null,
    contact_name: null as string | null,
    contact_phone: null as string | null,
    service_type: serviceType,
    scheduled_date: scheduledDate,
    scheduled_at: scheduledAt,
    planned_duration_minutes: parsePlannedDurationFromForm(formData),
    assigned_team_id: emptyToNull(formData.get("assigned_team_id")),
    assigned_collaborator_id: emptyToNull(
      formData.get("assigned_collaborator_id"),
    ),
    status: (emptyToNull(formData.get("status")) ?? "scheduled") as TaskStatus,
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
  if (!payload.client_id) {
    return { ok: false, error: "Seleciona ou cria um cliente." };
  }

  if (serviceTypeRequiresSlot(payload.service_type)) {
    if (!payload.scheduled_date || !payload.scheduled_at) {
      return {
        ok: false,
        error: "Com marcação: data e hora de agendamento são obrigatórias.",
      };
    }
    if (!payload.planned_duration_minutes) {
      return {
        ok: false,
        error: "Com marcação: a duração prevista é obrigatória.",
      };
    }
  } else if (serviceTypeRequiresDate(payload.service_type)) {
    if (!payload.scheduled_date) {
      return {
        ok: false,
        error: "Agendado sem marcação: indica pelo menos o dia.",
      };
    }
  }

  // Sem data/hora: limpar campos vazios (evitar inconsistências)
  if (!payload.scheduled_date) {
    payload.scheduled_at = null;
  }

  // Morada e contactos vêm sempre do cliente
  const { data: client } = await supabase
    .from("clients")
    .select("street, postal_code, locality, address, phone, contact_name")
    .eq("id", payload.client_id)
    .maybeSingle();
  if (!client) {
    return { ok: false, error: "Cliente não encontrado." };
  }
  payload.address = formatClientAddress(client);
  payload.contact_phone = client.phone;
  payload.contact_name = client.contact_name;

  let previousAssignee: {
    assigned_collaborator_id: string | null;
    assigned_team_id: string | null;
    scheduled_at: string | null;
  } | null = null;

  if (id) {
    const { data: prev } = await supabase
      .from("tasks")
      .select("assigned_collaborator_id, assigned_team_id, scheduled_at")
      .eq("id", id)
      .maybeSingle();
    previousAssignee = prev;
    // Se a marcação mudou, reinicia lembretes 10/30
    if (prev && prev.scheduled_at !== payload.scheduled_at) {
      Object.assign(payload, {
        reminder_30_sent_at: null,
        reminder_10_sent_at: null,
      });
    }
  }

  const query = id
    ? supabase.from("tasks").update(payload).eq("id", id)
    : supabase.from("tasks").insert(payload);

  const { data: saved, error } = await query
    .select("id, title, assigned_collaborator_id, assigned_team_id")
    .single();
  if (error) return { ok: false, error: error.message };

  const photoError = await uploadAdminPhotos(supabase, saved.id, formData);
  if (photoError) {
    return {
      ok: false,
      error: `Serviço guardado, mas falhou o upload de imagens: ${photoError}`,
    };
  }

  const assigneeChanged =
    !previousAssignee ||
    previousAssignee.assigned_collaborator_id !==
      saved.assigned_collaborator_id ||
    previousAssignee.assigned_team_id !== saved.assigned_team_id;

  if (
    assigneeChanged &&
    (saved.assigned_collaborator_id || saved.assigned_team_id)
  ) {
    try {
      await notifyTaskAssignees({
        taskId: saved.id,
        title: saved.title,
        assignedCollaboratorId: saved.assigned_collaborator_id,
        assignedTeamId: saved.assigned_team_id,
      });
    } catch {
      // Não falhar o save se o push falhar
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/mobile");
  revalidatePath("/tech");
  revalidatePath(`/tech/${saved.id}`);
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
