"""/health stays a dependency-free liveness probe; /health/ready adds one DB read."""
import time

import pytest

import main


class _BrokenDatabase:
    """Stands in for the Supabase client when the database is unreachable."""

    def table(self, name):
        raise RuntimeError("connection refused to db.internal.example password=hunter2")


class _SlowDatabase:
    def table(self, name):
        time.sleep(0.5)
        raise AssertionError("readiness should have timed out first")


@pytest.fixture
def ready_db(fake_supabase, monkeypatch):
    monkeypatch.setattr(main, "supabase", fake_supabase)
    return fake_supabase


def test_liveness_never_touches_the_database(client, monkeypatch):
    """Render's healthCheckPath must not depend on the database."""
    monkeypatch.setattr(main, "supabase", _BrokenDatabase())
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_readiness_ok_when_database_answers(client, ready_db):
    ready_db.set_response("gadgets", "select", [{"id": "g1"}])
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok" and body["database"] == "ok"
    assert isinstance(body["latency_ms"], float) and body["latency_ms"] >= 0
    assert set(body) == {"status", "database", "latency_ms"}
    assert resp.headers["cache-control"] == "no-store"
    # One cheap read: gadgets, limited to one row, nothing written.
    assert ("gadgets", 1) in ready_db.limits
    assert ready_db.writes == []


def test_readiness_ok_on_empty_catalog(client, ready_db):
    resp = client.get("/health/ready")
    assert resp.status_code == 200 and resp.json()["database"] == "ok"


def test_readiness_503_without_leaking_error_details(client, monkeypatch):
    monkeypatch.setattr(main, "supabase", _BrokenDatabase())
    resp = client.get("/health/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "error" and body["database"] == "error"
    assert set(body) == {"status", "database", "latency_ms"}
    assert "hunter2" not in resp.text and "refused" not in resp.text


def test_readiness_503_when_database_hangs(client, monkeypatch):
    monkeypatch.setattr(main, "supabase", _SlowDatabase())
    monkeypatch.setattr(main, "READINESS_TIMEOUT_SECONDS", 0.05)
    resp = client.get("/health/ready")
    assert resp.status_code == 503
    assert resp.json()["database"] == "error"
    assert resp.json()["latency_ms"] < 500


def test_readiness_is_rate_limited(client, ready_db):
    """Public and DB-backed, so it gets a limit; Render's liveness probe does not use it."""
    statuses = [client.get("/health/ready").status_code for _ in range(31)]
    assert statuses[:30] == [200] * 30
    assert statuses[30] == 429
