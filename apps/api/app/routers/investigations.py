from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.config import get_settings
from app.db import get_db
from app.models import Incident, Investigation, User as UserModel
from app.rate_limiter import rate_limit, ANALYZE_RATE_LIMIT
from app.schemas import InvestigationOut
from app.services.analysis import generate_investigation_for_incident

router = APIRouter(tags=["investigations"])


@router.get(
    "/investigations",
    response_model=list[InvestigationOut],
    response_model_by_alias=True,
)
def list_investigations(
    incident_id: str | None = Query(default=None, alias="incidentId"),
    db: Session = Depends(get_db),
) -> list[Investigation]:
    stmt = select(Investigation)
    if incident_id:
        stmt = stmt.where(Investigation.incident_id == incident_id)
    stmt = stmt.order_by(Investigation.generated_at.desc(), Investigation.id)
    return list(db.scalars(stmt))


@router.get(
    "/investigations/{investigation_id}",
    response_model=InvestigationOut,
    response_model_by_alias=True,
    responses={404: {"description": "Investigation not found"}},
)
def get_investigation(
    investigation_id: str, db: Session = Depends(get_db)
) -> Investigation:
    investigation = db.get(Investigation, investigation_id)
    if investigation is None:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.post(
    "/incidents/{incident_id}/analyze",
    response_model=InvestigationOut,
    response_model_by_alias=True,
    responses={
        404: {
            "description": "Incident not found"
        }
    },
    dependencies=[rate_limit(ANALYZE_RATE_LIMIT)],
)
async def analyze_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> Investigation:
    if db.get(Incident, incident_id) is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    settings = get_settings()
    if settings.analysis_delay_ms > 0:
        await asyncio.sleep(settings.analysis_delay_ms / 1000)

    investigation = generate_investigation_for_incident(db, incident_id)
    if investigation is None:
        raise HTTPException(
            status_code=404, detail="No analysis available for this incident"
        )
    return investigation
