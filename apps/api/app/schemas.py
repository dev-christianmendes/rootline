from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer


def iso_ms(value: datetime | None) -> str | None:
    """Serialize as ``2026-09-24T14:06:00.000Z``.

    Always milliseconds + ``Z`` so the payload is byte-stable and keeps
    lexicographic order equal to chronological order. The frontend sorts
    timestamps with ``String.localeCompare``, so a mixed ``...:00Z`` /
    ``...:00.000Z`` payload would sort incorrectly.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return f"{value.strftime('%Y-%m-%dT%H:%M:%S')}.{value.microsecond // 1000:03d}Z"


IsoDatetime = Annotated[datetime, PlainSerializer(iso_ms, return_type=str)]
OptionalIsoDatetime = Annotated[
    datetime | None, PlainSerializer(iso_ms, return_type=str | None)
]


class Domain(BaseModel):
    # populate_by_name lets the models validate from ORM attributes
    # (``error_rate``) as well as from their camelCase alias (``errorRate``),
    # which from_attributes alone would not do.
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# --------------------------------------------------------------------------
# Enums — kept in sync with packages/types/src/index.ts
# --------------------------------------------------------------------------


class ServiceHealth(str, Enum):
    healthy = "healthy"
    degraded = "degraded"
    critical = "critical"
    unknown = "unknown"


class ServiceKind(str, Enum):
    frontend = "frontend"
    gateway = "gateway"
    api = "api"
    worker = "worker"
    data = "data"
    cache = "cache"
    message_bus = "message_bus"


class DeploymentStatus(str, Enum):
    deployed = "deployed"
    rolled_back = "rolled_back"
    failed = "failed"


class Severity(str, Enum):
    p1 = "P1"
    p2 = "P2"
    p3 = "P3"
    p4 = "P4"


class IncidentStatus(str, Enum):
    detected = "DETECTED"
    investigating = "INVESTIGATING"
    mitigating = "MITIGATING"
    monitoring = "MONITORING"
    resolved = "RESOLVED"


class TimelineEventType(str, Enum):
    deployment = "deployment"
    metric = "metric"
    incident = "incident"
    investigation = "investigation"
    action = "action"
    system = "system"
    resolution = "resolution"


class MetricName(str, Enum):
    latency_ms = "latency_ms"
    error_rate = "error_rate"
    request_rate = "request_rate"
    cpu_usage = "cpu_usage"
    memory_usage = "memory_usage"


class LogLevel(str, Enum):
    debug = "debug"
    info = "info"
    warn = "warn"
    error = "error"


class SpanStatus(str, Enum):
    ok = "ok"
    error = "error"


class EvidenceKind(str, Enum):
    fact = "fact"
    inference = "inference"
    recommendation = "recommendation"


class EvidenceImpact(str, Enum):
    supporting = "supporting"
    counter = "counter"


class EvidenceSourceType(str, Enum):
    metrics = "metrics"
    logs = "logs"
    deployment = "deployment"
    trace = "trace"
    dependency = "dependency"
    infrastructure = "infrastructure"
    incident = "incident"


class HypothesisStatus(str, Enum):
    candidate = "candidate"
    accepted = "accepted"
    dismissed = "dismissed"


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------


class HealthReport(Domain):
    status: Literal["ok"] = "ok"
    version: str
    environment: str
    uptime_seconds: int = Field(alias="uptimeSeconds")


class SystemHealth(Domain):
    availability: float
    avg_latency_ms: float = Field(alias="avgLatencyMs")
    error_rate: float = Field(alias="errorRate")
    service_count: int = Field(alias="serviceCount")
    active_incidents: int = Field(alias="activeIncidents")


class ServiceOut(Domain):
    id: str
    name: str
    description: str
    kind: ServiceKind
    team: str
    version: str
    health: ServiceHealth
    latency_ms: float = Field(alias="latencyMs")
    error_rate: float = Field(alias="errorRate")
    availability: float
    p95_latency_ms: float = Field(alias="p95LatencyMs")
    dependencies: list[str]


class DeploymentOut(Domain):
    id: str
    service_id: str = Field(alias="serviceId")
    version: str
    started_at: IsoDatetime = Field(alias="startedAt")
    finished_at: OptionalIsoDatetime = Field(default=None, alias="finishedAt")
    status: DeploymentStatus
    author: str
    commit: str
    description: str


class TimelineEvent(Domain):
    time: str
    type: TimelineEventType
    title: str
    detail: str


class AffectedService(Domain):
    service_id: str = Field(alias="serviceId")
    impact: str


class IncidentResolution(Domain):
    root_cause: str = Field(alias="rootCause")
    summary: str
    resolved_by: str = Field(alias="resolvedBy")
    resolved_at: str = Field(alias="resolvedAt")
    mitigation: str


class IncidentResolutionPatch(BaseModel):
    """Partial resolution as sent by the resolve dialog."""

    root_cause: str | None = Field(default=None, alias="rootCause")
    summary: str | None = None
    mitigation: str | None = None
    resolved_by: str | None = Field(default=None, alias="resolvedBy")
    resolved_at: str | None = Field(default=None, alias="resolvedAt")

    model_config = ConfigDict(populate_by_name=True)


class IncidentOut(Domain):
    id: str
    title: str
    description: str
    severity: Severity
    status: IncidentStatus
    service_id: str = Field(alias="serviceId")
    assignee: str
    started_at: IsoDatetime = Field(alias="startedAt")
    detected_at: IsoDatetime = Field(alias="detectedAt")
    resolved_at: OptionalIsoDatetime = Field(default=None, alias="resolvedAt")
    impact: str
    summary: str
    timeline: list[TimelineEvent]
    affected_services: list[AffectedService] = Field(alias="affectedServices")
    resolution: IncidentResolution | None = None


class IncidentCreate(BaseModel):
    """Payload for POST /incidents. Every field is optional but ``title``."""

    title: str | None = None
    description: str | None = None
    severity: Severity | None = None
    service_id: str | None = Field(default=None, alias="serviceId")
    assignee: str | None = None
    started_at: OptionalIsoDatetime = Field(default=None, alias="startedAt")
    impact: str | None = None
    summary: str | None = None
    affected_services: list[AffectedService] | None = Field(
        default=None, alias="affectedServices"
    )

    model_config = ConfigDict(populate_by_name=True)


class IncidentPatch(BaseModel):
    status: IncidentStatus | None = None
    assignee: str | None = None
    title: str | None = None
    severity: Severity | None = None
    resolution: IncidentResolutionPatch | None = None

    model_config = ConfigDict(populate_by_name=True)


class MetricPointOut(Domain):
    timestamp: IsoDatetime
    value: float


class MetricSeriesOut(Domain):
    service_id: str = Field(alias="serviceId")
    metric: MetricName
    unit: str
    points: list[MetricPointOut]


class LogEntryOut(Domain):
    id: str
    service_id: str = Field(alias="serviceId")
    incident_id: str | None = Field(default=None, alias="incidentId")
    timestamp: IsoDatetime
    level: LogLevel
    message: str
    fields: dict


class SpanOut(Domain):
    span_id: str = Field(alias="spanId")
    parent_span_id: str | None = Field(default=None, alias="parentSpanId")
    name: str
    service: str
    operation: str
    started_at: IsoDatetime = Field(alias="startedAt")
    duration_ms: float = Field(alias="durationMs")
    status: SpanStatus
    error: str | None = None


class TraceOut(Domain):
    trace_id: str = Field(alias="traceId")
    incident_id: str | None = Field(default=None, alias="incidentId")
    service_id: str = Field(alias="serviceId")
    name: str
    operation: str
    started_at: IsoDatetime = Field(alias="startedAt")
    duration_ms: float = Field(alias="durationMs")
    status: SpanStatus
    spans: list[SpanOut]


class EvidenceOut(Domain):
    id: str
    kind: EvidenceKind
    label: str
    detail: str
    source: str
    source_type: EvidenceSourceType = Field(alias="sourceType")
    impact: EvidenceImpact
    time: str | None = None


class HypothesisOut(Domain):
    id: str
    title: str
    confidence: float
    summary: str
    evidence: list[EvidenceOut]
    counter_evidence: list[EvidenceOut] = Field(alias="counterEvidence")
    status: HypothesisStatus


class InvestigationOut(Domain):
    id: str
    incident_id: str = Field(alias="incidentId")
    generated_at: IsoDatetime = Field(alias="generatedAt")
    hypotheses: list[HypothesisOut]
