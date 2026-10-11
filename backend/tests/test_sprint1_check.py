"""Validate provider evidence without requiring Ollama or a paid API in CI."""
import json
from unittest.mock import patch

import httpx
import pytest

from scripts.sprint1_check import check_local_provider


def response(payload, status=200):
    return httpx.Response(status, json=payload,
                          request=httpx.Request("POST", "http://127.0.0.1:11434/api/generate"))


def test_local_probe_validates_output_and_does_not_claim_rag():
    with patch("scripts.sprint1_check.httpx.post", return_value=response({
        "done": True, "model": "qwen3:8b", "eval_count": 12,
        "response": json.dumps({"project": "TekaTech", "status": "ready"}),
    })) as provider:
        evidence = check_local_provider()
    assert evidence["provider"] == "ollama"
    assert evidence["validated_reply"] == {"project": "TekaTech", "status": "ready"}
    assert "RAG still uses OpenAI" in evidence["scope"]
    assert provider.call_args.kwargs["json"]["stream"] is False


@pytest.mark.parametrize("payload", [
    {"done": False, "model": "qwen3:8b", "response": '{"project":"TekaTech","status":"ready"}'},
    {"done": True, "model": "qwen3:8b", "response": "not JSON"},
    {"done": True, "model": "qwen3:8b", "response": '{"project":"TekaTech"}'},
    {"done": True, "model": "qwen3:8b", "response": '{"project":"TekaTech","status":"failed"}'},
])
def test_local_probe_rejects_incomplete_or_invalid_output(payload):
    with patch("scripts.sprint1_check.httpx.post", return_value=response(payload)):
        with pytest.raises(ValueError):
            check_local_provider()


def test_local_probe_propagates_provider_failure():
    with patch("scripts.sprint1_check.httpx.post", return_value=response({"error": "model unavailable"}, 404)):
        with pytest.raises(httpx.HTTPStatusError):
            check_local_provider()
