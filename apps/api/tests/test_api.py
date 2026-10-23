from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_project_flow():
    assert client.get("/health").status_code == 200
    response = client.post("/api/v1/projects", json={"name":"Kitchen project","project_type":"food_business","home_based":True,"food_preparation":True})
    assert response.status_code == 200
    project = response.json()["data"]
    assert len(project["milestones"]) == 4
    project_id = project["id"]
    assert client.get(f"/api/v1/projects/{project_id}/timeline").status_code == 200
    milestone_id = project["milestones"][0]["id"]
    assert client.patch(f"/api/v1/milestones/{milestone_id}/status", json={"status":"approved"}).status_code == 200


def test_upload_rejects_unsafe_type():
    project = client.post("/api/v1/projects", json={"name":"Event","project_type":"public_event"}).json()["data"]
    response = client.post(f"/api/v1/projects/{project['id']}/documents", files={"file":("bad.exe", b"bad", "application/octet-stream")})
    assert response.status_code == 415


def test_search_refuses_without_verified_evidence():
    result = client.post("/api/v1/search", json={"query":"zoning"}).json()["data"]
    assert result["sufficient_evidence"] is False
