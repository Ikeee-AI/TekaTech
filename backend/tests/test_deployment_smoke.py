import importlib.util
import json
from pathlib import Path
from urllib.error import HTTPError
import pytest

spec = importlib.util.spec_from_file_location("deployed_smoke", Path(__file__).resolve().parents[2] / "scripts/deployed_smoke.py")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def fake_request(*, backend_commit="abc123", frontend_commit="abc123", cors="https://web.example", gadgets=None,
                 ready_status=200, ready_body=None):
    def request(url, origin=None):
        if url.endswith("/health"):
            return json.dumps({"status": "ok"}), {}
        if url.endswith("/health/ready"):
            if ready_status != 200:
                raise HTTPError(url, ready_status, "status", {}, None)
            body = ready_body if ready_body is not None else {"status": "ok", "database": "ok", "latency_ms": 12.5}
            return json.dumps(body), {}
        if url.endswith("/version"):
            return json.dumps({"commit": backend_commit}), {}
        if url.endswith("/version.json"):
            return json.dumps({"commit": frontend_commit}), {}
        if url.endswith("/gadgets"):
            assert origin == "https://web.example"
            return json.dumps([] if gadgets is None else gadgets), {"Access-Control-Allow-Origin": cors}
        return '<div id="root"></div>', {}
    return request


def test_deployment_smoke_accepts_empty_real_catalog():
    result = smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request())
    assert result["gadget_count"] == 0
    assert result["cors"] == "passed"


@pytest.mark.parametrize("versions", [{"backend_commit": "old"}, {"frontend_commit": "old"}])
def test_deployment_smoke_rejects_stale_host(versions):
    with pytest.raises(ValueError, match="expected commit"):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(**versions))


def test_deployment_smoke_rejects_wrong_cors():
    with pytest.raises(ValueError, match="CORS"):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(cors="https://wrong.example"))


def test_deployment_smoke_rejects_error_payload_as_catalog():
    with pytest.raises(ValueError, match="gadget list"):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(gadgets={"detail": "error"}))


def test_deployment_smoke_reports_passing_readiness():
    result = smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request())
    assert result["readiness"] == "passed"
    assert result["database_latency_ms"] == 12.5


def test_deployment_smoke_skips_readiness_on_older_release():
    """A rollback target from before /health/ready answers 404; that must not fail the smoke."""
    result = smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(ready_status=404))
    assert result["readiness"] == "skipped"
    assert "database_latency_ms" not in result


def test_deployment_smoke_fails_when_database_not_ready():
    with pytest.raises(ValueError, match="readiness failed"):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(ready_status=503))


def test_deployment_smoke_fails_on_not_ok_readiness_body():
    body = {"status": "error", "database": "error", "latency_ms": 5000.0}
    with pytest.raises(ValueError, match="readiness failed"):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(ready_body=body))


def test_deployment_smoke_surfaces_other_readiness_http_errors():
    # 429/500 are neither "old release" nor a clear database verdict; the attempt fails and is retried.
    with pytest.raises(HTTPError):
        smoke.check_deployment("https://api.example", "https://web.example", "abc123", fake_request(ready_status=500))
