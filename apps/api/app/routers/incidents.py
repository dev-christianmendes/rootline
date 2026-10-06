from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.db import get_db
from app.models import Incident, LogEntry, Service, Trace, User as UserModel
from app.schemas import IncidentCreate, IncidentOut, IncidentPatch, LogEntryOut, TraceOut

router = APIRouter(tags=["incidents"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _next_incident_id(db: Session) -> str:
    """Next ``INC-<n>`` for the highest existing suffix.

    Parsed in Python so the same logic works on PostgreSQL and SQLite, which
    disagree on substring syntax.
    """
    highest = 0
    for raw in db.scalars(select(Incident.id).where(Incident.id.like("INC-%"))):
        try:
            highest = max(highest, int(raw[4:]))
        except ValueError:
            continue
    return f"INC-{highest + 1}"


def get_incident_or_404(incident_id: str, db: Session) -> Incident:
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("/incidents", response_model=list[IncidentOut], response_model_by_alias=True)
def list_incidents(db: Session = Depends(get_db)) -> list[Incident]:
    return list(db.scalars(select(Incident).order_by(Incident.started_at.desc(), Incident.id)))


@router.get(
    "/incidents/{incident_id}",
    response_model=IncidentOut,
    response_model_by_alias=True,
    response_model_exclude_none=True,
    responses={404: {"description": "Incident not found"}},
)
def get_incident(incident_id: str, db: Session = Depends(get_db)) -> Incident:
    return get_incident_or_404(incident_id, db)


@router.post(
    "/incidents",
    response_model=IncidentOut,
    response_model_by_alias=True,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"description": "Missing title"}},
)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> Incident:
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="Field 'title' is required")

    service_id = payload.service_id
    if service_id and db.get(Service, service_id) is None:
        raise HTTPException(
            status_code=400, detail=f"Unknown service '{service_id}'"
        )
    if not service_id:
        service_id = db.scalar(select(Service.id).order_by(Service.position, Service.id))
    if service_id is None:
        raise HTTPException(status_code=400, detail="No services available to attach")

    now = datetime.now(timezone.utc)
    incident = Incident(
        id=_next_incident_id(db),
        title=payload.title.strip(),
        description=payload.description or "",
        severity=(payload.severity.value if payload.severity else "P3"),
        status="DETECTED",
        service_id=service_id,
        assignee=payload.assignee or "Unassigned",
        started_at=payload.started_at or now,
        detected_at=now,
        impact=payload.impact or "Pending assessment.",
        summary=payload.summary or "",
        timeline=[
            {
                "time": _utc_now_iso(),
                "type": "incident",
                "title": "Incident created",
                "detail": "New incident reported.",
            }
        ],
        affected_services=[
            s.model_dump(by_alias=True)
            for s in (payload.affected_services or [])
        ],
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.patch(
    "/incidents/{incident_id}",
    response_model=IncidentOut,
    response_model_by_alias=True,
    response_model_exclude_none=True,
    responses={404: {"description": "Incident not found"}},
)
def patch_incident(
    incident_id: str,
    payload: IncidentPatch,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> Incident:
    incident = get_incident_or_404(incident_id, db)
    # by_alias keeps the stored resolution document in the same camelCase shape
    # the rest of the API (and the frontend) uses.
    changes = payload.model_dump(exclude_unset=True, exclude_none=True, by_alias=True)

    if "status" in changes and changes["status"] != incident.status:
        new_status = changes["status"]
        timestamp = datetime.now(timezone.utc)
        event_type = "resolution" if new_status == "RESOLVED" else "action"
        incident.timeline = [
            *(incident.timeline or []),
            {
                "time": _utc_now_iso(),
                "type": event_type,
                "title": f"Status changed to {new_status}",
                "detail": f"Moved from {incident.status} to {new_status}.",
            },
        ]
        if new_status == "RESOLVED" and not incident.resolved_at:
            incident.resolved_at = timestamp
        incident.status = new_status

    for field in ("assignee", "title", "severity"):
        if field in changes:
            setattr(incident, field, changes[field])

    if "resolution" in changes and changes["resolution"] is not None:
        timestamp = datetime.now(timezone.utc)
        current = incident.resolution or {}
        incident.resolution = {
            "rootCause": "",
            "summary": "",
            "mitigation": "",
            "resolvedBy": incident.assignee,
            "resolvedAt": _utc_now_iso(),
            **current,
            **{
                key: value
                for key, value in changes["resolution"].items()
                if value is not None
            },
        }
        if not incident.resolved_at:
            incident.resolved_at = timestamp

    db.commit()
    db.refresh(incident)
    return incident


@router.get(
    "/incidents/{incident_id}/logs",
    response_model=list[LogEntryOut],
    response_model_by_alias=True,
    response_model_exclude_none=True,
    responses={404: {"description": "Incident not found"}},
)
def get_incident_logs(
    incident_id: str, db: Session = Depends(get_db)
) -> list[LogEntry]:
    incident = get_incident_or_404(incident_id, db)
    stmt = (
        select(LogEntry)
        .where(LogEntry.incident_id == incident_id, LogEntry.service_id == incident.service_id)
        .order_by(LogEntry.timestamp, LogEntry.id)
    )
    return list(db.scalars(stmt))


@router.get(
    "/incidents/{incident_id}/traces",
    response_model=list[TraceOut],
    response_model_by_alias=True,
    response_model_exclude_none=True,
    responses={404: {"description": "Incident not found"}},
)
def get_incident_traces(incident_id: str, db: Session = Depends(get_db)) -> list[Trace]:
    get_incident_or_404(incident_id, db)
    stmt = select(Trace).where(Trace.incident_id == incident_id).order_by(
        Trace.started_at, Trace.trace_id
    )
    return list(db.scalars(stmt))
