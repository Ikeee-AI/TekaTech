def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_deployed_version_reports_host_commit(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc123")
    assert client.get("/version").json() == {"commit": "abc123"}
