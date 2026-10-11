# TekaTech backend

FastAPI owns database access and AI calls. Supabase Auth verifies incoming bearer tokens; the backend uses the secret/service-role database key. Browser data access is not used.

## Setup and run

Python 3.12+ and uv are required. From this directory:

```powershell
Copy-Item .env.example .env  # first setup only, then fill in
uv sync --frozen
uv run uvicorn main:app --reload
```

Required variables: `openai_api_key`, `supabase_url`, `supabase_key`. Optional: `cors_origins` (comma-separated frontend origins) and `rate_limit_storage_uri` (default `memory://`). Use the backend secret/service-role key; the frontend uses a different publishable/anon key. See `.env.example` for all settings.

`GET /health` is process liveness. `GET /version` returns Render's deployed commit SHA (or `local`). `GET /gadgets` reads the real database. Open `/docs` for the API reference.

## Database

The schema and RPC are tracked under `sql/`. Apply SQL manually in Supabase SQL Editor in the order documented in [database setup](../docs/database.md); production is never silently migrated. `scripts/assemble_sql.py` prints the ordered setup for copying into the editor. Existing projects require schema/signature comparison first.

Saving `POST /gadgets/{id}/specs` stores chunked text with NULL embeddings and pending status, without an AI call. `POST /gadgets/{id}/specs/{spec_id}/index` indexes one saved chunk later. Provider failure returns 503 and preserves the saved text; a content-match update protects against stale vectors. Database corrections invalidate the old embedding. Pending rows remain readable but cannot be retrieved by vector similarity.

## Tests

```powershell
uv run --frozen pytest
```

Tests use fake Supabase and mocked provider calls. `tests/conftest.py` sets safe dummy configuration before importing routes, resets rate-limit counters, and overrides the current user with an admin. Unauthorized/non-admin tests restore their dependency overrides.

The CI database job uses real scratch Postgres/pgvector; its roles, repeated migrations and transactional acceptance assertions are separate from mocked API tests.

## Live Sprint 1 checks

```powershell
uv run python scripts/sprint1_check.py --api-base http://127.0.0.1:8000 --output ../.local/sprint1-live-check.json
# Add --ai only for the deliberate ONE small billed backend provider call.
# Alternative: a real local generation, with validated JSON and no paid API call.
uv run python scripts/sprint1_check.py --ai --ai-provider ollama --ai-model qwen3:8b --output ../.local/sprint1-local-llm-check.json
```

This reads table columns and checks the match RPC; it never creates or deletes database records. Error reports contain safe codes/types, not raw credentials/provider messages. See the [deploy/rollback runbook](../docs/deploy-runbook.md) and [pipeline](../PIPELINE.md) for public deployment smoke checks.

The Ollama probe calls `http://127.0.0.1:11434/api/generate` from backend code, requests structured JSON and validates the completed output. It uses an already installed model and does not download one. This is temporary Sprint 1 provider-connectivity evidence. It does not redirect application chat/embeddings, populate pgvector, or make the laptop's local provider accessible to a hosted API. Do not mix embeddings from different models merely because they have the same dimensions.

## Architecture notes

- Admin authorization uses Supabase `app_metadata.is_admin`, never client-writable `user_metadata`. Any logged-in user can create/edit gadgets, save/index specs and submit corrections. Only admins delete gadgets and review/resolve corrections.
- RLS is enabled and direct browser table/RPC privileges are revoked, but the service-role backend bypasses it. FastAPI authorization is essential.
- Embeddings use `text-embedding-3-small` / `cl100k_base`; chat uses `gpt-5-mini` / `o200k_base`. Input limits check both characters and tokens.
- The prompt treats snippets as untrusted data and matches the frontend renderer's citation/bold/bullet rules. Keep those contracts when changing AI code.
- Query history stores model output and token telemetry; history failures cannot fail an already-billed query.
- `memory://` counters are single-process only. Use healthy shared Redis for multiple workers/replicas. Startup must fail if the configured shared store is unreachable; no silent fallback.
