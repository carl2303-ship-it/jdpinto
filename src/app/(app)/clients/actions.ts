"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertClient(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    address: emptyToNull(formData.get("address")),
    vat_number: emptyToNull(formData.get("vat_number")),
    notes: emptyToNull(formData.get("notes")),
  };

  if (!payload.name) {
    return { ok: false, error: "O nome é obrigatório." };
  }

  const query = id
    ? supabase.from("clients").update(payload).eq("id", id)
    : supabase.from("clients").insert(payload);

  const { error } = await query;
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clients");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function createClientQuick(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Nome do cliente obrigatório." };

  const { data, error } = await supabase
    .from("clients")
    .insert({ name: clean })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao criar cliente." };
  }

  revalidatePath("/clients");
  revalidatePath("/tasks");
  return { ok: true, id: data.id };
}
