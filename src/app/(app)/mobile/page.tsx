import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator } from "@/lib/auth";
import type { Task } from "@/types/database";
import { MobileToday } from "./mobile-today";

export const metadata = { title: "Portal Técnico" };

function todayDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function MobilePortalPage() {
  const supabase = await createClient();
  const me = await getMyCollaborator();
  const today = todayDate();

  let query = supabase
    .from("tasks")
    .select("*, clients:client_id(id,name)")
    .eq("scheduled_date", today)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: true });

  if (me && me.role === "field_tech") {
    query = query.or(
      `assigned_collaborator_id.eq.${me.id},assigned_team_id.not.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro: {error.message}
      </div>
    );
  }

  return <MobileToday tasks={(data ?? []) as Task[]} />;
}
