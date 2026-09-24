from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Deployment,
    Incident,
    Investigation,
    LogEntry,
    MetricPoint,
    Service,
    Trace,
)

DATASETS = (
    "services",
    "incidents",
    "metrics",
    "logs",
    "deployments",
    "traces",
    "hypotheses",
)


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _load(data_dir: Path, name: str) -> list[dict[str, Any]]:
    path = data_dir / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"seed dataset not found: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"seed dataset {path} must contain a JSON array")
    return payload


def is_empty(db: Session) -> bool:
    return db.scalar(select(func.count()).select_from(Service)) == 0


def clear(db: Session) -> None:
    for model in (
        Investigation,
        Trace,
        LogEntry,
        MetricPoint,
        Deployment,
        Incident,
        Service,
    ):
        db.execute(delete(model))
    db.commit()


def seed(db: Session, data_dir: Path | None = None, force: bool = False) -> bool:
    """Load the mock datasets into the database.

    Returns True when rows were written. Existing data is preserved unless
    ``force`` is set, so restarting the API never destroys incident edits.
    """
    settings = get_settings()
    directory = data_dir or settings.seed_data_dir
    directory = Path(directory)

    if not is_empty(db) and not force:
        return False

    if force:
        clear(db)

    services = _load(directory, "services")
    incidents = _load(directory, "incidents")
    metrics = _load(directory, "metrics")
    logs = _load(directory, "logs")
    deployments = _load(directory, "deployments")
    traces = _load(directory, "traces")
    hypotheses = _load(directory, "hypotheses")

    known_services = {s["id"] for s in services}

    for position, raw in enumerate(services):
        db.add(
            Service(
                id=raw["id"],
                position=position,
                name=raw["name"],
                description=raw.get("description", ""),
                kind=raw["kind"],
                team=raw.get("team", ""),
                version=raw.get("version", ""),
                health=raw.get("health", "unknown"),
                latency_ms=raw.get("latencyMs", 0.0),
                error_rate=raw.get("errorRate", 0.0),
                availability=raw.get("availability", 100.0),
                p95_latency_ms=raw.get("p95LatencyMs", 0.0),
                dependencies=raw.get("dependencies", []),
            )
        )

    # Services are the root of every reference graph. Flush them before adding
    # dependents: without ORM relationships between these models the unit of
    # work has no dependency edges and may insert children first, which
    # PostgreSQL rejects.
    db.flush()

    for position, raw in enumerate(deployments):
        db.add(
            Deployment(
                id=raw["id"],
                service_id=raw["serviceId"],
                position=position,
                version=raw["version"],
                started_at=parse_iso(raw["startedAt"]),
                finished_at=parse_iso(raw.get("finishedAt")),
                status=raw.get("status", "deployed"),
                author=raw.get("author", ""),
                commit=raw.get("commit", ""),
                description=raw.get("description", ""),
            )
        )

    # Parents must exist before rows referencing them: PostgreSQL enforces the
    # foreign keys immediately.
    db.flush()

    for raw in incidents:
        if raw["serviceId"] not in known_services:
            raise ValueError(
                f"incident {raw['id']} references unknown service {raw['serviceId']}"
            )
        db.add(
            Incident(
                id=raw["id"],
                title=raw["title"],
                description=raw.get("description", ""),
                severity=raw["severity"],
                status=raw["status"],
                service_id=raw["serviceId"],
                assignee=raw.get("assignee", ""),
                started_at=parse_iso(raw["startedAt"]),
                detected_at=parse_iso(raw["detectedAt"]),
                resolved_at=parse_iso(raw.get("resolvedAt")),
                impact=raw.get("impact", ""),
                summary=raw.get("summary", ""),
                timeline=raw.get("timeline", []),
                affected_services=raw.get("affectedServices", []),
                resolution=raw.get("resolution"),
            )
        )

    # Incidents are referenced by logs, traces and investigations.
    db.flush()

    for position, raw in enumerate(metrics):
        if raw["serviceId"] not in known_services:
            raise ValueError(
                f"metric series references unknown service {raw['serviceId']}"
            )
        unit = raw.get("unit", "")
        for point in raw.get("points", []):
            db.add(
                MetricPoint(
                    service_id=raw["serviceId"],
                    metric=raw["metric"],
                    series_position=position,
                    unit=unit,
                    timestamp=parse_iso(point["timestamp"]),
                    value=point["value"],
                )
            )

    for raw in logs:
        if raw["serviceId"] not in known_services:
            raise ValueError(f"log {raw['id']} references unknown service {raw['serviceId']}")
        db.add(
            LogEntry(
                id=raw["id"],
                service_id=raw["serviceId"],
                incident_id=raw.get("incidentId"),
                timestamp=parse_iso(raw["timestamp"]),
                level=raw.get("level", "info"),
                message=raw.get("message", ""),
                fields=raw.get("fields", {}),
            )
        )

    for raw in traces:
        if raw["serviceId"] not in known_services:
            raise ValueError(
                f"trace {raw['traceId']} references unknown service {raw['serviceId']}"
            )
        db.add(
            Trace(
                trace_id=raw["traceId"],
                incident_id=raw.get("incidentId"),
                service_id=raw["serviceId"],
                name=raw.get("name", ""),
                operation=raw.get("operation", ""),
                started_at=parse_iso(raw["startedAt"]),
                duration_ms=raw.get("durationMs", 0.0),
                status=raw.get("status", "ok"),
                spans=raw.get("spans", []),
            )
        )

    for raw in hypotheses:
        investigation = raw["investigation"]
        db.add(
            Investigation(
                id=investigation["id"],
                incident_id=investigation["incidentId"],
                generated_at=parse_iso(investigation["generatedAt"]),
                hypotheses=investigation.get("hypotheses", []),
            )
        )

    db.commit()
    return True
