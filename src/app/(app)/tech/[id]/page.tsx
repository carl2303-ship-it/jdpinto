import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator, isOfficeRole } from "@/lib/auth";
import type { Client, Task, TaskPhoto } from "@/types/database";
import { formatClientAddress } from "@/lib/forms";
import { TechTaskDetail } from "./tech-task-detail";

type Props = { params: Promise<{ id: string }> };

type ClientInfo = Pick<
  Client,
  | "id"
  | "name"
  | "phone"
  | "address"
  | "street"
  | "postal_code"
  | "locality"
  | "contact_name"
>;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Intervenção ${id.slice(0, 8)}` };
}

export default async function TechTaskPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const me = await getMyCollaborator();

  if (!me) notFound();

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !task) notFound();

  const row = task as Task;

  if (!isOfficeRole(me.role)) {
    const assignedToMe = row.assigned_collaborator_id === me.id;
    let inTeam = false;
    if (row.assigned_team_id) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("team_id", row.assigned_team_id)
        .eq("collaborator_id", me.id)
        .maybeSingle();
      inTeam = Boolean(membership);
    }
    if (!assignedToMe && !inTeam) notFound();
  }

  let client: ClientInfo | null = null;
  if (row.client_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select(
        "id, name, phone, address, street, postal_code, locality, contact_name",
      )
      .eq("id", row.client_id)
      .maybeSingle();
    client = (clientRow as ClientInfo | null) ?? null;
  }

  const displayTask: Task & { client: ClientInfo | null } = {
    ...row,
    address: row.address || formatClientAddress(client) || null,
    contact_name: row.contact_name || client?.contact_name || null,
    contact_phone: row.contact_phone || client?.phone || null,
    client,
  };

  const { data: photos } = await supabase
    .from("task_photos")
    .select("*")
    .eq("task_id", id)
    .order("uploaded_at", { ascending: false });

  const withUrls = await Promise.all(
    ((photos ?? []) as TaskPhoto[]).map(async (p) => {
      const { data } = await supabase.storage
        .from("task-photos")
        .createSignedUrl(p.photo_url, 60 * 60);
      return { ...p, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return <TechTaskDetail task={displayTask} photos={withUrls} />;
}
