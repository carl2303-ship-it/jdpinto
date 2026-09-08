"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  Client,
  Collaborator,
  Task,
  TaskStatus,
  Team,
} from "@/types/database";
import { TASK_STATUS_LABELS } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
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
  mapsUrl,
} from "@/lib/forms";
import { DateTime24Fields } from "@/components/ui/date-time-24";
import { createClientQuick } from "@/app/(app)/clients/actions";
import { deleteTask, upsertTask, type ActionResult } from "./actions";

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
};

function TaskFormFields({
  task,
  clients,
  teams,
  collaborators,
  onClientsChange,
}: {
  task?: TaskRow | null;
  clients: Client[];
  teams: Team[];
  collaborators: Collaborator[];
  onClientsChange: (clients: Client[]) => void;
}) {
  const [clientList, setClientList] = useState(clients);
  const [clientId, setClientId] = useState(task?.client_id ?? "");
  const [quickName, setQuickName] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  async function addQuickClient() {
    setQuickError(null);
    setCreating(true);
    const result = await createClientQuick(quickName);
    setCreating(false);
    if (!result.ok) {
      setQuickError(result.error);
      return;
    }
    const created: Client = {
      id: result.id,
      name: quickName.trim(),
      email: null,
      phone: null,
      contact_name: null,
      address: null,
      street: null,
      postal_code: null,
      locality: null,
      vat_number: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
    const next = [...clientList, created].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    setClientList(next);
    onClientsChange(next);
    setClientId(result.id);
    setQuickName("");
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
        <Label htmlFor="client_id">Cliente</Label>
        <Select
          id="client_id"
          name="client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">— Sem cliente —</option>
          {clientList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2 pt-1">
          <Input
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="Criar cliente rápido…"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={creating || !quickName.trim()}
            onClick={addQuickClient}
          >
            {creating ? "…" : "Criar"}
          </Button>
        </div>
        {quickError && (
          <p className="text-xs text-red-600">{quickError}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Morada do serviço</Label>
        <div className="flex gap-2">
          <Input
            id="address"
            name="address"
            defaultValue={task?.address ?? ""}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_name">Pessoa de contacto</Label>
        <Input
          id="contact_name"
          name="contact_name"
          defaultValue={task?.contact_name ?? ""}
          placeholder="Nome da pessoa no local"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_phone">Telefone de contacto</Label>
        <Input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          defaultValue={task?.contact_phone ?? ""}
        />
      </div>

      <DateTime24Fields
        label="Agendamento *"
        dateName="scheduled_date"
        timeName="scheduled_time"
        value={task?.scheduled_at ?? null}
        required
      />
      <p className="-mt-1 text-xs text-slate-500">
        Data e hora previstas. O técnico regista depois o início e o fim reais;
        a duração é calculada automaticamente.
      </p>

      {(task?.start_time || task?.end_time) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className="font-medium text-brand-navy">Registo do técnico</p>
          <p>
            Início: {formatDateTime(task.start_time ?? null)}
            {task.end_time ? ` · Fim: ${formatDateTime(task.end_time)}` : ""}
            {task.duration_minutes
              ? ` · Duração: ${formatDurationMinutes(task.duration_minutes)}`
              : ""}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="assigned_team_id">Equipa</Label>
          <Select
            id="assigned_team_id"
            name="assigned_team_id"
            defaultValue={task?.assigned_team_id ?? ""}
          >
            <option value="">— Sem equipa —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assigned_collaborator_id">Colaborador</Label>
          <Select
            id="assigned_collaborator_id"
            name="assigned_collaborator_id"
            defaultValue={task?.assigned_collaborator_id ?? ""}
          >
            <option value="">— Sem colaborador —</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </div>
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
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [state, action, pending] = useActionState(upsertTask, initial);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    const wantNew = searchParams.get("new") === "1";

    if (editId) {
      const task = tasks.find((t) => t.id === editId) ?? null;
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
      const q = query.toLowerCase();
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.clients?.name ?? "").toLowerCase().includes(q) ||
        (t.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [tasks, query, statusFilter]);

  async function onDelete(id: string) {
    if (!confirm("Eliminar esta intervenção?")) return;
    const result = await deleteTask(id);
    if (!result.ok) alert(result.error);
    else router.refresh();
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
          <CardDescription>Estado e pesquisa por cliente/título.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1"
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
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {task.clients?.name ?? "Sem cliente"} · Agendada{" "}
                    {formatDateTime(task.scheduled_at ?? task.scheduled_date)}
                    {task.duration_minutes
                      ? ` · ${formatDurationMinutes(task.duration_minutes)}`
                      : ""}
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(task);
                      setOpen(true);
                      router.replace(`/tasks?edit=${task.id}`, { scroll: false });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
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
        description="Cliente, morada, horário e atribuição."
        className="sm:max-w-xl"
      >
        <form action={action} className="space-y-4">
          <TaskFormFields
            key={editing?.id ?? "new"}
            task={editing}
            clients={clients}
            teams={teams}
            collaborators={collaborators}
            onClientsChange={setClients}
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
