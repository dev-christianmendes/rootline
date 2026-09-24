/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export type ServiceHealth = "healthy" | "degraded" | "critical" | "unknown";

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export type ServiceKind =
  | "frontend"
  | "gateway"
  | "api"
  | "worker"
  | "data"
  | "cache"
  | "message_bus";

export interface ServiceDependency {
  serviceId: string;
  targetId: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  kind: ServiceKind;
  team: string;
  version: string;
  health: ServiceHealth;
  latencyMs: number;
  errorRate: number;
  availability: number;
  p95LatencyMs: number;
  /** IDs of services this service depends on (outgoing edges). */
  dependencies: string[];
}

/* ------------------------------------------------------------------ */
/* Deployments                                                         */
/* ------------------------------------------------------------------ */

export type DeploymentStatus = "deployed" | "rolled_back" | "failed";

export interface Deployment {
  id: string;
  serviceId: string;
  version: string;
  startedAt: string;
  finishedAt: string;
  status: DeploymentStatus;
  author: string;
  commit: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

export type Severity = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "DETECTED"
  | "INVESTIGATING"
  | "MITIGATING"
  | "MONITORING"
  | "RESOLVED";

export type TimelineEventType =
  | "deployment"
  | "metric"
  | "incident"
  | "investigation"
  | "action"
  | "system"
  | "resolution";

export interface TimelineEvent {
  time: string;
  type: TimelineEventType;
  title: string;
  detail: string;
}

export interface AffectedService {
  serviceId: string;
  impact: string;
}

export interface IncidentResolution {
  rootCause: string;
  summary: string;
  resolvedBy: string;
  resolvedAt: string;
  mitigation: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  serviceId: string;
  assignee: string;
  startedAt: string;
  detectedAt: string;
  resolvedAt?: string;
  impact: string;
  summary: string;
  timeline: TimelineEvent[];
  affectedServices: AffectedService[];
  resolution?: IncidentResolution;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export type MetricName =
  | "latency_ms"
  | "error_rate"
  | "request_rate"
  | "cpu_usage"
  | "memory_usage";

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  serviceId: string;
  metric: MetricName;
  unit: string;
  points: MetricPoint[];
}

/* ------------------------------------------------------------------ */
/* Logs                                                                */
/* ------------------------------------------------------------------ */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  serviceId: string;
  incidentId?: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  fields: Record<string, string | number>;
}

/* ------------------------------------------------------------------ */
/* Traces                                                              */
/* ------------------------------------------------------------------ */

export type SpanStatus = "ok" | "error";

export interface Span {
  spanId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  operation: string;
  startedAt: string;
  durationMs: number;
  status: SpanStatus;
  error?: string;
}

export interface Trace {
  traceId: string;
  incidentId?: string;
  serviceId: string;
  name: string;
  operation: string;
  startedAt: string;
  durationMs: number;
  status: SpanStatus;
  spans: Span[];
}

/* ------------------------------------------------------------------ */
/* Investigation / AI                                                  */
/* ------------------------------------------------------------------ */

export type EvidenceKind = "fact" | "inference" | "recommendation";

export type EvidenceImpact = "supporting" | "counter";

export type EvidenceSourceType =
  | "metrics"
  | "logs"
  | "deployment"
  | "trace"
  | "dependency"
  | "infrastructure"
  | "incident";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail: string;
  source: string;
  sourceType: EvidenceSourceType;
  impact: EvidenceImpact;
  time?: string;
}

export type HypothesisStatus = "candidate" | "accepted" | "dismissed";

export interface Hypothesis {
  id: string;
  title: string;
  confidence: number;
  summary: string;
  evidence: Evidence[];
  counterEvidence: Evidence[];
  status: HypothesisStatus;
}

export interface Investigation {
  id: string;
  incidentId: string;
  generatedAt: string;
  hypotheses: Hypothesis[];
}

/* ------------------------------------------------------------------ */
/* API envelope                                                        */
/* ------------------------------------------------------------------ */

export interface HealthReport {
  status: "ok";
  version: string;
  environment: string;
  uptimeSeconds: number;
}

export interface SystemHealth {
  availability: number;
  avgLatencyMs: number;
  errorRate: number;
  serviceCount: number;
  activeIncidents: number;
}