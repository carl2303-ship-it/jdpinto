"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  Play,
  Upload,
  User,
} from "lucide-react";
import type { Client, Task, TaskPhoto } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { DateTime24Fields } from "@/components/ui/date-time-24";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatDurationMinutes, formatClientAddress, mapsUrl, wazeUrl, durationMinutesBetween } from "@/lib/forms";
import {
  saveTechIntervention,
  startMyTask,
  uploadTechPhotos,
  type ActionResult,
} from "@/app/(app)/tech/actions";

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

type Props = {
  task: Task & { client: ClientInfo | null };
  photos: Array<TaskPhoto & { signedUrl?: string | null }>;
};

const initial: ActionResult | null = null;

export function TechTaskDetail({ task, photos }: Props) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    saveTechIntervention,
    initial,
  );
  const [photoState, photoAction, photoPending] = useActionState(
    uploadTechPhotos,
    initial,
  );
  const [previews, setPreviews] = useState<string[]>([]);

  const clientName = task.client?.name ?? "Sem cliente";
  const address =
    task.address || formatClientAddress(task.client) || "";
  const phone = task.contact_phone || task.client?.phone || "";

  useEffect(() => {
    if (saveState?.ok || photoState?.ok) router.refresh();
  }, [saveState, photoState, router]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/tech"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à agenda
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Agendada:{" "}
            {formatDateTime(task.scheduled_at ?? task.scheduled_date)}
            {task.planned_duration_minutes
              ? ` · Prevista ${formatDurationMinutes(task.planned_duration_minutes)}`
              : ""}
            {task.start_time
              ? ` · Início ${formatDateTime(task.start_time)}`
              : ""}
            {task.end_time ? ` – Fim ${formatDateTime(task.end_time)}` : ""}
            {task.duration_minutes
              ? ` · Duração ${formatDurationMinutes(task.duration_minutes)}`
              : ""}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <Card className="border-brand-sky/20 bg-brand-sky/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dados do serviço</CardTitle>
          <CardDescription>Cliente e contactos no local</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky-dark" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cliente
              </p>
              <p className="font-semibold text-brand-navy">{clientName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky-dark" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Morada
              </p>
              <p className="text-brand-navy">
                {address || "Morada não definida"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky-dark" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Pessoa de contacto
              </p>
              <p className="text-brand-navy">
                {task.contact_name ||
                  task.client?.contact_name ||
                  "Não indicada"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky-dark" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Telefone de contacto
              </p>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="font-medium text-brand-sky-dark underline-offset-2 hover:underline"
                >
                  {phone}
                </a>
              ) : (
                <p className="text-slate-500">Sem telefone</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {task.status === "scheduled" && (
          <Button
            type="button"
            onClick={async () => {
              const r = await startMyTask(task.id);
              if (!r.ok) alert(r.error);
              else router.refresh();
            }}
          >
            <Play className="h-4 w-4" />
            Iniciar intervenção
          </Button>
        )}
        {address && (
          <>
            <a
              href={mapsUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4" />
              Google Maps
            </a>
            <a
              href={wazeUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Navigation className="h-4 w-4" />
              Waze
            </a>
          </>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex h-10 items-center rounded-lg bg-brand-sky/10 px-4 text-sm font-medium text-brand-sky-dark"
          >
            Ligar {phone}
          </a>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da intervenção</CardTitle>
          <CardDescription>
            Preenche início e fim (24h). Com data/hora de fim a duração é
            calculada e a tarefa fica concluída.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveAction} className="space-y-3">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="intent" id="intent" value="save" />

            <div className="space-y-1.5">
              <Label htmlFor="description">Notas / descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={task.description ?? ""}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTime24Fields
                label="Início"
                dateName="start_date"
                timeName="start_time"
                value={task.start_time}
              />
              <DateTime24Fields
                label="Fim"
                dateName="end_date"
                timeName="end_time"
                value={task.end_time}
              />
            </div>

            {task.start_time && task.end_time && (
              <p className="rounded-lg bg-brand-sky/10 px-3 py-2 text-sm font-medium text-brand-sky-dark">
                Duração:{" "}
                {formatDurationMinutes(
                  task.duration_minutes ??
                    durationMinutesBetween(task.start_time, task.end_time),
                )}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="report_notes">Relatório final</Label>
              <Textarea
                id="report_notes"
                name="report_notes"
                defaultValue={task.report_notes ?? ""}
                placeholder="Trabalho realizado, materiais, observações…"
                className="min-h-32"
              />
            </div>

            {saveState && !saveState.ok && (
              <p className="text-sm text-red-600">{saveState.error}</p>
            )}
            {saveState?.ok && (
              <p className="text-sm text-status-completed">Guardado.</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={savePending}
                className="flex-1"
                onClick={() => {
                  const el = document.getElementById(
                    "intent",
                  ) as HTMLInputElement | null;
                  if (el) el.value = "save";
                }}
              >
                {savePending ? "A guardar…" : "Guardar detalhes"}
              </Button>
              {task.status !== "completed" ? (
                <Button
                  type="submit"
                  variant="success"
                  disabled={savePending}
                  className="flex-1"
                  onClick={() => {
                    const el = document.getElementById(
                      "intent",
                    ) as HTMLInputElement | null;
                    if (el) el.value = "complete";
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir tarefa
                </Button>
              ) : (
                <p className="flex flex-1 items-center text-xs text-slate-500 sm:justify-end">
                  Concluída — podes corrigir horários, relatório ou fotos e
                  guardar.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotografias</CardTitle>
          <CardDescription>
            Antes, depois ou evidência — upload múltiplo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p) => (
                <figure
                  key={p.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {p.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signedUrl}
                      alt={p.photo_type}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-slate-400">
                      Sem preview
                    </div>
                  )}
                  <figcaption className="px-2 py-1 text-xs capitalize text-slate-500">
                    {p.photo_type}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <form action={photoAction} className="space-y-3">
            <input type="hidden" name="task_id" value={task.id} />
            <div className="space-y-1.5">
              <Label htmlFor="photo_type">Tipo</Label>
              <Select id="photo_type" name="photo_type" defaultValue="evidence">
                <option value="before">Antes</option>
                <option value="after">Depois</option>
                <option value="evidence">Evidência</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photos">Ficheiros</Label>
              <input
                id="photos"
                name="photos"
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-sky/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-sky-dark"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files) {
                    setPreviews([]);
                    return;
                  }
                  setPreviews(
                    Array.from(files).map((f) => URL.createObjectURL(f)),
                  );
                }}
              />
            </div>
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ))}
              </div>
            )}
            {photoState && !photoState.ok && (
              <p className="text-sm text-red-600">{photoState.error}</p>
            )}
            {photoState?.ok && (
              <p className="text-sm text-status-completed">Fotos enviadas.</p>
            )}
            <Button type="submit" variant="secondary" disabled={photoPending}>
              <Upload className="h-4 w-4" />
              {photoPending ? "A enviar…" : "Adicionar fotos"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
