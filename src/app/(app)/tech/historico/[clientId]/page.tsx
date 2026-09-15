import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyCollaborator, isOfficeRole } from "@/lib/auth";
import type { Client, Task, TaskPhoto } from "@/types/database";
import {
  TaskStateBadge,
} from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  formatDurationMinutes,
} from "@/lib/forms";
import { PHOTO_TYPE_LABELS, taskDetailHref } from "@/types/database";

type Props = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ from?: string }>;
};

type HistoryTask = Task & {
  photos: Array<TaskPhoto & { signedUrl: string | null }>;
};

async function techCanAccessClient(
  clientId: string,
  fromTaskId: string | undefined,
  meId: string,
  isOffice: boolean,
) {
  if (isOffice) return true;
  if (!fromTaskId) return false;

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, client_id, assigned_collaborator_id, assigned_team_id")
    .eq("id", fromTaskId)
    .maybeSingle();

  if (!task || task.client_id !== clientId) return false;
  if (task.assigned_collaborator_id === meId) return true;

  if (task.assigned_team_id) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("team_id", task.assigned_team_id)
      .eq("collaborator_id", meId)
      .maybeSingle();
    return Boolean(membership);
  }

  return false;
}

export async function generateMetadata({ params }: Props) {
  const { clientId } = await params;
  return { title: `Histórico · ${clientId.slice(0, 8)}` };
}

export default async function ClientHistoryPage({
  params,
  searchParams,
}: Props) {
  const { clientId } = await params;
  const { from } = await searchParams;
  const me = await getMyCollaborator();
  if (!me) notFound();

  const office = isOfficeRole(me.role);
  const allowed = await techCanAccessClient(
    clientId,
    from,
    me.id,
    office,
  );
  if (!allowed) notFound();

  const admin = createAdminClient();

  const { data: clientRow } = await admin
    .from("clients")
    .select("id, name, address, street, postal_code, locality")
    .eq("id", clientId)
    .maybeSingle();

  if (!clientRow) notFound();
  const client = clientRow as Pick<
    Client,
    "id" | "name" | "address" | "street" | "postal_code" | "locality"
  >;

  const { data: taskRows } = await admin
    .from("tasks")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("end_time", { ascending: false, nullsFirst: false });

  const completed = ((taskRows ?? []) as Task[]).filter(
    (t) => !from || t.id !== from,
  );

  const history: HistoryTask[] = await Promise.all(
    completed.map(async (task) => {
      const { data: photos } = await admin
        .from("task_photos")
        .select("*")
        .eq("task_id", task.id)
        .order("uploaded_at", { ascending: false });

      const withUrls = await Promise.all(
        ((photos ?? []) as TaskPhoto[]).map(async (p) => {
          const { data } = await admin.storage
            .from("task-photos")
            .createSignedUrl(p.photo_url, 60 * 60);
          return { ...p, signedUrl: data?.signedUrl ?? null };
        }),
      );

      return { ...task, photos: withUrls };
    }),
  );

  const backHref = from
    ? taskDetailHref(from, "tech")
    : "/tech";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à intervenção
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Histórico do cliente
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {client.name} · {history.length} intervenção(ões) concluída(s)
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Ainda não há intervenções concluídas para este cliente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {task.end_time
                          ? formatDateTime(task.end_time)
                          : task.start_time
                            ? formatDateTime(task.start_time)
                            : "Sem data"}
                      </span>
                      {task.duration_minutes
                        ? ` · ${formatDurationMinutes(task.duration_minutes)}`
                        : null}
                    </CardDescription>
                  </div>
                  <TaskStateBadge
                    status={task.status}
                    serviceType={task.service_type}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(task.report_notes || task.description) && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {task.report_notes || task.description}
                  </div>
                )}
                {task.photos.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <Camera className="h-3.5 w-3.5" />
                      Fotos ({task.photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {task.photos.map((p) =>
                        p.signedUrl ? (
                          <a
                            key={p.id}
                            href={p.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={p.signedUrl}
                              alt={PHOTO_TYPE_LABELS[p.photo_type]}
                              className="h-full w-full object-cover transition group-hover:opacity-90"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/55 px-1 py-0.5 text-[10px] text-white">
                              {PHOTO_TYPE_LABELS[p.photo_type]}
                            </span>
                          </a>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}
                {!task.report_notes &&
                  !task.description &&
                  task.photos.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Sem notas nem fotos nesta intervenção.
                    </p>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
