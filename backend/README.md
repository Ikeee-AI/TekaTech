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

`GET /health` is process liveness. `GET /version` returns the deployed commit SHA (`APP_COMMIT`, set by the CI Railway deploy; or `local`). `GET /gadgets` reads the real database. Open `/docs` for the API reference.

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

- Admin authorization uses Supabase `app_metadata.is_admin`, never client-writable `user_metadata`. The catalog is admin-curated (3 Nov 2026): only admins create/edit/delete gadgets, save/index/delete specs and review/resolve corrections. Any logged-in user can submit corrections and list their own.
- RLS is enabled and direct browser table/RPC privileges are revoked, but the service-role backend bypasses it. FastAPI authorization is essential.
- Embeddings use `text-embedding-3-small` / `cl100k_base`; chat uses `gpt-5-mini` / `o200k_base`. Input limits check both characters and tokens.
- The prompt treats snippets as untrusted data and matches the frontend renderer's citation/bold/bullet rules. Keep those contracts when changing AI code. The text and its version label (`PROMPT_VERSION`) live in `backend/prompts.py`; an evaluation report's `prompt_version` should carry the same label.
- After the model answers, `backend/citations.py` removes `[n]` markers outside the snippets that were sent (a dead citation in the UI) and `POST /query` reports how many in `invalid_citations_removed`. History stores the cleaned answer. An evaluator should score the raw answer or count the removals, otherwise the valid-citation rate is 100% by construction.
- Query history stores model output and token telemetry; history failures cannot fail an already-billed query.
- **Optional general-knowledge answer (#172).** `allow_general_knowledge` (default `false`) is used when retrieval finds no spec chunks, vector and keyword, in the requested scope, or (since 15 Nov 2026, next item) when the grounded call replies `NOT_IN_SPECS`. A question the snippets answer, fully or in part, gets the grounded, cited answer, even with the flag on, and `answer_basis` is `"specs"`. With the flag off, no match is today's "no relevant specs" answer (`answer_basis: "none"`, `model_used: "none"`). With the flag on, one capped chat call uses the `gk-v2` prompt in `prompts.py` (`GK_PROMPT_VERSION`) and the response has `answer_basis: "general_knowledge"`, `sources: []`, `retrieval: "none"` and the chat model in `model_used`. The answer opens with a fixed label, is unverified and declines non-gadget questions. No snippets are sent, only the question and, in comparison mode, the names of the gadgets asked about. Any `[n]` marker is removed and counted in `invalid_citations_removed`. The same output cap, reasoning effort and 503 handling apply (cut-off or empty output is the "couldn't use" 503). The flag is part of the answer-cache scope, so a general-knowledge answer is never served to a request without it, and a reworded question re-runs retrieval instead of reusing one. These answers are **not** written to `query_history`, because it feeds the public `/stats/trending-questions`; their token counts are logged. The rate limit (10 per minute) is unchanged, but each distinct no-match question now costs one chat call.
- **General knowledge for scoped questions (15 Nov 2026, rule `gkf-v1`).** A scoped question (gadget or compare page) always retrieves chunks, so the no-match trigger above never fires there. With the flag on, the grounded prompt carries one more rule: reply exactly `NOT_IN_SPECS` when the snippets hold none of the answer (a full or partial answer stays grounded). When the whole reply is that sentinel (any case, ignoring quotes, backticks, asterisks and trailing punctuation), `/query` makes a second chat call to the GK prompt and returns that answer exactly like the no-match GK path (same cache scope, not in `query_history`). With the flag off the rule is not sent and a stray sentinel becomes the "no relevant specs" answer (`answer_basis: "none"`, `model_used` is the chat model). The sentinel is never returned; a token inside a longer answer is removed. Cost: one extra chat call only in the flag-on, not-in-specs case.
- `POST /query` returns **503** `{"detail": "<plain sentence>"}` for every AI-side failure, the same shape as spec indexing: provider timeout ("The AI took too long to answer. Please try again."), quota/auth/connection/5xx errors ("AI answers are temporarily unavailable. Spec browsing still works.") and an empty or malformed model answer ("The AI returned an answer we couldn't use. Please rephrase and try again."). Provider names, keys and quota details are logged, never returned. Each OpenAI call times out after 45 s and is retried once, so one call can take up to about 90 s and a question (embedding, then chat) up to about 3 minutes in the worst case. An answer cut off by the output cap is also the "couldn't use" 503 (never shown partial, because a half-finished answer can end without its citations). No relevant specs is still a 200 with `model_used: "none"`.
- `memory://` counters are single-process only. Use healthy shared Redis for multiple workers/replicas. Startup must fail if the configured shared store is unreachable; no silent fallback.

## Browser-to-API boundary

The browser never queries data tables directly. Supabase is used from the browser for auth only (sign up / sign in). All data flows through FastAPI:

1. Browser signs in via Supabase and receives an access token.
2. The frontend `src/api/client.js` wraps `fetch`, pulls the current Supabase session's `access_token`, and sends it as a `Bearer` header.
3. The backend verifies it with `supabase.auth.get_user(token)` in `auth.py`.
4. Route-level authorization (`get_current_user`, `get_current_admin_user`) is the only access control — the backend's service-role key bypasses RLS, so Supabase RLS policies provide zero defense-in-depth here.

Admin is a flag on the Supabase auth user's `app_metadata`, which only the admin API (service-role key) can set. A user can never grant it to themselves. Admin-only operations today: create/edit/delete gadgets, ingest/index/delete specs, list/resolve corrections. Any logged-in user can submit corrections and list their own.

The relationship actually used by the app is `gadgets.id -> spec_documents.gadget_id` (one gadget, many spec chunks, cascade delete). `spec_documents` -> `spec_corrections` (one spec, many corrections, cascade delete) is the second relationship. Both are reproduced in scratch Postgres by `backend/sql/001_baseline.sql` without Supabase-managed Auth tables.

## Provider configuration

Environment variables (no secret values committed):

| Variable | Purpose | Default |
|----------|---------|---------|
| `openai_api_key` | OpenAI key for embeddings (`text-embedding-3-small`, `cl100k_base`) and chat (`gpt-5-mini`, `o200k_base`) | required |
| `supabase_url` | Supabase project URL | required |
| `supabase_key` | Supabase service-role key (`sb_secret_…`), bypasses RLS | required |
| `cors_origins` | Comma-separated allowed browser origins; `*` is refused at startup. CORS is not credentialed (auth is a Bearer header) and allows only `GET/POST/PUT/PATCH/DELETE` with `Authorization`, `Content-Type` | `http://localhost:5173` |
| `rate_limit_storage_uri` | Counter store; `memory://` is single-process only. Logs and the startup error show only its scheme and host | `memory://` |

Count with the matching encoder: `count_embedding_tokens` for anything headed to `embed_texts`, `count_chat_tokens` for anything headed into a prompt.

Rate limits: `/query` 10/min; spec ingestion, spec indexing, comparison creation and gadget photo upload 20/hour each; `GET /comparisons/{slug}` 60/min; signed-in GETs (`/corrections/mine`, `/me/gadgets`, `/me/gadgets/{id}/questions`) 120/min. `memory://` is per-process and correct only for a single worker; use a shared store (e.g. Redis) for multi-worker deploys. Startup aborts if a configured shared store is unreachable — no silent fallback.

## Failure drill

A safe way to show the `POST /query` error responses (timeout, quota, unusable output, empty retrieval) without calling OpenAI, so a drill costs nothing and cannot hit a real provider outage by accident. It is **off by default** and meant for a dev machine.

Three gates must all be open, otherwise the header is ignored and the request behaves normally (a non-admin learns nothing about the feature):

1. `failure_simulation_enabled=true` in `backend/.env`, then restart the server. It defaults to false and is deliberately **not** in `render.yaml`; a test fails if it ever is. On the production service it is set only during the supervised drill below, never left on.
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

**Check it stays off:** with the setting unset, repeat the request above. The response must be a normal answer, with no `X-Simulated-Failure` header. The Railway service's Variables list should not contain the variable.

### Supervised production drill (#118)

For the course's "controlled model failure" evidence, the drill may run on production in one supervised, time-boxed window (about 15 minutes), agreed by the team in advance. The DevOps Engineer owns the Railway change; the person running the requests uses a **production** admin account whose token stays on their own machine.

1. Railway → project `tekatech` → `tekatech-api` → Variables: add `FAILURE_SIMULATION_ENABLED=true`, then click **Deploy** on the staged-changes banner (the service restarts). Dashboard only; never `render.yaml` or `.railway/railway.ts`. (Before 12 Nov 2026 this was the Render dashboard.)
2. Once `/health/ready` returns 200, send the four modes plus the controls (a non-admin caller and an anonymous caller each get a normal answer). Save the response bodies, without the token.
3. Remove the variable and click **Deploy** again (the service restarts).
4. Repeat one admin request with the header: it must be a normal answer with no `X-Simulated-Failure`. Confirm the variable is gone from the Variables list.
5. Record the start time, end time and evidence on #118 and in the sprint log.

If step 3 or 4 fails, remove the variable before anything else; while it is on, admins (and only admins) can trigger simulated failures.

## TechSpecs import (disabled)

An admin-only way to pull one product's specifications from the [TechSpecs API](https://techspecs.io) (v5) into an **existing** gadget, instead of typing them in. It is **disabled** and must stay disabled until TechSpecs gives written authorization (requested from support@techspecs.io): their documentation says the data is watermarked and that downloading or caching it without authorization is forbidden.

- Settings: `techspecs_enabled` (default `false`), `techspecs_api_id`, `techspecs_api_key` (both optional, held as secrets and never logged or returned). Names are in `.env.example`; none of them belong in `render.yaml` (a test checks).
- While disabled, both routes answer **503** "TechSpecs import is disabled pending written authorization from TechSpecs..." after the admin check, and make no outbound call. Enabled without both credentials is also 503.
- `GET /techspecs/search?query=&page=&size=` (admin, 30/hour): `query` 2-100 characters, `page` 0-50, `size` 1-20. Returns `{"query", "page", "size", "results": [{"id", "name", "brand", "model", "category"}]}`. A preview only: nothing is stored or cached.
- `POST /techspecs/import` (admin, 20/hour) with `{"gadget_id": "<uuid>", "product_id": "<1-64 letters, digits, _ or ->"}`: fetches the product and saves it through the same path as `POST /gadgets/{id}/specs` (chunked, `pending`, no OpenAI call; index it afterwards as usual). The text starts with `Source: TechSpecs (techspecs.io), product <id>, retrieved <YYYY-MM-DD> (UTC)`, then one `Section / Key: value` line per spec field, and every chunk gets `source_url` `https://techspecs.io/`. It never creates a gadget (404 if the gadget does not exist) and is subject to the normal spec limits (422 if the product is too long for one saved spec).
- Provider failures: credentials rejected (401/403) and an unusable response are **502**; TechSpecs rate limit (429), timeout (10 s), connection or 5xx errors are **503**; unknown product is 404. No provider body, header or key is returned.
- The detail response schema is not documented, so `techspecs.py` parses it defensively; check the saved text the first time it is used against a real response. Imported text is spec text like any other: untrusted grounding data for `/query`.
- **Checking the parser with a free-trial key, before authorization:** `scripts/techspecs_probe.py` (run from `backend/` with `TECHSPECS_API_ID` / `TECHSPECS_API_KEY` in your own `.env`). Without `--yes` it only prints the plan. With `--yes` it makes at most 3 calls (1 search + up to 2 product lookups) and prints the response *shape* (keys, types, list lengths) and the parser's line and section counts; spec values only with `--show-values`, on screen. It stores nothing (no database, file or cache) and never prints the key. Don't run it in CI or on Render, and don't paste real TechSpecs values into the repo, an issue or a PR; record findings as field names and counts only.

## Collecting real answers for evaluation

`scripts/eval_adapter.py` asks the evaluation questions through a running API and writes the answers in the shape `scripts/eval_runner.py` scores. The runner numbers the verified source pack `[1]`-`[10]`, but `/query` numbers whatever it retrieved `[1]`-`[N]` per question, so the adapter maps each retrieved chunk back to the pack snippet it holds and rewrites the markers to pack ids (a chunk outside the pack becomes `[0]`, which the runner reports as an invalid citation).

```bash
python scripts/eval_adapter.py --api-base http://127.0.0.1:8000                 # check and plan only
python scripts/eval_adapter.py --api-base http://127.0.0.1:8000 --yes --out .local/answers.json
python scripts/eval_runner.py --answers .local/answers.json --markdown .local/report.md
```

- **It spends real credit** (about half a cent per question, 20 cases is roughly $0.10 from the shared balance), so without `--yes` it only checks and plans. A non-local API is refused unless `--allow-remote`. Questions are paced to stay under the 10-per-minute limit, so 20 take about 2 minutes.
- **Sign-in (since 14 Nov 2026):** `POST /query` needs a signed-in user, and a non-admin may ask only 20 questions per day, so set `TEKATECH_ACCESS_TOKEN` to an **admin** account's access token (admins are exempt from the daily limit). It is read from the environment only, sent as a Bearer header and never printed; without it every question is recorded as an HTTP 401 error.
- **Prerequisite:** every pack snippet saved and indexed as its **own** spec chunk (one `POST /gadgets/{id}/specs` per snippet) in the target database, preferably `TekaTech-dev`. The pre-check stops with a message if a snippet is missing or if a chunk holds several snippets (one citation would then credit all of them; `--allow-merged-chunks` accepts that coarser credit).
- **Output** records `origin: "live"`, the model, the `prompt_version` (read from `backend/prompts.py`), `invalid_citations_removed` per case and any `errors`. A failed question has no answer, so the runner scores it as a failure.
- **Invalid citations:** the backend strips markers that point outside the retrieved snippets, so the answers file only shows the ones that survived. The runner must also count `invalid_citations_removed`, otherwise the valid-citation rate is 100% by construction (tracked in #66).
- **Answer cache:** a repeated question in the same scope is answered from the in-process answer cache (`cached: true`), which would replay an earlier answer instead of measuring a fresh one. The cache scope includes `PROMPT_VERSION` and both model names, so a prompt or model change already starts from an empty cache. To re-run an unchanged prompt and get fresh answers, either restart the local server (the cache lives in the process), or send `X-Bypass-Answer-Cache: 1` with an **admin** bearer token. That header skips the cache read, both exact and similar matches. The fresh answer is still stored, so later ordinary requests reuse it. The header is ignored for non-admin callers (an anonymous caller gets 401 before it is read). `scripts/eval_adapter.py` sends the `TEKATECH_ACCESS_TOKEN` session but not this header; use the restart for adapter runs.

## API reference

Routes marked "none" are public; all others need a valid Supabase bearer token. Since 14 Nov 2026 (owner decision) a visitor who is not signed in may only browse the catalog (gadget and spec reads, spec coverage, health, version); every AI, comparison and question route answers `401 {"detail": "Login required"}` without a token and `401 {"detail": "Invalid or expired session"}` for a refused one. A token Supabase refuses is a 401; if the sign-in check itself fails (Supabase unreachable, timeout, 5xx) the answer is a 503 `"Sign-in check is temporarily unavailable. Please try again."`, so clients must not treat it as signed out. Every response carries `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Strict-Transport-Security` and a deny-all `Content-Security-Policy` (left off only for the `/docs` and `/redoc` HTML pages). The `client` pytest fixture overrides auth with an admin user; unauthorized/non-admin tests restore their own dependency overrides.

| Endpoint | Method | Auth | Payload | Success | Errors |
|----------|--------|------|---------|---------|--------|
| `/health` | GET | none | none | 200 `{"status": "ok"}` | — |
| `/health/ready` | GET | none | none | 200 `{"status": "ok", "database": "ok", "latency_ms": N}`; `Cache-Control: no-store` | 503 `{"status": "error", "database": "error", "latency_ms": N}` (the database failed or took over 5 s; never any error text), 429 (30/minute) |
| `/version` | GET | none | none | 200 `{"commit": "..."}` | — |
| `/gadgets` | GET | none | query: `category` (max 60 chars), `brand` (max 80) | 200 list | 422 (filter too long) |
| `/gadgets` | POST | admin | `GadgetCreate` (limits below) | 201 `GadgetResponse` | 401, 403, 422, 503 (database write failed) |
| `/gadgets/{id}` | GET | none | path `id` | 200 `GadgetResponse` | 404 |
| `/gadgets/{id}` | PATCH | admin | `GadgetUpdate`: only sent fields change; explicit `null` clears `release_date`, `price_php`, `image_url` | 200 `GadgetResponse` | 400 (no fields), 401, 403, 404, 422 (incl. `null` name/brand/category), 503 |
| `/gadgets/{id}` | DELETE | admin | path `id` | 204 | 401, 403, 404 |
| `/gadgets/{id}/image` | POST | admin | `multipart/form-data`, one file in field `file`: JPEG, PNG, WebP or AVIF (decided by magic bytes, not name or Content-Type; SVG refused), at most 2 MB (the request is cut off while reading, or refused up front by `Content-Length`). Stored in the public Storage bucket `gadget-images` at `gadgets/{id}/{sha256 prefix}.{ext}` (cache 1 year), then `image_url` is set to its public URL. 20/hour | 200 `GadgetResponse` (as PATCH) | 400 (upload interrupted), 401, 403, 404 (no such gadget; nothing stored), 413 (over 2 MB), 415 (not an allowed image, or SVG), 422 (no `file` field, extra fields, empty file), 429, 503 (storage or database failure; the gadget is unchanged). Needs the manual bucket step in `docs/database.md` |
| `/gadgets/{id}/specs` | GET | none | path `id` | 200 list | — |
| `/gadgets/{id}/specs` | POST | admin | `{"raw_text": "...", "source_url": "..."}` (`source_url` optional, http(s), max 2000 chars) | 201 `{"gadget_id", "chunks_created", "indexing_status"}` | 400, 401, 403, 404, 422, 429 |
| `/gadgets/{id}/specs/{spec_id}/index` | POST | admin | path ids | 200 `{"id", "indexing_status"}` | 401, 403, 404, 409, 422, 429, 503 |
| `/gadgets/{id}/specs/{spec_id}` | DELETE | admin | path ids | 204; its corrections are deleted with it (`on delete cascade`), and saved AI answers about the gadget are dropped from the answer cache | 401, 403, 404 (no such spec, or the spec belongs to another gadget) |
| `/comparisons` | POST | logged-in | `{"gadget_ids": [...]}` (at most 5 sent; duplicates removed, then at least 2 must remain) | 201 | 401, 404 (a gadget doesn't exist), 422 (fewer than 2 different, more than 5, malformed id), 429, 503, 500 (no free link name after 5 tries; try again) |
| `/comparisons/{slug}` | GET | logged-in (shared links need sign-in since 14 Nov 2026) | path `slug` (exactly 7 of `a-z0-9`) | 200 `{"slug", "gadget_ids"}` (view count is best-effort and never fails the request) | 401, 404 (unknown or malformed slug), 429 (60/minute) |
| `/stats/spec-coverage` | GET | none | none | 200 `{"covered": N, "total": N}` | — |
| `/stats/trending-questions` | GET | logged-in | query: `limit` (1–10, default 5) | 200 list; each `question` at most 150 chars and asked at least twice (a one-off question is never shown). A signed-in user's saved single-gadget question is stored in `query_history` as `[private question]` (tokens kept for cost) and never listed. `Cache-Control: private, max-age=60` | 401, 422 (limit out of range) |
| `/specs/{spec_id}/corrections` | POST | logged-in | `{"suggested_content": "..."}` (stripped; 1–20,000 chars and at most 6,000 embedding tokens, same as spec ingestion) | 201 | 401, 404, 422, 429 (20/hour) |
| `/corrections` | GET | admin | query `status`: `pending` (default), `approved` or `rejected` | 200 list, newest first, max 200 | 401, 403, 422 (unknown status), 503 |
| `/me/gadgets` | GET | logged-in | none (always the session user) | 200 list, newest first, max 50: `{"added_at", "gadget": GadgetResponse}`. 120/minute | 401, 429, 503 |
| `/me/gadgets/{gadget_id}` | PUT | logged-in | path `gadget_id` (a catalog gadget) | 204; already in the list is a no-op. 120/hour | 401, 404 (no such gadget), 409 (list full, 50), 422, 429, 503 |
| `/me/gadgets/{gadget_id}` | DELETE | logged-in | path `gadget_id` | 204, removes it from the caller's list only (idempotent). 120/hour | 401, 422, 429, 503 |
| `/me/gadgets/{gadget_id}/questions` | GET | logged-in | path `gadget_id` | 200 list, oldest first, the caller's latest 20 questions about that gadget: `{"id", "question", "asked_at", "response": QueryResponse}`. `POST /query` saves them (signed-in, exactly one gadget) and keeps only the newest 100 per gadget. 120/minute | 401, 422, 429, 503 |
| `/me/gadgets/{gadget_id}/questions` | DELETE | logged-in | path `gadget_id` | 204, deletes the caller's saved questions about that gadget only (idempotent). 60/hour | 401, 422, 429, 503 |
| `/me/ai-usage` | GET | logged-in | none (always the session user) | 200 `{"limit": 20, "remaining": N, "resets_at": "2026-11-15T00:00:00+00:00"}` (next 00:00 UTC = 08:00 Manila); an admin gets all three `null` (not limited). `Cache-Control: private, no-store`. 60/minute | 401, 429 |
| `/me/account` | DELETE | logged-in | none (always the session user) | 204. Deletes the caller's My Gadgets and saved questions and their pending corrections, replaces the submitter of their approved/rejected corrections with the all-zero UUID, then deletes the Supabase Auth user. 5/hour. The password re-check and confirmation are in the frontend. | 401, 409 (admin account), 429, 503 (rows are deleted first, so a retry is safe) |
| `/corrections/mine` | GET | logged-in | none (always the session user; no user-id parameter) | 200 list, newest first, max 50: `{"id", "status", "suggested_content", "created_at", "reviewed_at", "spec_id", "spec_excerpt", "gadget": {"id", "name", "brand"} \| null}` | 401, 429 (120/minute), 503 (`"Couldn't load your suggestions right now."`) |
| `/corrections/pending-count` | GET | admin | none | 200 `{"count": N}` | 401, 403, 503 |
| `/corrections/{id}` | PATCH | admin | `{"action": "approve\|reject"}`; only `pending` corrections can be resolved | 200 | 400, 401, 403, 404, 409 (`"Correction was already approved"` / `rejected`), 503 |
| `/query` | POST | logged-in, all modes (optional admin headers: `X-Simulate-Failure`, `X-Bypass-Answer-Cache`) | `{"question": "...", "gadget_ids": [...], "plain_language": false, "allow_general_knowledge": false, "regenerate": false}`; `regenerate` (gadget chat) replaces the caller's newest saved turn for the same question instead of adding one | 200 `{"answer", "sources", "model_used", "invalid_citations_removed", "cached", "cache_match", "retrieval", "answer_basis"}`; `retrieval` is `"vector"`, `"keyword"` or `"none"`; `answer_basis` is `"specs"`, `"general_knowledge"` or `"none"` (see below). A question about exactly one gadget is saved to the caller's thread. Non-admin answers carry `X-AI-Questions-Limit` / `X-AI-Questions-Remaining` | 401, 422 (empty or over-limit question), 429 (10/minute, or today's AI questions used up, see below), 503 (AI timeout, provider failure or unusable answer; see below) |
| `/techspecs/search` | GET | admin | query `query` (2-100 chars), `page` (0-50), `size` (1-20) | 200 `{"query", "page", "size", "results"}`; nothing stored | 401, 403, 422, 429 (30/hour), 502, 503 (disabled by default; see "TechSpecs import") |
| `/techspecs/import` | POST | admin | `{"gadget_id", "product_id"}` | 201 `{"gadget_id", "chunks_created", "indexing_status", "product_id", "source", "source_url"}` | 401, 403, 404, 422, 429 (20/hour), 502, 503 (disabled by default) |

Every route with an `{id}`, `{gadget_id}`, `{spec_id}` or `{correction_id}` path parameter returns 422 for a malformed UUID.

Shared error format: `{"detail": "<message>"}`. Validation failures return 422 from Pydantic before reaching the route, with `detail` as FastAPI's list of `{"loc", "msg", "type", "input"}`; the custom checks use plain-sentence `msg` values the UI can show directly. A bare `NaN`/`Infinity` in a JSON body is still a 422 (`main.py` makes the echoed `input` JSON-safe). A route that fails unexpectedly (for example a database call with no handling of its own, such as listing gadgets or saving spec text) returns **500** `{"detail": "Internal server error", "request_id": "..."}`: no exception text, and the id matches the log line.

**Rate limits** (per client address; a 429 body is `{"error": "Rate limit exceeded: 10 per 1 minute"}`, which uses `error`, not `detail`): `/query` 10/minute; spec ingestion, spec indexing, comparison creation and correction submission 20/hour each; `/health/ready` 30/minute. Counters are per process unless `RATE_LIMIT_STORAGE_URI` points at a shared store (see Architecture notes).

**Daily AI questions** (`ai_quota.py`, since 14 Nov 2026): each signed-in non-admin user may ask `AI_DAILY_QUESTION_LIMIT` (default 20) `POST /query` questions per UTC day; the count starts again at 00:00 UTC = 08:00 Manila. Admins (`app_metadata.is_admin`) are exempt. A question is counted after sign-in and validation (a 401 or 422 costs nothing); a cached answer and a question that later fails with a 503 do count. Over the limit: `429 {"detail": "You've used today's 20 AI questions. They reset at 8:00 AM (Manila time)."}` (uses `detail`, unlike the per-minute 429) with `Retry-After` (seconds to the reset) and `X-AI-Questions-Remaining: 0`. The counter shares the rate-limit store, so with `memory://` it resets on a redeploy.

**Response headers.** Every response carries `X-Request-ID`: a caller-supplied value is reused when it is 1 to 64 characters of letters, digits, `_` or `-`, otherwise a new id is generated. Quote it when reporting a problem. `GET /gadgets`, `GET /gadgets/{id}` and the `/stats/*` routes add `X-Cache: HIT` or `MISS` (server-side cache, 60 seconds; a gadget write clears the gadget cache and a spec write clears the stats cache), `/stats/spec-coverage` sends `Cache-Control: public, max-age=60`; `/stats/trending-questions` (signed-in only) sends `private, max-age=60`. `/query` adds `X-Simulated-Failure` only during a failure drill, and `X-AI-Questions-Limit` / `X-AI-Questions-Remaining` on every non-admin answer (both CORS-exposed, like `X-Request-ID`).

**Dropped database connections.** Reads (and deletes) are retried once when Supabase drops an idle connection (#133); writes are never retried, so a save cannot be applied twice.

Gadget input limits (`schemas.py`, same numbers as `frontend/src/utils/gadgetValidation.js`): `name` 1–120, `brand` 1–80, `category` 1–60 characters after trimming; `price_php` 0–10,000,000 and finite; `release_date` year 1970–2100; `image_url` a full http(s) link up to 2000 characters (blank is treated as no image). Responses are not re-validated against these limits, so older rows still load.
