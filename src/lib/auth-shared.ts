import type { CollaboratorRole } from "@/types/database";

export function isOfficeRole(role: CollaboratorRole | undefined | null) {
  return role === "admin" || role === "manager";
}

export function homePathForRole(role: CollaboratorRole | undefined | null) {
  return isOfficeRole(role) ? "/calendar" : "/tech";
}
