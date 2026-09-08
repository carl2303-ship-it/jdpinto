/** Convert datetime-local / ISO-ish value to ISO timestamptz, or null if empty. */
export function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Combine date (yyyy-mm-dd) + time (HH:mm, 24h) into ISO timestamptz. */
export function localDateAndTimeToIso(
  dateValue: string,
  timeValue: string,
): string | null {
  const d = dateValue?.trim() ?? "";
  const t = timeValue?.trim() ?? "";
  if (!d) return null;
  const time = t || "00:00";
  const date = new Date(`${d}T${time}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Convert ISO timestamptz to datetime-local input value. */
export function isoToLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoToLocalDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** HH:mm in 24h local time */
export function isoToLocalTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

export function formatTime24(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

/**
 * Garante end >= start. Em conclusão: fim = agora;
 * se o início estiver no futuro ou vazio, alinha o início ao fim.
 */
export function resolveTaskTimeRange(opts: {
  start: string | null;
  end: string | null;
  completing?: boolean;
}):
  | { ok: true; start_time: string | null; end_time: string | null }
  | { ok: false; error: string } {
  let start_time = opts.start;
  let end_time = opts.end;

  if (opts.completing) {
    end_time = new Date().toISOString();
    if (
      !start_time ||
      new Date(start_time).getTime() > new Date(end_time).getTime()
    ) {
      start_time = end_time;
    }
  }

  if (start_time && end_time) {
    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { ok: false, error: "Data/hora inválida." };
    }
    if (endMs < startMs) {
      return {
        ok: false,
        error: "A hora de fim tem de ser igual ou posterior à de início.",
      };
    }
  }

  return { ok: true, start_time, end_time };
}
