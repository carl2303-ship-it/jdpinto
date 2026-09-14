"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoToLocalDate, isoToLocalTime, localDateAndTimeToIso } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  dateName: string;
  timeName: string;
  value?: string | null;
  required?: boolean;
  onIsoChange?: (iso: string | null) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
/** Intervalos de 5 min — prático no telemóvel */
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

function snapMinute(m: string) {
  if (!m) return "";
  const n = Number(m);
  if (Number.isNaN(n)) return "";
  const snapped = Math.round(n / 5) * 5;
  const clamped = Math.min(55, Math.max(0, snapped));
  return String(clamped).padStart(2, "0");
}

function parseParts(value?: string | null) {
  const date = isoToLocalDate(value);
  const time = isoToLocalTime(value);
  const [h = "", m = ""] = time.split(":");
  return {
    date,
    hour: HOURS.includes(h) ? h : "",
    minute: m ? snapMinute(m) : "",
  };
}

/**
 * Data + hora 24h com selects (sem AM/PM do sistema).
 * Ex.: 14h : 30
 */
export function DateTime24Fields({
  label,
  dateName,
  timeName,
  value,
  required,
  onIsoChange,
}: Props) {
  const [date, setDate] = useState(() => parseParts(value).date);
  const [hour, setHour] = useState(() => parseParts(value).hour);
  const [minute, setMinute] = useState(() => parseParts(value).minute);

  useEffect(() => {
    const next = parseParts(value);
    setDate(next.date);
    setHour(next.hour);
    setMinute(next.minute);
  }, [value]);

  const timeValue =
    hour !== "" && minute !== "" ? `${hour}:${minute}` : "";

  function emit(nextDate: string, nextHour: string, nextMinute: string) {
    if (!onIsoChange) return;
    const t =
      nextHour !== "" && nextMinute !== ""
        ? `${nextHour}:${nextMinute}`
        : "";
    onIsoChange(localDateAndTimeToIso(nextDate, t));
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-brand-navy">
        {label}
      </legend>

      <input type="hidden" name={timeName} value={timeValue} />

      <div className="space-y-1">
        <Label htmlFor={dateName} className="text-xs text-slate-500">
          Data
        </Label>
        <Input
          id={dateName}
          name={dateName}
          type="date"
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            setDate(v);
            emit(v, hour, minute);
          }}
          required={required}
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500">Hora · formato 24h</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
              Hora
            </Label>
            <select
              aria-label={`${label} — hora`}
              value={hour}
              required={required}
              onChange={(e) => {
                const v = e.target.value;
                setHour(v);
                emit(date, v, minute);
              }}
              className={cn(
                "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center font-mono text-base font-semibold tabular-nums",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky",
              )}
            >
              <option value="">—</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <span className="mt-5 text-xl font-bold text-slate-400">:</span>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
              Min
            </Label>
            <select
              aria-label={`${label} — minutos`}
              value={minute}
              required={required}
              onChange={(e) => {
                const v = e.target.value;
                setMinute(v);
                emit(date, hour, v);
              }}
              className={cn(
                "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center font-mono text-base font-semibold tabular-nums",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky",
              )}
            >
              <option value="">—</option>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-center font-mono text-sm text-brand-navy">
          {timeValue ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-sky/10 px-2 py-0.5 font-semibold">
              {timeValue}
            </span>
          ) : (
            <span className="text-slate-400">ex.: 09:00 · 14:30 · 18:45</span>
          )}
        </p>
      </div>
    </fieldset>
  );
}
