# Environments and configuration separation

Owner: Ikeee-AI (DevOps). Prepared 16 October 2026 for Sprint 2 task S2-IK ("establish environment separation") and the course item "separate environments taking shape, such as preview or staging next to production". Variable **names** only; values live in ignored `.env` files, GitHub Actions secrets/variables or Render. Verified facts are marked with their source; proposals are marked as proposals.

## Current environments (verified 16 October 2026)

| | Local development | CI (GitHub Actions) | Production |
| --- | --- | --- | --- |
| Purpose | Developer machines | PR and main quality gates | Public course release |
| Trigger | Manual (`uvicorn`, `npm run dev`) | Every PR; push to main; manual dispatch | Push to main after all three CI jobs pass |
| Frontend | Vite dev server `:5173` | Production build with dummy `VITE_*` values | Render static site `tekatech-web` (`srv-db5v70tckfvc73biitc0`), https://tekatech-web.onrender.com |
| API | `uvicorn` `:8000` | Import/compile check; mocked pytest | Render free web service `tekatech-api` (`srv-db5v6sijnfac73brl4mg`), Singapore, 1 worker, https://tekatech-api.onrender.com |
| Database | Supabase project `TekaTech-dev` (`efdgguybkampozuvqjrz`, created 16 October 2026; issue #18) — verified by project ID only | Disposable `pgvector/pgvector:0.8.7-pg16` service container per run | Supabase project `TekaTech` (`lqswcmkzygqmnblaukco`, region ap-south-1 Mumbai) |
| AI provider | OpenAI key from `backend/.env` (credit restored; real embeddings call passed 22 Oct 2026, [evidence](../evidence/openai-local-2026-10-22.json)) | None: dummy `sk-test-dummy`; all model calls mocked | OpenAI key `TekaTech_Render` in Render (rotated and verified with a cited live answer 22 Oct 2026, [evidence](../evidence/openai-production-2026-10-22.md)) |
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
| `OPENAI_SMOKE_API_KEY` | — | repo secret, used only by `ops-ai-smoke.yml` (weekly live check) | — | Yes; separate restricted key, shares the prepaid $10 balance |
| Supabase Auth custom SMTP (Brevo) | — | — | Production Supabase project, Authentication → SMTP Settings (not an app env var) | Yes: the Brevo SMTP key is stored only in Supabase, never in the repo or Render |

### Auth email (production, since 3 November 2026)

Supabase's built-in email sender allowed **2 emails per hour** for the whole project, covering sign-up confirmations, password resets and resends, and that limit could not be raised. Production now sends auth email through **Brevo** (free plan, 300 emails/day) as custom SMTP:

- **Sender:** `TekaTech <tekatechemail@gmail.com>` (verified in Brevo). **Host/port:** `smtp-relay.brevo.com:587`. The SMTP login and key live only in Supabase (and the key only once in Brevo).
- **Supabase rate limits:** emails 30/hour (was 2; editable only with custom SMTP), minimum 60 s between emails to the same user. The other limits are unchanged.
- **Verified 3 Nov 2026, about 13:15 Manila** by Ikeee-AI: a fresh sign-up on production received "Confirm your signup" from TekaTech instantly, in the **inbox** (Gmail), and the link signed the user in.
- **Known limits:** a free Gmail sender has no custom-domain DKIM/DMARC (Brevo warns "Freemail domain is not recommended"), so some providers may file mail as spam. A sending domain is the fix if that happens. Brevo's 300/day cap is the real ceiling. `TekaTech-dev` still uses Supabase's built-in sender (2/hour).

## Gaps (honest status)

| # | Gap | Risk | Status |
| --- | --- | --- | --- |
| E1 | Local development used the production Supabase project | Local tests, seed scripts or deletes changed live data | **Fixed 16 October 2026** (#18): `TekaTech-dev` created from `backend/sql/`, test admin set via `app_metadata`, local `.env` files repointed (production values backed up to ignored `.env.prod-backup`). `sprint1_check.py` passed all 7 checks against dev (5 tables, match RPC, `/gadgets` = 0 rows); production smoke still passed for `68b4c5a` with 3 gadgets at 2026-10-16T10:12:40Z |
| E2 | No staging or preview environment | Changes are first seen by users in production; the Demo Day challenge has no rehearsal target | **Not implemented for the 31 Oct release (disclosed).** Mitigations: TekaTech-dev database for local and destructive tests; mocked CI plus Playwright checks on a faked API; manual SQL applied on dev before production (#145); one supervised production failure drill (#118, #152). Staging needs two more Render free services, a separate low-limit OpenAI key and its own CORS origin; carried to Sprint 5 (#34) |
| E3 | GitHub environment secrets/protection rules unavailable on this private Free-plan repo | Deploy hooks are repository-scoped; any workflow on main could read them | Accepted constraint; hooks referenced only by the main deploy job |
| E4 | One OpenAI key used locally and in production | No per-environment spending cap or usage attribution | Partly mitigated 22 Oct 2026 — separate restricted keys for production and development, but one shared Default-project budget; per-environment projects deferred |
| E5 | Branch protection unavailable (HTTP 403) | Required checks and reviews are not enforced | Recorded; manual `/pr-gate`; raise with instructor |
| E7 | Auth email limited to 2/hour on Supabase's built-in sender | A third sign-up or password reset in an hour got "Too many requests" and no email | **Fixed 3 November 2026** for production: Brevo custom SMTP, 30/hour (see "Auth email" above) |
| E6 | Production database (ap-south-1 Mumbai) and API (Render Singapore) are in different regions | Every API request pays a cross-region database round trip; affects Sprint 3–4 latency measurements | Known; measure before deciding (Manuel, Sprint 3). Not a Sprint 2 change |

## Decision: `POST /query` stays public (#59, 23 October 2026)

Decided by Ikeee-AI (product/cost owner). **Option 1: keep `/query` and `/comparisons` public without login.**

Protection:
- The per-IP rate limit (10/min).
- Character and token caps on the question.
- A **hard spending cap from the $10 prepaid OpenAI balance with auto-reload off**: requests stop at $0. See [the evidence](../evidence/openai-production-2026-10-22.md).

Reasons:
- Shoppers can ask without an account, which is the product promise in `frontend/README.md`.
- The worst case is bounded at $10 and an AI outage, not an open-ended bill.

Follow-ups:
- #77 caps the cost of each answer (`max_completion_tokens`, `reasoning_effort`) — Manuel.
- Revisit after Demo Day, or if the $5 alert email arrives early: options 2 (daily budget cap from `query_history` tokens) or 3 (login required).

## Proposal (not yet implemented)

**Step 1 — Separate local/test data — done 16 October 2026 (#18).** Created a second Supabase project, `TekaTech-dev`, from `backend/sql/` using the ordered setup in `docs/database.md`. Point every developer's `.env` at it; production values stay only in Render. Seed it with Jopher's idempotent seed script (S2-JO). Check the current Supabase free-plan project limit and pause behavior before creating it. Until then, never run destructive checks locally.

**Step 2 — Staging next to production (Sprint 3, free if limits allow).** Two more Render free services, `tekatech-api-staging` and `tekatech-web-staging`, using the `tekatech-dev` Supabase project, a separate OpenAI key with a low monthly budget, and `CORS_ORIGINS` = the staging frontend origin. Deploy via a `deploy-staging` job (manual dispatch with a SHA input, or on push to a `staging` branch) using new repo secrets `RENDER_STAGING_BACKEND_DEPLOY_HOOK` / `RENDER_STAGING_FRONTEND_DEPLOY_HOOK` and variables `STAGING_API_URL` / `STAGING_FRONTEND_URL`, followed by `scripts/deployed_smoke.py` against staging. Production deployment stays automatic on main and does not wait for staging. Check Render's current free instance-hour limits and whether service previews are available on the workspace's plan before choosing between a fixed staging pair and previews.

**Step 3 — Per-environment AI keys (when credit is restored).** Separate OpenAI keys (or projects) for local/staging and production, each with its own usage limit; CI keeps using mocks.

## Decisions needed (owner: Ikeee-AI)
1. Approve creating the `tekatech-dev` Supabase project (free; account action).
2. Staging style for Sprint 3: fixed staging services vs. previews (after checking plan limits).
3. Who receives the dev-project credentials (only developers who need them; never in chat or issues).
