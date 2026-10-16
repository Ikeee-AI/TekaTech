# Free DevOps automation for TekaTech

Recommendation prepared 15 October 2026 against official sources and the Desktop project's existing CI. This is a shortlist and implementation plan: no tools were installed, no new schedule was activated, and no account settings were changed by creating it.

## Recommended starting set

Use **existing GitHub Actions + GitHub CLI**, then add **Dependabot, actionlint and the Gitleaks CLI**. These cover deployment automation, reporting, dependency maintenance and workflow/secret checks without adding an AI subscription or a separate orchestration server. AI assistants can help write and diagnose the automation; routine execution belongs in scripts/CI.

| Tool | Automates | Cost boundary | TekaTech fit / status |
| --- | --- | --- | --- |
| GitHub Actions | PR checks, gated main deployment, artifacts and scheduled checks | GitHub Free includes 2,000 standard-runner minutes/month and 500 MB artifact storage; private-repo use beyond included quotas can cost money. Prefer standard Linux runners and verify budget controls. | Already configured in `.github/workflows/ci.yml`; extend rather than duplicate. [Billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| GitHub CLI (`gh`) | Scripted run/PR/issue queries, metrics extraction and report inputs | Open-source CLI; GitHub account features and API limits still apply. | Found on PATH in this session; authentication not reverified. Use run timestamps/status to populate existing DevOps logs. [CLI](https://cli.github.com/) / [license](https://github.com/cli/cli/blob/trunk/LICENSE) |
| Dependabot | Reviewed dependency/security-update PRs | Security/version updates are included in GitHub Free; ordinary checks triggered by update PRs still use applicable CI resources. | Recommend configuring npm, supported Python/uv dependency updates and GitHub Actions updates; verify current ecosystem support before writing config. Config was not inspected as enabled. [GitHub plans](https://github.com/pricing) |
| actionlint | GitHub Actions syntax, expressions and workflow mistakes | MIT-licensed local CLI; CI execution uses runner quota. | Good first small DevOps PR. Add a pinned release to workflow validation. [Official repository](https://github.com/rhysd/actionlint) |
| Gitleaks CLI | Secret checks across Git history and files | MIT-licensed CLI. The separate branded GitHub Action has licensing conditions for organizations; use the standalone CLI for this free-tool recommendation. | Complements `scripts/check_secrets.py`; use full history and redact reports. Current project notes describe security-patch maintenance rather than new features. [CLI](https://github.com/gitleaks/gitleaks) / [Action conditions](https://github.com/marketplace/actions/gitleaks) |
| pip-audit + npm audit | Known vulnerable dependency reports | pip-audit is Apache-2.0; npm audit is available through npm. Network advisory/registry queries and CI quota still apply. | Export/audit resolved Python dependencies and frontend lockfile. Review fixes; don't run forced automatic upgrades. [pip-audit](https://github.com/pypa/pip-audit) / [npm audit](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/) |
| Uptime Kuma — optional later | HTTP health monitoring, uptime history and configured notifications | MIT software, self-hosted; hardware, power and hosting are not supplied free. A sleeping/off laptop cannot monitor. | Consider for Sprint 5 if an always-on machine exists; do not add hosting just to satisfy a tooling checklist. [Project](https://github.com/louislam/uptime-kuma) / [license](https://github.com/louislam/uptime-kuma/blob/master/LICENSE) |

Prefer existing `scripts/deployed_smoke.py` for release verification: uptime alone does not establish the correct commit, working database path or CORS. Do not consume model tokens to poll a basic health endpoint.

## Skills and agent integration for Claude

**Render's official skills/plugin** are the closest fit to this project. The vendor provides deployment, debugging and monitoring workflows for coding agents, with an official MCP connection for reading services/logs/metrics and supported management actions. Search for the official `render` plugin in Claude Code's marketplace and follow Render's current setup instructions. Connection/authentication must be established in Claude; the Codex connection is separate. [Official skills/plugins](https://render.com/docs/llm-support), [MCP setup](https://render.com/docs/mcp-server).

Useful task categories for your DevOps work:

- Deployment/debugging: diagnose failed builds, startup errors and health checks.
- Monitoring: inspect deployment state, logs and metrics before/after a release.
- Environment configuration: inventory missing variable names and validate separation without displaying secret values.
- Blueprint/CLI workflows: validate hosting configuration and perform reproducible operations when the team needs them.

The installed Codex catalog includes Render skills for these areas and enabled GitHub/Render plugins. That does not establish installed/authenticated plugins in Claude. Prefer GitHub CLI for portable scripted GitHub operations; additional MCP servers are optional, not necessary for the first useful automation.

**Free tools do not mean free AI usage.** Render service plans, model APIs and Claude's own subscription/API usage are separate. This guide recommends no purchase and does not claim Claude Code is a free unlimited DevOps agent. [Claude usage/cost guidance](https://code.claude.com/docs/en/costs). OpenAI is the app's only provider (the optional Ollama mode was dropped on 16 October 2026).

## Small implementation sequence for the DevOps owner

| Order | Change to prepare | Evidence / output | Sprint |
| --- | --- | --- | --- |
| 1 | Baseline existing CI and collect read-only GitHub run data | Real durations, status counts and run links in existing `docs/devops/metrics.md`; preserve unavailable data as N/A | 2 |
| 2 | Add pinned actionlint and redacted Gitleaks CLI checks | Reviewed PR, workflow check output, history-scan result; fix real issues before marking clean | 2–3 |
| 3 | Add conservative weekly dependency-update configuration | Bounded update PRs; teammate review and normal tests retained | 3 |
| 4 | Add deterministic metrics reporting and dependency audits | Machine-readable report plus short consultation summary; audited dependencies and reviewed fixes | 3 |
| 5 | Measure a specific CI optimization | Comparable before/after runs, sample sizes and unchanged quality coverage | 3–4 |
| 6 | Rehearse release and recovery | Tagged revision → checked production; rollback record and elapsed recovery time | 4 |
| 7 | Add monitoring only if an always-on host is available | Pilot observation log, incidents and demonstrated alerts | 5 |

These are implementation suggestions for the existing owner work packages, not extra promises to complete every tool this week. Finish core Sprint 2 acceptance first. Preserve human teammate review; do not auto-merge dependence updates or count an agent review as the required peer review.

## Safe initial read-only commands

After verifying GitHub CLI login privately and access to the intended repository:

```powershell
Set-Location 'C:\Users\ivana\Desktop\TekaTech'
gh run list --repo Ikeee-AI/TekaTech --limit 20
gh pr list --repo Ikeee-AI/TekaTech
gh issue list --repo Ikeee-AI/TekaTech
```

These list account data; they do not deploy or change assignments. Metrics automation should explicitly distinguish PR runs, main runs, cancelled runs and actual deployment verification. Do not equate a successful deployment-hook HTTP response with a successful release.

Keep retained artifacts small and short-lived, cancel superseded PR checks and avoid unnecessary polling. Public repository visibility is not a free-cost workaround to apply without the owner's explicit decision. Existing branch-protection limits must remain disclosed until resolved.
