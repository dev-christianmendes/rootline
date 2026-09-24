from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Deployment
from app.schemas import DeploymentOut

router = APIRouter(tags=["deployments"])


@router.get(
    "/deployments", response_model=list[DeploymentOut], response_model_by_alias=True
)
def list_deployments(db: Session = Depends(get_db)) -> list[Deployment]:
    return list(
        db.scalars(select(Deployment).order_by(Deployment.position, Deployment.id))
    )
