# TekaTech

An AI subject project that helps shoppers understand and compare gadget specifications. The app stores sourced specs, retrieves relevant chunks with pgvector, and generates answers with clickable citations. Specs can be saved before AI indexing, so provider outages do not prevent catalog work.

## Team and responsibilities

The project owner (you) is the **one DevOps Engineer** and also contributes full-stack application code, as allowed by the course. Every other team member is a Developer. Add actual submission names before the first consultation; the remaining roster is pending.

| Member | Course role | Ownership |
| --- | --- | --- |
| Project owner (you) | DevOps Engineer (exactly one) | CI/CD, environments/secrets, quality gates, metrics, releases/rollback; additional full-stack development |
| Pending team roster | Developer(s) | Frontend, backend/API, database and AI features; divide areas among named developers |

Sprint 1 product owner: pending team confirmation. Every member reviews another teammate's PRs. Record any approved mid-project role change in the sprint log and notify the instructor.

## Sprint 1 status

Local foundation is prepared; Sprint 1 is **not done under the course Definition of Done** until reviewed PRs pass hosted CI, are merged, deployed and checked on the live site.

- Frontend production build and lint pass locally.
- Backend: 71 mocked tests pass, including save/index failure and authorization behavior.
- Tracked SQL applies twice and passes behavior/access checks in a temporary PGlite/pgvector database. Production migration remains unverified.
- PR CI, pipeline-triggered Render deployment configuration and 13 issue drafts are in the repository; GitHub runs/issues and hosting still require account connection.
- Current Supabase hostname fails DNS resolution. Resume/confirm the project in its dashboard before migration.
- The requested real AI test reached api.openai.com but returned HTTP 429, `credit_balance_exhausted`; a successful response still requires provider credit.

See [Sprint 1 evidence and remaining work](docs/sprint-1.md), [backlog](docs/backlog.md), [pipeline](PIPELINE.md), and [deploy/rollback runbook](docs/deploy-runbook.md).

## Stack and choices

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19, Vite, Tailwind | Existing responsive screens and straightforward static deployment |
| API | Python 3.12+, FastAPI | Typed request validation, testable REST endpoints and Python AI libraries |
| Database/auth | Supabase Postgres, pgvector, Supabase Auth | Relational data, vector retrieval and managed auth in the existing project |
| AI | OpenAI embeddings + gpt-5-mini | Existing cited RAG flow; unit tests mock provider calls |
| CI/CD | GitHub Actions | PR checks, parallel jobs, dependency caches and deployment gates |
| Hosting | Render API + static frontend; database stays in Supabase | Repository-based deployment without container infrastructure |

All data and AI calls go through FastAPI. The browser talks to Supabase for authentication only. Backend service-role credentials bypass RLS, so FastAPI authorization remains essential.

## Run locally

Prerequisites: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node.js 22+, and an active configured Supabase project.

In one PowerShell terminal:

```powershell
cd backend
Copy-Item .env.example .env   # first setup only; fill in your own keys
uv sync --frozen
uv run uvicorn main:app --reload
```

In a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env   # first setup only; use the publishable key
npm ci
npm run dev -- --port 5173 --strictPort
```

Frontend: http://localhost:5173. Backend: http://127.0.0.1:8000. API reference: http://127.0.0.1:8000/docs. `/health` checks process liveness; `/gadgets` is the database-backed walking-skeleton endpoint. An empty list is valid for a new database.

Use the backend secret/service-role key only in `backend/.env`; the frontend uses the distinct publishable/anon key. `VITE_API_BASE_URL` is compiled into the frontend. Its browser origin must appear in backend `cors_origins`.

## Database setup

Schema and RPC SQL are now tracked under `backend/sql/`. Apply the ordered files manually in Supabase SQL Editor; nothing silently migrates production. For existing data, inspect compatibility first. See [database model and setup](docs/database.md).

## Checks

```powershell
cd backend
uv run --frozen pytest
# Optional live check: reads database; --ai makes ONE small billed request.
uv run python scripts/sprint1_check.py --ai --api-base http://127.0.0.1:8000 --output ../.local/sprint1-live-check.json
```

```powershell
cd frontend
npm run lint
npm run build
```

Normal CI uses fake Supabase and mocked OpenAI. Its separate database job applies SQL to scratch PostgreSQL/pgvector and rolls test fixture writes back.

## Branch and review strategy

- `main` represents reviewed, deployed work. Bootstrap it with an empty initial commit only; application changes stay on feature branches.
- Use one branch per issue, such as `codex/TTK-09-pr-pipeline` (teammates may use `feature/TTK-...`). Open a PR referencing the issue.
- Require at least one **other teammate's** approval and `Backend tests`, `Frontend lint and build`, and `Database migrations` checks before merge. Dismiss stale reviews, block force pushes, and avoid direct application commits to main.
- Squash merge after review, then the main pipeline deploys the exact tested commit. Do not enable manual deployment approval if the class expects automatic deployment on every merge.
- An item is Done only after reviewed merge, passing CI, deployment and a live check. Local passes are evidence of readiness, not Done.

## Product scope and limits

Gadget CRUD, manual sourced-spec entry, optional AI indexing, grounded Q&A, comparisons/share links, corrections and admin review already have implementations. Broad live acceptance and AI failure hardening remain backlog work. Automated scraping and PDF extraction are outside the current scope. Spec snippets remain untrusted data in the AI prompt; keep the prompt's injection safeguards and its citation/format contract with the renderer.
