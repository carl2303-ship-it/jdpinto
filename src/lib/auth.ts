import { createClient } from "@/lib/supabase/server";
import type { Collaborator } from "@/types/database";
import { homePathForRole, isOfficeRole } from "@/lib/auth-shared";

export { homePathForRole, isOfficeRole } from "@/lib/auth-shared";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getMyCollaborator(): Promise<Collaborator | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_collaborator");

  if (error) {
    console.error("get_my_collaborator", error.message);
    return null;
  }

  return (data as Collaborator | null) ?? null;
}
