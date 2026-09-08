export type CollaboratorRole = "admin" | "field_tech" | "manager";
export type CollaboratorStatus = "active" | "inactive";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type PhotoType = "before" | "after" | "evidence";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
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

export type Task = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  start_time: string | null;
  end_time: string | null;
  assigned_team_id: string | null;
  assigned_collaborator_id: string | null;
  status: TaskStatus;
  report_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskPhoto = {
  id: string;
  task_id: string;
  photo_url: string;
  photo_type: PhotoType;
  uploaded_at: string;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "#f59e0b",
  in_progress: "#0284c7",
  completed: "#16a34a",
  cancelled: "#ef4444",
};

export const ROLE_LABELS: Record<CollaboratorRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  field_tech: "Técnico de Campo",
};
