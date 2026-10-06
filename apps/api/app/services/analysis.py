from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Incident, Investigation, LogEntry, MetricPoint, Service, Trace


def generate_investigation_for_incident(db: Session, incident_id: str) -> Investigation | None:
    """Generate an AI-powered investigation for an incident.

    This is a mock implementation that correlates available data (metrics, logs,
    deployments, traces) to produce hypotheses with evidence.

    Returns the created Investigation, or None if incident not found.
    """
    incident = db.get(Incident, incident_id)
    if incident is None:
        return None

    # Check if investigation already exists
    existing = db.scalar(
        select(Investigation).where(Investigation.incident_id == incident_id)
    )
    if existing:
        return existing

    # Gather evidence from various sources
    evidence = []
    counter_evidence = []

    # 1. Check for recent deployments to the affected service
    deployments = db.scalars(
        select(Trace)
        .where(Trace.incident_id == incident_id)
        .order_by(Trace.started_at)
    ).all()

    # 2. Get metrics around the incident time
    metric_points = db.scalars(
        select(MetricPoint)
        .where(MetricPoint.service_id == incident.service_id)
        .order_by(MetricPoint.timestamp.desc())
        .limit(100)
    ).all()

    # 3. Get logs for the incident
    logs = db.scalars(
        select(LogEntry)
        .where(LogEntry.incident_id == incident_id)
        .order_by(LogEntry.timestamp)
    ).all()

    # 4. Get traces for the incident
    traces = db.scalars(
        select(Trace)
        .where(Trace.incident_id == incident_id)
        .order_by(Trace.started_at)
    ).all()

    # Build hypotheses based on available data
    hypotheses = []

    # Hypothesis 1: Recent deployment caused the issue
    if incident.affected_services:
        affected_service_ids = [s.get("serviceId") for s in incident.affected_services if isinstance(s, dict)]
        if incident.service_id in affected_service_ids or not affected_service_ids:
            affected_service_ids = [incident.service_id] + affected_service_ids

        # Check for deployments to affected services around incident time
        from app.models import Deployment
        recent_deployments = db.scalars(
            select(Deployment)
            .where(Deployment.service_id.in_(affected_service_ids))
            .where(Deployment.started_at <= incident.detected_at)
            .order_by(Deployment.started_at.desc())
            .limit(5)
        ).all()

        if recent_deployments:
            dep = recent_deployments[0]
            hypotheses.append({
                "id": f"hyp-{uuid.uuid4().hex[:8]}",
                "title": f"Recent deployment to {dep.service_id} ({dep.version})",
                "confidence": 0.75,
                "summary": (
                    f"Deployment {dep.version} to {dep.service_id} occurred at "
                    f"{dep.started_at.isoformat()}, before incident detection at "
                    f"{incident.detected_at.isoformat()}. "
                    f"Author: {dep.author}. Description: {dep.description or 'No description.'}"
                ),
                "status": "candidate",
                "evidence": [
                    {
                        "id": f"ev-{uuid.uuid4().hex[:8]}",
                        "kind": "fact",
                        "label": f"Deployment {dep.version} at {dep.started_at.isoformat()}",
                        "detail": f"{dep.service_id} v{dep.version} deployed by {dep.author}",
                        "source": dep.id,
                        "sourceType": "deployment",
                        "impact": "supporting",
                        "time": dep.started_at.isoformat(),
                    },
                ],
                "counterEvidence": [],
            })

    # Hypothesis 2: Metric anomaly (error rate / latency spike)
    if metric_points:
        error_rates = [m for m in metric_points if m.metric == "error_rate"]
        latencies = [m for m in metric_points if m.metric == "latency_ms"]

        if error_rates:
            max_error = max(error_rates, key=lambda m: m.value)
            if max_error.value > 1.0:  # > 1% error rate
                hypotheses.append({
                    "id": f"hyp-{uuid.uuid4().hex[:8]}",
                    "title": f"Error rate spike on {incident.service_id}",
                    "confidence": 0.65,
                    "summary": (
                        f"Error rate reached {max_error.value:.2f}% at "
                        f"{max_error.timestamp.isoformat()} on {incident.service_id}. "
                        f"This correlates with the incident timeline."
                    ),
                    "status": "candidate",
                    "evidence": [
                        {
                            "id": f"ev-{uuid.uuid4().hex[:8]}",
                            "kind": "fact",
                            "label": f"Error rate {max_error.value:.2f}%",
                            "detail": f"Peak error rate observed at {max_error.timestamp.isoformat()}",
                            "source": f"{incident.service_id}/metrics/error_rate",
                            "sourceType": "metrics",
                            "impact": "supporting",
                            "time": max_error.timestamp.isoformat(),
                        },
                    ],
                    "counterEvidence": [],
                })

        if latencies:
            max_latency = max(latencies, key=lambda m: m.value)
            if max_latency.value > 500:  # > 500ms latency
                hypotheses.append({
                    "id": f"hyp-{uuid.uuid4().hex[:8]}",
                    "title": f"Latency degradation on {incident.service_id}",
                    "confidence": 0.60,
                    "summary": (
                        f"Latency reached {max_latency.value:.0f}ms at "
                        f"{max_latency.timestamp.isoformat()} on {incident.service_id}. "
                        f"May indicate resource saturation or downstream dependency issues."
                    ),
                    "status": "candidate",
                    "evidence": [
                        {
                            "id": f"ev-{uuid.uuid4().hex[:8]}",
                            "kind": "fact",
                            "label": f"Latency {max_latency.value:.0f}ms",
                            "detail": f"Peak latency observed at {max_latency.timestamp.isoformat()}",
                            "source": f"{incident.service_id}/metrics/latency_ms",
                            "sourceType": "metrics",
                            "impact": "supporting",
                            "time": max_latency.timestamp.isoformat(),
                        },
                    ],
                    "counterEvidence": [],
                })

    # Hypothesis 3: Trace errors
    if traces:
        error_traces = [t for t in traces if t.status == "error"]
        if error_traces:
            trace = error_traces[0]
            hypotheses.append({
                "id": f"hyp-{uuid.uuid4().hex[:8]}",
                "title": f"Failed traces in {trace.service_id}",
                "confidence": 0.70,
                "summary": (
                    f"Found {len(error_traces)} failed traces for {trace.service_id}. "
                    f"First error: {trace.name} at {trace.started_at.isoformat()}. "
                    f"Operation: {trace.operation}"
                ),
                "status": "candidate",
                "evidence": [
                    {
                        "id": f"ev-{uuid.uuid4().hex[:8]}",
                        "kind": "fact",
                        "label": f"{len(error_traces)} failed traces",
                        "detail": f"Trace {trace.trace_id} failed with status {trace.status}",
                        "source": trace.trace_id,
                        "sourceType": "trace",
                        "impact": "supporting",
                        "time": trace.started_at.isoformat(),
                    },
                ],
                "counterEvidence": [],
            })

    # Hypothesis 4: Error logs
    if logs:
        error_logs = [l for l in logs if l.level == "error"]
        if error_logs:
            log = error_logs[0]
            hypotheses.append({
                "id": f"hyp-{uuid.uuid4().hex[:8]}",
                "title": f"Error logs in {log.service_id}",
                "confidence": 0.55,
                "summary": (
                    f"Found {len(error_logs)} error logs for {log.service_id}. "
                    f"First error: {log.message} at {log.timestamp.isoformat()}."
                ),
                "status": "candidate",
                "evidence": [
                    {
                        "id": f"ev-{uuid.uuid4().hex[:8]}",
                        "kind": "fact",
                        "label": f"{len(error_logs)} error logs",
                        "detail": f"Error: {log.message}",
                        "source": log.id,
                        "sourceType": "logs",
                        "impact": "supporting",
                        "time": log.timestamp.isoformat(),
                    },
                ],
                "counterEvidence": [],
            })

    # If no hypotheses generated, create a generic one
    if not hypotheses:
        hypotheses.append({
            "id": f"hyp-{uuid.uuid4().hex[:8]}",
            "title": "Unknown root cause - manual investigation required",
            "confidence": 0.30,
            "summary": (
                "No strong correlations found in automated analysis. "
                "Manual investigation of metrics, logs, and traces recommended."
            ),
            "status": "candidate",
            "evidence": [],
            "counterEvidence": [],
        })

    # Create investigation
    investigation = Investigation(
        id=f"inv-{incident_id}-{uuid.uuid4().hex[:8]}",
        incident_id=incident_id,
        generated_at=datetime.now(timezone.utc),
        hypotheses=hypotheses,
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return investigation