"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, formatClientAddress } from "@/lib/forms";
import type { Client } from "@/types/database";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertClient(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const id = emptyToNull(formData.get("id"));
  const street = emptyToNull(formData.get("street"));
  const postal_code = emptyToNull(formData.get("postal_code"));
  const locality = emptyToNull(formData.get("locality"));
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    contact_name: emptyToNull(formData.get("contact_name")),
    street,
    postal_code,
    locality,
    address: formatClientAddress({ street, postal_code, locality }),
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
  revalidatePath("/calendar");
  revalidatePath("/tech");
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

export async function createClientFromTask(input: {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  street?: string | null;
  postal_code?: string | null;
  locality?: string | null;
}): Promise<
  | { ok: true; client: Client }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nome do cliente obrigatório." };

  const street = input.street?.trim() || null;
  const postal_code = input.postal_code?.trim() || null;
  const locality = input.locality?.trim() || null;
  const payload = {
    name,
    contact_name: input.contact_name?.trim() || null,
    phone: input.phone?.trim() || null,
    street,
    postal_code,
    locality,
    address: formatClientAddress({ street, postal_code, locality }),
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao criar cliente." };
  }

  revalidatePath("/clients");
  revalidatePath("/tasks");
  return { ok: true, client: data as Client };
}

/** @deprecated use createClientFromTask */
export async function createClientQuick(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const result = await createClientFromTask({ name });
  if (!result.ok) return result;
  return { ok: true, id: result.client.id };
}
