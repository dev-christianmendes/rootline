from __future__ import annotations

API = "/api/v1"


def test_health_reports_ok(client):
    response = client.get(f"{API}/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert isinstance(body["uptimeSeconds"], int)


def test_system_health_aggregates_services(client):
    response = client.get(f"{API}/system/health")
    assert response.status_code == 200
    body = response.json()
    services = client.get(f"{API}/services").json()

    assert body["serviceCount"] == len(services)
    assert body["activeIncidents"] >= 1
    assert 0 <= body["availability"] <= 100
    assert body["avgLatencyMs"] > 0


def test_services_are_listed_in_curated_order(client):
    services = client.get(f"{API}/services").json()
    assert len(services) == 11
    assert [s["id"] for s in services][0] == "frontend-web"
    for service in services:
        assert set(service) == {
            "id",
            "name",
            "description",
            "kind",
            "team",
            "version",
            "health",
            "latencyMs",
            "errorRate",
            "availability",
            "p95LatencyMs",
            "dependencies",
        }


def test_every_service_exposes_metrics(client):
    services = client.get(f"{API}/services").json()
    for service in services:
        response = client.get(f"{API}/services/{service['id']}/metrics")
        assert response.status_code == 200, service["id"]
        series = response.json()
        assert series, f"{service['id']} has no metric series"
        for entry in series:
            assert entry["points"], f"{service['id']}/{entry['metric']} is empty"


def test_metrics_timestamps_are_sortable_iso_strings(client):
    series = client.get(f"{API}/services/payment-api/metrics").json()
    for entry in series:
        stamps = [p["timestamp"] for p in entry["points"]]
        assert all(s.endswith("Z") for s in stamps)
        assert all(".000Z" in s for s in stamps)
        # The frontend sorts timestamps with String.localeCompare, so the wire
        # format must sort chronologically.
        assert stamps == sorted(stamps), entry["metric"]


def test_metrics_can_be_filtered_by_name(client):
    series = client.get(f"{API}/services/payment-api/metrics?metric=latency_ms").json()
    assert series
    assert {s["metric"] for s in series} == {"latency_ms"}


def test_unknown_service_returns_404_detail(client):
    response = client.get(f"{API}/services/does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "Service not found"

    response = client.get(f"{API}/services/does-not-exist/metrics")
    assert response.status_code == 404
    assert response.json()["detail"] == "Service not found"
