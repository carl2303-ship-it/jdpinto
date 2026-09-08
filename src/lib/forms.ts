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

/** Junta Rua, CP e Localidade (ou fallback ao campo address legado). */
export function formatClientAddress(client: {
  street?: string | null;
  postal_code?: string | null;
  locality?: string | null;
  address?: string | null;
} | null | undefined): string | null {
  if (!client) return null;
  const street = client.street?.trim() || "";
  const cp = client.postal_code?.trim() || "";
  const locality = client.locality?.trim() || "";
  const line2 = [cp, locality].filter(Boolean).join(" ");
  const composed = [street, line2].filter(Boolean).join(", ");
  if (composed) return composed;
  return client.address?.trim() || null;
}

/** Digits only; adds Portugal (+351) when number looks local (9xxxxxxxx). */
export function normalizePhoneE164(phone: string, defaultCountry = "351"): string | null {
  const raw = phone.trim();
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith("9")) {
    digits = `${defaultCountry}${digits}`;
  }
  return digits;
}

export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : `tel:${phone.trim()}`;
}

/** Opens WhatsApp chat (wa.me). Optional prefilled message. */
export function whatsappUrl(phone: string, message?: string) {
  const e164 = normalizePhoneE164(phone);
  if (!e164) return null;
  const base = `https://wa.me/${e164}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

/** Data agendada (yyyy-mm-dd) sem hora. */
export function formatScheduledDate(value: string | null | undefined) {
  if (!value) return "—";
  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(date);
}

/** Ex.: 90 → "1h 30m"; 45 → "45 min" */
export function formatDurationMinutes(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function parseDurationFromForm(formData: FormData): number | null {
  const hoursRaw = String(formData.get("duration_hours") ?? "").trim();
  const minsRaw = String(formData.get("duration_mins") ?? "").trim();
  const legacy = String(formData.get("duration_minutes") ?? "").trim();

  if (hoursRaw !== "" || minsRaw !== "") {
    const hours = hoursRaw === "" ? 0 : Number(hoursRaw);
    const mins = minsRaw === "" ? 0 : Number(minsRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    if (hours < 0 || mins < 0 || mins > 59) return null;
    const total = Math.round(hours * 60 + mins);
    return total > 0 ? total : null;
  }

  if (legacy === "") return null;
  const n = Number(legacy);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
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
