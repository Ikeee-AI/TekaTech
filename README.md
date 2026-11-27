# TekaTech

An AI subject project that helps shoppers understand and compare gadget specifications. The app stores sourced specs, retrieves relevant chunks with pgvector, and generates answers with clickable citations. Specs can be saved before AI indexing, so provider outages do not prevent catalog work.

**Using the app:** [quick-start guide](docs/quick-start.md) · **Running it locally:** [Run locally](#run-locally) · **With Docker (judges):** [docs/docker.md](docs/docker.md), `docker compose up --build`

## Team and responsibilities

The project owner, **Ikeee-AI**, is the **one DevOps Engineer**. Every other team member is a Developer with the specialty below. Full ownership boundaries, the Sprint 2–5 work packages and the review table are in [docs/sprints-2-to-5.md](docs/sprints-2-to-5.md). This five-person roster replaces the two-member Sprint 1 roster.

| Member | Course role | Ownership |
| --- | --- | --- |
| Ikeee-AI (`Ikeee-AI`) | DevOps Engineer (exactly one); planned weekly product owner | CI/CD, hosting, environments/secrets, quality gates, metrics, release/rollback, incidents, board coordination |
| Adrian (`s2302756-cloud`) | Developer — AI Developer | Versioned prompts, grounding/citation behavior, evaluation datasets and evaluator |
| Mika (`meka-moka`) | Developer — Frontend Engineer | Layouts, responsive styling, accessibility, visual components, citation rendering, slide deck |
| Manuel Mirasol (`s2302827-byte`) | Developer — Backend / AI Engineer | API contracts, auth, schema/migrations, provider adapters, retrieval/indexing, output validation |
| Jopher (`s2100932`) | Developer — Backend / Frontend Developer | Feature endpoints and workflows, API wiring, forms/state, integration tests, local seed |

Repository access on 16 October 2026: Manuel and Jopher have write access; Adrian's and Mika's invitations were sent that day. Sprint 1 product owner: **Ikeee-AI**, confirmed by the project owner on 12 October 2026. The product owner prioritizes the board and reports progress at consultation. Every member reviews another teammate's PRs. Record any approved mid-project role change in the sprint log and notify the instructor.

## Demo Day submission (code freeze, 27 Nov 2026)

| Deliverable | Link |
| --- | --- |
| Production app | https://tekatech-web.onrender.com (frontend, Render) · API https://tekatech-api-production-549b48c9.up.railway.app/health (Railway) · database and auth in Supabase |
| Final tagged release | [Latest release](https://github.com/Ikeee-AI/TekaTech/releases/latest) (the tag production runs) · all releases: [`CHANGELOG.md`](CHANGELOG.md), [`docs/releases/`](docs/releases/) |
| **Deployment Challenge recording** (continuous, unedited, narrated by the DevOps Engineer) | <<VIDEO_FOLDER_URL>> |
| Final slide deck | <<DECK_URL>> |
| Submission manifest (every required deliverable, owner and location) | [`docs/submission-manifest.md`](docs/submission-manifest.md) |
| Architecture · database ERD · API reference | [`docs/architecture.md`](docs/architecture.md) · [`docs/database.md`](docs/database.md) · [`backend/README.md`](backend/README.md) |
| AI implementation and evaluation | [`docs/ai-feature-writeup.md`](docs/ai-feature-writeup.md) · [`prompts/`](prompts/) |
| Pipeline · metrics · optimizations · runbook · incidents | [`PIPELINE.md`](PIPELINE.md) · [`docs/devops/metrics.md`](docs/devops/metrics.md) · [`docs/devops/optimizations.md`](docs/devops/optimizations.md) · [`docs/deploy-runbook.md`](docs/deploy-runbook.md) · [`docs/devops/incidents.md`](docs/devops/incidents.md) |
| AI provider failure simulation · malformed requests | [`backend/README.md`](backend/README.md) (`FAILURE_SIMULATION_ENABLED` drill) · [`docs/demo/malformed-request-demo.md`](docs/demo/malformed-request-demo.md) |
| Demo accounts and test data | Production: a member and an admin demo account, given to the panel privately (never in the repository). Local Docker: DEV admin and member accounts, see [`docs/docker.md`](docs/docker.md). Seed script: [`backend/scripts/seed_dev.py`](backend/scripts/seed_dev.py) |

## Current status (code freeze, 27 Nov 2026)

- **Live:** production runs the latest tagged release (`v1.2.0` is `f4ffb7f`; the Deployment Challenge change is tagged as the final release on the same day). Deployed smoke checks and a signed-in Chrome check of member and admin journeys passed on 27 Nov.
- **Features:** a 23-phone catalog curated by admins, with sourced specs and prices; cited AI answers on phone pages and for 2–5-phone comparisons, streamed, with 5-turn chat memory; published game and chip benchmarks (130 rows, each with a source link); general knowledge and web search, both opt-in and labelled, with daily caps; My Gadgets, saved questions, corrections, admin overview and admin web drafts; a Docker setup for running it locally. Signed-out visitors can browse the catalog only.
- **Tests (27 Nov 2026):** 1,124 backend tests and 684 frontend unit tests pass, plus the Playwright failure-drill checks and the database replay checks in CI. The full-history Gitleaks scan (318 commits), pip-audit, `npm audit` and Dependabot show nothing open.
- **Releases:** `v1.0.0` (31 Oct) was the Sprint 4 course submission; `v1.1.0` (6 Nov), `v1.2.0` (27 Nov, code freeze) and the Deployment Challenge release follow it.

## Sprint 1 status (historical, October 2026)

The private [GitHub repository](https://github.com/Ikeee-AI/TekaTech), merged [Sprint 1 PR #15](https://github.com/Ikeee-AI/TekaTech/pull/15), and [13 backlog issues](https://github.com/Ikeee-AI/TekaTech/issues) are live. The source branch is `tekatech/sprint-1`; GitHub closed the original PR #1 when its branch was renamed. Commit history is preserved. The private [TekaTech Sprint Board](https://github.com/users/Ikeee-AI/projects/1) contains all 13 issues. Sprint 1 still needs actual teammate review and genuine team process entries under the course Definition of Done. See the [team review guide](docs/team-review.md).

- Frontend production build and lint pass locally.
- Backend: 77 mocked tests pass, including save/index failure, authorization and local-provider output validation.
- Tracked SQL passes fresh/replay and legacy-overload acceptance checks, with vector in either public or extensions. The existing Supabase project is ACTIVE_HEALTHY; all five table reads and the vector RPC now pass using the backend configuration.
- PR CI passes backend tests, frontend lint/build and real Postgres/pgvector migration acceptance. [Latest code check before hosting evidence](https://github.com/Ikeee-AI/TekaTech/actions/runs/38172679951) passed at `a9d9bc3`.
- Main branch protection is unavailable for this private repository on its current plan (GitHub returned 403 requiring Pro or public visibility). Follow the review/check gates manually. The owner requested PR #15's merge after passing checks; that authorization does not count as another teammate's review.
- [Public frontend](https://tekatech-web.onrender.com) (Render) and [API health](https://tekatech-api-production-549b48c9.up.railway.app/health) (Railway since 12 Nov 2026, [plan](docs/devops/railway-migration-plan.md)) are live. Until then both ran on free Render services. Successful [main pipeline 38174257006](https://github.com/Ikeee-AI/TekaTech/actions/runs/38174257006) deployed merge commit `53f62e9` to both services. Exact version, database read, production CORS and direct `/login` checks passed. See [main deployment evidence](docs/evidence/sprint1-main-deployment.json); initial provisioning is recorded separately.
- Supabase migrations are applied and verified; existing query history remains intact. An obsolete vector RPC overload was reconciled. See [database evidence](docs/evidence/supabase-sprint-1.json).
- Temporary Sprint 1 AI connectivity: a real backend call to local Ollama `qwen3:8b` succeeded and its JSON output was validated. [Evidence](docs/evidence/local-llm-sprint-1.json). This verifies the local provider, not the full RAG feature. The `credit_balance_exhausted` blocker was cleared on 22 October 2026: a real local OpenAI embeddings call against TekaTech-dev passed ([evidence](docs/evidence/openai-local-2026-10-22.json)). The same evening the production key was rotated and the live site returned a grounded answer with `[1]` citations ([evidence](docs/evidence/openai-production-2026-10-22.md)).

See [Sprint 1 evidence and remaining work](docs/sprint-1.md), [backlog](docs/backlog.md), [pipeline](PIPELINE.md), and [deploy/rollback runbook](docs/deploy-runbook.md).

## Stack and choices

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19, Vite, Tailwind | Existing responsive screens and straightforward static deployment |
| API | Python 3.12+, FastAPI | Typed request validation, testable REST endpoints and Python AI libraries |
| Database/auth | Supabase Postgres, pgvector, Supabase Auth | Relational data, vector retrieval and managed auth in the existing project |
| AI | OpenAI embeddings + gpt-5-mini | Existing cited RAG flow; unit tests mock provider calls |
| CI/CD | GitHub Actions | PR checks, parallel jobs, dependency caches and deployment gates |
| Hosting | Railway API (Hobby, since 12 Nov 2026) + Render static frontend; database stays in Supabase | Railway removes the free-tier cold start (42.7 s measured on Render); CI deploys the exact tested SHA to both |

All data and AI calls go through FastAPI. The browser talks to Supabase for authentication only. Backend service-role credentials bypass RLS, so FastAPI authorization remains essential.

## Run locally

Checked from a fresh clone on Windows 10 on 29 Oct and again on 5 Nov 2026 ([evidence](docs/evidence/fresh-checkout-2026-11-05.md)). First setup takes about 5 minutes, most of it installing uv, `npm ci` and the Playwright browser.

**Prerequisites**
- Git and Node.js **22.22.2+ or 24.15+**. Slightly older 22.x/24.x versions still work, but `npm ci` prints `EBADENGINE` warnings for two test-only packages.
- [uv](https://docs.astral.sh/uv/getting-started/installation/). On Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`, then open a new terminal.
- Python 3.12+. You don't have to install it yourself: `uv sync` finds or downloads a matching Python, even if the system one is older (the check machine had 3.11).
- The **TekaTech-dev** values for both `.env` files, from Ikeee-AI. Never put production keys in a local `.env`.

**1. Clone**

```powershell
git clone https://github.com/Ikeee-AI/TekaTech.git
cd TekaTech
```

**2. Backend** (first terminal):

```powershell
cd backend
Copy-Item .env.example .env   # first setup only; then fill in the TekaTech-dev values
uv sync --frozen
uv run uvicorn main:app --reload
```

`backend/.env` needs `openai_api_key`, `supabase_url`, `supabase_key` (the `sb_secret_` service-role key) and `cors_origins`. Leave `failure_simulation_enabled` unset unless you are running the failure drill.

**3. Frontend** (second terminal):

```powershell
cd frontend
Copy-Item .env.example .env   # first setup only; use the sb_publishable_ key, never the secret one
npm ci
npm run dev -- --port 5173 --strictPort
```

**4. Check it works**
- http://127.0.0.1:8000/health/ready → `{"status":"ok","database":"ok",…}`, which means the backend reached Supabase.
- http://localhost:5173 → the catalog. On TekaTech-dev you should see the seeded gadgets; an empty catalog is normal for a new database (seed it below).
- Open **iPhone 15** and click the suggested question **"What chip does it use?"**. A cited answer ("A16 Bionic [1]") proves the OpenAI key and retrieval work. It costs well under one cent.
- API reference: http://127.0.0.1:8000/docs.

The first visit to each page can show "Loading page…" for a few seconds while Vite compiles it; later visits are instant.

**If something fails**
- *CORS error in the browser console:* the frontend's address (e.g. `http://localhost:5173`) must be in backend `cors_origins`. `--strictPort` stops Vite from silently moving to another port.
- *Changed `frontend/.env` but nothing changed:* `VITE_*` values are compiled in. Restart `npm run dev`.
- *`/health/ready` fails, or DNS / Cloudflare 521 errors:* the Supabase project may be paused. Resume it and wait a few minutes.
- *`uv` is not recognized:* open a new terminal after installing it.

### Sample data for TekaTech-dev

Seed the dev project so the catalog, AI answers and reviews have something to work with. The script refuses to run unless `backend/.env` points at TekaTech-dev, and is safe to rerun.

```powershell
cd backend
uv run python scripts/seed_dev.py                # 7 sample gadgets
uv run python scripts/seed_dev.py --with-specs   # also loads and indexes the verified iPhone 15 / Galaxy S24 specs (small OpenAI cost)
```

Ask questions the specs can answer, for example "What chip does it use?" on the iPhone 15 page.

To test the correction Review Queue you need an admin account on **TekaTech-dev only**. A teammate with the dev service-role key sets `app_metadata.is_admin` with the `update_user_by_id` call shown in `CLAUDE.md`; then sign out and back in.

### Failure drill

To see the app recover from request failures without a real outage, follow the steps and screenshots in [docs/pr-proof-s3](docs/pr-proof-s3/README.md): stop the backend mid-use, or start it with an invalid OpenAI key for that terminal only (`$env:OPENAI_API_KEY="sk-invalid"` before `uv run uvicorn main:app`). Every failure should show a clear message with **Try Again**, and keep what you typed.

## Database setup

Schema and RPC SQL are now tracked under `backend/sql/`. Apply the ordered files manually in Supabase SQL Editor; nothing silently migrates production. For existing data, inspect compatibility first. See [database model and setup](docs/database.md).

## Checks

The same checks CI runs on every PR. None of them call Supabase or OpenAI.

```powershell
cd backend
python ../scripts/check_secrets.py   # fails on committed .env files or key-shaped strings
uv run --frozen pytest
```

```powershell
cd frontend
npm run lint
npm test                             # Vitest unit tests
npm run build
npx playwright install chromium      # first time, and again after Playwright is updated
npm run test:e2e                     # failure-drill browser checks on a faked API (frontend/e2e/README.md)
```

Optional live check against your configured database (`--ai` makes ONE small billed request):

```powershell
cd backend
uv run python scripts/sprint1_check.py --ai --api-base http://127.0.0.1:8000 --output ../.local/sprint1-live-check.json
```

CI's separate database job applies the SQL to scratch PostgreSQL/pgvector and rolls test fixture writes back. The Sprint 1 Ollama probe is kept only as historical evidence; see `backend/README.md`.

## Branch and review strategy

- `main` represents reviewed, deployed work. Bootstrap it with an empty initial commit only; application changes stay on feature branches.
- Use one branch per issue, such as `tekatech/TTK-09-pr-pipeline`. Open a PR referencing the issue. Branch names describe the project; commit authorship and actual teammate reviews remain recorded in GitHub.
- Require at least one **other teammate's** approval and `Backend tests`, `Frontend lint and build`, and `Database migrations` checks before merge. Dismiss stale reviews, block force pushes, and avoid direct application commits to main.
- Squash merge after review, then the main pipeline deploys the exact tested commit. Do not enable manual deployment approval if the class expects automatic deployment on every merge.
- An item is Done only after reviewed merge, passing CI, deployment and a live check. Local passes are evidence of readiness, not Done.

## Product scope and limits

Gadget CRUD, manual sourced-spec entry, optional AI indexing, grounded Q&A, comparisons/share links, corrections and admin review already have implementations. Broad live acceptance and AI failure hardening remain backlog work. Automated scraping and PDF extraction are outside the current scope. Spec snippets remain untrusted data in the AI prompt; keep the prompt's injection safeguards and its citation/format contract with the renderer.
