import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@jdpinto.local";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** Notifica colaboradores (e membros da equipa) via Web Push — funciona em 2.º plano. */
export async function notifyTaskAssignees(opts: {
  taskId: string;
  title: string;
  assignedCollaboratorId: string | null;
  assignedTeamId: string | null;
}) {
  if (!configureWebPush()) return;

  const admin = createAdminClient();
  const recipientIds = new Set<string>();

  if (opts.assignedCollaboratorId) {
    recipientIds.add(opts.assignedCollaboratorId);
  }

  if (opts.assignedTeamId) {
    const { data: members } = await admin
      .from("team_members")
      .select("collaborator_id")
      .eq("team_id", opts.assignedTeamId);
    for (const m of members ?? []) {
      recipientIds.add(m.collaborator_id);
    }
  }

  if (recipientIds.size === 0) return;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("collaborator_id", [...recipientIds]);

  if (!subs?.length) return;

  const payload: PushPayload = {
    title: "Nova intervenção JDPINTO",
    body: opts.title,
    url: `/tech/${opts.taskId}`,
  };
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { urgency: "high", TTL: 60 * 60 },
        );
      } catch (err: unknown) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode: number }).statusCode)
            : 0;
        // Subscrição expirada / inválida
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
