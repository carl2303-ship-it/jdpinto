"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Client, Task } from "@/types/database";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDurationMinutes,
  formatScheduleDateLabel,
  formatScheduleTimeLabel,
} from "@/lib/forms";
import { cn } from "@/lib/utils";

export type TechTaskRow = Task & {
  clients?: Pick<Client, "id" | "name"> | null;
};

type Props = {
  initialTasks: TechTaskRow[];
  collaboratorId: string;
  teamIds: string[];
  isOffice: boolean;
};

function ScheduleBlock({ task }: { task: TechTaskRow }) {
  const when = task.scheduled_at ?? task.scheduled_date;
  const dateLabel = formatScheduleDateLabel(when);
  const timeLabel = formatScheduleTimeLabel(task.scheduled_at);

  return (
    <div className="flex items-stretch gap-3 rounded-xl bg-brand-navy px-3 py-3 text-white">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/70">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {dateLabel}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <Clock className="h-5 w-5 shrink-0 text-brand-sky" />
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {timeLabel}
          </span>
        </p>
      </div>
      {(task.planned_duration_minutes || task.duration_minutes) && (
        <div className="flex shrink-0 flex-col items-end justify-center border-l border-white/15 pl-3 text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
            {task.duration_minutes ? "Real" : "Prevista"}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatDurationMinutes(
              task.duration_minutes ?? task.planned_duration_minutes,
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  compact,
}: {
  task: TechTaskRow;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link href={`/tech/${task.id}`} className="block opacity-80">
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
              <StatusBadge status={task.status} />
            </div>
          </CardHeader>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/tech/${task.id}`} className="block">
      <Card
        className={cn(
          "overflow-hidden transition-shadow hover:shadow-md",
          "border-slate-200",
        )}
      >
        <CardContent className="space-y-3 p-4">
          <ScheduleBlock task={task} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-semibold leading-snug text-brand-navy">
                {task.title}
              </h3>
              <p className="text-sm text-slate-500">
                {task.clients?.name ?? "Sem cliente"}
                {task.planned_duration_minutes && !task.duration_minutes
                  ? ` · Prevista ${formatDurationMinutes(task.planned_duration_minutes)}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <StatusBadge status={task.status} />
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          </div>
          {task.address && (
            <p className="flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              {task.address}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function TechTaskList({
  initialTasks,
  collaboratorId,
  teamIds,
  isOffice,
}: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const reload = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("tasks")
      .select("*")
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (!isOffice) {
      const filters = [`assigned_collaborator_id.eq.${collaboratorId}`];
      if (teamIds.length > 0) {
        filters.push(`assigned_team_id.in.(${teamIds.join(",")})`);
      }
      query = query.or(filters.join(","));
    }

    const { data } = await query;
    const raw = (data ?? []) as Task[];
    const clientIds = [
      ...new Set(raw.map((t) => t.client_id).filter(Boolean)),
    ] as string[];

    const clientsMap = new Map<string, Pick<Client, "id" | "name">>();
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .in("id", clientIds);
      for (const c of clients ?? []) clientsMap.set(c.id, c);
    }

    setTasks(
      raw.map((t) => ({
        ...t,
        clients: t.client_id ? clientsMap.get(t.client_id) ?? null : null,
      })),
    );
  }, [collaboratorId, teamIds, isOffice]);

  useEffect(() => {
    const onChanged = () => {
      void reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    window.addEventListener("jdpinto:tasks-changed", onChanged);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onChanged);

    // Poll leve: garante lista atualizada mesmo se o Realtime falhar
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 15_000);

    return () => {
      window.removeEventListener("jdpinto:tasks-changed", onChanged);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onChanged);
      clearInterval(timer);
    };
  }, [reload]);

  const open = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Em aberto · {open.length}
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Sem tarefas atribuídas de momento.
            </CardContent>
          </Card>
        ) : (
          open.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Concluídas
          </h2>
          {done.map((task) => (
            <TaskCard key={task.id} task={task} compact />
          ))}
        </section>
      )}
    </>
  );
}
