from __future__ import annotations

import pytest

API = "/api/v1"


@pytest.fixture()
def rate_limited(monkeypatch):
    from app.config import get_settings
    from app.rate_limiter import reset_rate_limits

    monkeypatch.setattr(get_settings(), "rate_limit_enabled", True)
    reset_rate_limits()
    yield
    reset_rate_limits()


def test_login_is_rate_limited_per_client(client, rate_limited):
    credentials = {"username": "testuser", "password": "wrong-password"}
    # AUTH_RATE_LIMIT is 5/minute: five rejected logins, then the limiter answers.
    for _ in range(5):
        assert client.post(f"{API}/auth/login", json=credentials).status_code == 401
    response = client.post(f"{API}/auth/login", json=credentials)
    assert response.status_code == 429
    assert response.json()["detail"] == "Rate limit exceeded: 5/minute"


def test_rate_limited_write_endpoint_still_works_under_the_limit(
    client, rate_limited, auth_headers
):
    response = client.patch(
        f"{API}/incidents/INC-2391",
        json={"status": "MONITORING"},
        headers=auth_headers,
    )
    assert response.status_code == 200
