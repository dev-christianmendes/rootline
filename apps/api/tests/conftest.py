"""Shared fixtures: an isolated database seeded from data/mock.

By default the suite runs against a temporary SQLite file so it needs no running
PostgreSQL, while production uses PostgreSQL. The app code avoids dialect
specific SQL precisely so this stays possible.

Set ``ROOTLINE_TEST_DATABASE_URL`` to run the very same suite against a real
PostgreSQL, which is what CI does: SQLite does not enforce everything Postgres
does, so the SQLite-only run can pass while production breaks.

The environment must be configured before ``app`` is first imported, because
``app.db`` builds its engine at import time. Hence the module level setup
below rather than a monkeypatch inside the fixture.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = _REPO_ROOT / "data" / "mock"

_TMP_DIR = tempfile.mkdtemp(prefix="rootline-tests-")
os.environ["ROOTLINE_DATABASE_URL"] = os.environ.get(
    "ROOTLINE_TEST_DATABASE_URL", f"sqlite:///{Path(_TMP_DIR) / 'rootline-test.db'}"
)
os.environ["ROOTLINE_AUTO_SEED"] = "false"
os.environ["ROOTLINE_ANALYSIS_DELAY_MS"] = "0"
os.environ["ROOTLINE_SEED_DATA_DIR"] = str(SEED_DIR)


@pytest.fixture(scope="session")
def seed_dir() -> Path:
    if not (SEED_DIR / "services.json").exists():
        pytest.skip(f"seed datasets not found at {SEED_DIR}")
    return SEED_DIR


@pytest.fixture()
def client(seed_dir: Path) -> Iterator:
    from fastapi.testclient import TestClient

    from app import models  # noqa: F401  (register tables on Base.metadata)
    from app.db import Base, SessionLocal, engine
    from app.main import create_app
    from app.seed import seed

    # Every test starts from an empty database with the mock dataset loaded,
    # so ids, counters and status transitions cannot leak between tests.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed(db, seed_dir, force=True)
    finally:
        db.close()

    with TestClient(create_app()) as test_client:
        yield test_client
