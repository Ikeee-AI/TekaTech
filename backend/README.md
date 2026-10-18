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

## Browser-to-API boundary

The browser never queries data tables directly. Supabase is used from the browser for auth only (sign up / sign in). All data flows through FastAPI:

1. Browser signs in via Supabase and receives an access token.
2. The frontend `src/api/client.js` wraps `fetch`, pulls the current Supabase session's `access_token`, and sends it as a `Bearer` header.
3. The backend verifies it with `supabase.auth.get_user(token)` in `auth.py`.
4. Route-level authorization (`get_current_user`, `get_current_admin_user`) is the only access control — the backend's service-role key bypasses RLS, so Supabase RLS policies provide zero defense-in-depth here.

Admin is a flag on the Supabase auth user's `app_metadata`, which only the admin API (service-role key) can set. A user can never grant it to themselves. Admin-only operations today: delete gadget, list/resolve corrections. Any logged-in user can create/edit gadgets, ingest/index specs, and submit corrections.

The relationship actually used by the app is `gadgets.id -> spec_documents.gadget_id` (one gadget, many spec chunks, cascade delete). `spec_documents` -> `spec_corrections` (one spec, many corrections, cascade delete) is the second relationship. Both are reproduced in scratch Postgres by `backend/sql/001_baseline.sql` without Supabase-managed Auth tables.

## Provider configuration

Environment variables (no secret values committed):

| Variable | Purpose | Default |
|----------|---------|---------|
| `openai_api_key` | OpenAI key for embeddings (`text-embedding-3-small`, `cl100k_base`) and chat (`gpt-5-mini`, `o200k_base`) | required |
| `supabase_url` | Supabase project URL | required |
| `supabase_key` | Supabase service-role key (`sb_secret_…`), bypasses RLS | required |
| `cors_origins` | Comma-separated allowed browser origins | `http://localhost:5173` |
| `rate_limit_storage_uri` | Counter store; `memory://` is single-process only | `memory://` |

Count with the matching encoder: `count_embedding_tokens` for anything headed to `embed_texts`, `count_chat_tokens` for anything headed into a prompt.

Rate limits: `/query` 10/min; spec ingestion, spec indexing and comparison creation 20/hour each. `memory://` is per-process and correct only for a single worker; use a shared store (e.g. Redis) for multi-worker deploys. Startup aborts if a configured shared store is unreachable — no silent fallback.

## API reference

Routes marked "none" are public; all others need a valid Supabase bearer token. The `client` pytest fixture overrides auth with an admin user; unauthorized/non-admin tests restore their own dependency overrides.

| Endpoint | Method | Auth | Payload | Success | Errors |
|----------|--------|------|---------|---------|--------|
| `/health` | GET | none | none | 200 `{"status": "ok"}` | — |
| `/version` | GET | none | none | 200 `{"commit": "..."}` | — |
| `/gadgets` | GET | none | query: `category`, `brand` | 200 list | — |
| `/gadgets` | POST | logged-in | `GadgetCreate` | 201 `GadgetResponse` | 401, 422 |
| `/gadgets/{id}` | GET | none | path `id` | 200 `GadgetResponse` | 404 |
| `/gadgets/{id}` | PATCH | logged-in | `GadgetUpdate` | 200 `GadgetResponse` | 400, 401, 404, 422 |
| `/gadgets/{id}` | DELETE | admin | path `id` | 204 | 401, 403, 404 |
| `/gadgets/{id}/specs` | GET | none | path `id` | 200 list | — |
| `/gadgets/{id}/specs` | POST | logged-in | `{"raw_text": "...", "source_url": "..."}` | 201 `{"gadget_id", "chunks_created", "indexing_status"}` | 400, 401, 404, 422, 429 |
| `/gadgets/{id}/specs/{spec_id}/index` | POST | logged-in | path ids | 200 `{"id", "indexing_status"}` | 401, 404, 409, 422, 429, 503 |
| `/comparisons` | POST | none | `{"gadget_ids": [...]}` (2–5 ids) | 201 | 400 (fewer than 2), 422, 429 |
| `/comparisons/{slug}` | GET | none | path `slug` | 200 `{"slug", "gadget_ids"}` | 404 |
| `/stats/spec-coverage` | GET | none | none | 200 `{"covered": N, "total": N}` | — |
| `/stats/trending-questions` | GET | none | query: `limit` | 200 list | — |
| `/specs/{spec_id}/corrections` | POST | logged-in | `{"suggested_content": "..."}` | 201 | 401, 404 |
| `/corrections` | GET | admin | query `status` | 200 list | 401, 403 |
| `/corrections/{id}` | PATCH | admin | `{"action": "approve\|reject"}` | 200 | 400, 401, 403, 404 |
| `/query` | POST | none | `{"question": "...", "gadget_ids": [...], "plain_language": false}` | 200 `{"answer", "sources", "model_used"}` | 422 (empty or over-limit question), 429 |

Every route with an `{id}`, `{gadget_id}`, `{spec_id}` or `{correction_id}` path parameter returns 422 for a malformed UUID.

Shared error format: `{"detail": "<message>"}`. Validation failures return 422 from Pydantic before reaching the route. Rate-limited routes (`/query`, spec ingestion/indexing, comparison creation) return 429 once the limit is exceeded.
