# TTK-06: Environment and secrets management

Target: Sprint 1-4
Ownership area: DevOps Engineer. GitHub assignee (16 Oct 2026): Ikeee-AI. Sprint 2–5 work-package owners: see `docs/sprints-2-to-5.md`.

## Acceptance criteria

- [ ] README documents setup; both .env.example files cover all configuration.
- [ ] No real .env, account file or credentials in staged files or Git history.
- [ ] Production configuration is injected through Render; deploy hooks are repository-scoped GitHub Actions secrets used only by the main deploy job (environment secrets need a paid plan for this private repository — see PIPELINE.md).
- [ ] Document local/production separation and add isolated staging configuration before Sprint 3.

## Definition of Done

- [ ] Reviewed by at least one other teammate and merged to main through a PR.
- [ ] Required CI checks passed.
- [ ] Deployed and checked in the deployed environment.
- [ ] Link the issue, PR, CI run, commit and live verification evidence.

Hosted issue: https://github.com/Ikeee-AI/TekaTech/issues/7

Current status: open backlog item; deployment and the course Definition of Done still require evidence.
