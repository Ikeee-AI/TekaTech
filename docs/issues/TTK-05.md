# TTK-05: Relational database design and migration

Target: Sprint 1-2
Ownership area: Developer: database/backend. GitHub assignee (16 Oct 2026): Manuel Mirasol (`s2302827-byte`). Sprint 2–5 work-package owners: see `docs/sprints-2-to-5.md`.

## Acceptance criteria

- [x] Track and apply the five-table schema, foreign keys and vector-search RPC from repository SQL.
- [ ] Demonstrate gadget -> spec_documents -> spec_corrections relationships and deletion behavior.
- [x] Test pending versus indexed retrieval and invalidation of vectors after a correction.
- [x] Record the real Supabase migration and verify table/RPC compatibility before closing.

## Definition of Done

- [ ] Reviewed by at least one other teammate and merged to main through a PR.
- [ ] Required CI checks passed.
- [ ] Deployed and checked in the deployed environment.
- [ ] Link the issue, PR, CI run, commit and live verification evidence.

Current status: open GitHub backlog item. Initial implementation is proposed in #1; deployment and the course Definition of Done still require evidence.

## Verified database setup

The existing project is ACTIVE_HEALTHY. Migrations `20261011193804 sprint_1_foundation` and `20261011194244 reconcile_legacy_match_spec_documents` are applied. All five backend-configured table reads and the retrieval RPC pass; real FastAPI `/gadgets` returns 200 with the existing gadget. One gadget and six history rows remain intact.

The legacy five-column RPC was inspected, saved locally and checked for zero dependents before removing that exact obsolete overload. Scratch SQL checks cover both vector schemas, replay and legacy overload recovery. Live checks made no fixture writes or AI calls.

Evidence: [supabase-sprint-1.json](https://github.com/Ikeee-AI/TekaTech/blob/tekatech/sprint-1/docs/evidence/supabase-sprint-1.json). This issue stays open for reviewed merge, deployment and feature acceptance.
