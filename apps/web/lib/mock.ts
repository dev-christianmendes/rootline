import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  Deployment,
  Incident,
  Investigation,
  LogEntry,
  MetricSeries,
  Service,
  SystemHealth,
  Trace,
} from "@rootline/types";

/* ------------------------------------------------------------------ */
/* Data sources                                                        */
/* ------------------------------------------------------------------ */

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const DATA_DIR = path.join(REPO_ROOT, "data", "mock");
const RUNTIME_DIR = path.join(REPO_ROOT, "data", ".runtime");

function loadBase<T>(name: string): T {
  return JSON.parse(
    readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"),
  ) as T;
}

const getServicesBase = () => loadBase<Service[]>("services");
const getIncidentsBase = () => loadBase<Incident[]>("incidents");
const getMetricsBase = () => loadBase<MetricSeries[]>("metrics");
const getLogsBase = () => loadBase<LogEntry[]>("logs");
const getDeploymentsBase = () => loadBase<Deployment[]>("deployments");
const getTracesBase = () => loadBase<Trace[]>("traces");
const getHypothesesBase = () =>
  loadBase<{ incidentId: string; investigation: Investigation }[]>(
    "hypotheses",
  );

/* ------------------------------------------------------------------ */
/* Runtime overlay (stateful mutations persist to data/.runtime/)      */
/* ------------------------------------------------------------------ */

function runtimeFile(name: string): string {
  return path.join(RUNTIME_DIR, name);
}

function readRuntime<T>(name: string): T | null {
  const file = runtimeFile(name);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeRuntime(name: string, data: unknown): void {
  mkdirSync(RUNTIME_DIR, { recursive: true });
  writeFileSync(runtimeFile(name), JSON.stringify(data, null, 2), "utf8");
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export function getServices(): Service[] {
  return structuredClone(getServicesBase());
}

export function getService(id: string): Service | null {
  return getServicesBase().find((s) => s.id === id) ?? null;
}

export function getSystemHealth(): SystemHealth {
  const services = getServices();
  const incidents = getIncidents();
  const active = incidents.filter((i) => i.status !== "RESOLVED");

  const avg = (fn: (s: Service) => number) => {
    if (services.length === 0) return 0;
    return services.reduce((acc, s) => acc + fn(s), 0) / services.length;
  };

  return {
    availability: Number((100 - avg((s) => Math.max(0, 100 - s.availability))).toFixed(2)),
    avgLatencyMs: Math.round(avg((s) => s.latencyMs)),
    errorRate: Number(avg((s) => s.errorRate).toFixed(2)),
    serviceCount: services.length,
    activeIncidents: active.length,
  };
}

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

function incidentsSource(): Incident[] {
  return readRuntime<Incident[]>("incidents.json") ?? getIncidentsBase();
}

export function getIncidents(): Incident[] {
  return structuredClone(incidentsSource());
}

export function getIncident(id: string): Incident | null {
  return incidentsSource().find((i) => i.id === id) ?? null;
}

export interface IncidentPatch {
  status?: Incident["status"];
  assignee?: string;
  title?: string;
  severity?: Incident["severity"];
  resolution?: Partial<Incident["resolution"]>;
}

export function patchIncident(id: string, patch: IncidentPatch): Incident | null {
  const all = incidentsSource();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const current = all[idx];
  if (!current) return null;

  const next: Incident = structuredClone(current);

  if (patch.status) next.status = patch.status;
  if (patch.assignee) next.assignee = patch.assignee;
  if (patch.title) next.title = patch.title;
  if (patch.severity) next.severity = patch.severity;
  if (patch.resolution) {
    next.resolution = {
      rootCause: "",
      summary: "",
      mitigation: "",
      resolvedBy: next.assignee,
      resolvedAt: new Date().toISOString(),
      ...current.resolution,
      ...patch.resolution,
    };
  }
  if (patch.status === "RESOLVED" && !next.resolvedAt) {
    next.resolvedAt = new Date().toISOString();
  }

  all[idx] = next;
  writeRuntime("incidents.json", all);
  return structuredClone(next);
}

export function createIncident(input: Partial<Incident>): Incident {
  const all = incidentsSource();
  const max = all.reduce((acc, i) => {
    const n = Number(i.id.replace("INC-", ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  const now = new Date().toISOString();

  const incident: Incident = {
    id: `INC-${max + 1}`,
    title: input.title ?? "Untitled incident",
    description: input.description ?? "",
    severity: input.severity ?? "P3",
    status: "DETECTED",
    serviceId: input.serviceId ?? "payment-api",
    assignee: input.assignee ?? "Unassigned",
    startedAt: input.startedAt ?? now,
    detectedAt: now,
    impact: input.impact ?? "Pending assessment.",
    summary: input.summary ?? "",
    timeline: [
      {
        time: now,
        type: "incident",
        title: "Incident created",
        detail: "New incident reported.",
      },
    ],
    affectedServices: input.affectedServices ?? [],
  };

  all.unshift(incident);
  writeRuntime("incidents.json", all);
  return structuredClone(incident);
}

/* ------------------------------------------------------------------ */
/* Metrics / logs / deployments / traces                               */
/* ------------------------------------------------------------------ */

export function getMetrics(serviceId?: string, metric?: string): MetricSeries[] {
  return getMetricsBase()
    .filter((m) => (serviceId ? m.serviceId === serviceId : true))
    .filter((m) => (metric ? m.metric === metric : true))
    .map((m) => structuredClone(m));
}

export function getLogs(incidentId?: string, serviceId?: string): LogEntry[] {
  return getLogsBase()
    .filter((l) => (incidentId ? l.incidentId === incidentId : true))
    .filter((l) => (serviceId ? l.serviceId === serviceId : true))
    .map((l) => structuredClone(l))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getDeployments(): Deployment[] {
  return getDeploymentsBase().map((d) => structuredClone(d));
}

export function getTraces(incidentId?: string): Trace[] {
  return getTracesBase()
    .filter((t) => (incidentId ? t.incidentId === incidentId : true))
    .map((t) => structuredClone(t));
}

/* ------------------------------------------------------------------ */
/* Investigation / AI analysis                                         */
/* ------------------------------------------------------------------ */

export function getInvestigations(): Investigation[] {
  return getHypothesesBase().map((h) => structuredClone(h.investigation));
}

export function getInvestigation(id: string): Investigation | null {
  return getInvestigations().find((inv) => inv.id === id) ?? null;
}

export function getInvestigationForIncident(
  incidentId: string,
): Investigation | null {
  return getInvestigations().find((inv) => inv.incidentId === incidentId) ?? null;
}

export function analyzeIncident(incidentId: string): Investigation | null {
  const investigation = getInvestigationForIncident(incidentId);
  if (!investigation) return null;
  return structuredClone(investigation);
}