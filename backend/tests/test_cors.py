"""CORS: explicit origins only, no credentialed CORS (auth is a Bearer header), and only the
methods/headers the frontend uses."""
import pytest
from pydantic import ValidationError

from config import Settings

ORIGIN = "http://localhost:5173"
REQUIRED = {"openai_api_key": "sk-test-dummy", "supabase_url": "https://example.supabase.co", "supabase_key": "k"}


def _preflight(client, method, headers="authorization,content-type", origin=ORIGIN):
    return client.options(
        "/gadgets",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": headers,
        },
    )


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_preflight_allows_the_methods_and_headers_the_frontend_uses(client, method):
    resp = _preflight(client, method)
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == ORIGIN
    assert "access-control-allow-credentials" not in resp.headers


def test_preflight_refuses_an_unused_header_and_method(client):
    assert _preflight(client, "GET", headers="x-simulate-failure").status_code == 400
    assert _preflight(client, "TRACE").status_code == 400


def test_unknown_origin_gets_no_cors_headers(client):
    resp = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in resp.headers


def test_simple_request_is_not_credentialed(client):
    resp = client.get("/health", headers={"Origin": ORIGIN})
    assert resp.headers["access-control-allow-origin"] == ORIGIN
    assert "access-control-allow-credentials" not in resp.headers


@pytest.mark.parametrize("origins", ["*", "https://web.example, *", " * "])
def test_settings_refuse_a_wildcard_origin(origins):
    with pytest.raises(ValidationError, match="not allowed"):
        Settings(**REQUIRED, cors_origins=origins, _env_file=None)


def test_settings_accept_explicit_origins():
    s = Settings(**REQUIRED, cors_origins="https://a.example, https://b.example", _env_file=None)
    assert s.cors_origins_list == ["https://a.example", "https://b.example"]
