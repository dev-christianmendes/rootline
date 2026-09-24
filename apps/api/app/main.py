from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.routers import deployments, health, incidents, investigations, services, system
from app.seed import seed

logger = logging.getLogger("rootline.api")

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(bind=engine)

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

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router, prefix=API_PREFIX)
    application.include_router(system.router, prefix=API_PREFIX)
    application.include_router(services.router, prefix=API_PREFIX)
    application.include_router(incidents.router, prefix=API_PREFIX)
    application.include_router(investigations.router, prefix=API_PREFIX)
    application.include_router(deployments.router, prefix=API_PREFIX)

    return application


app = create_app()
