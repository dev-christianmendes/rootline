import type {
  IncidentStatus,
  Severity,
} from "@rootline/types";

/* ------------------------------------------------------------------ */
/* Severity                                                            */
/* ------------------------------------------------------------------ */

export const SEVERITY_ORDER: Severity[] = ["P1", "P2", "P3", "P4"];

export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: "critical" | "warning" | "info" | "muted" }
> = {
  P1: { label: "P1 — Critical", badge: "critical" },
  P2: { label: "P2 — High", badge: "warning" },
  P3: { label: "P3 — Medium", badge: "info" },
  P4: { label: "P4 — Low", badge: "muted" },
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const STATUS_ORDER: IncidentStatus[] = [
  "DETECTED",
  "INVESTIGATING",
  "MITIGATING",
  "MONITORING",
  "RESOLVED",
];

export const STATUS_META: Record<
  IncidentStatus,
  { badge: "critical" | "warning" | "info" | "success"; dot: string }
> = {
  DETECTED: { badge: "critical", dot: "bg-critical" },
  INVESTIGATING: { badge: "warning", dot: "bg-warning" },
  MITIGATING: { badge: "info", dot: "bg-info" },
  MONITORING: { badge: "info", dot: "bg-info/70" },
  RESOLVED: { badge: "success", dot: "bg-success" },
};

export const STATUS_FLOW: IncidentStatus[] = [
  "DETECTED",
  "INVESTIGATING",
  "MITIGATING",
  "MONITORING",
  "RESOLVED",
];

/** Returns the next allowed statuses from a given one (spec §15 flow). */
export function nextStatuses(current: IncidentStatus): IncidentStatus[] {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1) return [];
  return STATUS_FLOW.slice(idx + 1);
}

/* ------------------------------------------------------------------ */
/* Time / formatting                                                   */
/* ------------------------------------------------------------------ */

const UTC_TIME: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
};

const UTC_CLOCK: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
};

const UTC_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
};

export function formatTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", UTC_TIME);
}

export function formatClock(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", UTC_CLOCK);
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", UTC_DATE);
}

export function formatIso(ts: string): string {
  return ts.replace("T", " ").replace("Z", "").slice(0, 19);
}

export function formatDuration(
  startIso: string,
  endIso?: string | null,
): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const ms = Math.max(0, end - new Date(startIso).getTime());
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
}

export function formatDurationMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatPercent(value: number, digits = 2): string {
  if (Number.isInteger(value)) return `${value}%`;
  return `${value.toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export const HEALTH_META: Record<
  "healthy" | "degraded" | "critical" | "unknown",
  { label: string; dot: string; badge: "success" | "warning" | "critical" | "muted" }
> = {
  healthy: { label: "Healthy", dot: "bg-success", badge: "success" },
  degraded: { label: "Degraded", dot: "bg-warning", badge: "warning" },
  critical: { label: "Critical", dot: "bg-critical", badge: "critical" },
  unknown: { label: "Unknown", dot: "bg-muted-foreground", badge: "muted" },
};

export function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}