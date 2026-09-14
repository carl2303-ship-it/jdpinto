import type {
  Collaborator,
  Task,
  TaskStatus,
  Team,
  TeamMember,
} from "@/types/database";
import { localDateAndTimeToIso } from "@/lib/forms";

export type TaskForAvailability = Pick<
  Task,
  | "id"
  | "title"
  | "status"
  | "assigned_team_id"
  | "assigned_collaborator_id"
  | "scheduled_at"
  | "start_time"
  | "end_time"
  | "planned_duration_minutes"
  | "duration_minutes"
>;

export type AvailabilityKind =
  | "available"
  | "busy"
  | "overrun"; // deveria estar livre pela duração prevista, mas tarefa não concluída

/** @deprecated use AvailabilityKind */
export type TeamAvailabilityKind = AvailabilityKind;

export type TeamAvailability = {
  team: Team;
  kind: AvailabilityKind;
  /** Tarefa que causa busy/overrun */
  blockingTask?: TaskForAvailability | null;
  message: string;
};

export type CollaboratorAvailability = {
  collaborator: Pick<Collaborator, "id" | "full_name">;
  kind: AvailabilityKind;
  blockingTask?: TaskForAvailability | null;
  /** true se o bloqueio vem de tarefa da equipa (não atribuição direta) */
  viaTeam?: boolean;
  message: string;
};

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000);
}

/** Janela planeada [início, fim) para efeitos de ocupação. */
export function plannedWindow(task: TaskForAvailability): {
  start: Date;
  end: Date;
} | null {
  const startIso = task.scheduled_at ?? task.start_time;
  if (!startIso) return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  // Concluída: usa fim real se existir
  if (task.status === "completed" && task.end_time) {
    const end = new Date(task.end_time);
    if (!Number.isNaN(end.getTime()) && end >= start) {
      return { start, end };
    }
  }

  const planned =
    task.planned_duration_minutes ??
    task.duration_minutes ??
    60; // fallback 1h se não houver previsão

  return { start, end: addMinutes(startIso, planned) };
}

function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
) {
  return a.start < b.end && b.start < a.end;
}

const OPEN: TaskStatus[] = ["scheduled", "in_progress"];

/**
 * Disponibilidade das equipas para um novo slot [scheduledAt, +plannedMinutes).
 * - busy: sobreposição de janela planeada com tarefa aberta
 * - overrun: tarefa aberta cuja duração prevista já terminava antes do novo início
 * - available: livre no slot
 */
export function assessTeamAvailability(opts: {
  teams: Team[];
  tasks: TaskForAvailability[];
  scheduledAt: string | null;
  plannedMinutes: number | null;
  excludeTaskId?: string | null;
}): TeamAvailability[] {
  const { teams, tasks, scheduledAt, plannedMinutes, excludeTaskId } = opts;

  if (!scheduledAt || !plannedMinutes || plannedMinutes <= 0) {
    return teams.map((team) => ({
      team,
      kind: "available" as const,
      blockingTask: null,
      message: "Indica agendamento e duração prevista para ver disponibilidade.",
    }));
  }

  const slot = {
    start: new Date(scheduledAt),
    end: addMinutes(scheduledAt, plannedMinutes),
  };
  if (Number.isNaN(slot.start.getTime())) {
    return teams.map((team) => ({
      team,
      kind: "available" as const,
      blockingTask: null,
      message: "Agendamento inválido.",
    }));
  }

  return teams.map((team) => {
    const teamTasks = tasks.filter(
      (t) =>
        t.assigned_team_id === team.id &&
        t.id !== excludeTaskId &&
        OPEN.includes(t.status),
    );

    // 1) Conflito de sobreposição na janela planeada
    for (const t of teamTasks) {
      const w = plannedWindow(t);
      if (w && overlaps(slot, w)) {
        return {
          team,
          kind: "busy" as const,
          blockingTask: t,
          message: `Ocupada com «${t.title}» no mesmo horário (duração prevista).`,
        };
      }
    }

    // 2) Alerta: tarefa ainda aberta mas pela previsão já deveria ter acabado
    for (const t of teamTasks) {
      const w = plannedWindow(t);
      if (!w) continue;
      if (w.end.getTime() <= slot.start.getTime()) {
        return {
          team,
          kind: "overrun" as const,
          blockingTask: t,
          message: `Atenção: ainda em «${t.title}» (não concluída), embora pela duração prevista já pudesse estar livre.`,
        };
      }
    }

    return {
      team,
      kind: "available" as const,
      blockingTask: null,
      message: "Disponível neste horário.",
    };
  });
}

/**
 * Disponibilidade dos colaboradores para o mesmo slot.
 * Ocupado se:
 * - tem tarefa aberta atribuída a si no horário, ou
 * - pertence a uma equipa com tarefa aberta no horário (a equipa ocupada ocupa os membros).
 */
export function assessCollaboratorAvailability(opts: {
  collaborators: Pick<Collaborator, "id" | "full_name">[];
  memberships: Pick<TeamMember, "team_id" | "collaborator_id">[];
  tasks: TaskForAvailability[];
  scheduledAt: string | null;
  plannedMinutes: number | null;
  excludeTaskId?: string | null;
}): CollaboratorAvailability[] {
  const {
    collaborators,
    memberships,
    tasks,
    scheduledAt,
    plannedMinutes,
    excludeTaskId,
  } = opts;

  const teamsByCollaborator = new Map<string, string[]>();
  for (const m of memberships) {
    const list = teamsByCollaborator.get(m.collaborator_id) ?? [];
    list.push(m.team_id);
    teamsByCollaborator.set(m.collaborator_id, list);
  }

  if (!scheduledAt || !plannedMinutes || plannedMinutes <= 0) {
    return collaborators.map((collaborator) => ({
      collaborator,
      kind: "available" as const,
      blockingTask: null,
      message: "Indica agendamento e duração prevista para ver disponibilidade.",
    }));
  }

  const slot = {
    start: new Date(scheduledAt),
    end: addMinutes(scheduledAt, plannedMinutes),
  };
  if (Number.isNaN(slot.start.getTime())) {
    return collaborators.map((collaborator) => ({
      collaborator,
      kind: "available" as const,
      blockingTask: null,
      message: "Agendamento inválido.",
    }));
  }

  return collaborators.map((collaborator) => {
    const teamIds = new Set(teamsByCollaborator.get(collaborator.id) ?? []);

    const relevant = tasks.filter((t) => {
      if (t.id === excludeTaskId || !OPEN.includes(t.status)) return false;
      if (t.assigned_collaborator_id === collaborator.id) return true;
      if (t.assigned_team_id && teamIds.has(t.assigned_team_id)) return true;
      return false;
    });

    for (const t of relevant) {
      const w = plannedWindow(t);
      if (w && overlaps(slot, w)) {
        const viaTeam =
          t.assigned_collaborator_id !== collaborator.id &&
          Boolean(t.assigned_team_id && teamIds.has(t.assigned_team_id));
        return {
          collaborator,
          kind: "busy" as const,
          blockingTask: t,
          viaTeam,
          message: viaTeam
            ? `Ocupado (equipa) com «${t.title}» no mesmo horário (duração prevista).`
            : `Ocupado com «${t.title}» no mesmo horário (duração prevista).`,
        };
      }
    }

    for (const t of relevant) {
      const w = plannedWindow(t);
      if (!w) continue;
      if (w.end.getTime() <= slot.start.getTime()) {
        const viaTeam =
          t.assigned_collaborator_id !== collaborator.id &&
          Boolean(t.assigned_team_id && teamIds.has(t.assigned_team_id));
        return {
          collaborator,
          kind: "overrun" as const,
          blockingTask: t,
          viaTeam,
          message: viaTeam
            ? `Atenção: a equipa ainda está em «${t.title}» (não concluída), embora pela duração prevista já pudesse estar livre.`
            : `Atenção: ainda em «${t.title}» (não concluída), embora pela duração prevista já pudesse estar livre.`,
        };
      }
    }

    return {
      collaborator,
      kind: "available" as const,
      blockingTask: null,
      message: "Disponível neste horário.",
    };
  });
}

export function parsePlannedDurationFromForm(formData: FormData): number | null {
  const hoursRaw = String(formData.get("planned_duration_hours") ?? "").trim();
  const minsRaw = String(formData.get("planned_duration_mins") ?? "").trim();
  if (hoursRaw === "" && minsRaw === "") return null;
  const hours = hoursRaw === "" ? 0 : Number(hoursRaw);
  const mins = minsRaw === "" ? 0 : Number(minsRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  if (hours < 0 || mins < 0 || mins > 59) return null;
  const total = Math.round(hours * 60 + mins);
  return total > 0 ? total : null;
}

export function scheduleIsoFromParts(date: string, time: string) {
  return localDateAndTimeToIso(date, time);
}
