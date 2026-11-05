# Support, escalation and maintenance checklist

S5-IK handover (5 Nov 2026, Ikeee-AI). This is the one page to start from when something breaks or routine upkeep is due. It **links** the detailed guides instead of repeating them:

| Need | Guide |
| --- | --- |
| Deploy, verify, roll back, back up and restore, tag a release | [`deploy-runbook.md`](../deploy-runbook.md) |
| Diagnose a backend/provider error (symptom → cause → fix) | [`troubleshooting.md`](../troubleshooting.md) (Manuel) |
| How each user journey works and what to retest | [`feature-maintenance.md`](../feature-maintenance.md) (Jopher) |
| Prompts and evaluation | [`prompts/prompt-eval-handover.md`](../../prompts/prompt-eval-handover.md) |
| Pipeline, scheduled jobs, gates | [`PIPELINE.md`](../../PIPELINE.md) |
| Environments and configuration (names only) | [`environments.md`](environments.md) |
| Record an incident | [`incidents.md`](incidents.md) |

Operational ownership stays with **Ikeee-AI** (sole DevOps Engineer and repo admin).

## 1. Who to contact

Contact through **GitHub only**: open an issue (or comment on the PR) and mention the GitHub handle. Personal phone numbers and emails are deliberately not listed in this repository. An urgent production problem also goes to the team group chat, with a link to the issue.

| Area | Owner (GitHub) | Owns | Backup |
| --- | --- | --- | --- |
| Hosting, CI/CD, secrets, releases, rollback, incidents | **Ikeee-AI** (`Ikeee-AI`) | Render, GitHub Actions, Supabase projects, OpenAI account and balance | Manuel for a rollback by the runbook |
| Backend, auth, schema/SQL, provider, retrieval | Manuel Mirasol (`s2302827-byte`) | `backend/` foundations, `backend/sql/`, `troubleshooting.md` | Ikeee-AI |
| Feature workflows, forms, state, integration tests | Jopher (`s2100932`) | Gadget/spec/correction/compare journeys, quick-start | Manuel (backend side), Mika (UI side) |
| Frontend presentation and accessibility | Mika (`meka-moka`) | Layouts, components, citation display | Jopher |
| Prompts, grounding, evaluation | **Ikeee-AI** since 5 Nov 2026 (took over Adrian's S5-AD; Adrian `s2302756-cloud` inactive since 31 Oct) | `backend/prompts.py`, `prompts/`, `scripts/eval_*.py` | Manuel (evaluation adapter) |

Use the owner-area labels (`area:devops`, `area:backend`, `area:workflows`, `area:frontend`, `area:ai`) on issues, so the right person sees them. Only the PR author's teammates can approve a fix; nobody approves their own PR.

## 2. Severity and response

Same definitions as the sprint plan and [`pilot-plan.md`](pilot-plan.md). Response times are daytime, best-effort targets for a student team, not a service guarantee.

| Severity | Examples | First response | Fix path |
| --- | --- | --- | --- |
| **Critical** | Site or API down for 2+ consecutive checks after a warm-up; data loss or exposure; an authorization bypass | Ikeee-AI starts the incident within 30 min | If a deploy caused it: `rollback.yml` to the last good SHA ([runbook](../deploy-runbook.md#rollback)), then a reviewed revert PR. Entry in `incidents.md` |
| **High** | A required journey fails with no workaround (sign-in, ask, compare, specs, corrections, My Gadgets) | Same day | The area owner fixes it in a reviewed PR; entry in `incidents.md` |
| **Medium / low** | Wording, layout, slow but working, one bad catalog fact | Logged as an issue | Next normal PR |

Not incidents: a cold start of about 40–60 s on the free Render API after idle time; a paused or waking Supabase project (DNS failure, then 521, for a few minutes, see CLAUDE.md "Gotchas"); GitHub status lag during an Actions degradation (check githubstatus.com).

## 3. First 15 minutes of an incident

1. **Confirm it's real.** Open https://tekatech-web.onrender.com and `https://tekatech-api.onrender.com/health/ready`, and wait about 60 s for a cold start. Run the safe diagnostic in [`troubleshooting.md` §1](../troubleshooting.md) (no secrets, no writes, no AI calls).
2. **Check what changed.** The latest `main` run and deploy (`gh run list --branch main --limit 5`), and the commit production serves (`python scripts/deployed_smoke.py --api-url https://tekatech-api.onrender.com --frontend-url https://tekatech-web.onrender.com --commit <full sha>`).
3. **Check the providers.** Render, Supabase and OpenAI status pages; the OpenAI balance (prepaid, hard cap, auto-reload off).
4. **Decide.** If the last deploy caused it, roll back first and investigate after. Otherwise, route to the area owner (section 1).
5. **Record.** Use the `incident` skill or add an entry to `incidents.md`: detection time, impact, cause, fix, recovery time and a prevention step. The daily `ops-health.yml` opens an `incident` issue by itself when the production smoke check fails.

**Never during an incident:** paste secrets into issues or chat; reset or force-push `main`; drop tables to "roll back" the schema; restore into the live database without team approval; turn on `FAILURE_SIMULATION_ENABLED` outside the supervised drill.

## 4. Maintenance checklist

### Automatic (check that they ran)
| When (Manila) | Job | Look at |
| --- | --- | --- |
| Daily 08:00 | `ops-health.yml`, production smoke | No open `incident` issue; the run is green |
| Friday 08:30 | `ops-ai-smoke.yml`, one capped live OpenAI call (separate smoke key) | Green, or an `area:backend` issue opened for Manuel |
| Saturday 09:00 | `ops-weekly.yml`, delivery metrics and dependency audit | Metrics summary; the audit job fails on known vulnerabilities |

### Weekly (Ikeee-AI, about 15 min)
- [ ] Review Dependabot PRs and alerts (`gh api "repos/Ikeee-AI/TekaTech/dependabot/alerts?state=open"`). Merge updates only through reviewed PRs, never forced upgrades.
- [ ] Check the **OpenAI** remaining balance and spend against the prepaid cap.
- [ ] Check **GitHub Actions minutes** used this month (billing page). The October limit stopped CI on 31 Oct (`incidents.md`). Batch small doc changes into fewer PRs (owner rule since 5 Nov).
- [ ] Check that the **Supabase** live project is active, not paused. Free projects pause after a period without activity; the daily smoke check reads the database.
- [ ] Record the week's metrics row with the `pipeline-metrics` skill.

### Monthly, or before any release
- [ ] Full-history secret scan (Gitleaks), plus `scripts/check_secrets.py`, `pip-audit` and `npm audit --omit=dev` (`security-scan` skill).
- [ ] Backup/restore rehearsal with `scripts/db_restore_rehearsal.py` (dev source; it refuses production). The script now exports **seven** tables, including `user_gadgets` and `user_questions`. The last recorded run (31 Oct) predates both, so re-run it and update the runbook's "six tables" text.
- [ ] Access review: repository collaborators (`gh api repos/Ikeee-AI/TekaTech/collaborators`), Render and Supabase team members. Remove anyone who no longer works on the project.
- [ ] Secret review: rotate any key that may have been exposed; confirm the production and smoke OpenAI keys are still separate.
- [ ] Re-run the AI evaluation on the dev database if prompts, retrieval or the catalog changed ([handover](../../prompts/prompt-eval-handover.md); about $0.02 per run, with owner approval).
- [ ] Catalog content: no broken image links or wrong facts (for example the Poco x7 Pro release date, #201).

### Before a change of a given kind
| Change | Do first |
| --- | --- |
| **SQL** in `backend/sql/` | Apply it by hand to the **live** project `lqswcmkzygqmnblaukco`, checking the ref in the SQL Editor URL, before merging. A "PRODUCTION" badge doesn't prove it's the live project (incident 3 Nov). Register the file in `assemble_sql.py` |
| **Prompt** | New version label and a dev evaluation run ([handover](../../prompts/prompt-eval-handover.md)); the prompt and `AnswerText.jsx` change together or not at all |
| **Environment variable** | Add it to the Render dashboard and to [`environments.md`](environments.md) (names only). Never put `FAILURE_SIMULATION_ENABLED` in `render.yaml` |
| **Release** | [`docs/releases/`](../releases/) record and checklist; the owner pushes the tag |

## 5. Services and accounts (names only, no values)

| Service | What runs there | Plan limits that matter |
| --- | --- | --- |
| GitHub `Ikeee-AI/TekaTech` (private) | Code, CI/CD, scheduled ops | Free plan: monthly Actions minutes; no enforced branch protection (manual gate plus the CI "Main guard") |
| Render `tekatech-web`, `tekatech-api` | Frontend and API, deployed from `main` by deploy hooks | Free: the API sleeps after about 15 min idle |
| Supabase live (`lqswcmkzygqmnblaukco`) and TekaTech-dev (`efdgguybkampozuvqjrz`) | PostgreSQL + pgvector + Auth | Free: no point-in-time recovery or scheduled backups; pauses when inactive |
| OpenAI | `gpt-5-mini` answers, `text-embedding-3-small` embeddings | Prepaid balance with a hard cap and auto-reload off; production key and smoke key are separate |

Secrets live only in the Render dashboard, GitHub Actions secrets and local `.env` files, which are never committed (`scripts/check_secrets.py` enforces this).
