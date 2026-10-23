# Product and course backlog

> **Update, 16 October 2026:** the ownership sentence below reflects the two-member Sprint 1 team. The five-person Sprint 2–5 work packages in `docs/sprints-2-to-5.md` now split this backlog into owner-specific subtasks; GitHub issue assignees have not yet been changed.

Source: the course requirements supplied on 12 October 2026 and the existing TekaTech scope. The seven mandatory final-product requirements map one-to-one to TTK-01 through TTK-07. Product-specific pitch details beyond the existing gadget/spec/RAG scope still need team confirmation.

All 13 [GitHub issues](https://github.com/Ikeee-AI/TekaTech/issues) are created (#2-14). [backlog.json](backlog.json) maps each TTK ID to its hosted issue; [issues/](issues/) keeps the acceptance text. The private [TekaTech Sprint Board](https://github.com/users/Ikeee-AI/projects/1) contains all 13 issues. Ikeee-AI owns frontend, product-owner planning and DevOps items (#5/7/9/10/11/13). Manuel Mirasol (`s2302827-byte`) owns backend/database/AI (#2/3/4/6/8/12); his six GitHub ownership assignments and repository/board Write access are verified. #14 remains a later team planning decision. See [team review and access guide](team-review.md). Do not mark existing code Done until it meets the course Definition of Done.

| ID | Requirement / work item | Target | Current state |
| --- | --- | --- | --- |
| TTK-01 | Real gadget CRUD through API/UI | Sprint 2 | Code present; live acceptance pending |
| TTK-02 | Non-trivial RAG with backend output processing and evaluation | Sprint 3 | RAG/storage present; citation checks/evaluation pending |
| TTK-03 | Backend owns data and AI; auth at API | Sprint 1-2 | Code and mocked tests present; deployed; broader feature acceptance pending |
| TTK-04 | Functional frontend with loading/empty/error states | Sprint 1-2 | Local lint/build pass; live catalog/login verified; broader UI acceptance pending |
| TTK-05 | Related tables, reproducible schema and migration | Sprint 1-2 | Supabase migrations/table/RPC checks pass; reviewed deploy and feature acceptance pending |
| TTK-06 | Environment and secret management | Sprint 1-4 | Examples/ignore rules/config prepared; host configuration and main deployment verified |
| TTK-07 | Graceful AI/provider/request failure handling | Sprint 3-4 | Save/index behavior tested; query failure hardening pending |
| TTK-08 | Roles, product owner, board and backlog | Sprint 1 | Two members and product owner declared; board created; assignments/access verified; real teammate review pending |
| TTK-09 | PR CI and protected reviewed main branch | Sprint 1 | First hosted CI passed; private-plan branch protection unavailable |
| TTK-10 | Pipeline-triggered live walking skeleton | Sprint 1 | Main pipeline deployed exact merge SHA; catalog/database/CORS passed; teammate review pending |
| TTK-11 | One successful real backend AI test | Sprint 1 | Temporary local Ollama call/JSON validation passed; OpenAI credit restored and a real local embeddings call passed on 22 Oct 2026 ([evidence](evidence/openai-local-2026-10-22.json)); production key rotated and a cited answer verified on the live site the same day ([evidence](evidence/openai-production-2026-10-22.md)) |
| TTK-12 | Metrics, optimization and recovery evidence | Sprint 1-4 | Logs/runbook prepared; First CI baseline recorded; main pipeline and lead time measured; recovery exercise pending |
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
