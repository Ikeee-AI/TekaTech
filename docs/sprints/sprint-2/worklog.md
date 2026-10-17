# Sprint 2 work log (12–18 October 2026, due Saturday 17 October, 3:00 PM Asia/Manila)

Written with the `log-work` skill. Facts and evidence only; newest entry at the bottom.

## 2026-10-16 16:24 Asia/Manila — DevOps automation, agents/skills and Sprint 2 baseline
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S2-IK (TTK-12) · **Branch:** `tekatech/devops-agents-metrics`

**Done**
- Read all 31 project Markdown files and the CSP221A course site; confirmed Sprint 2 requirements and Consultation 2 checks (full CRUD via API+UI, API tests in pipeline, every merge auto-deploys). The site gives no consultation/freeze/Demo Day dates.
- Rebuilt `backend/.venv` from `uv.lock` (`uv sync --frozen --python 3.12`); packages now load from the Desktop checkout — evidence: local `pytest` 97 passed.
- Added `scripts/pipeline_metrics.py` (read-only metrics from GitHub Actions) with 2 mocked tests; added 6 project agents and 7 DevOps skills — commit `efa2e6b`, [PR #17](https://github.com/Ikeee-AI/TekaTech/pull/17), [PR CI run 38868906537](https://github.com/Ikeee-AI/TekaTech/actions/runs/38868906537): all three checks green; review requested from Manuel (`s2302827-byte`).
- Sprint 2 metrics snapshot (provisional) in `docs/devops/metrics.md`: PR avg 0.67 min (9 runs), main avg 2.12 min (2 runs), 11/11 successful, 2 deploys, merge-to-live avg 2.14 min, 0 failed deploys.
- Production smoke passed for `68b4c5a` at 2026-10-16T06:51:54Z (health, exact commit on both hosts, 3 gadgets, CORS); cold start 55.3 s.
- Local only (not committed): 21 curated third-party agents and 11 skills from `claude-code-templates@1.29.6` with a TekaTech guard note; `archify` skill installed user-wide in `~/.claude/skills/archify` (inspected copy of v3.1.0); `documenter` agent and `log-work` skill.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `GraphQL: Could not resolve to a Repository with the name 'Ikeee-AI/TekaTech'` | `gh` was logged in only as `ruwilin` | Owner logged in as Ikeee-AI; `viewerPermission: ADMIN` verified. Fixed |
| pytest loaded packages from `Documents\Codex\TekaTech\backend\.venv` | `backend/.venv` was copied from the old Codex project | Backed up, rebuilt from lockfile, tests passed, backup removed. Fixed |
| `error: pathspec 'devops: add role agents…' did not match any file(s)` | PowerShell here-string not accepted by `git commit -F -` | Committed with `-F` message file. An empty branch at `68b4c5a` was pushed first; harmless. Fixed |
| Commit `efa2e6b` subject starts with an invisible BOM | PowerShell 5.1 `Out-File -Encoding utf8` writes a BOM | Left as is; squash merge uses the PR title. PR body BOM removed. Accepted |
| `fatal: 'origin' does not appear to be a git repository` | Command ran from the parent folder after a `Set-Location ..` | Re-ran from the repo root. Fixed |
| `❌ 3 component(s) failed to install` | `ai-maestro/agent-management`, `railway/database`, `ai-research/prompt-engineer` absent from the release | Skipped. Accepted |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| README, `docs/sprint-1.md`, `docs/team-review.md`, `docs/backlog.md` list a two-member team; handoff/S2–S5 plan has five | Wrong roster at consultation | Handoff says the five-person plan supersedes; doc update needs a reviewed PR — Ikeee-AI — open |
| `docs/devops/incidents.md` says "the application is not deployed" | False after `53f62e9`/`68b4c5a` deploys | Ikeee-AI — open |
| All `docs/issues/TTK-*.md` say "Named assignee: pending team declaration" | Contradicts assignments in backlog/team-review | Ikeee-AI — open |
| TTK-06 expects GitHub *environment* secrets; PIPELINE.md uses repository secrets (private repo on Free plan) | Acceptance criterion can't be met as written | Record constraint / amend criterion — Ikeee-AI — open |
| 8 requested "senior-*"/code-reviewer skills are templates whose scripts always report 0 findings | Could produce fake "audit passed" evidence | Not installed; real checks via `pre-reviewer`, `/review-deliverable`, `/security-scan`. Resolved |
| Generic `devops-engineer`/`ai-engineer` agents clash with project agents of the same name | Would overwrite project rules | Generic versions not installed. Resolved |
| Uncommitted Ollama/local-mode changes span Manuel's and Mika's areas on the DevOps branch | Risk of mixing owners in one PR | Kept out of PR #17; split by owner later — Ikeee-AI with owners — open |

**Decisions**
- Teammate PRs are evaluated with `/review-deliverable`; corrections by others go on separate branches and are recorded, never credited to the original owner — Ikeee-AI.
- Third-party agents/skills stay local until reviewed in their own PR — Ikeee-AI.
- PR #17 reviewer is Manuel: the author cannot approve their own PR (course rule and plan review table) — Ikeee-AI.

**Blockers / risks**
- No teammate Sprint 2 PRs open at 16:24; Friday 12 PM handoff passed and 6 PM review checkpoint is near — all owners — today 6 PM.
- OpenAI `credit_balance_exhausted` still unresolved — Ikeee-AI (account) / Manuel (technical check) — before Sprint 3.
- Branch protection unavailable (HTTP 403 on private Free plan); manual `/pr-gate` only — Ikeee-AI — raise at Consultation 2.
- Access for Adrian, Mika, Jopher unverified — Ikeee-AI — today.

**Plan alignment** — S2-IK: Partial (CI/metrics/deploy evidence progressing; board entries, access checklist, environment plan, freeze date and peer-reviewed merge pending). S2-AD / S2-MI / S2-MA / S2-JO: no PRs submitted yet — status unknown.

**Next**
- Get Manuel's review on PR #17, run `/pr-gate 17`, merge on approval, `/verify-deploy` — Ikeee-AI — today.
- Collect teammate PRs and run `/review-deliverable` on each — Ikeee-AI — as they arrive.
- Board entries, access checklist, environment-separation plan — Ikeee-AI — before Saturday 12 PM.
- Final Sprint 2 metrics and consultation packet — Ikeee-AI — Saturday 9 AM–3 PM.

## 2026-10-16 16:49 Asia/Manila — Removed Ollama local mode; access check; environment plan
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S2-IK · **Branch:** `tekatech/devops-agents-metrics` (working tree, uncommitted)

**Done**
- Discarded the uncommitted Ollama local-mode work at the owner's request: 16 tracked files restored, 4 untracked files removed (`backend/local_ai.py`, `backend/scripts/local_answer_check.py`, `backend/tests/test_local_ai.py`, `frontend/src/hooks/useAiProvider.js`). Backup kept in ignored `.local/backup-ollama-local-mode/` (patch + files). `CLAUDE.md` handoff header kept; Ollama instructions removed. Evidence (local): pytest 79 passed; `npm run lint` clean; `npm run build` passed.
- Access check (read-only): write access `s2302827-byte` (Manuel), `s2100932`; pending invitations `meka-moka`, `s2302756-cloud`. All 12 assigned issues belong to Ikeee-AI or Manuel; #14 unassigned.
- Wrote `docs/devops/environments.md`: local/CI/production matrix, variable-name inventory, gaps E1–E5, free staging proposal.

**Errors and fixes**
None.

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Local `.env` files point at the production Supabase project | Local testing mutates live data | Proposed `tekatech-dev` project (environments.md E1) — Ikeee-AI — open |
| PR #16 has Manuel's approval; Sprint 1 docs say review pending | Understates real process evidence | Discrepancy D6 — Ikeee-AI — open |
| Plan/handoff docs still describe optional Ollama | Conflicts with today's decision | Discrepancy D7 — Ikeee-AI — open |
| `backend/.env` still contains `ai_provider`/`ollama_model` keys | Harmless (`extra="ignore"`) but stale | Owner removes them privately; file not edited — Ikeee-AI — open |

**Decisions**
- Drop Ollama local mode; OpenAI is the only provider — Ikeee-AI (project owner).

**Blockers / risks**
- Account-to-person mapping for `s2100932`, `meka-moka`, `s2302756-cloud` unconfirmed; two invitations unaccepted — Ikeee-AI — today.

**Plan alignment** — S2-IK: Partial (environment plan drafted; board entries, freeze date and peer-reviewed merge pending).

**Next**
- Confirm which account is Adrian, Mika, Jopher; ask invitees to accept — Ikeee-AI — today.
- Decide on `tekatech-dev` Supabase project — Ikeee-AI — before Saturday 12 PM.

## 2026-10-16 16:59 Asia/Manila — Docs sync PR prepared; dev-database task created
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S2-IK (TTK-06, TTK-08) · **Branch:** `tekatech/docs-sprint2-sync` (local commit, not pushed)

**Done**
- Team accounts confirmed by Ikeee-AI: Adrian `s2302756-cloud`, Mika `meka-moka`, Jopher `s2100932`, Manuel `s2302827-byte`. README roster updated to five people.
- Created [issue #18](https://github.com/Ikeee-AI/TekaTech/issues/18) (assigned Ikeee-AI): `tekatech-dev` Supabase project to separate local/test data from production.
- Fixed discrepancies D1–D4, D6–D8: README roster; dated update notes in `docs/sprint-1.md`, `docs/team-review.md`, `docs/backlog.md` (history kept as written); `incidents.md` deployment status; TTK assignee lines from GitHub; TTK-06 secrets criterion; Ollama references in plan docs.
- Bundled for review: plan/handoff docs, `environments.md`, Sprint 2 logs, `documenter` agent, `log-work` skill, `CLAUDE.md` handoff header.

**Errors and fixes**
None.

**Conflicts and contradictions**
None new.

**Decisions**
- Push the docs PR only after Ikeee-AI confirms; PR #17 still has no review at preparation time — Ikeee-AI.

**Blockers / risks**
- PR #17 unreviewed; Adrian/Mika invitations unaccepted — Ikeee-AI — today.

**Plan alignment** — S2-IK: Partial (board entries, freeze date, reviewed merges outstanding).

**Next**
- Push `tekatech/docs-sprint2-sync` and request Manuel's review when approved — Ikeee-AI.

## 2026-10-16 18:13 Asia/Manila — Dev database created; local development separated from production
**Who:** Ikeee-AI (dashboard steps), Claude Code (verification) · **Task:** S2-IK (TTK-06), issue #18 · **Branch:** `tekatech/docs-sprint2-sync`

**Done**
- Ikeee-AI created Supabase project `TekaTech-dev` (`efdgguybkampozuvqjrz`), applied `.local/supabase-setup.sql` (generated by `backend/scripts/assemble_sql.py`), set Site URL, created a test user and set `app_metadata.is_admin = true` (verified by query: `is_admin = true`).
- Local `backend/.env` and `frontend/.env` now point at `TekaTech-dev` (secret / publishable key types verified by prefix only); production values backed up to git-ignored `.env.prod-backup`; stale `ai_provider`/`ollama_model` lines removed.
- Verification: `sprint1_check.py` against the local API on dev — all 7 checks passed (5 tables, `match_spec_documents` RPC, `/gadgets` 200 with 0 rows). Production smoke at 2026-10-16T10:12:40Z still passed for `68b4c5a` (3 gadgets, CORS).
- `docs/devops/environments.md`: E1 fixed; E6 added (production DB ap-south-1 vs API Singapore).

**Errors and fixes**
| Error | Cause | Fix / status |
| --- | --- | --- |
| Supabase "Potential issues detected: destructive operations / UPDATE without WHERE" on the setup SQL | Static warning on `drop trigger if exists`, guarded legacy `drop function` and a one-time backfill `update` of an empty table | Reviewed line by line; safe on a new project; run in `TekaTech-dev` only. Resolved |
| Admin update reported "No rows returned" | Normal for UPDATE; first attempt used the placeholder email | Re-run with the real email; confirmed with a `select`. Resolved |
| Production `/gadgets` request timed out | Free Render API cold start | `deployed_smoke.py` with retries passed. Resolved |

**Conflicts and contradictions**
None new.

**Decisions**
- Destructive and seed checks run only against `TekaTech-dev` — Ikeee-AI.

**Blockers / risks**
- Dev credentials still to be shared privately with Jopher and Manuel (issue #18 step 6) — Ikeee-AI — tonight.

**Plan alignment** — S2-IK: Partial (environment separation done locally; board entries, freeze date and reviewed merges outstanding). Unblocks S2-JO destructive checks.

**Next**
- Share dev credentials privately with Jopher and Manuel; close #18 after that — Ikeee-AI.
