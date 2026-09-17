import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  Collaborator,
  Task,
  TaskPhoto,
  Team,
  TeamMember,
} from "@/types/database";
import { TasksManager } from "./tasks-manager";
import type { AttachmentItem } from "@/components/tech/attachment-grid";

export const metadata = { title: "Intervenções" };

export default async function TasksPage() {
  const supabase = await createClient();

  const [tasksRes, clientsRes, teamsRes, collabRes, membersRes] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "*, clients:client_id(id,name), teams:assigned_team_id(id,name,color_code), collaborators:assigned_collaborator_id(id,full_name)",
        )
        .eq("office_stage", "active")
        .order("scheduled_date", { ascending: true, nullsFirst: false }),
      supabase.from("clients").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("collaborators")
        .select("*")
        .eq("status", "active")
        .order("full_name"),
      supabase.from("team_members").select("team_id, collaborator_id"),
    ]);

  const error =
    tasksRes.error ||
    clientsRes.error ||
    teamsRes.error ||
    collabRes.error ||
    membersRes.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar intervenções: {error.message}
      </div>
    );
  }

  const tasks = (tasksRes.data ?? []) as Task[];
  const taskIds = tasks.map((t) => t.id);

  const attachmentsByTask: Record<string, AttachmentItem[]> = {};
  if (taskIds.length > 0) {
    const { data: photoRows } = await supabase
      .from("task_photos")
      .select("*")
      .in("task_id", taskIds)
      .order("uploaded_at", { ascending: false });

    const photos = (photoRows ?? []) as TaskPhoto[];
    await Promise.all(
      photos.map(async (p) => {
        const { data } = await supabase.storage
          .from("task-photos")
          .createSignedUrl(p.photo_url, 60 * 60);
        const item: AttachmentItem = {
          ...p,
          signedUrl: data?.signedUrl ?? null,
        };
        const list = attachmentsByTask[p.task_id] ?? [];
        list.push(item);
        attachmentsByTask[p.task_id] = list;
      }),
    );
  }

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">A carregar…</div>}>
      <TasksManager
        tasks={tasks as Task[]}
        clients={(clientsRes.data ?? []) as Client[]}
        teams={(teamsRes.data ?? []) as Team[]}
        collaborators={(collabRes.data ?? []) as Collaborator[]}
        memberships={(membersRes.data ?? []) as TeamMember[]}
        attachmentsByTask={attachmentsByTask}
      />
    </Suspense>
  );
}
