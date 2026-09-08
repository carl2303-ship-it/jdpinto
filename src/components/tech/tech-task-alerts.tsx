"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";
import {
  ensureNotificationPermission,
  playTaskAlertSound,
  showSystemNotification,
} from "@/lib/task-alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/forms";

type AlertTask = {
  id: string;
  title: string;
  address: string | null;
  start_time: string | null;
};

type Props = {
  collaboratorId: string;
  teamIds: string[];
};

export function TechTaskAlerts({ collaboratorId, teamIds }: Props) {
  const [alert, setAlert] = useState<AlertTask | null>(null);
  const [enabled, setEnabled] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const teamSet = useRef(new Set(teamIds));
  const unlockedAudio = useRef(false);

  useEffect(() => {
    teamSet.current = new Set(teamIds);
  }, [teamIds]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function boot() {
      // Seed tarefas já conhecidas (evita alerta ao abrir a app)
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .neq("status", "cancelled");

      if (cancelled) return;
      for (const row of existing ?? []) {
        seenRef.current.add(row.id);
      }

      await ensureNotificationPermission();

      channel = supabase
        .channel(`tech-task-alerts:${collaboratorId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tasks" },
          (payload) => {
            handlePayload(payload.new as Task, "INSERT");
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks" },
          (payload) => {
            handlePayload(payload.new as Task, "UPDATE");
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setEnabled(true);
        });
    }

    function isAssignedToMe(task: Task) {
      if (task.assigned_collaborator_id === collaboratorId) return true;
      if (
        task.assigned_team_id &&
        teamSet.current.has(task.assigned_team_id)
      ) {
        return true;
      }
      return false;
    }

    function handlePayload(task: Task, event: "INSERT" | "UPDATE") {
      if (!task?.id || task.status === "cancelled") return;
      if (!isAssignedToMe(task)) return;

      const alreadySeen = seenRef.current.has(task.id);
      seenRef.current.add(task.id);

      // Só alerta em tarefas novas para este técnico (INSERT ou 1.ª vez que aparece)
      if (event === "UPDATE" && alreadySeen) return;

      const alertTask: AlertTask = {
        id: task.id,
        title: task.title,
        address: task.address,
        start_time: task.start_time,
      };

      setAlert(alertTask);
      playTaskAlertSound();
      showSystemNotification(
        "Nova intervenção JDPINTO",
        task.title,
        `/tech/${task.id}`,
      );

      // Vibrar se o telemóvel permitir
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([120, 60, 120, 60, 200]);
        } catch {
          // ignore
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [collaboratorId]);

  function unlockAudio() {
    if (unlockedAudio.current) return;
    unlockedAudio.current = true;
    playTaskAlertSound();
  }

  return (
    <>
      {/* Um toque inicial desbloqueia o áudio no iOS/Android */}
      {!unlockedAudio.current && (
        <button
          type="button"
          onClick={unlockAudio}
          className="fixed bottom-20 right-3 z-40 rounded-full bg-brand-navy px-3 py-2 text-xs font-medium text-white shadow-lg lg:bottom-6"
        >
          <span className="inline-flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Ativar alertas sonoros
            {enabled ? "" : "…"}
          </span>
        </button>
      )}

      {alert && (
        <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
          <div
            role="alertdialog"
            aria-live="assertive"
            className="w-full max-w-md animate-in fade-in slide-in-from-top-2 rounded-2xl border border-brand-sky/30 bg-white p-4 shadow-2xl ring-2 ring-brand-sky/20"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-sky-dark">
                  Nova tarefa atribuída
                </p>
                <p className="mt-0.5 text-base font-semibold text-brand-navy">
                  {alert.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {alert.address || "Sem morada"} ·{" "}
                  {formatDateTime(alert.start_time)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/tech/${alert.id}`}
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
