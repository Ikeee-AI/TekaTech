"""Bounded live OpenAI check: one embedding and one tiny chat request with the app's models.

Reads the key from OPENAI_API_KEY only (never an argument). No retries, a short timeout and a
small output cap keep the cost to a fraction of a cent. The report records model, latency,
token usage and request ids; never the key, and never more than the length of the reply.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

API_BASE = "https://api.openai.com/v1"
EMBEDDING_MODEL = "text-embedding-3-small"  # same models as backend/embeddings.py and routers/query.py
CHAT_MODEL = "gpt-5-mini"
EMBEDDING_DIMENSIONS = 1536
MAX_COMPLETION_TOKENS = 300  # covers minimal reasoning plus a one-word reply
TIMEOUT_SECONDS = 20


class ProviderError(Exception):
    def __init__(self, http_status, code, error_type):
        super().__init__(f"HTTP {http_status} {code or ''}".strip())
        self.http_status, self.code, self.error_type = http_status, code, error_type


def post(path, body, api_key):
    request = Request(f"{API_BASE}{path}", data=json.dumps(body).encode("utf-8"), method="POST",
                      headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8")), response.headers.get("x-request-id")
    except HTTPError as exc:
        # Keep only the provider's error code/type: raw bodies can echo request details.
        try:
            error = json.loads(exc.read().decode("utf-8")).get("error") or {}
        except (ValueError, AttributeError):
            error = {}
        raise ProviderError(exc.code, error.get("code"), error.get("type")) from None


def timed(name, operation):
    started = time.monotonic()
    try:
        detail = operation()
        return {"check": name, "status": "passed", "latency_ms": round((time.monotonic() - started) * 1000), **detail}
    except ProviderError as exc:
        return {"check": name, "status": "failed", "latency_ms": round((time.monotonic() - started) * 1000),
                "http_status": exc.http_status, "code": exc.code, "error_type": exc.error_type}
    except Exception as exc:  # timeouts, DNS, unexpected response shape
        return {"check": name, "status": "failed", "latency_ms": round((time.monotonic() - started) * 1000),
                "error_type": type(exc).__name__}


def run_smoke(api_key, request=post):
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    def embedding():
        data, request_id = request("/embeddings", {"model": EMBEDDING_MODEL, "input": ["TekaTech live smoke check."]}, api_key)
        dimensions = len(data["data"][0]["embedding"])
        if dimensions != EMBEDDING_DIMENSIONS:
            raise ValueError(f"Expected {EMBEDDING_DIMENSIONS} dimensions, got {dimensions}")
        return {"model": data.get("model"), "dimensions": dimensions,
                "total_tokens": data.get("usage", {}).get("total_tokens"), "request_id": request_id}

    def chat():
        data, request_id = request("/chat/completions", {
            "model": CHAT_MODEL,
            "messages": [{"role": "user", "content": "Reply with the single word: ready"}],
            "max_completion_tokens": MAX_COMPLETION_TOKENS,
            "reasoning_effort": "minimal",
        }, api_key)
        choice = data["choices"][0]
        reply = (choice.get("message") or {}).get("content") or ""
        if not reply.strip():
            raise ValueError(f"Empty reply (finish_reason={choice.get('finish_reason')})")
        usage = data.get("usage", {})
        return {"model": data.get("model"), "finish_reason": choice.get("finish_reason"), "reply_chars": len(reply),
                "prompt_tokens": usage.get("prompt_tokens"), "completion_tokens": usage.get("completion_tokens"),
                "request_id": request_id}

    checks = [timed("embedding", embedding), timed("chat", chat)]
    return {"status": "passed" if all(c["status"] == "passed" for c in checks) else "failed",
            "checked_at": datetime.now(timezone.utc).isoformat(), "checks": checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, help="Optional JSON report path (contains no key)")
    args = parser.parse_args()
    try:
        report = run_smoke(os.environ.get("OPENAI_API_KEY", "").strip())
    except ValueError as exc:
        report = {"status": "failed", "checked_at": datetime.now(timezone.utc).isoformat(), "error": str(exc)}
    rendered = json.dumps(report, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
