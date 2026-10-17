# TTK-09: PR quality gates and reviewed main branch

Target: Sprint 1
Ownership area: DevOps Engineer. GitHub assignee (16 Oct 2026): Ikeee-AI. Sprint 2–5 work-package owners: see `docs/sprints-2-to-5.md`.

## Acceptance criteria

- [ ] GitHub Actions installs dependencies, lints/builds frontend, tests/import-checks backend and tests migrations on every PR.
- [ ] main requires one other teammate review and the three CI check jobs; dismiss stale approvals.
- [ ] Keep provider calls mocked and no deployment secrets available to PR jobs.

## Definition of Done

- [ ] Reviewed by at least one other teammate and merged to main through a PR.
- [ ] Required CI checks passed.
- [ ] Deployed and checked in the deployed environment.
- [ ] Link the issue, PR, CI run, commit and live verification evidence.

Hosted issue: https://github.com/Ikeee-AI/TekaTech/issues/10

Current status: open backlog item; deployment and the course Definition of Done still require evidence.
