from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Deployment
from app.schemas import DeploymentOut, PageParams, PaginatedResponse

router = APIRouter(tags=["deployments"])


@router.get(
    "/deployments", response_model=PaginatedResponse[DeploymentOut], response_model_by_alias=True
)
def list_deployments(params: PageParams = Depends(), db: Session = Depends(get_db)) -> PaginatedResponse[DeploymentOut]:
    total = db.scalar(select(func.count()).select_from(Deployment))
    items = list(
        db.scalars(
            select(Deployment)
            .order_by(Deployment.position, Deployment.id)
            .offset(params.offset)
            .limit(params.limit)
        )
    )
    return PaginatedResponse(
        items=items,
        total=total,
        offset=params.offset,
        limit=params.limit,
        has_more=params.offset + params.limit < total,
    )
