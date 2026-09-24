from __future__ import annotations

import os
import time

from fastapi import APIRouter

from app.config import get_settings
from app.schemas import HealthReport

router = APIRouter(tags=["health"])
_STARTED_AT = time.time()


@router.get("/health", response_model=HealthReport, response_model_by_alias=True)
def health() -> HealthReport:
    settings = get_settings()
    return HealthReport(
        status="ok",
        version=settings.app_version,
        environment=os.environ.get("ROOTLINE_ENVIRONMENT", settings.environment),
        uptimeSeconds=int(time.time() - _STARTED_AT),
    )
