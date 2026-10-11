# Product and course backlog

Source: the course requirements supplied on 12 October 2026 and the existing TekaTech scope. The seven mandatory final-product requirements map one-to-one to TTK-01 through TTK-07. Product-specific pitch details beyond the existing gadget/spec/RAG scope still need team confirmation.

Issue bodies are ready in [issues/](issues/) and [backlog.json](backlog.json). They are **local drafts, not hosted GitHub issues**. After connecting GitHub, create each as an issue, add them to the project board, and assign named owners. Do not mark existing code Done until it meets the course Definition of Done.

| ID | Requirement / work item | Target | Current state |
| --- | --- | --- | --- |
| TTK-01 | Real gadget CRUD through API/UI | Sprint 2 | Code present; live acceptance pending |
| TTK-02 | Non-trivial RAG with backend output processing and evaluation | Sprint 3 | RAG/storage present; citation checks/evaluation pending |
| TTK-03 | Backend owns data and AI; auth at API | Sprint 1-2 | Code and mocked tests present; deployment pending |
| TTK-04 | Functional frontend with loading/empty/error states | Sprint 1-2 | Local lint/build pass; browser/live data verification pending |
| TTK-05 | Related tables, reproducible schema and migration | Sprint 1-2 | SQL and temporary-database checks pass; Supabase application pending |
| TTK-06 | Environment and secret management | Sprint 1-4 | Examples/ignore rules/config prepared; host setup pending |
| TTK-07 | Graceful AI/provider/request failure handling | Sprint 3-4 | Save/index behavior tested; query failure hardening pending |
| TTK-08 | Roles, product owner, board and backlog | Sprint 1 | Team names and hosted board/issues pending |
| TTK-09 | PR CI and protected reviewed main branch | Sprint 1 | Workflow prepared; hosted run/branch rules pending |
| TTK-10 | Pipeline-triggered live walking skeleton | Sprint 1 | Deployment blueprint/runbook prepared; accounts/live URL pending |
| TTK-11 | One successful real backend AI test | Sprint 1 | Attempted; provider returned credit_balance_exhausted |
| TTK-12 | Metrics, optimization and recovery evidence | Sprint 1-4 | Logs/runbook prepared; actual CI/deployment measurements pending |
| TTK-13 | Tagged release, documentation and Demo Day | Sprint 4 | Planned |

Sprint 1 priority: TTK-08/09/05/06/10/11, with the minimal catalog path from TTK-03/04. Keep other feature depth for later sprints.

Board columns: Backlog -> Ready -> In progress -> In review -> Deployed verification -> Done. Owners move items to Done only with a reviewed PR, passing checks, live deployment and verification evidence.
