def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_deployed_version_reports_host_commit(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc123")
    assert client.get("/version").json() == {"commit": "abc123"}


def test_deployed_version_prefers_app_commit_for_railway(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "render-sha")
    monkeypatch.setenv("APP_COMMIT", "railway-sha")
    assert client.get("/version").json() == {"commit": "railway-sha"}


def test_deployed_version_without_host_commit_is_local(client, monkeypatch):
    monkeypatch.delenv("APP_COMMIT", raising=False)
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    assert client.get("/version").json() == {"commit": "local"}


def test_nan_literal_in_body_is_422_not_500(client, fake_supabase):
    """Python's JSON parser accepts bare NaN; the 422 that echoes it must still encode."""
    resp = client.post(
        "/query",
        content='{"question": NaN}',
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["input"] == "nan"
    # Validation failed before any database or model call.
    assert fake_supabase.writes == []


def test_validation_errors_keep_fastapis_shape(client, fake_supabase):
    resp = client.post("/gadgets", json={"brand": "Samsung", "category": "Phone"})
    assert resp.status_code == 422
    error = resp.json()["detail"][0]
    assert error["loc"] == ["body", "name"]
    assert error["type"] == "missing"
    assert "msg" in error
