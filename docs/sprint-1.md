# Sprint 1: foundation and walking skeleton

Plan recorded: 12 October 2026. Source: course Sprint 1 checklist and project requirements supplied by the team. DevOps Engineer: project owner (you), also doing full-stack development. Remaining developer roster and named product owner: pending.

## Consultation readiness

| Requirement | Evidence currently available | Remaining acceptance |
| --- | --- | --- |
| Repository/README/branch strategy/ignore/env examples | Private GitHub repository, pushed feature branch and draft PR #1 | Another teammate review and merge |
| Roles and backlog | Project owner declared as the single DevOps Engineer, with full-stack contribution; 13 hosted issues covering all seven requirements; four DevOps items assigned to Ikeee-AI | Other developers named/assigned; project board created |
| Schema migrated | Tracked baseline/RPC/grants; applied twice and acceptance passed in temporary PGlite and hosted Postgres/pgvector CI | Actual Supabase migration and verification |
| Frontend -> API -> database | Existing catalog calls backend `/gadgets`, whose route reads Supabase | Real database reachable and successful live browser request |
| CI on every PR | First GitHub PR run passed all three jobs (40 seconds) | Required statuses/review protection unavailable on current private-repo plan |
| Pipeline-triggered live deployment | Render blueprint, exact-commit deploy hooks and setup runbook | Accounts connected, hooks configured, passing merged pipeline and live URLs |
| One backend AI test | One real request attempted; HTTP 429 `credit_balance_exhausted` | Add credit and capture successful 1536-dimension embedding response |

Nothing is counted Done yet under the course Definition of Done. Hosted PR CI passed; teammate review, merge and production deployment remain pending.

## GitHub evidence on 12 October 2026

- Repository: [Ikeee-AI/TekaTech](https://github.com/Ikeee-AI/TekaTech), private. Main is the empty bootstrap; application code is on `codex/sprint-1`.
- [Draft PR #1](https://github.com/Ikeee-AI/TekaTech/pull/1): unmerged, review pending.
- [Initial CI run](https://github.com/Ikeee-AI/TekaTech/actions/runs/38167468464): success at `b82e068499a5920821842b52c67e5fd70d20673b`. Backend, frontend and database passed; PR deployment skipped by design.
- [13 issues](https://github.com/Ikeee-AI/TekaTech/issues), #2-14, open. DevOps items #7/10/11/13 assigned to Ikeee-AI.
- Branch protection: GitHub returned 403 requiring Pro or public visibility for this repository. No upgrade or visibility change made.
- Project board: current Git sign-in lacks Projects scope; in-app browser is signed out. Board creation pending.
- Machine-readable initial evidence: [github-sprint-1.json](evidence/github-sprint-1.json).

## Local verification on 12 October 2026

- Backend: 71 tests passed; provider/Supabase calls mocked.
- Frontend: ESLint passed; production build passed. Vite reports a non-blocking bundle-size warning (~523 kB main JavaScript before gzip).
- Backend source import/compilation check and package build passed locally; production starts FastAPI from the full repository, not the placeholder package entry point.
- SQL: all six ordered files apply twice; acceptance covers indexed-only/scoped retrieval, pending chunks, changed-content vector invalidation, atomic views, telemetry columns, service-role permissions, browser-role restrictions, RLS and deletion cascades.
- Live database: hostname DNS resolution failed (`11001`); no schema application or data modification attempted.
- Live AI provider: api.openai.com returned HTTP 429 `credit_balance_exhausted`; no successful embedding/index/query claim.
- Local secret scan: non-ignored working files passed the known-pattern/config-file guard; staged files and the bootstrap history also passed before commit. Ignored `.env` and account files stay excluded.

Machine-readable local provider/database evidence: ignored `.local/sprint1-live-check.json`. Keep secrets out of committed evidence. Temporary PGlite checks are local SQL validation, not proof of production or the Docker-based GitHub job.

## Planned review/demo

Next: create the board and finish team assignments, resolve branch-rule eligibility, apply/verify the real schema, configure Render, get the teammate review, merge after passing PR checks, and show the live catalog's database-backed request. Bring the live URL, board, reviewed PR, CI run, commit and updated metrics to the 15-minute consultation.

## Team standups (2-3 per week)

Add actual teammate updates; do not invent participation:

| Date / member | Finished | Next | Blocked by |
| --- | --- | --- | --- |
| Pending actual standup | | | |

## Review and retrospective

Consultation date: pending instructor schedule. Feedback: not yet received.

After the consultation, record: what went well, what did not, and one change for Sprint 2. Do not complete the retro before the review occurs.
