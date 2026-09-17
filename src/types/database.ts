export type CollaboratorRole = "admin" | "field_tech" | "manager";
export type CollaboratorStatus = "active" | "inactive";
export type TaskStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Após conclusão: revisão admin → faturar → terminada */
export type TaskOfficeStage = "active" | "to_invoice" | "done";

/** Tipo de marcação / prioridade do serviço */
export type TaskServiceType =
  | "agendado_com_marcacao"
  | "agendado_sem_marcacao"
  | "sem_marcacao"
  | "urgente"
  | "nao_urgente";

export type PhotoType = "before" | "after" | "evidence" | "briefing";

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: "Antes",
  after: "Depois",
  evidence: "Evidência",
  briefing: "Anexo",
};

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  /** @deprecated prefer street + postal_code + locality; mantido composto na BD */
  address: string | null;
  street: string | null;
  postal_code: string | null;
  locality: string | null;
  vat_number: string | null;
  notes: string | null;
  created_at: string;
};

export type Collaborator = {
  id: string;
  user_id: string | null;
  full_name: string;
  role: CollaboratorRole;
  phone: string | null;
  email: string | null;
  status: CollaboratorStatus;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  leader_id: string | null;
  color_code: string;
  created_at: string;
};

export type TeamMember = {
  team_id: string;
  collaborator_id: string;
};

export type PushSubscriptionRow = {
  id: string;
  collaborator_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  /** Data de agendamento (dia) — yyyy-mm-dd, para calendário */
  scheduled_date: string | null;
  /** Data e hora de agendamento (admin) */
  scheduled_at: string | null;
  /** Duração prevista em minutos (planeamento) */
  planned_duration_minutes: number | null;
  /** Duração real em minutos (calculada quando o técnico define o fim) */
  duration_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
  assigned_team_id: string | null;
  assigned_collaborator_id: string | null;
  /** Tipo de marcação / prioridade */
  service_type: TaskServiceType;
  status: TaskStatus;
  report_notes: string | null;
  /** Lembrete ~30 min antes (push) já enviado */
  reminder_30_sent_at: string | null;
  /** Lembrete ~10 min antes (push) já enviado */
  reminder_10_sent_at: string | null;
  /**
   * Fluxo escritório após conclusão:
   * active → Intervenções; to_invoice → A faturar; done → Terminadas
   */
  office_stage: TaskOfficeStage;
  created_at: string;
  updated_at: string;
};

export type TaskPhoto = {
  id: string;
  task_id: string;
  photo_url: string;
  photo_type: PhotoType;
  /** Nome original do ficheiro (imagens / PDF) */
  file_name: string | null;
  uploaded_at: string;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

/** Estados visíveis nas pastilhas (substitui o tipo quando a tarefa avança). */
export const TASK_PROGRESS_STATUSES = ["in_progress", "completed"] as const;

export type TaskProgressStatus = (typeof TASK_PROGRESS_STATUSES)[number];

export function isTaskProgressStatus(
  status: TaskStatus,
): status is TaskProgressStatus {
  return status === "in_progress" || status === "completed";
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  scheduled: "#94a3b8",
  in_progress: "#0284c7",
  completed: "#16a34a",
  cancelled: "#94a3b8",
};

/** Cor da pastilha no calendário: progresso sobrescreve o tipo de serviço. */
export function taskChipColor(task: {
  status: TaskStatus;
  service_type?: TaskServiceType | null;
}) {
  if (isTaskProgressStatus(task.status)) {
    return TASK_STATUS_COLORS[task.status];
  }
  if (task.service_type) {
    return TASK_SERVICE_TYPE_COLORS[task.service_type];
  }
  return "#94a3b8";
}

export const TASK_OFFICE_STAGE_LABELS: Record<TaskOfficeStage, string> = {
  active: "Em intervenções",
  to_invoice: "A faturar",
  done: "Terminada",
};

export const TASK_SERVICE_TYPE_LABELS: Record<TaskServiceType, string> = {
  agendado_com_marcacao: "Agendado com marcação",
  agendado_sem_marcacao: "Agendado sem marcação",
  sem_marcacao: "Sem marcação (ir quando possível)",
  urgente: "Urgente (não falhar)",
  nao_urgente: "Não urgente",
};

export const TASK_SERVICE_TYPE_SHORT: Record<TaskServiceType, string> = {
  agendado_com_marcacao: "Com marcação",
  agendado_sem_marcacao: "Sem hora",
  sem_marcacao: "Quando possível",
  urgente: "Urgente",
  nao_urgente: "Não urgente",
};

export const TASK_SERVICE_TYPE_COLORS: Record<TaskServiceType, string> = {
  agendado_com_marcacao: "#0ea5e9",
  agendado_sem_marcacao: "#6366f1",
  sem_marcacao: "#64748b",
  urgente: "#dc2626",
  nao_urgente: "#94a3b8",
};

/** Exige data + hora de agendamento */
export function serviceTypeRequiresSlot(type: TaskServiceType) {
  return type === "agendado_com_marcacao";
}

/** Exige pelo menos o dia */
export function serviceTypeRequiresDate(type: TaskServiceType) {
  return (
    type === "agendado_com_marcacao" || type === "agendado_sem_marcacao"
  );
}

export const ROLE_LABELS: Record<CollaboratorRole, string> = {
  admin: "Administrador",
  manager: "Administrador", // legado — tratado como admin no UI
  field_tech: "Técnico",
};

export type TaskOpenFrom =
  | "tasks"
  | "calendar"
  | "a-faturar"
  | "terminadas"
  | "tech";

export function taskDetailHref(taskId: string, from?: TaskOpenFrom) {
  return from ? `/tech/${taskId}?from=${from}` : `/tech/${taskId}`;
}

/** Destino do botão «Fechar tarefa» conforme a origem. */
export function closeTaskHref(
  from: string | null | undefined,
  isOffice: boolean,
) {
  switch (from) {
    case "calendar":
      return "/calendar";
    case "tasks":
      return "/tasks";
    case "a-faturar":
      return "/a-faturar";
    case "terminadas":
      return "/terminadas";
    case "tech":
      return "/tech";
    default:
      return isOffice ? "/tasks" : "/tech";
  }
}

/** Link do calendário: admin edita se aberta; concluída → relatório/fotos. */
export function calendarTaskHref(task: Pick<Task, "id" | "status">) {
  if (task.status === "completed") return taskDetailHref(task.id, "calendar");
  return `/tasks?edit=${task.id}`;
}
