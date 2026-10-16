# TekaTech: Claude handoff

Prepared 15 October 2026 for the next working session. This is project context and a plan, not proof that planned tasks are complete.

## Start in the correct project

The user explicitly selected **C:\Users\ivana\Desktop\TekaTech**. Work in this Desktop copy. Do not switch to, overwrite it from, or synchronize it with a copy under Documents/Codex unless the user asks. Read the root CLAUDE.md and AGENTS.md, this file, and the relevant linked plan before editing.

- Repository identity from project documentation: https://github.com/Ikeee-AI/TekaTech
- Branch reported during handoff inspection: `tekatech/sprint-1-team-review`.
- Some Git status calls in the handoff executor failed with “must be run in a work tree”, although a separate rev-parse reported the Desktop root as a work tree. Recheck Git normally in your environment before changing branches or committing. Do not infer that the checkout is clean, delete .git, reset files, or re-clone over this folder.
- Inspect local changes first and preserve them. The docs in this package do not authorize commits, pushes, deployments, purchases or production database changes.
- Treat older README statements about only two team members as historical. The five-person roster below is the user's current assignment. Update outdated summaries in a separate reviewed documentation change when requested.

## Product and architecture

TekaTech helps shoppers understand and compare gadget specifications. It stores sourced specifications, retrieves relevant evidence and produces answers with numbered clickable citations. Main features include gadget CRUD, saved specifications and indexing, questions, gadget comparisons, saved comparison links, corrections and statistics.

The Desktop source contains React 19 / Vite / Tailwind frontend and Python 3.12+ / FastAPI backend. Supabase supplies PostgreSQL, pgvector and authentication. GitHub Actions performs checks and requests Render deployment. These are inspected source choices, not a fresh claim about production health.

Data flow: browser → FastAPI → database / AI provider → validated answer and sources → browser. Browser Supabase access is for authentication only. Backend service-role credentials bypass RLS; route-level authentication and authorization are essential. Admin status uses `app_metadata.is_admin`, not user-editable metadata.

**OpenAI is the project's only AI provider.** The optional Ollama local mode was dropped by the project owner on 16 October 2026; only the historical Sprint 1 connectivity probe in `backend/scripts/sprint1_check.py` remains. Do not remove OpenAI, silently fall back to paid calls, use a laptop loopback URL from cloud hosting, or report local-model success as deployed OpenAI acceptance. Recheck current provider configuration without printing secret values.

Important technical constraints retained from the repository:

- Saving specifications is independent of AI indexing; an AI outage must not lose saved text.
- Prompt format and frontend citation rendering are coupled. Preserve numbered citations and supported formatting unless both ends change together.
- SQL lives in `backend/sql/`; production migrations are manually coordinated, not automatically applied by app startup or deployment. CI uses a disposable database.
- Preserve source trust boundaries: retrieved spec text is untrusted input, not instructions.
- Rate limiting in memory is per process. Do not silently replace configured shared storage with an in-memory fallback.
- Frontend `VITE_*` configuration is baked into the build; backend CORS must match the actual frontend origin.
- Unit tests mock database/model calls. Real provider checks must be deliberate, bounded and reported separately.

## Team and exclusive responsibilities

| Member | Role | Owns | Handoff |
| --- | --- | --- | --- |
| Ikeee-AI / project owner | Sole DevOps Engineer; planned weekly product-owner duty | CI/CD, hosting, environments/secrets, quality gates, delivery metrics, release/rollback, incidents and board coordination | Integrates reviewed work, deploys through CI and collects evidence |
| Adrian | Developer — AI Developer | Versioned prompts, answer/grounding/citation behavior, evaluation datasets, executable evaluator/scoring and AI quality reports | Gives prompt/eval contract to Manuel, then scores integrated outputs |
| Mika | Developer — Frontend Engineer | Presentation, layouts, responsive styling, accessibility, visual components, citation rendering and final slide-deck assembly | Supplies components/states to Jopher and verifies presentation |
| Manuel Mirasol (`s2302827-byte`) | Developer — Backend Engineer / AI Engineer | API contracts, shared auth, schema/migrations, model adapters, retrieval/indexing, output parsing/validation and backend failures | Supplies contracts to Jopher and runtime/evaluation adapter to Adrian |
| Jopher | Developer — Backend / Frontend Developer | Feature endpoints/business workflows, CRUD/spec/correction/comparison journeys, API wiring, forms, state and integration tests | Uses Manuel's foundations and Mika's UI; supplies complete browser journeys |

No duplicate primary ownership. One implementation owner per one- or two-day issue and one branch per issue. Shared files need one editor per PR; specialists provide requirements/review. AI review does not substitute for the course's teammate review. Usernames/access for Adrian, Mika and Jopher have not been verified in this handoff.

## Sprint plan and deadlines

The full assignment document is [sprints-2-to-5.md](sprints-2-to-5.md). It has 20 weekly owner work packages, explicit deliverables/acceptance, complementary handoffs, consultation preparation and all 21 final checklist items. All team deadlines are **Saturday 3:00 PM Asia/Manila, UTC+8**.

| Sprint | Deadline in 2026 | Deliverable focus |
| --- | --- | --- |
| 2 | October 17 | Core CRUD/spec workflows, API tests in CI, working relationships, real-provider readiness and automatic deployment |
| 3 | October 24 | Grounded AI end to end, executable evaluation, mocked model tests, safe failure behavior and measured pipeline improvement |
| 4 | October 31 | Tagged public release, complete documentation/submission evidence, measured optimization, rollback and live-deploy rehearsal |
| 5 | November 7 | Extra 48-hour operational pilot, fixes, stable release and maintenance handover |

Per-role weekly summary:

| Member | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 |
| --- | --- | --- | --- | --- |
| Adrian | Prompt assets, verified facts for two gadgets, 10 cases and initial evaluator | At least 20 cases, prompt-change evaluation and quality report | Release evaluation/write-up and AI presentation | Pilot analysis, five new regression cases and prompt handover |
| Mika | Responsive CRUD/detail/form states | Answer/comparison/citation states and deck draft | UI/accessibility audit, final deck and visible-change rehearsal | Pilot usability fixes and component documentation |
| Manuel | API/auth/schema contract and genuine OpenAI connection check | Retrieval/output processing, mocked tests and failure simulator | Security/reliability hardening, architecture/schema/API docs and failure drills | Backend/provider fixes and troubleshooting handover |
| Jopher | CRUD/spec integration, API tests and local seed/setup | Ask/compare/share/correction integration and recovery states | Fresh-checkout/user acceptance and production user demo | Workflow regressions, user guide and setup recheck |
| Ikeee-AI | Access/review/CI checks, environment plan and metrics baseline | Prompt-eval workflow, bounded smoke job, environment isolation and optimization | Release, full-history secret scan, completed evidence and rollback/deploy challenge | Monitored pilot, incident response and stable release |

The course has four assessed sprints. Sprint 5 is extra team stabilization, not an extension of the instructor's freeze. Consultations, freeze and Demo Day calendar dates still need instructor confirmation; use the earlier actual deadline if it precedes this plan.

## Course requirements and evidence

Authority for course requirements: https://csp221a.vercel.app/ . The complete local plan includes source links and a 21-item submission manifest.

Seven acceptance areas: persistent real CRUD; meaningful AI; backend-owned AI/data access; real UI/backend integration; meaningful relationships between at least two tables; complete examples and per-environment secrets with clean repository history; graceful model/request failures. Backend must validate, transform, store or otherwise act on AI output. A pass-through chatbot is insufficient.

Each weekly consultation uses 15 minutes: 4 deployed demo, 3 board, 3 DevOps report, 2 risk/next sprint, 3 questions. Preserve 2–3 async standups/week, written retros, small reviewed PRs and honest attribution. Every member should explain their own code, including AI-assisted code.

Done = reviewed PR, passed checks, merged, deployed and checked in the deployed environment. A code file or local passing test alone does not prove deployed completion. Never fabricate earlier standups, approvals, authorship or metrics.

Final presentation: 20 minutes plus 10 minutes questions. Rehearse a small visible change → reviewed PR → merge → automated deploy within the session. Be able to demonstrate malformed request handling, controlled model failure and production rollback. Submitted artifacts must be tied to the frozen release.

## What already exists in the Desktop source

Inspected during this handoff:

- `.github/workflows/ci.yml`: PR, main-push and manual-check triggers; parallel backend/frontend/database jobs; dependency caches and outdated PR cancellation.
- Backend job: tracked-file secret check, locked dependency sync, compilation, mocked pytest suite and app import check.
- Frontend job: locked npm install, ESLint, production build and short-retention artifact.
- Database job: disposable PostgreSQL/pgvector, migrations replayed and compatibility/behavior tests.
- Main deployment depends on all three jobs, requests Render deployment for the tested revision and runs deployed smoke checks.
- `scripts/check_secrets.py` and `scripts/deployed_smoke.py` already exist. Reuse them. A tracked-file scanner does not by itself establish clean full Git history.
- `PIPELINE.md`, `docs/deploy-runbook.md`, `docs/database.md`, `docs/devops/metrics.md`, `optimizations.md` and `incidents.md` exist.
- Root `CLAUDE.md` already contained technical instructions; this handoff preserves them.
- Desktop README still contains an older two-member roster and historical test counts/status. Those are not the final team lineup or current verification results.

Not established by this handoff: current CI results, production deployment SHA/health, actual API credit, updated branch protection, teammate access or fresh test pass counts. Historical README records an OpenAI credit blocker and unavailable private-repository branch protection; reverify rather than treating either as permanently true. A manual review rule is not enforced protection.

Historical URLs from the Desktop README, not re-probed here:

- Frontend: https://tekatech-web.onrender.com
- API health: https://tekatech-api.onrender.com/health

## First DevOps work session

1. Verify the Desktop path, Git state/branch and available tools. Read existing workflow/runbook and this sprint's work package. Keep credentials out of outputs.
2. Confirm teammate review/access and the earliest instructor consultation/freeze date. Identify actual remaining Sprint 2 blockers before adding optional tools.
3. Run the existing checks; inspect CI evidence. Do not rebuild working CI from scratch or run destructive production tests.
4. Prioritize free additions: actionlint workflow checks, Gitleaks CLI history scanning, Dependabot update PRs and a delivery-metrics report using GitHub CLI. See [free-automation-tools.md](devops/free-automation-tools.md).
5. Give each change a small issue/PR, pin third-party CI tool versions, test it and collect comparable measurements. Keep dependency updates reviewed rather than automatically merging them.
6. Update PIPELINE.md and the actual existing metric/optimization/incident logs. Use N/A plus reason when evidence is unavailable; preserve raw run links/timestamps.
7. Stop at a reviewable local result unless the user has authorized the next external action. No new spending, broadened access, leaked secrets or production-data mutations are implied by this handoff.

Weekly metrics: average PR pipeline duration, main duration, pipeline success numerator/denominator, production deploy count, merge-to-live lead time, failed deploy count, recovery time and optimization/change made. Application latency is separate. No need for a paid monitoring stack to begin collecting these.

## Commands for the Desktop checkout

PowerShell, backend checks:

```powershell
Set-Location 'C:\Users\ivana\Desktop\TekaTech\backend'
uv sync --frozen --python 3.12
uv run --frozen pytest -q
```

Frontend checks:

```powershell
Set-Location 'C:\Users\ivana\Desktop\TekaTech\frontend'
npm ci
npm run lint
npm run build
```

Run locally in separate terminals after verifying existing environment files privately; do not overwrite them:

```powershell
Set-Location 'C:\Users\ivana\Desktop\TekaTech\backend'
uv run uvicorn main:app --reload
```

```powershell
Set-Location 'C:\Users\ivana\Desktop\TekaTech\frontend'
npm run dev -- --port 5173 --strictPort
```

Dependency installation may need network access. Read backend/frontend READMEs for variable names; never paste .env contents into the conversation. Don't assume copied virtual environments are portable; use uv to establish the Desktop project's environment.

## Prompt to start with Claude

“Work only in C:\Users\ivana\Desktop\TekaTech. Read CLAUDE.md, docs/claude-handoff.md, docs/sprints-2-to-5.md and docs/devops/free-automation-tools.md. I am Ikeee-AI, the sole DevOps Engineer. Inspect the existing Git state and CI first, then help me complete the next unfinished Sprint 2 DevOps task with free tools and measurable evidence. Preserve other members' ownership, existing changes and OpenAI as primary. Prepare tested, reviewable changes; do not claim deployment or reviews that did not occur.”

Claude Code reads root project guidance when launched in the project. If using Claude chat without local file access, attach this handoff and the sprint/tool guides; a pasted Windows path alone does not grant file access. Keep all secrets out of attachments. Reference: https://code.claude.com/docs/en/memory .
