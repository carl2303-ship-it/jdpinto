"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/types/database";
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  calendarTaskHref,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTime24 } from "@/lib/forms";

export type CalendarTask = Pick<
  Task,
  | "id"
  | "title"
  | "scheduled_date"
  | "start_time"
  | "end_time"
  | "status"
  | "address"
> & {
  client_name?: string | null;
  team_name?: string | null;
  assignee_name?: string | null;
};

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function taskDayKey(task: CalendarTask) {
  if (task.scheduled_date) return task.scheduled_date.slice(0, 10);
  if (!task.start_time) return null;
  return format(parseISO(task.start_time), "yyyy-MM-dd");
}

function tasksOnDay(tasks: CalendarTask[], day: Date) {
  const key = format(day, "yyyy-MM-dd");
  return tasks.filter((t) => taskDayKey(t) === key);
}

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<ViewMode>("month");

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      const key = taskDayKey(task);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.start_time ?? a.title).localeCompare(b.start_time ?? b.title),
      );
    }
    return map;
  }, [tasks]);

  const unscheduled = useMemo(
    () =>
      tasks.filter(
        (t) => !taskDayKey(t) && t.status !== "cancelled",
      ),
    [tasks],
  );

  function goPrev() {
    if (view === "month") setCursor((d) => addMonths(d, -1));
    else if (view === "week") setCursor((d) => addWeeks(d, -1));
    else setCursor((d) => addDays(d, -1));
  }

  function goNext() {
    if (view === "month") setCursor((d) => addMonths(d, 1));
    else if (view === "week") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addDays(d, 1));
  }

  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: pt })
      : view === "week"
        ? `Semana de ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: pt })}`
        : format(cursor, "EEEE, d MMMM yyyy", { locale: pt });

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  const weekDays = eachDayOfInterval({
    start: startOfWeek(cursor, { weekStartsOn: 1 }),
    end: endOfWeek(cursor, { weekStartsOn: 1 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Calendário de Ocupação
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Intervenções por mês, semana ou dia.
          </p>
        </div>
        <Link
          href="/tasks?new=1"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-sky px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-sky-dark"
        >
          <Plus className="h-4 w-4" />
          Nova Intervenção
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="capitalize">{title}</CardTitle>
            <CardDescription>
              {tasks.filter((t) => taskDayKey(t)).length} intervenção(ões)
              agendada(s)
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {([
                ["month", "Mês"],
                ["week", "Semana"],
                ["day", "Dia"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    view === id
                      ? "bg-brand-sky text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goPrev}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={goToday}>
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goNext}
                aria-label="Seguinte"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {view === "month" && (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="grid grid-cols-7 gap-px border-b border-slate-200 pb-2">
                  {WEEKDAYS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-px rounded-lg bg-slate-100">
                  {monthDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayTasks = byDay.get(key) ?? [];
                    const inMonth = isSameMonth(day, cursor);
                    return (
                      <div
                        key={key}
                        className={cn(
                          "min-h-[72px] bg-white p-1 text-left sm:min-h-[96px] sm:p-1.5",
                          !inMonth && "bg-slate-50/80 text-slate-400",
                          isToday(day) && "ring-1 ring-inset ring-brand-sky",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setCursor(day);
                            setView("day");
                          }}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium hover:bg-slate-100",
                            isToday(day) && "bg-brand-sky text-white hover:bg-brand-sky-dark",
                          )}
                          aria-label={`Ver dia ${format(day, "d MMMM", { locale: pt })}`}
                        >
                          {format(day, "d")}
                        </button>
                        <div className="mt-0.5 space-y-0.5">
                          {dayTasks.slice(0, 3).map((task) => (
                            <Link
                              key={task.id}
                              href={calendarTaskHref(task)}
                              className="block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white hover:opacity-90 sm:text-[11px]"
                              style={{
                                backgroundColor:
                                  TASK_STATUS_COLORS[task.status],
                              }}
                              title={task.title}
                            >
                              {task.start_time
                                ? `${formatTime24(task.start_time)} `
                                : ""}
                              {task.title}
                            </Link>
                          ))}
                          {dayTasks.length > 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCursor(day);
                                setView("day");
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-600"
                            >
                              +{dayTasks.length - 3}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === "week" && (
            <div className="space-y-2">
              {weekDays.map((day) => {
                const dayTasks = tasksOnDay(tasks, day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "rounded-xl border border-slate-200 p-3",
                      isToday(day) && "border-brand-sky/40 bg-brand-sky/5",
                    )}
                  >
                    <button
                      type="button"
                      className="mb-2 text-sm font-semibold capitalize text-brand-navy"
                      onClick={() => {
                        setCursor(day);
                        setView("day");
                      }}
                    >
                      {format(day, "EEEE, d MMM", { locale: pt })}
                    </button>
                    {dayTasks.length === 0 ? (
                      <p className="text-xs text-slate-400">Sem intervenções</p>
                    ) : (
                      <ul className="space-y-2">
                        {dayTasks.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {view === "day" && (
            <div className="space-y-2">
              {tasksOnDay(tasks, cursor).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                  Sem intervenções neste dia.
                </div>
              ) : (
                tasksOnDay(tasks, cursor).map((task) => (
                  <TaskRow key={task.id} task={task} detailed />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {unscheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sem data agendada</CardTitle>
            <CardDescription>
              {unscheduled.length} intervenção(ões) por calendarizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unscheduled.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskRow({
  task,
  detailed,
}: {
  task: CalendarTask;
  detailed?: boolean;
}) {
  return (
    <Link
      href={calendarTaskHref(task)}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm"
    >
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: TASK_STATUS_COLORS[task.status] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-brand-navy">{task.title}</p>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {[
            task.start_time && formatTime24(task.start_time),
            task.client_name,
            task.team_name,
            task.assignee_name,
          ]
            .filter(Boolean)
            .join(" · ") || "Sem detalhes"}
        </p>
        {detailed && task.address && (
          <p className="mt-1 truncate text-xs text-slate-400">{task.address}</p>
        )}
      </div>
    </Link>
  );
}
