import * as React from "react";
import { cn } from "@/lib/utils";
import type { TaskServiceType, TaskStatus } from "@/types/database";
import {
  TASK_SERVICE_TYPE_COLORS,
  TASK_SERVICE_TYPE_SHORT,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  isTaskProgressStatus,
} from "@/types/database";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

/** Só Em Curso / Concluída — Agendada e Cancelada não aparecem. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  if (!isTaskProgressStatus(status)) return null;
  return (
    <Badge
      className="text-white"
      style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ServiceTypeBadge({
  type,
}: {
  type: TaskServiceType | null | undefined;
}) {
  if (!type) return null;
  return (
    <Badge
      className="text-white"
      style={{ backgroundColor: TASK_SERVICE_TYPE_COLORS[type] }}
    >
      {TASK_SERVICE_TYPE_SHORT[type]}
    </Badge>
  );
}

/**
 * Pastilha única: tipo de serviço enquanto agendada;
 * Em Curso / Concluída no lugar do tipo quando a tarefa avança.
 */
export function TaskStateBadge({
  status,
  serviceType,
}: {
  status: TaskStatus;
  serviceType?: TaskServiceType | null;
}) {
  if (isTaskProgressStatus(status)) {
    return <StatusBadge status={status} />;
  }
  return <ServiceTypeBadge type={serviceType} />;
}
