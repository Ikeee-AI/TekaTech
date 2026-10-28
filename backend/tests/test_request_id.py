import logging

import pytest


def _request_lines(caplog):
    return [r.getMessage() for r in caplog.records
            if r.name == "tekatech.request" and r.getMessage().startswith("request ")]


def test_response_gets_generated_request_id(client):
    request_id = client.get("/health").headers["x-request-id"]
    assert len(request_id) == 32 and all(c in "0123456789abcdef" for c in request_id)


def test_generated_ids_differ_per_request(client):
    assert client.get("/health").headers["x-request-id"] != client.get("/health").headers["x-request-id"]


def test_sane_incoming_request_id_is_reused(client):
    resp = client.get("/health", headers={"X-Request-ID": "smoke-abc_123"})
    assert resp.headers["x-request-id"] == "smoke-abc_123"


@pytest.mark.parametrize("bad", ["a" * 65, "has space", "semi;colon", "tab\there", "dot.ted"])
def test_unsafe_incoming_request_id_is_replaced(client, bad):
    returned = client.get("/health", headers={"X-Request-ID": bad}).headers["x-request-id"]
    assert returned != bad and len(returned) == 32


def test_request_id_on_framework_error_responses(client):
    # 404 and 422 come from FastAPI's own handlers; the id is still attached.
    assert "x-request-id" in client.get("/no-such-route").headers
    assert "x-request-id" in client.post("/gadgets", json={}).headers


def test_cors_exposes_request_id_header(client):
    resp = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert resp.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "x-request-id" in resp.headers["access-control-expose-headers"].lower()


def test_one_log_line_without_query_string_or_secrets(client, caplog):
    caplog.set_level(logging.INFO, logger="tekatech.request")
    client.get(
        "/stats/trending?limit=5&secret_question=what+is+the+battery",
        headers={"Authorization": "Bearer token-value-xyz", "X-Request-ID": "trace-1",
                 "Rndr-Id": "abc-123", "X-Forwarded-For": "198.51.100.7, 203.0.113.9"},
    )
    lines = _request_lines(caplog)
    assert len(lines) == 1
    line = lines[0]
    assert "method=GET" in line and "path=/stats/trending " in line
    assert "request_id=trace-1" in line and "rndr_id=abc-123" in line
    assert "status=" in line and "duration_ms=" in line
    # Only the count of forwarded entries, never the addresses.
    assert "xff_entries=2" in line
    for leaked in ("secret_question", "battery", "limit=5", "token-value-xyz", "Bearer", "198.51.100.7", "203.0.113.9"):
        assert leaked not in line


def test_log_line_path_cannot_forge_lines(client, caplog):
    caplog.set_level(logging.INFO, logger="tekatech.request")
    client.get("/gadgets/abc%0Arequest%20method=FAKE")
    line = _request_lines(caplog)[0]
    assert "\n" not in line and " method=FAKE" not in line


def test_unhandled_error_is_json_500_with_request_id(client, monkeypatch, caplog):
    import routers.gadgets as gadgets_module

    class Exploding:
        def table(self, name):
            raise RuntimeError("internal detail password=hunter2")

    monkeypatch.setattr(gadgets_module, "supabase", Exploding())
    caplog.set_level(logging.INFO, logger="tekatech.request")
    resp = client.get("/gadgets", headers={"X-Request-ID": "err-42", "Origin": "http://localhost:5173"})
    assert resp.status_code == 500
    assert resp.json() == {"detail": "Internal server error", "request_id": "err-42"}
    assert resp.headers["x-request-id"] == "err-42"
    # CORS still applies, so a browser can read the id.
    assert resp.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "hunter2" not in resp.text
    assert any("status=500" in line and "request_id=err-42" in line for line in _request_lines(caplog))
