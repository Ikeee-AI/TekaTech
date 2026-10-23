import importlib.util
import json
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location("ai_smoke", Path(__file__).resolve().parents[2] / "scripts/ai_smoke.py")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

KEY = "test-dummy-key"


def fake_request(*, dimensions=1536, reply="ready", finish_reason="stop", fail=None):
    calls = []

    def request(path, body, api_key):
        calls.append((path, body))
        assert api_key == KEY
        if fail and path == fail[0]:
            raise fail[1]
        if path == "/embeddings":
            return {"model": "text-embedding-3-small", "data": [{"embedding": [0.0] * dimensions}],
                    "usage": {"total_tokens": 6}}, "req_embed"
        return {"model": "gpt-5-mini-2025-08-07",
                "choices": [{"message": {"content": reply}, "finish_reason": finish_reason}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 9}}, "req_chat"
    request.calls = calls
    return request


def test_passing_smoke_records_usage_and_request_ids():
    request = fake_request()
    report = smoke.run_smoke(KEY, request=request)
    assert report["status"] == "passed"
    embedding, chat = report["checks"]
    assert embedding["dimensions"] == 1536 and embedding["total_tokens"] == 6 and embedding["request_id"] == "req_embed"
    assert chat["reply_chars"] == 5 and chat["completion_tokens"] == 9 and chat["request_id"] == "req_chat"


def test_requests_use_app_models_and_cap_output():
    request = fake_request()
    smoke.run_smoke(KEY, request=request)
    (embed_path, embed_body), (chat_path, chat_body) = request.calls
    assert embed_path == "/embeddings" and embed_body["model"] == "text-embedding-3-small"
    assert chat_path == "/chat/completions" and chat_body["model"] == "gpt-5-mini"
    assert chat_body["max_completion_tokens"] == smoke.MAX_COMPLETION_TOKENS <= 300


def test_exhausted_credit_fails_with_provider_code_only():
    error = smoke.ProviderError(429, "insufficient_quota", "insufficient_quota")
    report = smoke.run_smoke(KEY, request=fake_request(fail=("/embeddings", error)))
    assert report["status"] == "failed"
    embedding = report["checks"][0]
    assert embedding["http_status"] == 429 and embedding["code"] == "insufficient_quota"
    assert report["checks"][1]["status"] == "passed"  # one failure doesn't hide the other result


@pytest.mark.parametrize("overrides, expected", [
    ({"dimensions": 3}, "embedding"),
    ({"reply": "", "finish_reason": "length"}, "chat"),
])
def test_bad_provider_output_fails(overrides, expected):
    report = smoke.run_smoke(KEY, request=fake_request(**overrides))
    failed = [c["check"] for c in report["checks"] if c["status"] == "failed"]
    assert report["status"] == "failed" and failed == [expected]


def test_timeout_is_a_failure_not_a_crash():
    report = smoke.run_smoke(KEY, request=fake_request(fail=("/chat/completions", TimeoutError())))
    assert report["checks"][1] == {**report["checks"][1], "status": "failed", "error_type": "TimeoutError"}


def test_missing_key_is_rejected():
    with pytest.raises(ValueError):
        smoke.run_smoke("", request=fake_request())


def test_report_never_contains_the_key():
    report = smoke.run_smoke(KEY, request=fake_request())
    assert KEY not in json.dumps(report)
