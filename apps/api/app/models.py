from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, JSONType


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(128), default=None)
    hashed_password: Mapped[str] = mapped_column(String(256))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    # Preserves the curated order of the dataset; the service map and tables
    # lay out services in this sequence, so a plain ORDER BY id would reshuffle
    # the graph on every request.
    position: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(32))
    team: Mapped[str] = mapped_column(String(128), default="")
    version: Mapped[str] = mapped_column(String(64), default="")
    health: Mapped[str] = mapped_column(String(16), default="unknown")
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    error_rate: Mapped[float] = mapped_column(Float, default=0.0)
    availability: Mapped[float] = mapped_column(Float, default=100.0)
    p95_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    # Outgoing dependency edges, stored as service ids.
    dependencies: Mapped[list] = mapped_column(JSONType, default=list)

    incidents: Mapped[list["Incident"]] = relationship(back_populates="service")

    __table_args__ = (Index("ix_services_position", "position"),)


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[str] = mapped_column(String(64))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32), default="deployed")
    author: Mapped[str] = mapped_column(String(128), default="")
    commit: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (Index("ix_deployments_position", "position"),)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(8), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"), index=True
    )
    assignee: Mapped[str] = mapped_column(String(128), default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    impact: Mapped[str] = mapped_column(Text, default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    timeline: Mapped[list] = mapped_column(JSONType, default=list)
    affected_services: Mapped[list] = mapped_column(JSONType, default=list)
    resolution: Mapped[dict | None] = mapped_column(JSONType)

    service: Mapped[Service] = relationship(back_populates="incidents")
    investigation: Mapped["Investigation | None"] = relationship(
        back_populates="incident", uselist=False
    )


class MetricPoint(Base):
    """Flattened time series, one row per sample.

    Storing points individually (instead of a JSON array per series) is what
    makes range scans and aggregations possible in SQL; the API regroups them
    into ``MetricSeries`` on the way out.
    """

    __tablename__ = "metric_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    metric: Mapped[str] = mapped_column(String(32))
    # Position of the series inside the dataset, so the API can return the
    # curated order instead of an alphabetical one.
    series_position: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(16), default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    value: Mapped[float] = mapped_column(Float)

    __table_args__ = (
        # Serves the default "all series for a service, in dataset order" scan;
        # the metric variant serves the ?metric= filter.
        Index("ix_metric_points_series", "service_id", "series_position", "timestamp"),
        Index("ix_metric_points_metric", "service_id", "metric", "timestamp"),
    )


class LogEntry(Base):
    __tablename__ = "log_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    level: Mapped[str] = mapped_column(String(16), default="info")
    message: Mapped[str] = mapped_column(Text, default="")
    fields: Mapped[dict] = mapped_column(JSONType, default=dict)

    __table_args__ = (Index("ix_log_entries_incident", "incident_id", "timestamp"),)


class Trace(Base):
    __tablename__ = "traces"

    trace_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[str] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(256), default="")
    operation: Mapped[str] = mapped_column(String(128), default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(16), default="ok")
    # Spans are read and written as a unit and never filtered on.
    spans: Mapped[list] = mapped_column(JSONType, default=list)


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"),
        index=True,
        unique=True,
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    hypotheses: Mapped[list] = mapped_column(JSONType, default=list)

    incident: Mapped[Incident] = relationship(back_populates="investigation")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
