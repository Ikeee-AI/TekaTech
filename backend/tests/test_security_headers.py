"""Security headers on every API response; the HTML docs pages keep working (no CSP there)."""
import pytest

from security_headers import CONTENT_SECURITY_POLICY

EXPECTED = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "strict-transport-security": "max-age=31536000",
}


def _assert_base_headers(resp):
    for name, value in EXPECTED.items():
        assert resp.headers.get(name) == value, name


@pytest.mark.parametrize("path", ["/health", "/version", "/no-such-route", "/openapi.json"])
def test_json_responses_carry_all_headers_and_the_strict_csp(client, path):
    resp = client.get(path)
    _assert_base_headers(resp)
    assert resp.headers["content-security-policy"] == CONTENT_SECURITY_POLICY


def test_error_and_preflight_responses_carry_the_headers(client):
    _assert_base_headers(client.post("/gadgets", json={}))  # 422
    preflight = client.options(
        "/gadgets",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    _assert_base_headers(preflight)


def test_rate_limited_response_carries_the_headers(client, fake_supabase):
    fake_supabase.set_response("comparison_links", "select", [])
    for _ in range(60):
        client.get("/comparisons/zzzzzzz")
    resp = client.get("/comparisons/zzzzzzz")
    assert resp.status_code == 429
    _assert_base_headers(resp)


@pytest.mark.parametrize("path", ["/docs", "/redoc"])
def test_docs_pages_still_load_without_the_csp(client, path):
    resp = client.get(path)
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "content-security-policy" not in resp.headers
    _assert_base_headers(resp)
