"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyToNull } from "@/lib/forms";
import type { CollaboratorRole, CollaboratorStatus } from "@/types/database";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function provisionAuthUser(opts: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ userId: string } | { error: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });

    if (error) {
      // Utilizador já existe — tentar obter e ligar
      if (error.message.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const existing = list?.users.find(
          (u) => u.email?.toLowerCase() === opts.email.toLowerCase(),
        );
        if (existing) return { userId: existing.id };
      }
      return { error: error.message };
    }

    if (!data.user) return { error: "Falha ao criar utilizador Auth." };
    return { userId: data.user.id };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao criar conta Auth.",
    };
  }
}

export async function upsertCollaborator(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  const email = emptyToNull(formData.get("email"))?.toLowerCase() ?? null;
  const password = emptyToNull(formData.get("password"));
  const createLogin = formData.get("create_login") === "on";

  const payload = {
    full_name: String(formData.get("full_name") ?? "").trim(),
    phone: emptyToNull(formData.get("phone")),
    email,
    role: (emptyToNull(formData.get("role")) ??
      "field_tech") as CollaboratorRole,
    status: (emptyToNull(formData.get("status")) ??
      "active") as CollaboratorStatus,
  };

  if (payload.role !== "admin" && payload.role !== "field_tech") {
    payload.role = "field_tech";
  }

  if (!payload.full_name) {
    return { ok: false, error: "O nome é obrigatório." };
  }

  let userId: string | null = null;
  let message: string | undefined;

  if (createLogin || (!id && email && password)) {
    if (!email) {
      return { ok: false, error: "Email é obrigatório para criar acesso." };
    }
    if (!password || password.length < 6) {
      return {
        ok: false,
        error: "Password temporária (mín. 6 caracteres) é obrigatória.",
      };
    }

    const provisioned = await provisionAuthUser({
      email,
      password,
      fullName: payload.full_name,
    });

    if ("error" in provisioned) {
      return { ok: false, error: provisioned.error };
    }

    userId = provisioned.userId;
    message =
      "Colaborador guardado. Pode entrar em /login com o email e a password definida.";
  }

  if (id) {
    const updatePayload = {
      ...payload,
      ...(userId ? { user_id: userId } : {}),
    };
    const { error } = await supabase
      .from("collaborators")
      .update(updatePayload)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("collaborators").insert({
      ...payload,
      ...(userId ? { user_id: userId } : {}),
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/team");
  revalidatePath("/tasks");
  revalidatePath("/tech");
  return { ok: true, message };
}

export async function deleteCollaborator(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("collaborators").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function upsertTeam(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  const memberIds = formData.getAll("member_ids").map(String).filter(Boolean);

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    leader_id: emptyToNull(formData.get("leader_id")),
    color_code: emptyToNull(formData.get("color_code")) ?? "#0284c7",
  };

  if (!payload.name) {
    return { ok: false, error: "O nome da equipa é obrigatório." };
  }

  let teamId = id;

  if (id) {
    const { error } = await supabase
      .from("teams")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Erro ao criar equipa." };
    }
    teamId = data.id;
  }

  if (teamId) {
    await supabase.from("team_members").delete().eq("team_id", teamId);
    if (memberIds.length > 0) {
      const { error: membersError } = await supabase.from("team_members").insert(
        memberIds.map((collaborator_id) => ({
          team_id: teamId!,
          collaborator_id,
        })),
      );
      if (membersError) return { ok: false, error: membersError.message };
    }
  }

  revalidatePath("/team");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/tech");
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  revalidatePath("/tasks");
  return { ok: true };
}
