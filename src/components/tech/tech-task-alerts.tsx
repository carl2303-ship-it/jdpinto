"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";
import { taskDetailHref } from "@/types/database";
import {
  broadcastTasksChanged,
  ensureNotificationPermission,
  playTaskAlertSound,
  showSystemNotification,
  subscribePushNotifications,
} from "@/lib/task-alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/forms";

type AlertKind = "new" | "reminder30" | "reminder10";

type AlertTask = {
  id: string;
  title: string;
  address: string | null;
  scheduled_at: string | null;
  start_time: string | null;
  kind: AlertKind;
};

type Props = {
  collaboratorId: string;
  teamIds: string[];
};

function isAssignedToMe(
  task: Pick<Task, "assigned_collaborator_id" | "assigned_team_id">,
  collaboratorId: string,
  teamIds: Set<string>,
) {
  if (task.assigned_collaborator_id === collaboratorId) return true;
  if (task.assigned_team_id && teamIds.has(task.assigned_team_id)) return true;
  return false;
}

function reminderKey(taskId: string, kind: "30" | "10") {
  return `jdpinto-rem-${kind}-${taskId}`;
}

export function TechTaskAlerts({ collaboratorId, teamIds }: Props) {
  const [alert, setAlert] = useState<AlertTask | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [live, setLive] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const teamSet = useRef(new Set(teamIds));
  const readyRef = useRef(false);

  useEffect(() => {
    teamSet.current = new Set(teamIds);
  }, [teamIds]);

  const triggerAlert = useCallback(
    (task: Task, kind: AlertKind = "new") => {
      const alertTask: AlertTask = {
        id: task.id,
        title: task.title,
        address: task.address,
        scheduled_at: task.scheduled_at,
        start_time: task.start_time,
        kind,
      };

      setAlert(alertTask);
      playTaskAlertSound();
      const notifTitle =
        kind === "reminder30"
          ? "Aviso · daqui a ~30 min"
          : kind === "reminder10"
            ? "Aviso · daqui a ~10 min"
            : "Nova intervenção JDPINTO";
      void showSystemNotification(
        notifTitle,
        task.title,
        taskDetailHref(task.id, "tech"),
      );
      if (kind === "new") broadcastTasksChanged(task.id);

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 80, 200, 80, 400]);
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function handleRow(
      task: Task,
      event: "INSERT" | "UPDATE",
      oldRow?: Task | null,
    ) {
      if (!task?.id || task.status === "cancelled") return;

      const nowMine = isAssignedToMe(task, collaboratorId, teamSet.current);
      if (!nowMine) {
        // Removida de mim → atualizar lista
        if (seenRef.current.has(task.id)) {
          broadcastTasksChanged(task.id);
        }
        return;
      }

      // Nova atribuição (UPDATE): alerta mesmo se o id já estava "visto"
      if (event === "UPDATE" && oldRow) {
        const wasMine = isAssignedToMe(
          oldRow,
          collaboratorId,
          teamSet.current,
        );
        if (!wasMine && nowMine) {
          seenRef.current.add(task.id);
          triggerAlert(task, "new");
          return;
        }
        // Alteração numa tarefa já minha → só refrescar lista
        broadcastTasksChanged(task.id);
        seenRef.current.add(task.id);
        return;
      }

      const alreadySeen = seenRef.current.has(task.id);
      seenRef.current.add(task.id);

      if (event === "UPDATE" && alreadySeen) {
        broadcastTasksChanged(task.id);
        return;
      }
      if (event === "INSERT" || !alreadySeen) {
        triggerAlert(task, "new");
      }
    }

    async function fetchAssignedIds() {
      const filters = [`assigned_collaborator_id.eq.${collaboratorId}`];
      if (teamSet.current.size > 0) {
        filters.push(
          `assigned_team_id.in.(${[...teamSet.current].join(",")})`,
        );
      }

      const { data } = await supabase
        .from("tasks")
        .select(
          "id, title, address, scheduled_at, start_time, status, assigned_collaborator_id, assigned_team_id",
        )
        .neq("status", "cancelled")
        .or(filters.join(","));

      return (data ?? []) as Task[];
    }

    function checkReminders(rows: Task[]) {
      if (typeof window === "undefined") return;
      for (const task of rows) {
        if (
          task.status === "completed" ||
          task.status === "cancelled" ||
          !task.scheduled_at
        ) {
          continue;
        }
        const mins =
          (new Date(task.scheduled_at).getTime() - Date.now()) / 60_000;
        if (Number.isNaN(mins)) continue;

        if (
          mins <= 35 &&
          mins > 10 &&
          !localStorage.getItem(reminderKey(task.id, "30"))
        ) {
          localStorage.setItem(reminderKey(task.id, "30"), "1");
          triggerAlert(task, "reminder30");
        } else if (
          mins <= 12 &&
          mins > -5 &&
          !localStorage.getItem(reminderKey(task.id, "10"))
        ) {
          localStorage.setItem(reminderKey(task.id, "10"), "1");
          triggerAlert(task, "reminder10");
        }
      }
    }

    async function pollForNew() {
      if (!readyRef.current || cancelled) return;
      const rows = await fetchAssignedIds();
      let changed = false;
      const currentIds = new Set(rows.map((r) => r.id));

      for (const task of rows) {
        if (seenRef.current.has(task.id)) continue;
        seenRef.current.add(task.id);
        triggerAlert(task, "new");
        changed = true;
      }

      for (const id of [...seenRef.current]) {
        if (!currentIds.has(id)) {
          seenRef.current.delete(id);
          changed = true;
        }
      }

      checkReminders(rows);
      if (changed) broadcastTasksChanged();
    }

    async function boot() {
      const existing = await fetchAssignedIds();
      if (cancelled) return;
      for (const row of existing) {
        seenRef.current.add(row.id);
      }
      readyRef.current = true;
      checkReminders(existing);

      await ensureNotificationPermission();

      channel = supabase
        .channel(`tech-task-alerts:${collaboratorId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tasks" },
          (payload) => {
            handleRow(payload.new as Task, "INSERT");
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks" },
          (payload) => {
            handleRow(
              payload.new as Task,
              "UPDATE",
              (payload.old as Task) ?? null,
            );
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive(true);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setLive(false);
          }
        });

      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") void pollForNew();
      }, 8_000);

      document.addEventListener("visibilitychange", onVisible);
    }

    function onVisible() {
      if (document.visibilityState === "visible") void pollForNew();
    }

    void boot();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (pollTimer) clearInterval(pollTimer);
      if (channel) void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [collaboratorId, triggerAlert]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("jdpinto-alerts-on") === "1") {
      setAudioUnlocked(true);
      void (async () => {
        await ensureNotificationPermission();
        const push = await subscribePushNotifications(collaboratorId);
        setPushReady(push.ok);
        setPushError(push.ok ? null : push.error);
      })();
    }
  }, [collaboratorId]);

  async function unlockAudio() {
    setPushBusy(true);
    setPushError(null);
    setAudioUnlocked(true);
    localStorage.setItem("jdpinto-alerts-on", "1");
    playTaskAlertSound();
    await ensureNotificationPermission();
    const push = await subscribePushNotifications(collaboratorId);
    setPushReady(push.ok);
    setPushError(push.ok ? null : push.error);
    setPushBusy(false);
  }

  return (
    <>
      {(!audioUnlocked || !pushReady) && (
        <button
          type="button"
          onClick={() => void unlockAudio()}
          disabled={pushBusy}
          className="fixed bottom-20 right-3 z-40 max-w-[13rem] rounded-full bg-brand-navy px-3 py-2 text-left text-xs font-medium text-white shadow-lg lg:bottom-6"
        >
          <span className="inline-flex items-start gap-1.5">
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {pushBusy
                ? "A ativar…"
                : pushReady
                  ? "Alertas OK"
                  : audioUnlocked
                    ? "Ativar push (2.º plano)"
                    : "Ativar alertas"}
              <span className="mt-0.5 block text-[10px] font-normal text-white/70">
                {pushReady
                  ? "notificações em segundo plano"
                  : "necessário para app fechada"}
              </span>
            </span>
          </span>
        </button>
      )}

      {audioUnlocked && pushReady && (
        <div
          className="fixed bottom-20 right-3 z-30 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-medium text-slate-500 shadow lg:bottom-6"
          title="Alertas de novas tarefas"
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Push ativo
          {live ? " · live" : ""}
        </div>
      )}

      {pushError && audioUnlocked && !pushReady && (
        <div className="fixed inset-x-3 bottom-36 z-40 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow lg:bottom-20 lg:left-auto lg:right-3 lg:max-w-xs">
          Push não ativado: {pushError}. No telemóvel, instala a app no ecrã
          inicial e permite notificações.
        </div>
      )}

      {alert && (
        <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
          <div
            role="alertdialog"
            aria-live="assertive"
            className="w-full max-w-md rounded-2xl border border-brand-sky/30 bg-white p-4 shadow-2xl ring-2 ring-brand-sky/20"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-sky-dark">
                  {alert.kind === "reminder30"
                    ? "Aviso · ~30 minutos"
                    : alert.kind === "reminder10"
                      ? "Aviso · ~10 minutos"
                      : "Nova tarefa atribuída"}
                </p>
                <p className="mt-0.5 text-base font-semibold text-brand-navy">
                  {alert.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {alert.address || "Sem morada"} ·{" "}
                  {formatDateTime(alert.scheduled_at ?? alert.start_time)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={taskDetailHref(alert.id, "tech")}
                    onClick={() => setAlert(null)}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-sky text-sm font-medium text-white hover:bg-brand-sky-dark"
                  >
                    Abrir intervenção
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAlert(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setAlert(null)}
                aria-label="Fechar alerta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
