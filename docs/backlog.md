# Product and course backlog

Source: the course requirements supplied on 12 October 2026 and the existing TekaTech scope. The seven mandatory final-product requirements map one-to-one to TTK-01 through TTK-07. Product-specific pitch details beyond the existing gadget/spec/RAG scope still need team confirmation.

All 13 [GitHub issues](https://github.com/Ikeee-AI/TekaTech/issues) are created (#2-14). [backlog.json](backlog.json) maps each TTK ID to its hosted issue; [issues/](issues/) keeps the acceptance text. The four DevOps-owned items are assigned to Ikeee-AI. Other assignments and the project board remain pending. The current Git connection lacks Projects scope and the in-app browser is signed out. Do not mark existing code Done until it meets the course Definition of Done.

| ID | Requirement / work item | Target | Current state |
| --- | --- | --- | --- |
| TTK-01 | Real gadget CRUD through API/UI | Sprint 2 | Code present; live acceptance pending |
| TTK-02 | Non-trivial RAG with backend output processing and evaluation | Sprint 3 | RAG/storage present; citation checks/evaluation pending |
| TTK-03 | Backend owns data and AI; auth at API | Sprint 1-2 | Code and mocked tests present; deployment pending |
| TTK-04 | Functional frontend with loading/empty/error states | Sprint 1-2 | Local lint/build pass; browser/live data verification pending |
| TTK-05 | Related tables, reproducible schema and migration | Sprint 1-2 | SQL and temporary-database checks pass; Supabase application pending |
| TTK-06 | Environment and secret management | Sprint 1-4 | Examples/ignore rules/config prepared; host setup pending |
| TTK-07 | Graceful AI/provider/request failure handling | Sprint 3-4 | Save/index behavior tested; query failure hardening pending |
| TTK-08 | Roles, product owner, board and backlog | Sprint 1 | Issues created; team names and board pending |
| TTK-09 | PR CI and protected reviewed main branch | Sprint 1 | First hosted CI passed; private-plan branch protection unavailable |
| TTK-10 | Pipeline-triggered live walking skeleton | Sprint 1 | Deployment blueprint/runbook prepared; accounts/live URL pending |
| TTK-11 | One successful real backend AI test | Sprint 1 | Attempted; provider returned credit_balance_exhausted |
| TTK-12 | Metrics, optimization and recovery evidence | Sprint 1-4 | Logs/runbook prepared; First CI baseline recorded; deployment/recovery measurements pending |
| TTK-13 | Tagged release, documentation and Demo Day | Sprint 4 | Planned |

Sprint 1 priority: TTK-08/09/05/06/10/11, with the minimal catalog path from TTK-03/04. Keep other feature depth for later sprints.

Board columns: Backlog -> Ready -> In progress -> In review -> Deployed verification -> Done. Owners move items to Done only with a reviewed PR, passing checks, live deployment and verification evidence.

## Hosted issue mapping

- [TTK-01 (#2)](https://github.com/Ikeee-AI/TekaTech/issues/2) - CRUD on a real database
- [TTK-02 (#3)](https://github.com/Ikeee-AI/TekaTech/issues/3) - Non-trivial AI with backend output processing
- [TTK-03 (#4)](https://github.com/Ikeee-AI/TekaTech/issues/4) - Backend owns database and AI logic
- [TTK-04 (#5)](https://github.com/Ikeee-AI/TekaTech/issues/5) - Functional frontend wired to backend
- [TTK-05 (#6)](https://github.com/Ikeee-AI/TekaTech/issues/6) - Relational database design and migration
- [TTK-06 (#7)](https://github.com/Ikeee-AI/TekaTech/issues/7) - Environment and secrets management
- [TTK-07 (#8)](https://github.com/Ikeee-AI/TekaTech/issues/8) - Graceful AI and request errors
- [TTK-08 (#9)](https://github.com/Ikeee-AI/TekaTech/issues/9) - Declare roles and prioritize Sprint 1
- [TTK-09 (#10)](https://github.com/Ikeee-AI/TekaTech/issues/10) - PR quality gates and reviewed main branch
- [TTK-10 (#11)](https://github.com/Ikeee-AI/TekaTech/issues/11) - Pipeline-triggered walking skeleton on a live URL
- [TTK-11 (#12)](https://github.com/Ikeee-AI/TekaTech/issues/12) - One real backend AI-provider connectivity test
- [TTK-12 (#13)](https://github.com/Ikeee-AI/TekaTech/issues/13) - Pipeline metrics, optimization and recovery evidence
- [TTK-13 (#14)](https://github.com/Ikeee-AI/TekaTech/issues/14) - Release documentation and Demo Day
