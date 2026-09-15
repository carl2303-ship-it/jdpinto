"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Navigation, Play } from "lucide-react";
import type { Client, Task } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TaskStateBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, mapsUrl, wazeUrl } from "@/lib/forms";
import {
  completeTask,
  updateTaskStatus,
  uploadTaskPhoto,
  type ActionResult,
} from "@/app/(app)/tasks/actions";

type TaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
};

const initial: ActionResult | null = null;

export function MobileToday({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(
    tasks.find((t) => t.status === "in_progress")?.id ??
      tasks[0]?.id ??
      null,
  );
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [state, action, pending] = useActionState(completeTask, initial);

  const active = tasks.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (state?.ok) {
      setPhotos(null);
      router.refresh();
    }
  }, [state, router]);

  async function startTask(id: string) {
    const result = await updateTaskStatus(id, "in_progress");
    if (!result.ok) alert(result.error);
    else {
      setActiveId(id);
      router.refresh();
    }
  }

  async function uploadPhotos(taskId: string) {
    if (!photos || photos.length === 0) {
      setPhotoMsg("Seleciona pelo menos uma foto.");
      return;
    }
    setPhotoMsg("A enviar…");
    for (const file of Array.from(photos)) {
      const fd = new FormData();
      fd.set("photo", file);
      fd.set("photo_type", "evidence");
      const result = await uploadTaskPhoto(taskId, fd);
      if (!result.ok) {
        setPhotoMsg(result.error);
        return;
      }
    }
    setPhotoMsg(`${photos.length} foto(s) enviada(s).`);
    setPhotos(null);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Minha Agenda de Hoje
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {tasks.length} intervenção(ões) para hoje.
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Sem tarefas para hoje.
          </CardContent>
        </Card>
      ) : (
        tasks.map((task) => (
          <Card
            key={task.id}
            className={
              activeId === task.id ? "ring-2 ring-brand-sky/40" : undefined
            }
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setActiveId(task.id)}
                >
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription>
                    {task.clients?.name ?? "Sem cliente"} · Agendada{" "}
                    {formatDateTime(task.scheduled_at ?? task.scheduled_date)}
                    {task.start_time
                      ? ` · ${formatDateTime(task.start_time)}`
                      : ""}
                  </CardDescription>
                </button>
                <TaskStateBadge
                  status={task.status}
                  serviceType={task.service_type}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.address && (
                <p className="text-sm text-slate-600">{task.address}</p>
              )}
              {task.contact_phone && (
                <a
                  href={`tel:${task.contact_phone}`}
                  className="block text-sm font-medium text-brand-sky-dark"
                >
                  {task.contact_phone}
                </a>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => startTask(task.id)}
                  disabled={
                    task.status === "completed" ||
                    task.status === "in_progress" ||
                    task.status === "cancelled"
                  }
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
                {task.address ? (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={mapsUrl(task.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Maps
                    </a>
                    <a
                      href={wazeUrl(task.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Waze
                    </a>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" disabled>
                    Sem morada
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {active && active.status !== "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Fecho de Tarefa</CardTitle>
            <CardDescription>{active.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={action} className="space-y-3">
              <input type="hidden" name="id" value={active.id} />
              <div className="space-y-1.5">
                <Label htmlFor="report_notes">Relatório final</Label>
                <Textarea
                  id="report_notes"
                  name="report_notes"
                  placeholder="Relatório final da intervenção…"
                  defaultValue={active.report_notes ?? ""}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="photos">Fotografias</Label>
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-sky/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-sky-dark"
                  onChange={(e) => setPhotos(e.target.files)}
                />
                <div className="flex items-center gap-2">
                  <Select name="photo_type_ui" defaultValue="evidence" disabled>
                    <option value="evidence">Evidência</option>
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => uploadPhotos(active.id)}
                  >
                    Enviar fotos
                  </Button>
                </div>
                {photoMsg && (
                  <p className="text-xs text-slate-500">{photoMsg}</p>
                )}
              </div>

              {state && !state.ok && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}

              <Button
                type="submit"
                variant="success"
                className="w-full"
                disabled={pending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {pending ? "A concluir…" : "Concluir Tarefa"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
