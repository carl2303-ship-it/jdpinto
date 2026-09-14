const APP_TIME_ZONE = "Europe/Lisbon";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function partsInTimeZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: map.year!,
    month: map.month!,
    day: map.day!,
    hour: map.hour!,
    minute: map.minute!,
    second: map.second ?? "00",
  };
}

/** Convert datetime-local / ISO-ish value to ISO timestamptz, or null if empty. */
export function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Combina data (yyyy-mm-dd) + hora (HH:mm) como relógio de Portugal (Europe/Lisbon)
 * e devolve ISO UTC. Não depende do fuso do servidor (Netlify = UTC).
 */
export function localDateAndTimeToIso(
  dateValue: string,
  timeValue: string,
): string | null {
  const d = dateValue?.trim() ?? "";
  const t = timeValue?.trim() ?? "";
  if (!d || !t) return null;
  const [hhRaw = "", mmRaw = ""] = t.split(":");
  const hh = pad2(Number(hhRaw));
  const mm = pad2(Number(mmRaw));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Number(hhRaw)) || Number.isNaN(Number(mmRaw))) {
    return null;
  }

  // Ajuste iterativo: converte "parede" Lisboa → UTC (respeita horário de verão)
  let utcMs = Date.parse(`${d}T${hh}:${mm}:00Z`);
  if (Number.isNaN(utcMs)) return null;
  for (let i = 0; i < 3; i += 1) {
    const p = partsInTimeZone(new Date(utcMs), APP_TIME_ZONE);
    const asIfUtc = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    const target = Date.parse(`${d}T${hh}:${mm}:00Z`);
    utcMs += target - asIfUtc;
  }

  const out = new Date(utcMs);
  if (Number.isNaN(out.getTime())) return null;
  return out.toISOString();
}

/** Convert ISO timestamptz to datetime-local input value (Portugal). */
export function isoToLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsInTimeZone(date, APP_TIME_ZONE);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function isoToLocalDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsInTimeZone(date, APP_TIME_ZONE);
  return `${p.year}-${p.month}-${p.day}`;
}

/** HH:mm em hora de Portugal */
export function isoToLocalTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsInTimeZone(date, APP_TIME_ZONE);
  return `${p.hour}:${p.minute}`;
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
    timeZone: APP_TIME_ZONE,
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
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes === 0) return "< 1 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** True se os dois ISO caem no mesmo minuto em Europe/Lisbon. */
export function sameLocalMinute(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  const pa = partsInTimeZone(da, APP_TIME_ZONE);
  const pb = partsInTimeZone(db, APP_TIME_ZONE);
  return (
    pa.year === pb.year &&
    pa.month === pb.month &&
    pa.day === pb.day &&
    pa.hour === pb.hour &&
    pa.minute === pb.minute
  );
}

/** Minutos entre início e fim (arredondados; 0 se for o mesmo minuto). */
export function durationMinutesBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export function formatTime24(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

/** Ex.: "sáb., 14/09/2026" — para cards do técnico */
export function formatScheduleDateLabel(value: string | null | undefined) {
  if (!value) return "Sem data";
  const iso = value.includes("T") ? value : `${value.slice(0, 10)}T12:00:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Hora agendada em destaque; "—" se só houver dia */
export function formatScheduleTimeLabel(scheduledAt: string | null | undefined) {
  if (!scheduledAt || !scheduledAt.includes("T")) return "—:—";
  return formatTime24(scheduledAt);
}

/**
 * Garante end >= start.
 * Em conclusão: usa o fim do formulário; se faltar, usa agora.
 * Nunca altera o início para igualar o fim — exige início válido.
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
    if (!end_time) {
      end_time = new Date().toISOString();
    }
    if (!start_time) {
      return {
        ok: false,
        error: "Indica a data/hora de início antes de concluir.",
      };
    }
  }

  if (start_time && end_time) {
    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { ok: false, error: "Data/hora inválida." };
    }
    // Mesmo minuto em Portugal: aceitar (ex.: início com segundos e fim ao minuto)
    if (endMs < startMs) {
      if (sameLocalMinute(start_time, end_time)) {
        end_time = start_time;
      } else {
        return {
          ok: false,
          error: "A hora de fim tem de ser igual ou posterior à de início.",
        };
      }
    }
  }

  return { ok: true, start_time, end_time };
}
