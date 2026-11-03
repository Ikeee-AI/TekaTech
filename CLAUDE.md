# CLAUDE.md

## Current team and DevOps handoff

Use the Desktop checkout at `C:\Users\ivana\Desktop\TekaTech`, as selected by the user. Do not switch to the old Documents/Codex project copy.

Read the current project handoff:
@docs/claude-handoff.md

The current five-person ownership and Sprint 2–5 plan are documented in `docs/sprints-2-to-5.md`; free DevOps tools and Claude/Render integration options are in `docs/devops/free-automation-tools.md`. These current assignments supersede the older two-member roster in README. OpenAI is the app's only AI provider: the optional Ollama local mode was dropped by the project owner on 16 October 2026 (the Sprint 1 Ollama connectivity probe in `scripts/sprint1_check.py` remains as historical TTK-11 evidence). Use `uv sync --frozen` and `npm ci` for reproducible dependency installation; do not overwrite existing environment files.

The technical guidance below is preserved from the existing CLAUDE.md.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Backend** (from `backend/`, Python 3.12+ with [uv](https://docs.astral.sh/uv/)):
```bash
uv sync                                   # install deps
uv run uvicorn main:app --reload          # dev server on :8000
uv run pytest                             # full suite
uv run pytest tests/test_query.py         # one file
uv run pytest -k test_delete_gadget        # one test by name
```

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev      # Vite dev server on :5173
npm run lint     # eslint — must stay clean, see "Lint conventions" below
npm run build
```

Both halves need their own `.env` (neither is committed) — see `backend/README.md` and `frontend/README.md` for the exact keys. The two Supabase keys are **different**: backend uses the `sb_secret_` service-role key, frontend uses the `sb_publishable_` anon key.

## Architecture

### The frontend never queries data tables
Supabase is used from the browser for **auth only** (`src/context/AuthContext.jsx` → `signUp`/`signIn` hit Supabase directly). All data flows through the FastAPI backend: `src/api/client.js` wraps `fetch`, pulls the current Supabase session's `access_token`, and sends it as a `Bearer` header. The backend verifies it with `supabase.auth.get_user(token)` in `auth.py`.

### Route code is the *only* access control
The backend connects with the **service-role key, which bypasses Row Level Security entirely**. Whatever RLS policies may exist in the Supabase project provide zero defense-in-depth here. Every authorization decision lives in the FastAPI dependencies:
- `get_current_user` — any logged-in Supabase user
- `get_current_admin_user` — additionally requires `app_metadata.is_admin`

Admin is a flag on the Supabase auth user's `app_metadata`, which **only** the admin API (service-role key) can set — a user can never grant it to themselves (unlike `user_metadata`, which is client-writable). Promote someone with:
```python
supabase.auth.admin.update_user_by_id(user_id, {"app_metadata": {"is_admin": True}})
```
Admin-only today: create/edit/delete gadgets, ingest/index/delete specs, list/resolve corrections (the catalog is admin-curated since 3 Nov 2026, `docs/scope-changes.md`). Any logged-in user can submit corrections and list their own (`/corrections/mine`), manage their own My Gadgets list (`/me/gadgets`, always scoped to the session user; no user-id parameter), and read/clear their saved questions about a gadget (`/me/gadgets/{id}/questions`; `POST /query` stays public but saves the turn to `user_questions` when the caller sends a valid session and asks about exactly one gadget). **No auth at all** (deliberately public, rate limit is the only guard): `POST /query`, `POST /comparisons`, `GET /comparisons/{slug}`, `/stats/*`, and the gadget/spec `GET` routes. An endpoint with no `Depends(get_current_user…)` is public — check for it when adding routes.

### The database schema is tracked and manually applied
`backend/sql/001_baseline.sql` tracks the five original application tables, `backend/sql/user_gadgets.sql` adds the per-user My Gadgets list, `backend/sql/user_questions.sql` the per-gadget AI conversation, and `backend/sql/match_spec_documents.sql` tracks vector retrieval. `backend/scripts/assemble_sql.py` prints all SQL in application order; `docs/database.md` explains setup and compatibility checks for existing databases. SQL is still **hand-applied in Supabase SQL Editor**: nothing auto-migrates production. CI applies it twice to scratch Postgres/pgvector and runs transactional behavior/access checks. If you add DB-side functions, put them in `backend/sql/` and tell the user how to apply them.

### RAG pipeline
Saving (`routers/specs.py`): raw text → `chunk_text()` → `spec_documents` with NULL embeddings and pending status, without an AI call. Separate `POST /gadgets/{gadget_id}/specs/{spec_id}/index` embeds one saved chunk later; provider failure preserves saved text, and content-match checks protect against stale vectors. `embed_texts()` supports batching when called with multiple texts.

Query (`routers/query.py`): embed the question → `match_spec_documents` RPC for nearest chunks (optionally scoped to `gadget_ids`; a scoped question gets the nearest `MATCH_COUNT` chunks whatever their score, because the right snippet ranks first but often scores under 0.5, while an unscoped one keeps `MATCH_THRESHOLD`) → build a **numbered** context block → prompt instructs the model to cite with `[1]`, `[2]` → frontend `AnswerText.jsx` parses those markers into clickable citations that scroll to the matching source card. The prompt text lives in `prompts.py` (with a `PROMPT_VERSION` label); `citations.py` then removes `[n]` markers outside the snippets that were sent and `/query` returns the count as `invalid_citations_removed`. The chat call is capped with `ANSWER_MAX_COMPLETION_TOKENS` (1500) and `ANSWER_REASONING_EFFORT` (`"low"`): gpt-5-mini bills hidden reasoning as output, `/query` is public and the prepaid balance is shared, and an answer that hits the cap (`finish_reason == "length"`) is a 503, never shown partial.

Consequence worth knowing: spec text lands verbatim in the LLM's grounding context. Since 3 Nov 2026 only admins can ingest specs, and a user's correction only reaches the context after an admin approves it, so the stored-prompt-injection surface is now admin-reviewed input. Don't reopen ingestion to all users without asking. The system prompt mitigates it by framing snippets as untrusted data; keep that section if you rewrite the prompt.

**The prompt's formatting rules are coupled to `AnswerText.jsx`.** That component renders exactly three things: `[n]` citations, `**bold**`, and `- ` bullets — and bullets only become a list when at most one non-bullet line precedes them. The prompt states those limits deliberately. Loosening it (headings, tables, `[1,2]`-style citations) makes the model emit markup that renders as literal text, with no error to notice. Change both files together or neither.

Comparison mode also passes a "Gadgets in this comparison" note listing every requested gadget, because retrieval only surfaces gadgets that *have* specs — without it the model can't distinguish "no specs on file" from "not in scope" and quietly compares a subset.

### Shared AI panel logic
`AIAnswerPanel` (single gadget) and `AIComparisonPanel` (comparison) differ only in their header and question input. Everything else is shared: `hooks/useAiAnswer.js` (loading/error/result state, plain-language toggle, citation scroll, copy) and `components/AiAnswerResult.jsx` (error block, answer, collapsible sources, footer). Changes to answer rendering or citation behavior belong in those two files, not in the panels.

### Tokens
`tokens.py` owns both tiktoken encodings, because the two models **do not share one**: `text-embedding-3-small` uses `cl100k_base`, `gpt-5-mini` uses `o200k_base`. Count with the wrong one and the number is silently wrong. Use `count_embedding_tokens` for anything headed to `embed_texts`, `count_chat_tokens` for anything headed into a prompt.

Input limits are enforced twice on purpose: a loose character cap (free, rejects the absurd) then a token cap (the real limit). Characters are a poor proxy — measured on real spec text the ratio swings from ~1.5 chars/token (Japanese) to ~4.3 (Filipino), so a char-only cap lets one request cost ~3x another of identical length.

`query.py` records `embedding_tokens` / `prompt_tokens` / `completion_tokens` into `query_history` from the `usage` block OpenAI returns on every response. Those columns only exist after `sql/add_query_history_token_columns.sql` is applied, so the insert retries without them on schema error — and the whole history write is wrapped so it can never fail the request, since both OpenAI calls are already billed by the time it runs.

### Rate limiting
`rate_limit.py` holds a module-level `slowapi` `Limiter`. Applied to `/query` (10/min), spec ingestion, spec indexing, and comparison creation (20/hr each). **slowapi requires the endpoint to accept `request: Request`** even if unused — omitting it breaks the decorator at runtime, not at import.

Counter storage comes from `settings.rate_limit_storage_uri` (default `memory://`). `memory://` is per-process and therefore only correct on a single worker; a shared store (`redis://`) is required for multi-worker/replica deploys. `verify_storage_reachable()` runs in the app lifespan and **aborts startup** if a configured store is unreachable — deliberately no `in_memory_fallback`, since a silent downgrade to per-process counters looks healthy while the protection is gone. Don't "helpfully" add a fallback.

## Testing

`tests/conftest.py` does three things worth knowing before writing tests:
- `fake_supabase` — an in-memory fake of the Supabase fluent builder. Configure per-test with `fake_supabase.set_response(table, operation, data)` where operation is `"select"`/`"insert"`/`"update"`/`"delete"`. RPC calls key off the pseudo-table `"_rpc"` with operation `None`. If a router starts using a builder method the fake lacks (e.g. `.limit()` was added for stats), add it to `FakeQuery`.
- `client` — a `TestClient` that overrides `get_current_user` to return a fake **admin** user. Tests assume an authenticated admin caller. To test a non-admin/anonymous path, override `app.dependency_overrides[get_current_user]` inside the test and restore it in a `finally`.
- `reset_rate_limiter` — autouse; without it the shared limiter would leak hits across tests (they all share one client "IP").

Tests never make real Supabase or OpenAI calls. Mock OpenAI with `unittest.mock.patch("routers.query.client")` (module-level client object) or `patch("routers.specs.embed_texts", ...)`.

## Lint conventions

`npm run lint` is currently clean and should stay that way. Two deliberate patterns:

- **`react-hooks/set-state-in-effect` is suppressed at specific call sites.** The app-wide data-fetching convention is `setLoading(true)` → `api.x().then(...).finally(() => setLoading(false))` inside a `useEffect`, used across many components. The strict rule flags it where the `setState` runs synchronously in the effect body (currently suppressed in `AIComparisonPanel`, `ComparePage`, `AdminCorrections`). Suppress at the line with a comment explaining why; do **not** restructure the fetch pattern in one component only, and do not disable the rule project-wide.
- **`AuthContext.jsx` exports only components.** `react-refresh/only-export-components` forced a three-file split: the provider (`context/AuthContext.jsx`), the raw context object (`context/authContextValue.js`), and the hook (`hooks/useAuth.js`). Don't consolidate them.

## CI and deploy

`.github/workflows/ci.yml` runs three parallel jobs on every PR — mirror them locally before pushing:
- **Backend tests**: `python ../scripts/check_secrets.py` (fails on tracked `.env*`, `account.txt`, or `sk-`/`sb_secret_`/GitHub-token/Render-hook patterns — including in test fixtures), `compileall`, `uv run pytest`, then `from main import app`.
- **Frontend lint and build**: `npm ci && npm run lint && npm run build`.
- **Database migrations**: `python backend/scripts/assemble_sql.py` output applied **twice** to scratch pgvector Postgres (so every SQL file must be idempotent/replay-safe), then `backend/tests/sql/schema_acceptance.sql`. A new file in `backend/sql/` must also be registered in `assemble_sql.py` or CI never applies it.

Pushes to `main` additionally trigger Render deploy hooks and `scripts/deployed_smoke.py`. Deploys never touch the database — SQL is applied by hand first (`docs/deploy-runbook.md`, `PIPELINE.md`). PRs follow `.github/PULL_REQUEST_TEMPLATE.md`, which asks for any manual migration/env step to be listed.

`AGENTS.md` is a copy of this file for Codex; update both together.

## Gotchas

- Both halves need matching config to talk to each other: the frontend's `VITE_API_BASE_URL` must point at the backend, and that frontend's own origin must appear in the backend's `cors_origins`. Vite inlines env vars **at build time**, so changing `VITE_*` requires a dev-server restart or rebuild — it is not read at runtime.
- The backend's allowed CORS origin comes from `cors_origins` in its `.env` (comma-separated, defaults to `http://localhost:5173`). If Vite starts on a different port because 5173 is taken, requests fail CORS until that origin is added.
- A paused Supabase project surfaces as DNS failure then Cloudflare 521, and takes a few minutes to fully wake after resuming — not an app bug.
- `FAILURE_SIMULATION_ENABLED` (the `/query` failure drill, admin + `X-Simulate-Failure` header only) must stay unset in production, except during the supervised, time-boxed drill in `backend/README.md` ("Supervised production drill"), when the DevOps Engineer sets it in the Render dashboard and removes it straight afterwards. Never add it to `render.yaml`; a test fails if it appears there.
