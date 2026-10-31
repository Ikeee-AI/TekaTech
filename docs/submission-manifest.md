# Submission manifest: v1.0.0

The 21 final checklist items from the [course guide](https://csp221a.vercel.app/#deliverables), as assigned in [sprints-2-to-5.md](sprints-2-to-5.md#final-submission-manifest-all-21-website-checklist-items). Prepared by Ikeee-AI on 31 October 2026 for the frozen release [`v1.0.0`](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) (`5aa4635`). Status is what the repository shows on that date; anything not verified is marked open, not complete. Submitting to the course portal is a separate team action.

- **Repository:** https://github.com/Ikeee-AI/TekaTech (private; the instructor needs access)
- **Production:** https://tekatech-web.onrender.com · API https://tekatech-api.onrender.com/health (free Render tier; the first request after idle can take about a minute)

| # | Artifact | Owner | Where | Status |
| --- | --- | --- | --- | --- |
| 1 | Tagged production release on a free public host | Ikeee-AI | [Release v1.0.0](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0); [main run 41176164488](https://github.com/Ikeee-AI/TekaTech/actions/runs/41176164488); deployed smoke passed on `5aa4635` at 14:24 Manila | Ready |
| 2 | Frontend, backend and migration source | Jopher | `frontend/`, `backend/`, `backend/sql/`; clean-checkout build in [fresh-checkout-2026-10-29.md](evidence/fresh-checkout-2026-10-29.md); per-PR authorship in the release notes | Ready |
| 3 | Complete `.env.example` with no secret values | Ikeee-AI | [backend/.env.example](../backend/.env.example), [frontend/.env.example](../frontend/.env.example); secret guard and full-history Gitleaks clean (31 Oct) | Ready; each technical owner to confirm their keys are listed |
| 4 | Local seed data or setup script | Jopher | [backend/scripts/seed_dev.py](../backend/scripts/seed_dev.py); README "Sample data for TekaTech-dev" | Ready |
| 5 | README: product, roles, stack, setup | Ikeee-AI | [README.md](../README.md) (five-person roster, stack, setup rewritten in #155). Its "Sprint 1 status" section is historical | Ready, with stale Sprint 1 status section to trim later |
| 6 | Architecture diagram | Manuel | [docs/architecture.md](architecture.md) (Mermaid diagram, trade-offs, #161) | Ready |
| 7 | Schema diagram or outline | Manuel | [docs/database.md](database.md) (Mermaid ER diagram: gadgets → spec_documents → spec_corrections, the relationships the app uses) | Ready |
| 8 | API reference | Manuel | [backend/README.md](../backend/README.md) (updated in #159: routes, limits, headers, error bodies) | Ready |
| 9 | AI feature write-up and evaluation | Adrian | [docs/ai-feature-writeup.md](ai-feature-writeup.md); [prompts/](../prompts/); [eval-s4-2026-10-31.md](evidence/eval-s4-2026-10-31.md) (#166) | Ready; targets not met, stated in the write-up and release notes |
| 10 | Release changelog | Ikeee-AI | [Release v1.0.0 notes](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0): verification, migration notes, known limitations, every merged PR | Ready |
| 11 | Board with sprint history | Ikeee-AI | [TekaTech Sprint Board](https://github.com/users/Ikeee-AI/projects/1) (private): Sprint 1–4 issues and PRs; 44 Sprint 4 items added on 31 Oct with statuses matching GitHub (43 Done, #167 In review), follow-ups in #168 and #169 | Ready |
| 12 | Four plans, standups and four retrospectives | Ikeee-AI | Plans: [sprint-1.md](sprint-1.md), [sprints-2-to-5.md](sprints-2-to-5.md). Logs: [sprint-2](sprints/sprint-2/worklog.md), [sprint-3](sprints/sprint-3/worklog.md), [sprint-4](sprints/sprint-4/worklog.md). Standups: #60 (S2), #72 (S3). Retros: Sprint 1 in sprint-1.md, #61 (S2), #116 (S3) | **Open:** no Sprint 4 standup thread; Sprint 4 retro opened as #168 (comments pending); Sprint 3 retro is missing Adrian's and Manuel's comments |
| 13 | Scope-change log | Ikeee-AI | [docs/scope-changes.md](scope-changes.md) | Ready; instructor notification not recorded for any row |
| 14 | Slide deck | Mika | Not in the repository. A 9-slide consultation deck exists as a private Claude artifact (Sprint 4 log), not the final timed deck | **Open:** Mika to link the final deck |
| 15 | Repeatable AI failure simulation | Manuel | `FAILURE_SIMULATION_ENABLED` drill in [backend/README.md](../backend/README.md); [dev drill](evidence/failure-drill-dev-2026-10-28.md), [production drill](evidence/failure-drill-prod-2026-10-28.md); Playwright "Browser checks (failure drill)" job; malformed-request demo [docs/demo/malformed-request-demo.md](demo/malformed-request-demo.md) | Ready |
| 16 | Pipeline configuration files | Ikeee-AI | [.github/workflows/](../.github/workflows/) (`ci.yml`, `rollback.yml`, `release.yml`, ops jobs), all changed through reviewed PRs | Ready |
| 17 | PIPELINE.md and pipeline diagram | Ikeee-AI | [PIPELINE.md](../PIPELINE.md) (Mermaid diagram); [engineering-workflow.html](devops/engineering-workflow.html) | Ready |
| 18 | Completed metrics log | Ikeee-AI | [docs/devops/metrics.md](devops/metrics.md): Sprint 1–4 rows with source runs; [sprint4-metrics-final.json](evidence/sprint4-metrics-final.json) | Ready |
| 19 | Optimization log | Ikeee-AI | [docs/devops/optimizations.md](devops/optimizations.md); [app-performance.md](devops/app-performance.md) | Ready |
| 20 | Deployment and rollback runbook | Ikeee-AI | [docs/deploy-runbook.md](deploy-runbook.md); [rollback rehearsal](evidence/rollback-rehearsal-2026-10-31.md) (1 min 35 s); [database restore rehearsal](evidence/db-restore-2026-10-31.md) (14.0 s) | Ready |
| 21 | Incident log and postmortems | Ikeee-AI | [docs/devops/incidents.md](devops/incidents.md): process exceptions PE-1–PE-4 and findings; no production incident recorded in Sprints 2–4 | Ready |

## Disclosed gaps (not marked complete)

- **Enforced branch protection:** unavailable on this private GitHub Free repository; the merge gate is a manual check plus the CI "Main guard" job.
- **Staging environment:** not built for v1.0.0 ([environments.md](devops/environments.md) E2, #34).
- **Acceptance rows 19–20:** production password-reset email and data surviving a redeploy are not yet verified ([acceptance report](evidence/acceptance-s4-jo/README.md)).
- **AI quality targets:** not met in the 31 Oct evaluation (#166).
- **Open items above:** Sprint 4 standups/retro (12), final slide deck (14); tracked in #169.
