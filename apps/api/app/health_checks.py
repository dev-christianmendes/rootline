from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal, engine
from app.observability import logger

router = APIRouter(tags=["health"])


@dataclass
class HealthCheckResult:
    name: str
    status: str  # "healthy" | "degraded" | "unhealthy"
    message: str
    duration_ms: float
    details: Optional[dict] = None


@dataclass
class ReadinessResponse:
    status: str  # "ready" | "not_ready"
    checks: list[HealthCheckResult]
    timestamp: str


def check_database() -> HealthCheckResult:
    """Check database connectivity and basic query."""
    start = time.time()
    try:
        with SessionLocal() as db:
            # Simple query to verify connection
            db.execute(text("SELECT 1"))
            # Check if we can query a table
            db.execute(text("SELECT COUNT(*) FROM services LIMIT 1"))
        
        duration = (time.time() - start) * 1000
        return HealthCheckResult(
            name="database",
            status="healthy",
            message="Database connection successful",
            duration_ms=round(duration, 2),
        )
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error("health_check_database_failed", error=str(e))
        return HealthCheckResult(
            name="database",
            status="unhealthy",
            message=f"Database connection failed: {str(e)}",
            duration_ms=round(duration, 2),
        )


def check_database_migrations() -> HealthCheckResult:
    """Check if database migrations are up to date."""
    start = time.time()
    try:
        from alembic import command
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        
        alembic_cfg = Config("alembic.ini")
        script = ScriptDirectory.from_config(alembic_cfg)
        
        with engine.connect() as conn:
            # Get current revision
            context = command.get_revision(alembic_cfg)
            head = script.get_current_head()
            
            if context != head:
                duration = (time.time() - start) * 1000
                return HealthCheckResult(
                    name="migrations",
                    status="degraded",
                    message=f"Database not at head revision (current: {context}, head: {head})",
                    duration_ms=round((time.time() - start) * 1000, 2),
                    details={"current": context, "head": head},
                )
        
        duration = (time.time() - start) * 1000
        return HealthCheckResult(
            name="migrations",
            status="healthy",
            message="Database migrations up to date",
            duration_ms=round(duration, 2),
        )
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.warning("health_check_migrations_failed", error=str(e))
        return HealthCheckResult(
            name="migrations",
            status="degraded",
            message=f"Could not verify migrations: {str(e)}",
            duration_ms=round(duration, 2),
        )


def check_redis() -> HealthCheckResult:
    """Check Redis connectivity (placeholder - implement if Redis is used)."""
    start = time.time()
    # TODO: Implement Redis check if Redis is used
    duration = (time.time() - start) * 1000
    return HealthCheckResult(
        name="redis",
        status="healthy",
        message="Redis check not implemented",
        duration_ms=round(duration, 2),
    )


def check_disk_space() -> HealthCheckResult:
    """Check available disk space."""
    start = time.time()
    try:
        import shutil
        total, used, free = shutil.disk_usage("/")
        free_percent = (free / total) * 100
        
        if free_percent < 5:
            status = "unhealthy"
            message = f"Critical disk space: {free_percent:.1f}% free"
        elif free_percent < 15:
            status = "degraded"
            message = f"Low disk space: {free_percent:.1f}% free"
        else:
            status = "healthy"
            message = f"Disk space OK: {free_percent:.1f}% free"
        
        duration = (time.time() - start) * 1000
        return HealthCheckResult(
            name="disk_space",
            status=status,
            message=message,
            duration_ms=round(duration, 2),
            details={"free_percent": round(free_percent, 1)},
        )
    except Exception as e:
        duration = (time.time() - start) * 1000
        return HealthCheckResult(
            name="disk_space",
            status="degraded",
            message=f"Could not check disk space: {str(e)}",
            duration_ms=round(duration, 2),
        )


def run_all_checks() -> list[HealthCheckResult]:
    """Run all health checks."""
    return [
        check_database(),
        check_database_migrations(),
        check_redis(),
        check_disk_space(),
    ]


@router.get("/health/ready", response_model=ReadinessResponse)
def readiness() -> ReadinessResponse:
    """Deep health check for readiness probe."""
    checks = run_all_checks()
    
    # Determine overall status
    statuses = [c.status for c in checks]
    if "unhealthy" in statuses:
        overall = "not_ready"
    elif "degraded" in statuses:
        overall = "not_ready"  # Treat degraded as not ready for strict readiness
    else:
        overall = "ready"
    
    from datetime import datetime, timezone
    return ReadinessResponse(
        status=overall,
        checks=checks,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/health/live")
def liveness() -> dict:
    """Liveness probe - always returns healthy if process is running."""
    return {"status": "alive"}