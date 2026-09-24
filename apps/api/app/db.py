from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import JSON, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

# JSONB on PostgreSQL, plain JSON elsewhere so the test suite can run on SQLite.
JSONType = JSON().with_variant(JSONB, "postgresql")


class Base(DeclarativeBase):
    pass


def _build_engine():
    settings = get_settings()
    url = settings.database_url
    kwargs: dict = {"pool_pre_ping": True, "future": True}
    if url.startswith("sqlite"):
        # SQLite is only used by the test suite; it has no server-side pool.
        kwargs.pop("pool_pre_ping")

    built = create_engine(url, **kwargs)

    if url.startswith("sqlite"):
        # SQLite ignores foreign keys unless asked, which silently lets broken
        # insert ordering pass the suite. Enable them so the tests exercise the
        # same constraints PostgreSQL does.
        @event.listens_for(built, "connect")
        def _set_sqlite_pragma(dbapi_connection, _record):  # pragma: no cover
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return built


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a request scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
