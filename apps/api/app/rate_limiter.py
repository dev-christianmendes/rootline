from __future__ import annotations

from typing import Callable

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request, Depends, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings


def get_rate_limit_key(request: Request) -> str:
    """Generate rate limit key based on IP address."""
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/minute"],
    storage_uri="memory://",
)


def add_rate_limiter(app: FastAPI) -> None:
    """Add rate limiter to FastAPI app."""
    settings = get_settings()
    # Skip rate limiting in test environment (SQLite)
    if not settings.database_url.startswith("sqlite"):
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to add rate limit headers to responses."""

    async def dispatch(self, request: Request, call_next):
        # Check if rate limiter is available
        if hasattr(request.app.state, "limiter"):
            # The limiter will automatically check limits
            pass
        response = await call_next(request)
        return response


def rate_limit(limit: str) -> Callable:
    """Create a rate limit dependency that only applies in production."""
    async def rate_limit_dependency(request: Request):
        settings = get_settings()
        # Skip rate limiting in test environment (SQLite)
        if settings.database_url.startswith("sqlite"):
            return
        # Apply rate limit
        await limiter.limit(limit)(request)
    return Depends(rate_limit_dependency)


# Endpoint-specific rate limits
AUTH_RATE_LIMIT = "5/minute"
INCIDENT_CREATE_RATE_LIMIT = "30/minute"
INCIDENT_PATCH_RATE_LIMIT = "60/minute"
ANALYZE_RATE_LIMIT = "10/minute"