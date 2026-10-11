import importlib.util
import json
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location("deployed_smoke", Path(__file__).resolve().parents[2] / "scripts/deployed_smoke.py")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def fake_request(*, backend_commit="abc123", frontend_commit="abc123", cors="https://web.example", gadgets=None):
    def request(url, origin=None):
        if url.endswith("/health"):
            return json.dumps({"status": "ok"}), {}
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
