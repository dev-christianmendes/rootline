from __future__ import annotations

API = "/api/v1"


def get_items(response) -> list:
    """Extract items from paginated response."""
    data = response.json()
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    return data


def test_incidents_are_listed_newest_first(client):
    incidents = get_items(client.get(f"{API}/incidents"))
    assert len(incidents) == 4
    started = [i["startedAt"] for i in incidents]
    assert started == sorted(started, reverse=True)


def test_incident_omits_optional_fields_when_absent(client):
    incident = client.get(f"{API}/incidents/INC-2391").json()
    assert "resolvedAt" not in incident
    assert "resolution" not in incident

    resolved = client.get(f"{API}/incidents/INC-2388").json()
    assert resolved["resolvedAt"].endswith("Z")
    assert resolved["resolution"]["rootCause"]


def test_unknown_incident_returns_404(client):
    for path in ("", "/logs", "/traces"):
        response = client.get(f"{API}/incidents/nope{path}")
        assert response.status_code == 404, path
        assert response.json()["detail"] == "Incident not found"


def test_incident_logs_and_traces_are_scoped(client):
    logs = client.get(f"{API}/incidents/INC-2390/logs").json()
    assert logs
    assert all(log["incidentId"] == "INC-2390" for log in logs)
    assert [log["timestamp"] for log in logs] == sorted(log["timestamp"] for log in logs)

    traces = client.get(f"{API}/incidents/INC-2391/traces").json()
    assert traces
    assert all(trace["incidentId"] == "INC-2391" for trace in traces)
    for trace in traces:
        assert trace["spans"]


def test_every_incident_has_telemetry(client):
    """The incident detail page renders logs and traces tabs; empty ones would
    be a dead end."""
    for incident in get_items(client.get(f"{API}/incidents")):
        incident_id = incident["id"]
        assert client.get(f"{API}/incidents/{incident_id}/logs").json(), incident_id
        assert client.get(f"{API}/incidents/{incident_id}/traces").json(), incident_id


def test_create_incident_requires_title(client, auth_headers):
    response = client.post(f"{API}/incidents", json={}, headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Field 'title' is required"


def test_create_incident_persists_and_is_retrievable(client, auth_headers):
    before = len(get_items(client.get(f"{API}/incidents")))
    response = client.post(
        f"{API}/incidents",
        json={
            "title": "Checkout button unresponsive",
            "description": "Reported by support.",
            "severity": "P2",
            "serviceId": "checkout-api",
            "assignee": "S. Kim",
            "impact": "Checkout blocked for some users.",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["status"] == "DETECTED"
    assert created["severity"] == "P2"
    assert created["serviceId"] == "checkout-api"
    assert created["timeline"][0]["type"] == "incident"
    assert created["detectedAt"].endswith("Z")

    assert len(get_items(client.get(f"{API}/incidents"))) == before + 1
    assert client.get(f"{API}/incidents/{created['id']}").status_code == 200


def test_create_incident_generates_unique_sequential_ids(client, auth_headers):
    first = client.post(f"{API}/incidents", json={"title": "One"}, headers=auth_headers).json()
    second = client.post(f"{API}/incidents", json={"title": "Two"}, headers=auth_headers).json()
    assert first["id"] != second["id"]
    assert int(second["id"][4:]) == int(first["id"][4:]) + 1


def test_create_incident_rejects_unknown_service(client, auth_headers):
    response = client.post(
        f"{API}/incidents", json={"title": "X", "serviceId": "ghost-service"}, headers=auth_headers
    )
    assert response.status_code == 400
    assert "ghost-service" in response.json()["detail"]


def test_patch_resolves_incident_and_records_resolution(client, auth_headers):
    response = client.patch(
        f"{API}/incidents/INC-2390",
        json={
            "status": "RESOLVED",
            "resolution": {
                "rootCause": "Session cache miss storm",
                "summary": "Warmed the session cache.",
                "mitigation": "Raised cache TTL.",
                "resolvedBy": "M. Silva",
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "RESOLVED"
    assert body["resolution"]["rootCause"] == "Session cache miss storm"
    assert body["resolution"]["resolvedAt"].endswith("Z")
    assert body["resolvedAt"].endswith("Z")
    assert body["timeline"][-1]["type"] == "resolution"


def test_patch_status_change_is_recorded_in_timeline(client, auth_headers):
    body = client.patch(
        f"{API}/incidents/INC-2389", json={"status": "MONITORING"}, headers=auth_headers
    ).json()
    assert body["status"] == "MONITORING"
    assert body["timeline"][-1]["title"] == "Status changed to MONITORING"
    assert "resolvedAt" not in body


def test_patch_unknown_incident_returns_404(client, auth_headers):
    response = client.patch(
        f"{API}/incidents/nope", json={"status": "MONITORING"}, headers=auth_headers
    )
    assert response.status_code == 404