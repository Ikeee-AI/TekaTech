# TTK-03: Backend owns database and AI logic

Target: Sprint 1-2
Ownership area: Developer: backend. GitHub assignee (16 Oct 2026): Manuel Mirasol (`s2302827-byte`). Sprint 2–5 work-package owners: see `docs/sprints-2-to-5.md`.

## Acceptance criteria

- [ ] Frontend data and AI calls go through FastAPI; browser Supabase is used for auth only.
- [ ] Backend verifies access tokens; admin actions check app_metadata.is_admin.
- [ ] API reference and tests cover core routes; OpenAI/service-role keys stay backend-only.

## Definition of Done

- [ ] Reviewed by at least one other teammate and merged to main through a PR.
- [ ] Required CI checks passed.
- [ ] Deployed and checked in the deployed environment.
- [ ] Link the issue, PR, CI run, commit and live verification evidence.

Hosted issue: https://github.com/Ikeee-AI/TekaTech/issues/4

Current status: open backlog item; deployment and the course Definition of Done still require evidence.
