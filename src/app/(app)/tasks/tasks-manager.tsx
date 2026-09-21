"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Eye, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type {
  Client,
  Collaborator,
  Task,
  TaskServiceType,
  TaskStatus,
  Team,
  TeamMember,
} from "@/types/database";
import {
  TASK_SERVICE_TYPE_LABELS,
  TASK_STATUS_LABELS,
  serviceTypeRequiresDate,
  serviceTypeRequiresSlot,
  taskDetailHref,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { TaskStateBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatClientAddress,
  formatDateTime,
  formatDurationMinutes,
  isoToLocalDate,
  mapsUrl,
} from "@/lib/forms";
import { DateTime24Fields } from "@/components/ui/date-time-24";
import {
  assessCollaboratorAvailability,
  assessTeamAvailability,
} from "@/lib/team-availability";
import { createClientFromTask } from "@/app/(app)/clients/actions";
import { deleteTask, deleteTaskAttachment, upsertTask, type ActionResult } from "./actions";
import type { AttachmentItem } from "@/components/tech/attachment-grid";
import { AttachmentGrid } from "@/components/tech/attachment-grid";
import { cn } from "@/lib/utils";

const initial: ActionResult | null = null;

type TaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
  teams?: Pick<Team, "id" | "name" | "color_code"> | null;
  collaborators?: Pick<Collaborator, "id" | "full_name"> | null;
};

type Props = {
  tasks: TaskRow[];
  clients: Client[];
  teams: Team[];
  collaborators: Collaborator[];
  memberships: TeamMember[];
  attachmentsByTask?: Record<string, AttachmentItem[]>;
};

function TaskFormFields({
  task,
  clients,
  teams,
  collaborators,
  memberships,
  allTasks,
  onClientsChange,
  attachments,
  onRemoveAttachment,
  removingAttachmentId,
}: {
  task?: TaskRow | null;
  clients: Client[];
  teams: Team[];
  collaborators: Collaborator[];
  memberships: TeamMember[];
  allTasks: TaskRow[];
  onClientsChange: (clients: Client[]) => void;
  attachments: AttachmentItem[];
  onRemoveAttachment?: (id: string) => void;
  removingAttachmentId?: string | null;
}) {
  const [clientList, setClientList] = useState(clients);
  const [clientMode, setClientMode] = useState<"existing" | "new">(
    task?.client_id ? "existing" : "existing",
  );
  const [clientId, setClientId] = useState(task?.client_id ?? "");
  const [clientSearch, setClientSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    contact_name: "",
    phone: "",
    street: "",
    postal_code: "",
    locality: "",
  });
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    task?.scheduled_at ?? null,
  );
  const [plannedHours, setPlannedHours] = useState(
    task?.planned_duration_minutes != null
      ? String(Math.floor(task.planned_duration_minutes / 60))
      : "1",
  );
  const [plannedMins, setPlannedMins] = useState(
    task?.planned_duration_minutes != null
      ? String(task.planned_duration_minutes % 60)
      : "0",
  );
  const [teamId, setTeamId] = useState(task?.assigned_team_id ?? "");
  const [collaboratorId, setCollaboratorId] = useState(
    task?.assigned_collaborator_id ?? "",
  );
  const [serviceType, setServiceType] = useState<TaskServiceType>(
    task?.service_type ?? "agendado_com_marcacao",
  );

  const needsSlot = serviceTypeRequiresSlot(serviceType);
  const needsDate = serviceTypeRequiresDate(serviceType);

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientList;
    return clientList.filter((c) => {
      const hay = [
        c.name,
        c.contact_name,
        c.phone,
        c.street,
        c.postal_code,
        c.locality,
        c.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clientList, clientSearch]);

  const selectedClient = useMemo(
    () => clientList.find((c) => c.id === clientId) ?? null,
    [clientList, clientId],
  );

  const plannedMinutes = useMemo(() => {
    const h = plannedHours === "" ? 0 : Number(plannedHours);
    const m = plannedMins === "" ? 0 : Number(plannedMins);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const total = Math.round(h * 60 + m);
    return total > 0 ? total : null;
  }, [plannedHours, plannedMins]);

  const availability = useMemo(
    () =>
      assessTeamAvailability({
        teams,
        tasks: allTasks,
        scheduledAt,
        plannedMinutes,
        excludeTaskId: task?.id ?? null,
      }),
    [teams, allTasks, scheduledAt, plannedMinutes, task?.id],
  );

  const collabAvailability = useMemo(
    () =>
      assessCollaboratorAvailability({
        collaborators,
        memberships,
        tasks: allTasks,
        scheduledAt,
        plannedMinutes,
        excludeTaskId: task?.id ?? null,
      }),
    [
      collaborators,
      memberships,
      allTasks,
      scheduledAt,
      plannedMinutes,
      task?.id,
    ],
  );

  const selectedAvail = availability.find((a) => a.team.id === teamId);
  const selectedCollabAvail = collabAvailability.find(
    (a) => a.collaborator.id === collaboratorId,
  );

  async function createNewClient() {
    setClientError(null);
    setCreating(true);
    const result = await createClientFromTask(newClient);
    setCreating(false);
    if (!result.ok) {
      setClientError(result.error);
      return;
    }
    const next = [...clientList, result.client].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    setClientList(next);
    onClientsChange(next);
    setClientId(result.client.id);
    setClientMode("existing");
    setNewClient({
      name: "",
      contact_name: "",
      phone: "",
      street: "",
      postal_code: "",
      locality: "",
    });
  }

  return (
    <div className="space-y-3">
      {task?.id && <input type="hidden" name="id" value={task.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={task?.title ?? ""}
          placeholder="Ex.: Instalação FTTH"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={task?.description ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="service_type">Tipo de serviço *</Label>
        <Select
          id="service_type"
          name="service_type"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as TaskServiceType)}
          required
        >
          {(Object.keys(TASK_SERVICE_TYPE_LABELS) as TaskServiceType[]).map(
            (t) => (
              <option key={t} value={t}>
                {TASK_SERVICE_TYPE_LABELS[t]}
              </option>
            ),
          )}
        </Select>
        <p className="text-xs text-slate-500">
          {needsSlot
            ? "Exige data, hora e duração prevista."
            : needsDate
              ? "Exige o dia; a hora é opcional."
              : "Data/hora opcionais — ir quando possível ou conforme prioridade."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Cliente</Label>
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1.5",
                clientMode === "existing"
                  ? "bg-white text-brand-navy shadow-sm"
                  : "text-slate-500",
              )}
              onClick={() => {
                setClientMode("existing");
                setClientError(null);
              }}
            >
              Existente
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1.5",
                clientMode === "new"
                  ? "bg-white text-brand-navy shadow-sm"
                  : "text-slate-500",
              )}
              onClick={() => {
                setClientMode("new");
                setClientError(null);
              }}
            >
              Novo cliente
            </button>
          </div>
        </div>

        {clientMode === "existing" ? (
          <div className="space-y-2">
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Pesquisar cliente (nome, morada, telefone…)"
            />
            <Select
              id="client_id"
              name="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Sem cliente —</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.locality ? ` · ${c.locality}` : ""}
                </option>
              ))}
            </Select>
            {selectedClient && (
              <div className="rounded-lg border border-brand-sky/20 bg-brand-sky/5 px-3 py-2 text-sm text-slate-700">
                <p className="font-medium text-brand-navy">
                  {selectedClient.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {[
                    selectedClient.contact_name &&
                      `Contacto: ${selectedClient.contact_name}`,
                    selectedClient.phone,
                    formatClientAddress(selectedClient),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem contactos / morada no perfil"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input type="hidden" name="client_id" value={clientId} />
            <Input
              placeholder="Nome do cliente *"
              value={newClient.name}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, name: e.target.value }))
              }
            />
            <Input
              placeholder="Pessoa de contacto"
              value={newClient.contact_name}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, contact_name: e.target.value }))
              }
            />
            <Input
              placeholder="Telefone"
              type="tel"
              value={newClient.phone}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, phone: e.target.value }))
              }
            />
            <Input
              placeholder="Rua"
              value={newClient.street}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, street: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Código postal"
                value={newClient.postal_code}
                onChange={(e) =>
                  setNewClient((s) => ({ ...s, postal_code: e.target.value }))
                }
              />
              <Input
                placeholder="Localidade"
                value={newClient.locality}
                onChange={(e) =>
                  setNewClient((s) => ({ ...s, locality: e.target.value }))
                }
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={creating || !newClient.name.trim()}
              onClick={createNewClient}
            >
              <Plus className="h-4 w-4" />
              {creating ? "A criar…" : "Guardar cliente e usar nesta tarefa"}
            </Button>
            {clientId && clientMode === "new" && selectedClient && (
              <p className="text-xs text-emerald-700">
                Cliente «{selectedClient.name}» criado e selecionado.
              </p>
            )}
            {!clientId && (
              <p className="text-xs text-amber-700">
                Guarda o cliente primeiro; a morada e contactos passam para a
                tarefa automaticamente.
              </p>
            )}
          </div>
        )}
        {clientError && (
          <p className="text-xs text-red-600">{clientError}</p>
        )}
      </div>

      <DateTime24Fields
        label={needsSlot ? "Agendamento *" : needsDate ? "Dia *" : "Agendamento (opcional)"}
        dateName="scheduled_date"
        timeName="scheduled_time"
        value={
          task?.scheduled_at ??
          task?.scheduled_date ??
          null
        }
        required={needsDate}
        requireTime={needsSlot}
        onIsoChange={setScheduledAt}
      />
      <p className="-mt-1 text-xs text-slate-500">
        {needsSlot
          ? "Data e hora marcadas com o cliente. A duração real é registada pelo técnico."
          : needsDate
            ? "Indica o dia previsto. A hora pode ficar em branco (sem marcação)."
            : "Podes deixar sem data — o técnico faz quando for possível."}
      </p>

      <div className="space-y-1.5">
        <Label>Duração prevista {needsSlot ? "*" : "(opcional)"}</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="planned_duration_hours"
              className="text-xs font-normal text-slate-500"
            >
              Horas
            </Label>
            <Input
              id="planned_duration_hours"
              name="planned_duration_hours"
              type="number"
              min={0}
              max={48}
              step={1}
              required={needsSlot}
              value={plannedHours}
              onChange={(e) => setPlannedHours(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="planned_duration_mins"
              className="text-xs font-normal text-slate-500"
            >
              Minutos
            </Label>
            <Input
              id="planned_duration_mins"
              name="planned_duration_mins"
              type="number"
              min={0}
              max={59}
              step={5}
              value={plannedMins}
              onChange={(e) => setPlannedMins(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Usada para planear ocupação de equipas e colaboradores.
          {plannedMinutes
            ? ` · Total: ${formatDurationMinutes(plannedMinutes)}`
            : ""}
        </p>
      </div>

      {(task?.start_time || task?.end_time) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className="font-medium text-brand-navy">Registo do técnico</p>
          <p>
            Início: {formatDateTime(task.start_time ?? null)}
            {task.end_time ? ` · Fim: ${formatDateTime(task.end_time)}` : ""}
            {task.duration_minutes
              ? ` · Duração real: ${formatDurationMinutes(task.duration_minutes)}`
              : ""}
          </p>
        </div>
      )}

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-sm font-semibold text-brand-navy">
          Disponibilidade das equipas
        </p>
        {!scheduledAt || !plannedMinutes ? (
          <p className="text-xs text-slate-500">
            Preenche agendamento e duração prevista para ver quem está livre.
          </p>
        ) : (
          <ul className="space-y-2">
            {availability.map(({ team, kind, message }) => (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => setTeamId(team.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    teamId === team.id
                      ? "border-brand-sky ring-1 ring-brand-sky/40"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                    kind === "available" && "border-l-4 border-l-emerald-500",
                    kind === "busy" && "border-l-4 border-l-red-500",
                    kind === "overrun" && "border-l-4 border-l-amber-500",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: team.color_code || "#0ea5e9" }}
                    />
                    <span className="font-medium text-brand-navy">
                      {team.name}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-semibold uppercase tracking-wide",
                        kind === "available" && "text-emerald-700",
                        kind === "busy" && "text-red-700",
                        kind === "overrun" && "text-amber-700",
                      )}
                    >
                      {kind === "available"
                        ? "Livre"
                        : kind === "busy"
                          ? "Ocupada"
                          : "Em atraso"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{message}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-sm font-semibold text-brand-navy">
          Disponibilidade dos colaboradores
        </p>
        {!scheduledAt || !plannedMinutes ? (
          <p className="text-xs text-slate-500">
            Preenche agendamento e duração prevista para ver quem está livre.
            Membros de uma equipa ocupada ficam ocupados.
          </p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {collabAvailability.map(({ collaborator, kind, message }) => (
              <li key={collaborator.id}>
                <button
                  type="button"
                  onClick={() => setCollaboratorId(collaborator.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    collaboratorId === collaborator.id
                      ? "border-brand-sky ring-1 ring-brand-sky/40"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                    kind === "available" && "border-l-4 border-l-emerald-500",
                    kind === "busy" && "border-l-4 border-l-red-500",
                    kind === "overrun" && "border-l-4 border-l-amber-500",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-navy">
                      {collaborator.full_name}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-semibold uppercase tracking-wide",
                        kind === "available" && "text-emerald-700",
                        kind === "busy" && "text-red-700",
                        kind === "overrun" && "text-amber-700",
                      )}
                    >
                      {kind === "available"
                        ? "Livre"
                        : kind === "busy"
                          ? "Ocupado"
                          : "Em atraso"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{message}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="assigned_team_id">Equipa</Label>
          <Select
            id="assigned_team_id"
            name="assigned_team_id"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">— Sem equipa —</option>
            {teams.map((t) => {
              const a = availability.find((x) => x.team.id === t.id);
              const tag =
                a?.kind === "busy"
                  ? " (ocupada)"
                  : a?.kind === "overrun"
                    ? " (em atraso)"
                    : a?.kind === "available" && scheduledAt && plannedMinutes
                      ? " (livre)"
                      : "";
              return (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {tag}
                </option>
              );
            })}
          </Select>
          {selectedAvail?.kind === "busy" && (
            <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {selectedAvail.message}
            </p>
          )}
          {selectedAvail?.kind === "overrun" && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              {selectedAvail.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assigned_collaborator_id">Colaborador</Label>
          <Select
            id="assigned_collaborator_id"
            name="assigned_collaborator_id"
            value={collaboratorId}
            onChange={(e) => setCollaboratorId(e.target.value)}
          >
            <option value="">— Sem colaborador —</option>
            {collaborators.map((c) => {
              const a = collabAvailability.find(
                (x) => x.collaborator.id === c.id,
              );
              const tag =
                a?.kind === "busy"
                  ? " (ocupado)"
                  : a?.kind === "overrun"
                    ? " (em atraso)"
                    : a?.kind === "available" && scheduledAt && plannedMinutes
                      ? " (livre)"
                      : "";
              return (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {tag}
                </option>
              );
            })}
          </Select>
          {selectedCollabAvail?.kind === "busy" && (
            <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {selectedCollabAvail.message}
            </p>
          )}
          {selectedCollabAvail?.kind === "overrun" && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              {selectedCollabAvail.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin_photos">Anexos do serviço (opcional)</Label>
        {attachments.length > 0 && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-slate-600">
              Já enviados ({attachments.length}) — podes abrir ou remover
            </p>
            <AttachmentGrid
              items={attachments}
              onRemove={onRemoveAttachment}
              removingId={removingAttachmentId}
            />
          </div>
        )}
        <input
          id="admin_photos"
          name="admin_photos"
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-sky/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-sky-dark"
        />
        <p className="text-xs text-slate-500">
          Imagens ou PDF para o técnico (fotos do local, esquema, planta, etc.).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Estado</Label>
        <Select
          id="status"
          name="status"
          defaultValue={task?.status ?? "scheduled"}
        >
          {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function TasksManager({
  tasks,
  clients: initialClients,
  teams,
  collaborators,
  memberships,
  attachmentsByTask: initialAttachments = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState(initialClients);
  const [attachmentsByTask, setAttachmentsByTask] = useState(initialAttachments);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [state, action, pending] = useActionState(upsertTask, initial);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    setAttachmentsByTask(initialAttachments);
  }, [initialAttachments]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    const wantNew = searchParams.get("new") === "1";

    if (editId) {
      const task = tasks.find((t) => t.id === editId) ?? null;
      if (task?.status === "completed") {
        router.replace(taskDetailHref(task.id, "tasks"), { scroll: false });
        return;
      }
      if (task) {
        setEditing(task);
        setOpen(true);
      }
      return;
    }

    if (wantNew) {
      setEditing(null);
      setOpen(true);
    }
  }, [searchParams, tasks]);

  function clearDeepLink() {
    const editId = searchParams.get("edit");
    const wantNew = searchParams.get("new") === "1";
    if (editId || wantNew) {
      router.replace("/tasks", { scroll: false });
    }
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    clearDeepLink();
  }

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setEditing(null);
      router.replace("/tasks", { scroll: false });
      router.refresh();
    }
  }, [state, router]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (dateFilter) {
        const day =
          t.scheduled_date?.slice(0, 10) ||
          (t.scheduled_at ? isoToLocalDate(t.scheduled_at) : "");
        if (day !== dateFilter) return false;
      }
      const q = query.toLowerCase();
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.clients?.name ?? "").toLowerCase().includes(q) ||
        (t.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [tasks, query, statusFilter, dateFilter]);

  async function onDelete(id: string) {
    if (!confirm("Eliminar esta intervenção?")) return;
    const result = await deleteTask(id);
    if (!result.ok) alert(result.error);
    else router.refresh();
  }

  async function onRemoveAttachment(photoId: string) {
    if (!confirm("Remover este anexo da intervenção?")) return;
    setRemovingAttachmentId(photoId);
    const result = await deleteTaskAttachment(photoId);
    setRemovingAttachmentId(null);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setAttachmentsByTask((prev) => {
      const next: Record<string, AttachmentItem[]> = {};
      for (const [taskId, list] of Object.entries(prev)) {
        next[taskId] = list.filter((p) => p.id !== photoId);
      }
      return next;
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Intervenções
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Criar, editar e acompanhar tarefas no terreno.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
            router.replace("/tasks?new=1", { scroll: false });
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Intervenção
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Data, estado e pesquisa por cliente/título.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5 sm:w-44">
            <Label htmlFor="filter_date">Data</Label>
            <Input
              id="filter_date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="sm:mb-0.5"
              onClick={() => setDateFilter("")}
            >
              Todas as datas
            </Button>
          ) : null}
          <Input
            className="flex-1 min-w-[12rem]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar…"
          />
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TaskStatus | "all")
            }
            className="sm:w-48"
          >
            <option value="all">Todos os estados</option>
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>
            {filtered.length} intervenção(ões)
            {dateFilter
              ? ` · ${dateFilter.split("-").reverse().join("/")}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Sem intervenções.
            </div>
          ) : (
            filtered.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-brand-navy">{task.title}</p>
                    <TaskStateBadge
                      status={task.status}
                      serviceType={task.service_type}
                    />
                    {(attachmentsByTask[task.id]?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <Paperclip className="h-3 w-3" />
                        {attachmentsByTask[task.id].length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {task.clients?.name ?? "Sem cliente"}
                    {task.scheduled_at
                      ? ` · ${formatDateTime(task.scheduled_at)}`
                      : task.scheduled_date
                        ? ` · Dia ${task.scheduled_date}`
                        : " · Sem data marcada"}
                    {task.planned_duration_minutes
                      ? ` · Prevista ${formatDurationMinutes(task.planned_duration_minutes)}`
                      : ""}
                    {task.duration_minutes
                      ? ` · Real ${formatDurationMinutes(task.duration_minutes)}`
                      : ""}
                    {task.teams?.name ? ` · ${task.teams.name}` : ""}
                    {task.start_time
                      ? ` · Início ${formatDateTime(task.start_time)}`
                      : ""}
                    {task.end_time ? ` – ${formatDateTime(task.end_time)}` : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {[
                      task.teams?.name,
                      task.collaborators?.full_name,
                      task.address,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem atribuição / morada"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {task.address && (
                    <a
                      href={mapsUrl(task.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Maps
                    </a>
                  )}
                  {task.status === "completed" ? (
                    <Link
                      href={taskDetailHref(task.id, "tasks")}
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-brand-navy hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditing(task);
                        setOpen(true);
                        router.replace(`/tasks?edit=${task.id}`, {
                          scroll: false,
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={closeDialog}
        title={editing ? "Editar intervenção" : "Nova intervenção"}
        description="Tipo de serviço, agendamento, cliente (opcional), imagens e equipa."
        className="sm:max-w-xl"
      >
        <form action={action} className="space-y-4">
          <TaskFormFields
            key={editing?.id ?? "new"}
            task={editing}
            clients={clients}
            teams={teams}
            collaborators={collaborators}
            memberships={memberships}
            allTasks={tasks}
            onClientsChange={setClients}
            attachments={
              editing?.id ? (attachmentsByTask[editing.id] ?? []) : []
            }
            onRemoveAttachment={
              editing?.id ? onRemoveAttachment : undefined
            }
            removingAttachmentId={removingAttachmentId}
          />
          {state && !state.ok && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDialog}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
