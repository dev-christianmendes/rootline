from __future__ import annotations

import math

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Incident, Service
from app.schemas import SystemHealth

router = APIRouter(tags=["system"])

ACTIVE_STATUSES = ("DETECTED", "INVESTIGATING", "MITIGATING", "MONITORING")


def js_round(value: float) -> int:
    """Match JavaScript's Math.round (half away from zero) instead of Python's
    banker's rounding, so the numbers match the previous mock API exactly."""
    return math.floor(value + 0.5) if value >= 0 else math.ceil(value - 0.5)


def js_round2(value: float) -> float:
    """Match Number(x.toFixed(2))."""
    return math.floor(value * 100 + 0.5) / 100 if value >= 0 else -math.floor(
        -value * 100 + 0.5
    ) / 100


@router.get(
    "/system/health", response_model=SystemHealth, response_model_by_alias=True
)
def system_health(db: Session = Depends(get_db)) -> SystemHealth:
    services = list(db.scalars(select(Service)))
    count = len(services)
    if count == 0:
        return SystemHealth(
            availability=100.0,
            avgLatencyMs=0.0,
            errorRate=0.0,
            serviceCount=0,
            activeIncidents=0,
        )

    availability = sum(s.availability for s in services) / count
    avg_latency = sum(s.latency_ms for s in services) / count
    error_rate = sum(s.error_rate for s in services) / count
    active_total = len(
        list(db.scalars(select(Incident.id).where(Incident.status.in_(ACTIVE_STATUSES))))
    )

    return SystemHealth(
        availability=js_round2(availability),
        avgLatencyMs=js_round(avg_latency),
        errorRate=js_round2(error_rate),
        serviceCount=count,
        activeIncidents=active_total,
    )
