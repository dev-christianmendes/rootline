from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Callable

import structlog
from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, generate_latest
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger("rootline.api")

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

DB_QUERY_COUNT = Counter(
    "db_queries_total",
    "Total database queries",
    ["operation", "table"],
)

DB_QUERY_LATENCY = Histogram(
    "db_query_duration_seconds",
    "Database query latency in seconds",
    ["operation", "table"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

ACTIVE_CONNECTIONS = Counter(
    "active_connections",
    "Number of active WebSocket connections",
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Add request ID to each request for tracing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        
        # Add request ID to structlog context
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        # Log request
        duration = time.time() - start_time
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        
        return response


class MetricsMiddleware(BaseHTTPMiddleware):
    """Collect Prometheus metrics for HTTP requests."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint
        if request.url.path in ("/metrics", "/health", "/health/ready"):
            return await call_next(request)

        method = request.method
        path = request.url.path
        
        # Normalize path for metrics (replace IDs with placeholders)
        endpoint = self._normalize_path(path)
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        except Exception as e:
            status = 500
            raise
        finally:
            duration = time.time() - start_time
            
            # Record metrics
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
            REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

    def _normalize_path(self, path: str) -> str:
        """Normalize path by replacing IDs with placeholders."""
        import re
        # Replace UUIDs
        path = re.sub(r'/[0-9a-f-]{36}', '/:id', path)
        # Replace numeric IDs
        path = re.sub(r'/\d+', '/:id', path)
        # Replace INC-XXXX
        path = re.sub(r'/INC-\d+', '/:incident_id', path)
        return path


def setup_metrics(app: FastAPI) -> None:
    """Setup Prometheus metrics endpoint."""
    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )


def record_db_query(operation: str, table: str, duration: float) -> None:
    """Record database query metrics."""
    DB_QUERY_COUNT.labels(operation=operation, table=table).inc()
    DB_QUERY_LATENCY.labels(operation=operation, table=table).observe(duration)


def increment_active_connections() -> None:
    """Increment active WebSocket connections counter."""
    ACTIVE_CONNECTIONS.inc()


def decrement_active_connections() -> None:
    """Decrement active WebSocket connections counter."""
    ACTIVE_CONNECTIONS.dec()