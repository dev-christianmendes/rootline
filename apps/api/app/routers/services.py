from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import MetricPoint, Service
from app.schemas import MetricPointOut, MetricSeriesOut, ServiceOut, PageParams, PaginatedResponse

router = APIRouter(tags=["services"])


@router.get("/services", response_model=PaginatedResponse[ServiceOut], response_model_by_alias=True)
def list_services(params: PageParams = Depends(), db: Session = Depends(get_db)) -> PaginatedResponse[ServiceOut]:
    total = db.scalar(select(func.count()).select_from(Service))
    items = list(db.scalars(
        select(Service)
        .order_by(Service.position, Service.id)
        .offset(params.offset)
        .limit(params.limit)
    ))
    return PaginatedResponse(
        items=items,
        total=total,
        offset=params.offset,
        limit=params.limit,
        has_more=params.offset + params.limit < total,
    )


@router.get(
    "/services/{service_id}",
    response_model=ServiceOut,
    response_model_by_alias=True,
    responses={404: {"description": "Service not found"}},
)
def get_service(service_id: str, db: Session = Depends(get_db)) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.get(
    "/services/{service_id}/metrics",
    response_model=list[MetricSeriesOut],
    response_model_by_alias=True,
    responses={404: {"description": "Service not found"}},
)
def get_service_metrics(
    service_id: str,
    metric: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MetricSeriesOut]:
    if db.get(Service, service_id) is None:
        raise HTTPException(status_code=404, detail="Service not found")

    stmt = select(MetricPoint).where(MetricPoint.service_id == service_id)
    if metric:
        stmt = stmt.where(MetricPoint.metric == metric)
    points = list(
        db.scalars(
            stmt.order_by(MetricPoint.series_position, MetricPoint.timestamp)
        )
    )

    # Points are stored flat; regroup them into one series per metric+unit.
    series: list[MetricSeriesOut] = []
    for point in points:
        if (
            series
            and series[-1].metric == point.metric
            and series[-1].unit == point.unit
        ):
            series[-1].points.append(MetricPointOut.model_validate(point))
        else:
            series.append(
                MetricSeriesOut(
                    serviceId=point.service_id,
                    metric=point.metric,
                    unit=point.unit,
                    points=[MetricPointOut.model_validate(point)],
                )
            )
    return series
