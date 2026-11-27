# Submission manifest: Demo Day (code freeze, 27 Nov 2026)

Every required final deliverable, its owner and where it is. Updated by Ikeee-AI on 27 Nov 2026 for the code freeze and Demo Day, from the 31 Oct version made for the Sprint 4 submission `v1.0.0` (`5aa4635`). The original 21 items keep their numbers; 22–23 are new.

- **Repository:** https://github.com/Ikeee-AI/TekaTech (private; the panel needs access)
- **Production:** https://tekatech-web.onrender.com (Render) · API https://tekatech-api-production-549b48c9.up.railway.app/health (Railway since 12 Nov 2026) · Supabase database and auth
- **Final release:** [latest release](https://github.com/Ikeee-AI/TekaTech/releases/latest). `v1.2.0` (`f4ffb7f`, [record](releases/v1.2.0.md)) was tagged at the freeze; [v1.2.1](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.2.1) (`1e14562`, the #306 merge) contains the Deployment Challenge retake change (`0cc5c6a`, #308); `v1.2.2` adds only the flow diagrams (#309, docs) and is the final tag, so production runs the final tag.
- **Deployment Challenge recording:** [Deployment Challenge recording (Google Drive)](https://drive.google.com/drive/folders/1dYqhSuY-oSmRmcbd46ipTKLAM_A2rm2B?usp=sharing): PR [#308](https://github.com/Ikeee-AI/TekaTech/pull/308), 27 Nov 2026, about 7 min 50 s, one continuous take, every step done by hand

| # | Artifact | Owner | Where | Status |
| --- | --- | --- | --- | --- |
| 1 | Tagged production release on a free public host | Ikeee-AI | [Latest release](https://github.com/Ikeee-AI/TekaTech/releases/latest); [v1.2.0](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.2.0) on `f4ffb7f` (main run 45974615237, deployed smoke passed 27 Nov 09:34 UTC); earlier [v1.1.0](releases/v1.1.0.md), [v1.0.0](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) | Ready; final tag `v1.2.2` (27 Nov), on top of v1.2.1 (`1e14562`) |
| 2 | Frontend, backend and migration source | Jopher | `frontend/`, `backend/`, `backend/sql/`; clean-checkout build in [fresh-checkout-2026-10-29.md](evidence/fresh-checkout-2026-10-29.md); per-PR authorship in the release notes | Ready |
| 3 | Complete `.env.example` with no secret values | Ikeee-AI | [.env.example](../.env.example) (Docker), [backend/.env.example](../backend/.env.example), [frontend/.env.example](../frontend/.env.example); secret guard and full-history Gitleaks clean (318 commits, 27 Nov) | Ready |
| 4 | Local seed data or setup script | Jopher | [backend/scripts/seed_dev.py](../backend/scripts/seed_dev.py) (README "Sample data for TekaTech-dev"); [backend/scripts/mirror_catalog_to_dev.py](../backend/scripts/mirror_catalog_to_dev.py) copies the 23-phone catalog and benchmarks to DEV (#300) | Ready |
| 5 | README: product, roles, stack, setup | Ikeee-AI | [README.md](../README.md): "Demo Day submission" links, roster, stack, setup, Docker; its "Sprint 1 status" section is historical | Ready |
| 6 | Architecture diagram | Manuel | [docs/architecture.md](architecture.md) (Mermaid diagram, trade-offs, #161) | Ready |
| 7 | Schema diagram or outline | Manuel | [docs/database.md](database.md) (Mermaid ER diagram: gadgets → spec_documents → spec_corrections, the relationships the app uses) | Ready |
| 8 | API reference | Manuel | [backend/README.md](../backend/README.md) (updated in #159: routes, limits, headers, error bodies) | Ready |
| 9 | AI feature write-up and evaluation | Adrian, then Ikeee-AI (takeover since 5 Nov) | [docs/ai-feature-writeup.md](ai-feature-writeup.md); [prompts/](../prompts/) (prompt v4, `web-v2`, GK `gk-v2`/`gkf-v2`); [eval-s4-2026-10-31.md](evidence/eval-s4-2026-10-31.md) (#166); v4 eval 24 and 23 of 24 (#296); offline prompt evaluation runs in CI | Ready; v1.0.0 targets not met, stated in the write-up |
| 10 | Release changelog | Ikeee-AI | [CHANGELOG.md](../CHANGELOG.md) (v1.0.0 → v1.2.0); [docs/releases/](releases/) | Ready |
| 11 | Board with sprint history | Ikeee-AI | [TekaTech Sprint Board](https://github.com/users/Ikeee-AI/projects/1) (private): Sprint 1–5 issues and PRs; release issues #13 and #14 closed 27 Nov | Ready |
| 12 | Plans, standups and retrospectives | Ikeee-AI | Plans: [sprint-1.md](sprint-1.md), [sprints-2-to-5.md](sprints-2-to-5.md). Logs: [sprint-2](sprints/sprint-2/worklog.md), [sprint-3](sprints/sprint-3/worklog.md), [sprint-4](sprints/sprint-4/worklog.md), [sprint-5](sprints/sprint-5/worklog.md). Standups: #60 (S2), #72 (S3). Retros: Sprint 1 in sprint-1.md, #61 (S2), #116 (S3), #168 (S4), #238 (S5) | Ready; no Sprint 4 standup thread, and the Sprint 3 retro lacks Adrian's and Manuel's comments (stated, not filled in afterwards) |
| 13 | Scope-change log | Ikeee-AI | [docs/scope-changes.md](scope-changes.md) | Ready; instructor notification not recorded for any row |
| 14 | Slide deck | Mika | [Slide deck by Mika (Canva)](https://www.canva.com/design/DAHZj2xX9v0/lLzZPUYndMhR5bfU9OTZuQ/edit): draft at the freeze; the final version goes to the same link | Linked (draft; final at the same link) |
| 15 | Repeatable AI failure simulation | Manuel | `FAILURE_SIMULATION_ENABLED` drill in [backend/README.md](../backend/README.md); [dev drill](evidence/failure-drill-dev-2026-10-28.md), [production drill](evidence/failure-drill-prod-2026-10-28.md); Playwright "Browser checks (failure drill)" job; malformed-request demo [docs/demo/malformed-request-demo.md](demo/malformed-request-demo.md) | Ready |
| 16 | Pipeline configuration files | Ikeee-AI | [.github/workflows/](../.github/workflows/) (`ci.yml`, `rollback.yml`, `release.yml`, ops jobs), all changed through reviewed PRs | Ready |
| 17 | PIPELINE.md and pipeline diagram | Ikeee-AI | [PIPELINE.md](../PIPELINE.md) (Mermaid diagram); [engineering-workflow.html](devops/engineering-workflow.html) | Ready |
| 18 | Completed metrics log | Ikeee-AI | [docs/devops/metrics.md](devops/metrics.md): Sprint 1–4 rows and the freeze row (14–25 Nov) with source runs; [sprint4-metrics-final.json](evidence/sprint4-metrics-final.json), [freeze-metrics-2026-11-26.json](evidence/freeze-metrics-2026-11-26.json) | Ready |
| 19 | Optimization log | Ikeee-AI | [docs/devops/optimizations.md](devops/optimizations.md); [app-performance.md](devops/app-performance.md) | Ready |
| 20 | Deployment and rollback runbook | Ikeee-AI | [docs/deploy-runbook.md](deploy-runbook.md); rollback rehearsals [31 Oct](evidence/rollback-rehearsal-2026-10-31.md) (1 min 35 s) and [12 Nov on Railway](evidence/rollback-rehearsal-2026-11-12-railway.md) (1 min 17 s); [database restore rehearsal](evidence/db-restore-2026-10-31.md) (14.0 s) | Ready |
| 21 | Incident log and postmortems | Ikeee-AI | [docs/devops/incidents.md](devops/incidents.md): process exceptions PE-1–PE-4 and production incidents with timelines and recovery times, latest 27 Nov (failed Railway deploy, recovered in 24.6 min, #304) | Ready |
| 22 | Pre-recorded Deployment Challenge (continuous take) | Ikeee-AI | [Deployment Challenge recording (Google Drive)](https://drive.google.com/drive/folders/1dYqhSuY-oSmRmcbd46ipTKLAM_A2rm2B?usp=sharing): PR [#308](https://github.com/Ikeee-AI/TekaTech/pull/308), 27 Nov 2026, about 7 min 50 s, one continuous take, every step done by hand; also linked in [README.md](../README.md). Footer text change → PR → checks → teammate approval → merge → automatic deploy → verified on production | Ready |
| 23 | Docker setup for running the app locally (judges) | Ikeee-AI | [docs/docker.md](docker.md), [docker-compose.yml](../docker-compose.yml) (#300, #304); hands-on check 27 Nov | Ready |

## Deployment Challenge timeline (27 Nov 2026, PR #308)

| Stage | Manila time | Minutes from start |
| --- | --- | --- |
| Recording started; production footer "a student project · Demo Day release", `/version` `8a02749` | 21:38:30 | 0.0 |
| Commit `7c30faf` (footer and its unit test) | 21:40:02 | 1.5 |
| Pushed, PR #308 opened | 21:40:46 | 2.3 |
| Six PR checks green (backend, frontend, browser failure drill, database, PR policy, labels) | 21:41:55 | 3.4 |
| Approved by Manuel (`s2302827-byte`) on the head commit | 21:42:08 | 3.6 |
| Squash-merged as `0cc5c6a` | 21:43:44 | 5.2 |
| [Main run 46009607078](https://github.com/Ikeee-AI/TekaTech/actions/runs/46009607078): Main guard, Render trigger, Railway deploy, deployed smoke (commit, 23 gadgets, CORS) passed | 21:45:42 | 7.2 |
| `/version` = `0cc5c6a`; FAQ footer "a student project · Demo Day 2026"; recording stopped | 21:46:21 | 7.9 |

About 6 minutes from commit to verified production (target 30; the 31 Oct rehearsal took 122.6 min, almost all waiting for review). Every step in this take was done by hand by Ikeee-AI. An earlier take the same day (PR [#307](https://github.com/Ikeee-AI/TekaTech/pull/307), 18:24, about 5 min) had its steps run by Claude Code; it is kept as a record, not submitted.

## Disclosed gaps (not marked complete)

- **Enforced branch protection:** unavailable on this private GitHub Free repository; the merge gate is a manual check plus the CI "Main guard" job.
- **Staging environment:** none; #34 closed as not planned (25 Nov). Mitigations in [environments.md](devops/environments.md) (E2): DEV project, PR CI, deployed smoke, rollback.
- **Acceptance rows 19–20** ([acceptance report](evidence/acceptance-s4-jo/README.md)): data surviving a redeploy is shown by the 27 Nov checks (six production deploys that day; the 23-phone catalog and a member account created 26 Oct were intact afterwards). Password-reset email was fixed on 14 Nov (#265, Brevo SMTP) but was not re-tested at the freeze.
- **AI quality targets:** not met in the 31 Oct evaluation (#166); later prompt versions improved the eval set (v4: 24 and 23 of 24).
- **Open items above:** Sprint 4 standup thread and missing Sprint 3 retro comments (12); slide deck is a draft at the freeze (14).
