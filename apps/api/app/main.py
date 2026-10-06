from __future__ import annotations

import logging
import os
import subprocess
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.auth import auth_router
from app.routers import deployments, health, incidents, investigations, services, system
from app.websockets.router import router as websockets_router
from app.seed import seed
from app.rate_limiter import add_rate_limiter

logger = logging.getLogger("rootline.api")

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()

    # Run alembic migrations only in production (Docker), not in tests (SQLite)
    # Tests use SQLite and create tables via Base.metadata.create_all in conftest.py
    if not settings.database_url.startswith("sqlite"):
        try:
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd="/srv/api",
                capture_output=True,
                text=True,
                check=True,
            )
            logger.info("Alembic migrations applied: %s", result.stdout.strip())
        except subprocess.CalledProcessError as e:
            logger.error("Alembic migration failed: %s", e.stderr)
            raise

    if settings.auto_seed:
        db = SessionLocal()
        try:
            if seed(db):
                logger.info("seeded database from %s", settings.seed_data_dir)
            else:
                logger.info("database already populated, skipping seed")
        except Exception:  # pragma: no cover - surfaced to the operator
            logger.exception("seeding failed")
            raise
        finally:
            db.close()

    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Rootline API",
        version=settings.app_version,
        description=(
            "Incident investigation and correlation API for Rootline. "
            "Replaces the in-process mock API used by the Next.js frontend."
        ),
        lifespan=lifespan,
    )

    # Add rate limiter
    add_rate_limiter(application)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(auth_router, prefix=API_PREFIX)
    application.include_router(health.router, prefix=API_PREFIX)
    application.include_router(system.router, prefix=API_PREFIX)
    application.include_router(services.router, prefix=API_PREFIX)
    application.include_router(incidents.router, prefix=API_PREFIX)
    application.include_router(investigations.router, prefix=API_PREFIX)
    application.include_router(deployments.router, prefix=API_PREFIX)
    application.include_router(websockets_router, prefix=API_PREFIX)

    return application


app = create_app()
