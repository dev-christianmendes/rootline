from __future__ import annotations

API = "/api/v1"


def get_items(response) -> list:
    """Extract items from paginated response."""
    data = response.json()
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    return data


def test_investigations_are_listed_newest_first(client):
    investigations = get_items(client.get(f"{API}/investigations"))
    assert len(investigations) == 4
    generated = [i["generatedAt"] for i in investigations]
    assert generated == sorted(generated, reverse=True)


def test_investigations_can_be_filtered_by_incident(client):
    filtered = get_items(client.get(f"{API}/investigations?incidentId=INC-2389"))
    assert len(filtered) == 1
    assert filtered[0]["incidentId"] == "INC-2389"


def test_investigation_not_found_returns_404(client):
    response = client.get(f"{API}/investigations/inv-nope")
    assert response.status_code == 404
    assert response.json()["detail"] == "Investigation not found"


def test_hypothesis_payload_shape(client):
    body = client.get(f"{API}/investigations/inv-2391").json()
    assert body["incidentId"] == "INC-2391"
    for hypothesis in body["hypotheses"]:
        assert 0 <= hypothesis["confidence"] <= 1
        assert hypothesis["status"] in {"candidate", "accepted", "dismissed"}
        assert hypothesis["evidence"]
        for evidence in [*hypothesis["evidence"], *hypothesis["counterEvidence"]]:
            assert evidence["sourceType"] in {
                "metrics",
                "logs",
                "deployment",
                "trace",
                "dependency",
                "infrastructure",
                "incident",
            }
            assert evidence["impact"] in {"supporting", "counter"}


def test_every_incident_can_be_analyzed(client, auth_headers):
    """"Run analysis" 404s when an incident has no investigation, which hid the
    investigation link on the incident detail page."""
    for incident in get_items(client.get(f"{API}/incidents")):
        incident_id = incident["id"]
        response = client.post(f"{API}/incidents/{incident_id}/analyze", headers=auth_headers)
        assert response.status_code == 200, incident_id
        assert response.json()["incidentId"] == incident_id
        assert response.json()["hypotheses"]


def test_analyze_unknown_incident_returns_404(client, auth_headers):
    response = client.post(f"{API}/incidents/nope/analyze", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"


def test_deployments_are_listed(client):
    deployments = get_items(client.get(f"{API}/deployments"))
    assert len(deployments) == 6
    services = {s["id"] for s in get_items(client.get(f"{API}/services"))}
    for deployment in deployments:
        assert deployment["serviceId"] in services
        assert deployment["startedAt"].endswith("Z")
        assert deployment["finishedAt"].endswith("Z")