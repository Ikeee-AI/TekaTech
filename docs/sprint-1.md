# Sprint 1: foundation and walking skeleton

Plan recorded: 12 October 2026. Source: course Sprint 1 checklist and project requirements supplied by the team. DevOps Engineer: project owner (you), also doing full-stack development. Remaining developer roster and named product owner: pending.

## Consultation readiness

| Requirement | Evidence currently available | Remaining acceptance |
| --- | --- | --- |
| Repository/README/branch strategy/ignore/env examples | Private GitHub repository, pushed feature branch and ready-for-review PR #15 | Another teammate review and merge |
| Roles and backlog | Project owner declared as the single DevOps Engineer, with full-stack contribution; 13 hosted issues covering all seven requirements; four DevOps items assigned to Ikeee-AI | Other developers named/assigned; project board created |
| Schema migrated | Two registered migrations on the existing ACTIVE_HEALTHY Supabase project; all five table checks and the retrieval RPC pass | Teammate review, merge and public deployment acceptance |
| Frontend -> API -> database | Local browser catalog displays the existing Rog Ally through real FastAPI/Supabase | Public hosting and successful public frontend browser request |
| CI on every PR | First GitHub PR run passed all three jobs (40 seconds) | Required statuses/review protection unavailable on current private-repo plan |
| Pipeline-triggered live deployment | Render blueprint, exact-commit deploy hooks and setup runbook | Accounts connected, hooks configured, passing merged pipeline and live URLs |
| One backend AI test | Temporary local Ollama `qwen3:8b` call passed; backend validated JSON | Application RAG remains OpenAI-backed and credit-blocked; public AI acceptance is separate |

Nothing is counted Done yet under the course Definition of Done. Hosted PR CI passed; teammate review, merge and production deployment remain pending.

## GitHub evidence on 12 October 2026

- Repository: [Ikeee-AI/TekaTech](https://github.com/Ikeee-AI/TekaTech), private. Main is the empty bootstrap; application code is on `tekatech/sprint-1`.
- [Ready-for-review PR #15](https://github.com/Ikeee-AI/TekaTech/pull/15): unmerged, teammate review pending. Original [PR #1](https://github.com/Ikeee-AI/TekaTech/pull/1) was closed by GitHub when its source branch was renamed; commits were preserved.
- [Initial CI run](https://github.com/Ikeee-AI/TekaTech/actions/runs/38167468464): success at `b82e068499a5920821842b52c67e5fd70d20673b`. Backend, frontend and database passed; PR deployment skipped by design.
- [13 issues](https://github.com/Ikeee-AI/TekaTech/issues), #2-14, open. DevOps items #7/10/11/13 assigned to Ikeee-AI.
- Branch protection: GitHub returned 403 requiring Pro or public visibility for this repository. No upgrade or visibility change made.
- Project board: current Git sign-in lacks Projects scope; in-app browser is signed out. Board creation pending.
- Machine-readable initial evidence: [github-sprint-1.json](evidence/github-sprint-1.json).

## Local verification on 12 October 2026

- Backend: 77 tests passed; provider/Supabase calls mocked, including local-provider completion/output validation.
- Frontend: ESLint passed; production build passed. Vite reports a non-blocking bundle-size warning (~523 kB main JavaScript before gzip).
- Backend source import/compilation check and package build passed locally; production starts FastAPI from the full repository, not the placeholder package entry point.
- SQL: all six ordered files apply twice; acceptance covers indexed-only/scoped retrieval, pending chunks, changed-content vector invalidation, atomic views, telemetry columns, service-role permissions, browser-role restrictions, RLS and deletion cascades.
- Earlier live database check failed DNS (`11001`). After restoration, Supabase is ACTIVE_HEALTHY. Two migrations are now registered and verified; read-only checks preserve the existing gadget and six history rows.
- OpenAI returned HTTP 429 `credit_balance_exhausted`; no successful embedding/index/query claim. A separate real local Ollama call now passes the temporary connectivity check; see the scope adjustment below.
- Local secret scan: non-ignored working files passed the known-pattern/config-file guard; staged files and the bootstrap history also passed before commit. Ignored `.env` and account files stay excluded.

Machine-readable local provider/database evidence: ignored `.local/sprint1-live-check.json`. Keep secrets out of committed evidence. Temporary PGlite checks are local SQL validation, not proof of production or the Docker-based GitHub job.

## Planned review/demo

Next: create the board and finish team assignments, resolve branch-rule eligibility, configure Render, get the teammate review, merge after passing PR checks, and show the live catalog's database-backed request. Bring the live URL, board, reviewed PR, CI run, commit and updated metrics to the 15-minute consultation.

## Temporary provider and branch adjustment

On 12 October 2026 the project owner requested the project-named `tekatech/sprint-1` branch and authorized free public Render hosting. The branch was renamed without rewriting commits. GitHub automatically closed #1; replacement #15 is ready for review rather than draft. Remaining teammates have no declared roles yet; none were fabricated. Render access/configuration and teammate review remain pending before the requested merge can safely trigger deployment.

The course allows the team to choose its AI provider. For the Sprint 1 connectivity check, reuse the already installed local Ollama `qwen3:8b` while OpenAI has exhausted its credit. Backend code made a real generation call, requested JSON and validated `{"project":"TekaTech","status":"ready"}`. It generated 19 tokens. All five live table reads and the retrieval RPC also passed in that probe; no database rows were written. [Recorded evidence](evidence/local-llm-sprint-1.json).

This is a temporary local connectivity test, not a completed RAG feature or successful OpenAI request. Application embeddings/chat still use OpenAI. A hosted backend cannot reach the laptop's loopback endpoint, and the local model is not provisioned on Render. Keep the local probe out of regular CI; its automated tests mock the provider and cover rejected/incomplete responses.

## Team standups (2-3 per week)

Add actual teammate updates; do not invent participation:

| Date / member | Finished | Next | Blocked by |
| --- | --- | --- | --- |
| Pending actual standup | | | |

## Review and retrospective

Consultation date: pending instructor schedule. Feedback: not yet received.

After the consultation, record: what went well, what did not, and one change for Sprint 2. Do not complete the retro before the review occurs.

## Supabase verification on 12 October 2026

The existing TekaTech project (`lqswcmkzygqmnblaukco`) is ACTIVE_HEALTHY. Registered migrations: `20261011193804 sprint_1_foundation` and `20261011194244 reconcile_legacy_match_spec_documents`.

- Backend-configured reads of all five core tables pass; the match RPC returns the expected empty result for an empty scope.
- FastAPI TestClient with real Supabase: `/health` 200; `/gadgets` 200 with one existing gadget; malformed gadget ID 422. This verifies the backend route, not a public deployment or browser session.
- All five core tables enable RLS. Backend CRUD and retrieval access are present; anon/authenticated cannot read them or execute the retrieval RPC directly. Existing gadget -> spec -> correction foreign keys cascade correctly by definition.
- Existing data counts remain one gadget, zero spec documents and six query-history rows. No fixture records or AI calls were used for live verification.
- SQL regression checks pass for fresh schemas, replay, old named-argument overloads and vector installed in either `public` or `extensions`.
- A restore timing issue was encountered: COMING_UP initially returned an empty catalog; the restored schema then appeared, including a legacy RPC overload. Its definition was saved locally and its lack of dependents verified before removing that exact obsolete signature. The five-column legacy RPC no longer conflicts with the six-column backend RPC.
- [Machine-readable evidence and advisor findings](evidence/supabase-sprint-1.json). Remaining security/performance findings are tracked for release hardening; no clean security-audit claim is made.
