import { FileText, Trash2 } from "lucide-react";
import type { PhotoType, TaskPhoto } from "@/types/database";
import { PHOTO_TYPE_LABELS } from "@/types/database";
import { isPdfFile } from "@/lib/attachments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AttachmentItem = TaskPhoto & { signedUrl?: string | null };

export function AttachmentGrid({
  items,
  className,
  onRemove,
  removingId,
}: {
  items: AttachmentItem[];
  className?: string;
  onRemove?: (id: string) => void;
  removingId?: string | null;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        className,
      )}
    >
      {items.map((p) => {
        const label =
          p.file_name ||
          PHOTO_TYPE_LABELS[p.photo_type as PhotoType] ||
          p.photo_type;
        const pdf = isPdfFile(p.photo_url, null) || isPdfFile(p.file_name ?? "");
        const busy = removingId === p.id;

        if (pdf) {
          return (
            <div
              key={p.id}
              className="relative flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center"
            >
              {onRemove && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  className="absolute right-1.5 top-1.5 h-7 w-7 border-red-200 bg-white text-red-600 hover:bg-red-50"
                  aria-label="Remover anexo"
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <a
                href={p.signedUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 hover:opacity-90"
              >
                <FileText className="h-8 w-8 text-brand-sky-dark" />
                <span className="line-clamp-2 text-xs font-medium text-brand-navy">
                  {label}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  PDF ·{" "}
                  {PHOTO_TYPE_LABELS[p.photo_type as PhotoType] ?? p.photo_type}
                </span>
              </a>
            </div>
          );
        }

        return (
          <figure
            key={p.id}
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          >
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={busy}
                className="absolute right-1.5 top-1.5 z-10 h-7 w-7 border-red-200 bg-white text-red-600 hover:bg-red-50"
                aria-label="Remover anexo"
                onClick={() => onRemove(p.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {p.signedUrl ? (
              <a href={p.signedUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.signedUrl}
                  alt={label}
                  className="aspect-square w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-slate-400">
                Sem preview
              </div>
            )}
            <figcaption className="truncate px-2 py-1 text-xs text-slate-500">
              {PHOTO_TYPE_LABELS[p.photo_type as PhotoType] ?? p.photo_type}
              {p.file_name ? ` · ${p.file_name}` : ""}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
