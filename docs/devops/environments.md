# Environments and configuration separation

Owner: Ikeee-AI (DevOps). Prepared 16 October 2026 for Sprint 2 task S2-IK ("establish environment separation") and the course item "separate environments taking shape, such as preview or staging next to production". Variable **names** only; values live in ignored `.env` files, GitHub Actions secrets/variables or Render. Verified facts are marked with their source; proposals are marked as proposals.

## Current environments (verified 16 October 2026)

| | Local development | CI (GitHub Actions) | Production |
| --- | --- | --- | --- |
| Purpose | Developer machines | PR and main quality gates | Public course release |
| Trigger | Manual (`uvicorn`, `npm run dev`) | Every PR; push to main; manual dispatch | Push to main after all three CI jobs pass |
| Frontend | Vite dev server `:5173` | Production build with dummy `VITE_*` values | Render static site `tekatech-web` (`srv-db5v70tckfvc73biitc0`), https://tekatech-web.onrender.com |
| API | `uvicorn` `:8000` | Import/compile check; mocked pytest | Render free web service `tekatech-api` (`srv-db5v6sijnfac73brl4mg`), Singapore, 1 worker, https://tekatech-api.onrender.com |
| Database | **Production Supabase project** (`backend/.env` and `frontend/.env` both point at it — checked by project ID only) | Disposable `pgvector/pgvector:0.8.7-pg16` service container per run | Supabase project `lqswcmkzygqmnblaukco` |
| AI provider | OpenAI key from `backend/.env` (credit exhausted per Sprint 1 records) | None: dummy `sk-test-dummy`; all model calls mocked | OpenAI key in Render (credit exhausted per Sprint 1 records) |
| Rate-limit store | `memory://` | `memory://` | `memory://` (valid only with 1 worker) |
| Config source | `backend/.env`, `frontend/.env` (gitignored; templates in `.env.example`) | Literal dummy values in `ci.yml` | Render env vars (`render.yaml` lists names with `sync: false`) |
| Deploy credentials | None | PR jobs: none. Deploy job (main only): repo secrets `RENDER_BACKEND_DEPLOY_HOOK`, `RENDER_FRONTEND_DEPLOY_HOOK`; repo variables `PRODUCTION_API_URL`, `PRODUCTION_FRONTEND_URL` | Hooks accept deploys only of the tested SHA |

### Configuration inventory (names only)

| Name | Local | CI | Production (Render) | Secret? |
| --- | --- | --- | --- | --- |
| `OPENAI_API_KEY` / `openai_api_key` | backend `.env` | dummy | `tekatech-api` | Yes |
| `SUPABASE_URL` | backend `.env` | dummy | `tekatech-api` | No |
| `SUPABASE_KEY` (service role, `sb_secret_`) | backend `.env` | dummy | `tekatech-api` | **Yes — bypasses RLS** |
| `CORS_ORIGINS` | backend `.env` | default | `tekatech-api` = frontend origin | No |
| `RATE_LIMIT_STORAGE_URI` | backend `.env` | `memory://` | `memory://` | No (Yes if a Redis URL with password) |
| `VITE_SUPABASE_URL` | frontend `.env` | dummy | `tekatech-web` | No |
| `VITE_SUPABASE_ANON_KEY` (`sb_publishable_`) | frontend `.env` | dummy | `tekatech-web` | No (public by design) |
| `VITE_API_BASE_URL` | frontend `.env` | dummy | `tekatech-web` | No; baked in at build time |
| `RENDER_BACKEND_DEPLOY_HOOK`, `RENDER_FRONTEND_DEPLOY_HOOK` | — | repo secrets, main deploy job only | — | Yes |
| `PRODUCTION_API_URL`, `PRODUCTION_FRONTEND_URL` | — | repo variables | — | No |

## Gaps (honest status)

| # | Gap | Risk | Status |
| --- | --- | --- | --- |
| E1 | Local development uses the production Supabase project | Local tests, seed scripts or deletes change live data; Sprint 2 asks for destructive checks in a "designated test environment" | Open — highest priority |
| E2 | No staging or preview environment | Changes are first seen by users in production; the Demo Day challenge has no rehearsal target | Open — Sprint 3 target |
| E3 | GitHub environment secrets/protection rules unavailable on this private Free-plan repo | Deploy hooks are repository-scoped; any workflow on main could read them | Accepted constraint; hooks referenced only by the main deploy job |
| E4 | One OpenAI key used locally and in production | No per-environment spending cap or usage attribution | Open — create separate keys when credit is restored |
| E5 | Branch protection unavailable (HTTP 403) | Required checks and reviews are not enforced | Recorded; manual `/pr-gate`; raise with instructor |

## Proposal (not yet implemented)

**Step 1 — Separate local/test data (Sprint 2–3, free).** Create a second Supabase project, `tekatech-dev`, from `backend/sql/` using the ordered setup in `docs/database.md`. Point every developer's `.env` at it; production values stay only in Render. Seed it with Jopher's idempotent seed script (S2-JO). Check the current Supabase free-plan project limit and pause behavior before creating it. Until then, never run destructive checks locally.

**Step 2 — Staging next to production (Sprint 3, free if limits allow).** Two more Render free services, `tekatech-api-staging` and `tekatech-web-staging`, using the `tekatech-dev` Supabase project, a separate OpenAI key with a low monthly budget, and `CORS_ORIGINS` = the staging frontend origin. Deploy via a `deploy-staging` job (manual dispatch with a SHA input, or on push to a `staging` branch) using new repo secrets `RENDER_STAGING_BACKEND_DEPLOY_HOOK` / `RENDER_STAGING_FRONTEND_DEPLOY_HOOK` and variables `STAGING_API_URL` / `STAGING_FRONTEND_URL`, followed by `scripts/deployed_smoke.py` against staging. Production deployment stays automatic on main and does not wait for staging. Check Render's current free instance-hour limits and whether service previews are available on the workspace's plan before choosing between a fixed staging pair and previews.

**Step 3 — Per-environment AI keys (when credit is restored).** Separate OpenAI keys (or projects) for local/staging and production, each with its own usage limit; CI keeps using mocks.

## Decisions needed (owner: Ikeee-AI)
1. Approve creating the `tekatech-dev` Supabase project (free; account action).
2. Staging style for Sprint 3: fixed staging services vs. previews (after checking plan limits).
3. Who receives the dev-project credentials (only developers who need them; never in chat or issues).
