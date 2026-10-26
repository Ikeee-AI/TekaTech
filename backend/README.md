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

**Manual SQL step for the keyword fallback (#88):** run `sql/keyword_match_spec_documents.sql` once in the Supabase SQL Editor (DEV first, then live). See [Adding the keyword fallback to an existing project](../docs/database.md#adding-the-keyword-fallback-to-an-existing-project). Until then `/query` works as before, minus the fallback.

### Retrieval

`POST /query` embeds the question and calls `match_spec_documents` with `MATCH_THRESHOLD = 0.25` and `MATCH_COUNT = 6` (`routers/query.py`). The threshold was measured on the verified eval pack in [retrieval-threshold-2026-10-27.md](../docs/evidence/retrieval-threshold-2026-10-27.md). The earlier 0.5 dropped relevant chunks for 10 of 23 answerable questions. If nothing passes the threshold, the keyword fallback (`keyword_search.py` + `keyword_match_spec_documents`) runs. It searches the same scope and indexed chunks only. Content words are OR-ed, a small synonym map is applied (chip/processor/SoC/CPU, battery/mAh, screen/display, camera/MP, storage/GB, weight/grams, charging/W), and fixed regexes match numbers with units such as `4000mAh`. Its chunks are numbered and cited exactly like vector chunks, and their `similarity` is the real cosine score. A database error in the fallback, including the function not being applied yet, never fails the request: it logs once and returns the "no relevant specs" answer.

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
- The prompt treats snippets as untrusted data and matches the frontend renderer's citation/bold/bullet rules. Keep those contracts when changing AI code. The text and its version label (`PROMPT_VERSION`) live in `backend/prompts.py`; an evaluation report's `prompt_version` should carry the same label.
- After the model answers, `backend/citations.py` removes `[n]` markers outside the snippets that were sent (a dead citation in the UI) and `POST /query` reports how many in `invalid_citations_removed`. History stores the cleaned answer. An evaluator should score the raw answer or count the removals, otherwise the valid-citation rate is 100% by construction.
- Query history stores model output and token telemetry; history failures cannot fail an already-billed query.
- `POST /query` returns **503** `{"detail": "<plain sentence>"}` for every AI-side failure, the same shape as spec indexing: provider timeout ("The AI took too long to answer. Please try again."), quota/auth/connection/5xx errors ("AI answers are temporarily unavailable. Spec browsing still works.") and an empty or malformed model answer ("The AI returned an answer we couldn't use. Please rephrase and try again."). Provider names, keys and quota details are logged, never returned. Each OpenAI call times out after 45 s and is retried once, so one call can take up to about 90 s and a question (embedding, then chat) up to about 3 minutes in the worst case. An answer cut off by the output cap is also the "couldn't use" 503 (never shown partial, because a half-finished answer can end without its citations). No relevant specs is still a 200 with `model_used: "none"`.
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

## Failure drill

A safe way to show the `POST /query` error responses (timeout, quota, unusable output, empty retrieval) without calling OpenAI, so a drill costs nothing and cannot hit a real provider outage by accident. It is **off by default** and meant for a dev machine.

Three gates must all be open, otherwise the header is ignored and the request behaves normally (a non-admin learns nothing about the feature):

1. `failure_simulation_enabled=true` in `backend/.env`, then restart the server. It defaults to false and is deliberately **not** in `render.yaml`; a test fails if it ever is. Never set it on the production service.
2. The request carries `X-Simulate-Failure: timeout | quota | bad_output | empty` (case-insensitive).
3. The caller is a logged-in **admin** (`app_metadata.is_admin`). Use the `TekaTech-dev` test admin and its session `access_token`; never paste a token into chat, an issue or a commit.

```bash
curl -i -X POST http://127.0.0.1:8000/query \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "X-Simulate-Failure: timeout" -d '{"question": "How big is the battery?"}'
```

On Windows PowerShell use `curl.exe` (not the `curl` alias) and put the JSON in a file, because PowerShell 5.1 strips the quotes from inline JSON:

```powershell
'{"question": "How big is the battery?"}' | Set-Content body.json -Encoding ascii
curl.exe -i -X POST http://127.0.0.1:8000/query -H "Content-Type: application/json" `
  -H "Authorization: Bearer $env:TOKEN" -H "X-Simulate-Failure: timeout" -d "@body.json"
```

| Header value | Status | `detail` / body | Also returned |
| --- | --- | --- | --- |
| `timeout` | 503 | "The AI took too long to answer. Please try again." | `X-Simulated-Failure: timeout` |
| `quota` | 503 | "AI answers are temporarily unavailable. Spec browsing still works." | `X-Simulated-Failure: quota` |
| `bad_output` | 503 | "The AI returned an answer we couldn't use. Please rephrase and try again." | `X-Simulated-Failure: bad_output` |
| `empty` | 200 | the normal "couldn't find any spec information" answer, `sources: []`, `model_used: "none"` | none |
| anything else (admin only) | 422 | lists the valid modes | none |

The simulated responses come from the same code as real failures, so the drill shows the real contract. They still count against the 10-per-minute limit, never call OpenAI, and write nothing to `query_history`. The browser UI does not send the header; to watch the messages in the UI, run the frontend against the local backend while logged in as the admin and add the header with a header-injecting browser extension (not tested here).

**Check it stays off:** with the setting unset, repeat the request above. The response must be a normal answer, with no `X-Simulated-Failure` header. The Render service's environment list should not contain the variable.

## Collecting real answers for evaluation

`scripts/eval_adapter.py` asks the evaluation questions through a running API and writes the answers in the shape `scripts/eval_runner.py` scores. The runner numbers the verified source pack `[1]`-`[10]`, but `/query` numbers whatever it retrieved `[1]`-`[N]` per question, so the adapter maps each retrieved chunk back to the pack snippet it holds and rewrites the markers to pack ids (a chunk outside the pack becomes `[0]`, which the runner reports as an invalid citation).

```bash
python scripts/eval_adapter.py --api-base http://127.0.0.1:8000                 # check and plan only
python scripts/eval_adapter.py --api-base http://127.0.0.1:8000 --yes --out .local/answers.json
python scripts/eval_runner.py --answers .local/answers.json --markdown .local/report.md
```

- **It spends real credit** (about half a cent per question, 20 cases is roughly $0.10 from the shared balance), so without `--yes` it only checks and plans. A non-local API is refused unless `--allow-remote`. Questions are paced to stay under the 10-per-minute limit, so 20 take about 2 minutes.
- **Prerequisite:** every pack snippet saved and indexed as its **own** spec chunk (one `POST /gadgets/{id}/specs` per snippet) in the target database, preferably `TekaTech-dev`. The pre-check stops with a message if a snippet is missing or if a chunk holds several snippets (one citation would then credit all of them; `--allow-merged-chunks` accepts that coarser credit).
- **Output** records `origin: "live"`, the model, the `prompt_version` (read from `backend/prompts.py`), `invalid_citations_removed` per case and any `errors`. A failed question has no answer, so the runner scores it as a failure.
- **Invalid citations:** the backend strips markers that point outside the retrieved snippets, so the answers file only shows the ones that survived. The runner must also count `invalid_citations_removed`, otherwise the valid-citation rate is 100% by construction (tracked in #66).
- **Answer cache:** a repeated question in the same scope is answered from the in-process answer cache (`cached: true`), which would replay an earlier answer instead of measuring a fresh one. The cache scope includes `PROMPT_VERSION` and both model names, so a prompt or model change already starts from an empty cache. To re-run an unchanged prompt and get fresh answers, either restart the local server (the cache lives in the process), or send `X-Bypass-Answer-Cache: 1` with an **admin** bearer token. That header skips the cache read, both exact and similar matches. The fresh answer is still stored, so later ordinary requests reuse it. The header is ignored for anonymous and non-admin callers, and only then is the caller looked up. `scripts/eval_adapter.py` sends no auth today, so it does not send this header; use the restart for adapter runs.

## API reference

Routes marked "none" are public; all others need a valid Supabase bearer token. The `client` pytest fixture overrides auth with an admin user; unauthorized/non-admin tests restore their own dependency overrides.

| Endpoint | Method | Auth | Payload | Success | Errors |
|----------|--------|------|---------|---------|--------|
| `/health` | GET | none | none | 200 `{"status": "ok"}` | — |
| `/version` | GET | none | none | 200 `{"commit": "..."}` | — |
| `/gadgets` | GET | none | query: `category`, `brand` | 200 list | — |
| `/gadgets` | POST | logged-in | `GadgetCreate` (limits below) | 201 `GadgetResponse` | 401, 422, 503 (database write failed) |
| `/gadgets/{id}` | GET | none | path `id` | 200 `GadgetResponse` | 404 |
| `/gadgets/{id}` | PATCH | logged-in | `GadgetUpdate`: only sent fields change; explicit `null` clears `release_date`, `price_php`, `image_url` | 200 `GadgetResponse` | 400 (no fields), 401, 404, 422 (incl. `null` name/brand/category), 503 |
| `/gadgets/{id}` | DELETE | admin | path `id` | 204 | 401, 403, 404 |
| `/gadgets/{id}/specs` | GET | none | path `id` | 200 list | — |
| `/gadgets/{id}/specs` | POST | logged-in | `{"raw_text": "...", "source_url": "..."}` (`source_url` optional, http(s), max 2000 chars) | 201 `{"gadget_id", "chunks_created", "indexing_status"}` | 400, 401, 404, 422, 429 |
| `/gadgets/{id}/specs/{spec_id}/index` | POST | logged-in | path ids | 200 `{"id", "indexing_status"}` | 401, 404, 409, 422, 429, 503 |
| `/comparisons` | POST | none | `{"gadget_ids": [...]}` (at most 5 sent; duplicates removed, then at least 2 must remain) | 201 | 404 (a gadget doesn't exist), 422 (fewer than 2 different, more than 5, malformed id), 429, 503 |
| `/comparisons/{slug}` | GET | none | path `slug` | 200 `{"slug", "gadget_ids"}` (view count is best-effort and never fails the request) | 404 |
| `/stats/spec-coverage` | GET | none | none | 200 `{"covered": N, "total": N}` | — |
| `/stats/trending-questions` | GET | none | query: `limit` (1–10, default 5) | 200 list; each `question` at most 150 chars | 422 (limit out of range) |
| `/specs/{spec_id}/corrections` | POST | logged-in | `{"suggested_content": "..."}` (stripped; 1–20,000 chars and at most 6,000 embedding tokens, same as spec ingestion) | 201 | 401, 404, 422, 429 (20/hour) |
| `/corrections` | GET | admin | query `status` | 200 list | 401, 403 |
| `/corrections/mine` | GET | logged-in | none (always the session user; no user-id parameter) | 200 list, newest first, max 50: `{"id", "status", "suggested_content", "created_at", "reviewed_at", "spec_id", "spec_excerpt", "gadget": {"id", "name", "brand"} \| null}` | 401 |
| `/corrections/pending-count` | GET | admin | none | 200 `{"count": N}` | 401, 403, 503 |
| `/corrections/{id}` | PATCH | admin | `{"action": "approve\|reject"}`; only `pending` corrections can be resolved | 200 | 400, 401, 403, 404, 409 (`"Correction was already approved"` / `rejected`), 503 |
| `/query` | POST | none (optional admin headers: `X-Simulate-Failure`, `X-Bypass-Answer-Cache`) | `{"question": "...", "gadget_ids": [...], "plain_language": false}` | 200 `{"answer", "sources", "model_used", "invalid_citations_removed", "cached", "cache_match", "retrieval"}`; `retrieval` is `"vector"`, `"keyword"` or `"none"` | 422 (empty or over-limit question), 429, 503 (AI timeout, provider failure or unusable answer; see below) |

Every route with an `{id}`, `{gadget_id}`, `{spec_id}` or `{correction_id}` path parameter returns 422 for a malformed UUID.

Shared error format: `{"detail": "<message>"}`. Validation failures return 422 from Pydantic before reaching the route, with `detail` as FastAPI's list of `{"loc", "msg", "type", "input"}`; the custom checks use plain-sentence `msg` values the UI can show directly. A bare `NaN`/`Infinity` in a JSON body is still a 422 (`main.py` makes the echoed `input` JSON-safe). Rate-limited routes (`/query`, spec ingestion/indexing, comparison creation, correction submission) return 429 once the limit is exceeded.

Gadget input limits (`schemas.py`, same numbers as `frontend/src/utils/gadgetValidation.js`): `name` 1–120, `brand` 1–80, `category` 1–60 characters after trimming; `price_php` 0–10,000,000 and finite; `release_date` year 1970–2100; `image_url` a full http(s) link up to 2000 characters (blank is treated as no image). Responses are not re-validated against these limits, so older rows still load.
