"""Live Sprint 1 checks. No database writes; --ai calls the selected provider once."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Literal

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from openai import OpenAI
from pydantic import BaseModel
from config import settings
from supabase_client import supabase


class LocalSmokeReply(BaseModel):
    project: Literal["TekaTech"]
    status: Literal["ready"]


def check_local_provider(model="qwen3:8b"):
    """A local generation probe, not a replacement for the application's RAG."""
    response = httpx.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": model,
            "prompt": 'Return JSON with project "TekaTech" and status "ready".',
            "format": LocalSmokeReply.model_json_schema(),
            "stream": False,
            "think": False,
            "options": {"temperature": 0, "num_predict": 64},
        },
        timeout=180,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("done") is not True:
        raise ValueError("Expected a completed Ollama generation")
    reply = LocalSmokeReply.model_validate_json(payload["response"])
    return {
        "provider": "ollama", "model": payload["model"],
        "validated_reply": reply.model_dump(),
        "generated_tokens": payload.get("eval_count"),
        "scope": "local backend connectivity only; application RAG still uses OpenAI",
    }


def run_checks(*, ai=False, ai_provider="openai", ai_model="qwen3:8b", api_base=None, frontend_url=None):
    results = []

    def check(name, operation):
        try:
            detail = operation()
            results.append({"check": name, "status": "passed", "detail": detail})
        except Exception as exc:
            # Raw errors can include URLs, headers or personal data. Record safe fields only.
            code = getattr(exc, "code", None)
            body = getattr(exc, "body", None)
            if isinstance(body, dict):
                error = body.get("error", body)
                if isinstance(error, dict):
                    code = error.get("code", code)
            results.append({"check": name, "status": "failed",
                            "error_type": type(exc).__name__, "code": code,
                            "http_status": getattr(exc, "status_code", None)})

    def table_read(table, columns):
        result = supabase.table(table).select(columns, count="exact").limit(0).execute()
        return {"row_count": result.count}

    for table, columns in (
        ("gadgets", "id,name,brand,category,created_at,updated_at"),
        ("spec_documents", "id,gadget_id,content,embedding,indexing_status,verified_at"),
        ("spec_corrections", "id,spec_document_id,submitted_by,reviewed_by,status"),
        ("comparison_links", "id,slug,gadget_ids,view_count"),
        ("query_history", "id,query_text,answer_text,gadget_ids_ref,model_used,embedding_tokens,prompt_tokens,completion_tokens"),
    ):
        check(f"database_{table}", lambda t=table, c=columns: table_read(t, c))

    def match_rpc():
        # Synthetic unit vector, empty scope; no AI call or database writes.
        result = supabase.rpc("match_spec_documents", {
            "query_embedding": [1.0] + [0.0] * 1535,
            "match_count": 0, "match_threshold": 0.5, "match_gadget_ids": [],
        }).execute()
        if result.data != []:
            raise ValueError("Expected an empty result for an empty scope")
        return {"reachable": True}
    check("database_match_rpc", match_rpc)

    if api_base:
        def api_check():
            response = httpx.get(f"{api_base.rstrip('/')}/gadgets", timeout=30)
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list):
                raise ValueError("Expected a gadget list")
            return {"http_status": response.status_code, "gadget_count": len(rows)}
        check("frontend_backend_database_endpoint", api_check)

    if frontend_url:
        def frontend_check():
            response = httpx.get(frontend_url, timeout=30, follow_redirects=True)
            response.raise_for_status()
            if 'id="root"' not in response.text:
                raise ValueError("Expected the React application shell")
            return {"http_status": response.status_code}
        check("live_frontend_shell", frontend_check)

    if ai:
        def provider_check():
            client = OpenAI(api_key=settings.openai_api_key.get_secret_value(), timeout=20, max_retries=0)
            response = client.embeddings.create(
                model="text-embedding-3-small", input=["TekaTech Sprint 1 connection test."]
            )
            if len(response.data) != 1 or len(response.data[0].embedding) != 1536:
                raise ValueError("Unexpected embedding dimensions")
            return {"model": response.model, "dimensions": len(response.data[0].embedding),
                    "total_tokens": response.usage.total_tokens,
                    "request_id": getattr(response, "_request_id", None)}
        if ai_provider == "ollama":
            check("ai_provider", lambda: check_local_provider(ai_model))
        elif ai_provider == "openai":
            check("ai_provider", provider_check)
        else:
            raise ValueError("Unknown AI provider")
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "checks": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ai", action="store_true", help="One provider request: OpenAI is billed, Ollama is local")
    parser.add_argument("--ai-provider", choices=("openai", "ollama"), default="openai")
    parser.add_argument("--ai-model", default="qwen3:8b", help="Installed Ollama model for the local probe")
    parser.add_argument("--api-base", help="Local or deployed backend origin")
    parser.add_argument("--frontend-url", help="Deployed frontend URL")
    parser.add_argument("--output", type=Path, help="Optional JSON evidence file (no keys)")
    args = parser.parse_args()
    report = run_checks(ai=args.ai, ai_provider=args.ai_provider, ai_model=args.ai_model,
                        api_base=args.api_base, frontend_url=args.frontend_url)
    rendered = json.dumps(report, indent=2)
    print(rendered)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    sys.exit(any(item["status"] == "failed" for item in report["checks"]))
