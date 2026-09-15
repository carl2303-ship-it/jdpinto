"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Eye, Receipt } from "lucide-react";
import type { Client, Collaborator, Task, Team } from "@/types/database";
import {
  TaskStateBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatDurationMinutes } from "@/lib/forms";
import { taskDetailHref } from "@/types/database";
import { markTaskInvoiced, markTaskToInvoice } from "./actions";

export type BillingTaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
  teams?: Pick<Team, "id" | "name"> | null;
  collaborators?: Pick<Collaborator, "id" | "full_name"> | null;
};

type SortKey = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "client_asc";

type Props = {
  mode: "to_invoice" | "done";
  tasks: BillingTaskRow[];
};

function taskDateKey(t: BillingTaskRow) {
  return t.end_time ?? t.scheduled_at ?? t.scheduled_date ?? t.created_at;
}

export function BillingTasksBoard({ mode, tasks }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...tasks];

    if (from) {
      const fromMs = new Date(`${from}T00:00:00`).getTime();
      list = list.filter((t) => {
        const k = taskDateKey(t);
        return k && new Date(k).getTime() >= fromMs;
      });
    }
    if (to) {
      const toMs = new Date(`${to}T23:59:59`).getTime();
      list = list.filter((t) => {
        const k = taskDateKey(t);
        return k && new Date(k).getTime() <= toMs;
      });
    }
    if (q) {
      list = list.filter((t) => {
        const hay = [
          t.title,
          t.clients?.name,
          t.teams?.name,
          t.collaborators?.full_name,
          t.address,
          t.report_notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sort === "name_asc" || sort === "name_desc") {
        const cmp = a.title.localeCompare(b.title, "pt");
        return sort === "name_asc" ? cmp : -cmp;
      }
      if (sort === "client_asc") {
        return (a.clients?.name ?? "").localeCompare(
          b.clients?.name ?? "",
          "pt",
        );
      }
      const da = taskDateKey(a) ?? "";
      const db = taskDateKey(b) ?? "";
      const cmp = da.localeCompare(db);
      return sort === "date_asc" ? cmp : -cmp;
    });

    return list;
  }, [tasks, query, sort, from, to]);

  async function onInvoice(id: string) {
    if (!confirm("Marcar como faturada e enviar para Terminadas?")) return;
    startTransition(async () => {
      const r = await markTaskInvoiced(id);
      if (!r.ok) alert(r.error);
      else router.refresh();
    });
  }

  async function onBackToInvoice(id: string) {
    if (!confirm("Voltar esta tarefa para A faturar?")) return;
    startTransition(async () => {
      const r = await markTaskToInvoice(id);
      if (!r.ok) alert(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Pesquisa, período e ordenação — útil com muitas intervenções.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="q">Pesquisar</Label>
            <Input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título, cliente, equipa, morada…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Até</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="sort">Ordenar</Label>
            <Select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="date_desc">Data (mais recentes)</option>
              <option value="date_asc">Data (mais antigas)</option>
              <option value="name_asc">Título A–Z</option>
              <option value="name_desc">Título Z–A</option>
              <option value="client_asc">Cliente A–Z</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            {filtered.length} intervenção(ões)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Sem resultados neste período.
            </p>
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
                  </div>
                  <p className="text-sm text-slate-500">
                    {task.clients?.name ?? "Sem cliente"}
                    {task.end_time
                      ? ` · Concluída ${formatDateTime(task.end_time)}`
                      : task.scheduled_at
                        ? ` · ${formatDateTime(task.scheduled_at)}`
                        : ""}
                    {task.duration_minutes
                      ? ` · ${formatDurationMinutes(task.duration_minutes)}`
                      : ""}
                    {task.teams?.name ? ` · ${task.teams.name}` : ""}
                    {task.collaborators?.full_name
                      ? ` · ${task.collaborators.full_name}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={taskDetailHref(
                      task.id,
                      mode === "to_invoice" ? "a-faturar" : "terminadas",
                    )}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-brand-navy hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Link>
                  {mode === "to_invoice" ? (
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      disabled={pending}
                      onClick={() => void onInvoice(task.id)}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Faturado
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => void onBackToInvoice(task.id)}
                    >
                      Voltar a faturar
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
