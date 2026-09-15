import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToCollaborators } from "@/lib/push-server";

type ReminderTask = {
  id: string;
  title: string;
  scheduled_at: string;
  assigned_collaborator_id: string | null;
  assigned_team_id: string | null;
  reminder_30_sent_at: string | null;
  reminder_10_sent_at: string | null;
};

async function recipientIdsForTask(
  task: Pick<ReminderTask, "assigned_collaborator_id" | "assigned_team_id">,
) {
  const admin = createAdminClient();
  const ids = new Set<string>();
  if (task.assigned_collaborator_id) ids.add(task.assigned_collaborator_id);
  if (task.assigned_team_id) {
    const { data: members } = await admin
      .from("team_members")
      .select("collaborator_id")
      .eq("team_id", task.assigned_team_id);
    for (const m of members ?? []) ids.add(m.collaborator_id);
  }
  return [...ids];
}

/**
 * Envia avisos push 30 e 10 minutos antes de scheduled_at.
 * Pensado para correr a cada ~5 min (cron Netlify) ou sob pedido.
 */
export async function runScheduledTaskReminders() {
  const admin = createAdminClient();
  const now = Date.now();
  const horizon = new Date(now + 35 * 60_000).toISOString();
  const pastGrace = new Date(now - 5 * 60_000).toISOString();

  const { data, error } = await admin
    .from("tasks")
    .select(
      "id, title, scheduled_at, assigned_collaborator_id, assigned_team_id, reminder_30_sent_at, reminder_10_sent_at",
    )
    .in("status", ["scheduled", "in_progress"])
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", pastGrace)
    .lte("scheduled_at", horizon);

  if (error) throw new Error(error.message);

  const tasks = (data ?? []) as ReminderTask[];
  let sent30 = 0;
  let sent10 = 0;

  for (const task of tasks) {
    if (!task.scheduled_at) continue;
    const minsUntil =
      (new Date(task.scheduled_at).getTime() - now) / 60_000;
    const recipients = await recipientIdsForTask(task);
    if (recipients.length === 0) continue;

    // Aviso ~30 min (janela 10–35 min para não falhar o cron de 5 min)
    if (
      minsUntil <= 35 &&
      minsUntil > 10 &&
      !task.reminder_30_sent_at
    ) {
      await sendPushToCollaborators(recipients, {
        title: "Aviso · daqui a ~30 min",
        body: task.title,
        url: `/tech/${task.id}`,
      });
      await admin
        .from("tasks")
        .update({ reminder_30_sent_at: new Date().toISOString() })
        .eq("id", task.id);
      sent30 += 1;
    }

    // Aviso ~10 min (janela −5–12 min)
    if (minsUntil <= 12 && minsUntil > -5 && !task.reminder_10_sent_at) {
      await sendPushToCollaborators(recipients, {
        title: "Aviso · daqui a ~10 min",
        body: task.title,
        url: `/tech/${task.id}`,
      });
      await admin
        .from("tasks")
        .update({ reminder_10_sent_at: new Date().toISOString() })
        .eq("id", task.id);
      sent10 += 1;
    }
  }

  return { checked: tasks.length, sent30, sent10 };
}

/** Helpers para o cliente (app aberta): minutos até à marcação */
export function minutesUntilSchedule(scheduledAt: string | null | undefined) {
  if (!scheduledAt) return null;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / 60_000;
}
