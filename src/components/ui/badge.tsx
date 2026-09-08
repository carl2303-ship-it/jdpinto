import * as React from "react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from "@/types/database";

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

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      className="text-white"
      style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
