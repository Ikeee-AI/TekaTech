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

## 2026-10-17 22:55 Asia/Manila — Reviewer pass on open PRs #52, #64, #65, #53
**Who:** Manuel Mirasol (`s2302827-byte`) (AI-assisted: yes — `pre-reviewer` subagents produced read-only pre-reviews; the review decisions were posted by Manuel's session on his instruction) · **Task:** S2-MA (reviewer duty on Ikeee-AI PRs) · **Branch:** `tekatech/S2-MA-auth-contract-tests` (no files changed during the review work)

**Done**
- Listed open PRs; four had a review request for Manuel: #65, #64, #53, #52 (the other open PRs were already approved, Dependabot with no reviewer, or #35 requesting Ikeee-AI) — evidence: `gh pr list`.
- #52 (weekly dependency audit fails on findings): pre-review recommended approve; **APPROVED** 2026-10-17T14:48:07Z — https://github.com/Ikeee-AI/TekaTech/pull/52
- #64 (main guard retries PR lookup): pre-review recommended approve; **APPROVED** 2026-10-17T14:48:08Z — https://github.com/Ikeee-AI/TekaTech/pull/64
- #65 (S2-AD support, verified source pack and evaluator): pre-review recommended changes; **CHANGES_REQUESTED** posted — https://github.com/Ikeee-AI/TekaTech/pull/65
- #53 (Sprint 2 evidence pack): pre-review recommended small changes; **CHANGES_REQUESTED** posted — https://github.com/Ikeee-AI/TekaTech/pull/53
- Recorded states re-read via `gh pr view --json reviews`: #52 and #64 APPROVED, #65 and #53 CHANGES_REQUESTED, each with one review by `s2302827-byte`.

**Errors and fixes**
None.

## 2026-10-16 20:14 Asia/Manila — DevOps automation batch: secret scanning, scheduled ops, Dependabot, labels, release tools, Sprint 2/3 board
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S2-IK, Sprint 3 DevOps prep · **Branches:** `tekatech/ci-actionlint`, `ci-gitleaks`, `ops-scheduled`, `repo-hygiene`, `release-tools`

**Done**
- Board: `project` token scope added; Sprint 2 owner issues #20–#24 and #18 placed with real statuses; PRs #17, #19, #25–#27, #29, #30 in *In review*; Sprint 3 DevOps issues #31–#34 in *Backlog*; #28 *Ready*. 31 board items.
- [PR #25](https://github.com/Ikeee-AI/TekaTech/pull/25): actionlint 1.7.12 (checksum-verified) + shellcheck in Backend tests — CI run 38889524499 green; step ~1 s, job 19 s.
- [PR #26](https://github.com/Ikeee-AI/TekaTech/pull/26) (stacked on #25): gitleaks 8.30.1 full-history scan, redacted — local and CI: **no leaks** (14 local non-merge commits, all branches; 15 in CI); step ~1 s.
- [PR #27](https://github.com/Ikeee-AI/TekaTech/pull/27): `ops-health.yml` daily production smoke with auto `incident` issue; `ops-weekly.yml` Saturday metrics + pip-audit/npm audit. CI green.
- [PR #29](https://github.com/Ikeee-AI/TekaTech/pull/29): Dependabot (uv, npm, actions; weekly, grouped, capped) + owner-area labeler — CI green; labeler applied `area:devops` to its own PR.
- [PR #30](https://github.com/Ikeee-AI/TekaTech/pull/30): guarded `rollback.yml` (SHA on main + 3 successful checks; guard query verified on `68b4c5a`) and tag-based `release.yml`; runbook updated. Not executed (would deploy production); rehearsal stays NOT RUN.
- Local dependency audit found vulnerable transitive packages → [issue #28](https://github.com/Ikeee-AI/TekaTech/issues/28): pyjwt 2.13.0 (14 advisories), urllib3 2.7.0 (3), multidict 6.7.1 (1), source-map-js (1 high). Routed to Manuel (backend) / Mika (frontend).
- Claude attribution removed from PR descriptions at the owner's request; future commits/PRs carry none.

**Errors and fixes**
| Error | Cause | Fix / status |
| --- | --- | --- |
| `refusing to allow an OAuth App to create or update workflow ... without workflow scope` | Windows Credential Manager Git token lacks `workflow` scope | One-off push via `gh auth git-credential` (Ikeee-AI, has `workflow`); git config unchanged. Resolved |
| `gh auth refresh` failed when typed with extra words after `!` | Question text included on the command line | Owner ran it in a separate PowerShell window. Resolved |
| gitleaks first scan covered 13 of 16 commits | Default scans current branch only | `--log-opts="--all"` locally and in CI. Resolved |
| `jq: command not found` locally | jq not installed on this laptop | Used gh `--jq`; runners have jq. Accepted |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #65's branch is stacked on #35's commits (143cfb7, f952fad) and overlaps #35 on `prompts/README.md`, `prompts/S2-AD-prompt-spec.md`, `scripts/eval_runner.py` (Adrian's area, authored by Ikeee-AI) | Merging #65 first would conflict with or supersede #35 and misplace Adrian's attribution | Asked to merge #35 first and rebase #65; Adrian to acknowledge — Ikeee-AI / Adrian — open |
| #53 consultation packet text vs its own later entries (packet at ~20:15 lists PE-1..PE-3; incidents/worklog add PE-4; consultation time "to be confirmed" vs 19 Oct 19:30) | Stale evidence pack | Change requested — Ikeee-AI — open (D9) |
| #53 PE-2 "~30 h" vs #35 opened 2026-10-16 13:03Z and recovery ~19:00 Sat Manila (~22 h) | Wrong figure in incidents.md and consultation.md | Change requested — Ikeee-AI — open (D9). From the pre-review; not independently recomputed by Manuel |

**Decisions**
- Approved #52 and #64 with optional, non-blocking notes (pipefail side effects; `|| pr=""` hardening; post-merge run link before marking Done) — Manuel.
- Requested changes on #65 and #53 rather than approving with caveats — Manuel.
- AI pre-reviews are advisory only and do not count as peer review; the approvals/requests are Manuel's own decisions.

**Blockers / risks**
- #65 and #53 are blocked on author changes; #65 is also gated on #35 landing — Ikeee-AI / Adrian — Sprint 2 deadline is today 3:00 PM Asia/Manila (already passed at time of writing; slip to be reported at consultation).
- Not verified by this session: the "85 passed", "ruff clean", and "facts re-checked" claims in #65; vendor-page facts (Apple/Samsung); the actionlint/shellcheck and `workflow_dispatch` run results claimed in #52/#64; PE-4 and the metrics figures in #53. Pre-reviewers also did not open the cited runs.
- The packet's note that Claude attribution was removed from PR descriptions differs from the standing session attribution rule; left as the owner's call.

**Plan alignment** — S2-MA: unchanged by this session (reviewer duty only; #37 auth contract tests still awaiting merge per Ikeee-AI). Review of #52/#64 done; Done status for those PRs requires merge, deploy and a post-merge check, none of which occurred in this session. Nothing was merged or deployed.

**Next**
- Re-review #65 and #53 when fixes are pushed and review is re-requested — Manuel — when requested.
- Merge #52 and #64, then record the post-merge main run link for #64 — Ikeee-AI — after approval.
- Open a follow-up ticket for evaluator strictness before Sprint 3 (#54) — Ikeee-AI / Adrian.

## 2026-10-18 17:46 Asia/Manila — Rebase #37, re-review follow-up on #46/#53/#65
**Who:** Manuel Mirasol (AI-assisted: yes) · **Task:** S2-MA · **Branch:** `s2-ma-rebase` (pushed as `tekatech/S2-MA-auth-contract-tests`)

**Done**
- Rebased #37 onto `upstream/main` (PR base is `Ikeee-AI/TekaTech`, not the fork's `origin/main`). Three conflicts in `backend/tests/test_gadgets.py` and `test_specs.py` resolved by keeping both sides; one `test_ingest_spec_requires_login` remains (in `test_specs.py`); duplicate missing-name test dropped (main's `test_create_gadget_without_name_returns_422` covers it). Local backend suite: 92 passed (local run). Force-pushed with lease, head `02daa7d`; PR reports MERGEABLE — evidence: PR #37, commit 02daa7d.
- Verified the run links cited in #53/#65: 39108173515 = pull_request run on `d7d9227` (success); 39108438489 = main push on `b3c98e0`, log shows "38 commits scanned" / "no leaks found"; 39030954463 = first `ops-weekly` run (PE-3); 39038725331 attempt 2 success (PE-4).
- Posted a comment on #37 asking s2100932 to re-approve (their approval is on the old commit `0cef0b3`) — https://github.com/Ikeee-AI/TekaTech/pull/37#issuecomment-6248302905
- Manuel re-approved #46 (`f1e0285`), #53 (`c04ee1f`) and #65 (`d7d9227`) on the website, replacing the earlier changes-requested reviews on #53/#65. AI drafted the review text; the approvals are Manuel's own.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| First rebase onto `origin/main` replayed 15 commits | `origin` is the fork and was behind; PR targets `upstream` | Discarded (never pushed); redone on a new branch from `upstream/main` |
| `git reset --hard`, first `git push --force-with-lease`, and `gh pr review --approve` were blocked by the auto-mode classifier | Safety classifier (destructive/self-approval) | Avoided reset; push re-run after Manuel's explicit instruction; approvals posted by Manuel himself |
| #37 check "Owner-area labels" fails: `Resource not accessible by integration` | `labeler.yml` uses `pull_request`; fork PRs get a read-only token | Not fixed; skipped by decision. Fix is Ikeee-AI's: `pull_request_target` (no PR-head checkout) or the repo's fork write-token setting |

| #26 edits the same `ci.yml` lines as #25 | Merge conflict risk | Stacked #26 on #25; merge #25 first — Ikeee-AI — open |
| `ops-weekly` metrics job needs `scripts/pipeline_metrics.py` from #17 | Job would fail before #17 merges | Job skips with a notice until #17 is merged — resolved by design |

**Decisions**
- Dependency fixes go through owners' reviewed PRs; no forced upgrades — Ikeee-AI.
- Automations that need other members or credit (prompt-eval CI, live OpenAI smoke, staging, measured optimization) planned as Sprint 3 issues #31–#34 — Ikeee-AI.

**Blockers / risks**
- Seven PRs (#17, #19, #25, #26, #27, #29, #30) wait on Manuel's review; review load is high — Ikeee-AI to agree merge order with Manuel.
- Vulnerable dependencies (#28) — Manuel / Mika — Sprint 3 start.

**Plan alignment** — S2-IK: Partial → strong DevOps evidence prepared; nothing new counted Done until reviewed, merged and verified. Sprint 3 DevOps work pulled forward as reviewable PRs.

**Next**
- Owner enables board built-in workflows (Projects → Workflows) — Ikeee-AI — tonight.
- Agree merge order with Manuel: #19 → #17 → #25 → #26 → #27 → #29 → #30 — Saturday morning.

## 2026-10-17 18:00–20:20 Asia/Manila — Merges, guardrails, deliverable reviews, Sprint 2 evidence
**Who:** Ikeee-AI (AI-assisted: yes) · **Task:** S2-IK · **Branch:** `tekatech/sprint2-evidence`

**Done**
- Gated merge sequence (approval on latest commit by a teammate + 3 green checks, then squash merge and wait for deploy + smoke): #19 `f6b86a9`, #17 `4d41a34`, #25 `8909316`, #27 `0223744`, #29 `9e94580`, #30 `a79076d`, #40 `20909ab` — all deployed and smoke-verified, 19:42–20:01. First real main-guard run passed on #40.
- Repository guardrails applied: squash-only merges, delete merged branches, Dependabot alerts + security-fix PRs (#41–#45 opened), Actions allowlist (GitHub-owned + `astral-sh/setup-uv`), fork PR workflows with read-only token/no secrets. Rulesets/branch protection re-checked: HTTP 403.
- PRs opened: #40 main guard (merged), #46 automated PR review + reviewer assignment, #52 audit pipefail fix. #26 rebased onto main after #25's squash merge; re-approval requested.
- Teammate contributions verified on GitHub (all commits under their own accounts): Adrian #35, Jopher #36, Manuel #37 (+9 reviews), Mika #39. CI re-triggered on all four fork PRs → all green.
- Deliverable reviews against Sprint 2 task rows → `docs/sprints/sprint-2/reviews/sprint-2-deliverable-reviews.md`; casual fix messages drafted for each member.
- Ops workflows run once by hand: `ops-health` (run 39030952194) passed; `ops-weekly` (run 39030954463) metrics passed.
- Final Sprint 2 metrics (37 PR runs 0.66 min; 10 main runs 2.19 min; 48/48; 10 deploys; 0 failed) and persistence-after-redeploy evidence in `docs/devops/metrics.md`; process exceptions PE-1..PE-3 in `docs/devops/incidents.md`; quality-gate costs in `docs/devops/optimizations.md`; consultation packet finalized.

**Errors and fixes**
| Error | Cause | Fix / status |
| --- | --- | --- |
| Told the owner it was 10:08 Manila (5 h before deadline); it was 18:08 | `TZ=Asia/Manila date` in Git Bash printed UTC | Corrected immediately; PowerShell time conversion now used (saved as a standing rule). Team deadline had already passed |
| `STOP #26: mergeable=CONFLICTING` | #26 was stacked on #25; squash merge rewrote the base commit | `git rebase --onto origin/main d5abfde`; force-pushed own branch; re-approval requested |
| Weekly dependency audit green despite 18 findings | No `pipefail` without explicit shell | #52; verified failing correctly on branch run 39031057744 |
| Empty `/gadgets` response once | Render restarting during the #40 deploy | Retried; 3 gadgets served |
| Optimization row first written from memory (18 s) | Not measured | Re-measured: 14 s; corrected before commit |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Earlier entry blocks #65 on Adrian's acknowledgement of the "covering for Adrian" PR | Merge condition | Dropped by Manuel: Adrian's task was covered by Ikeee-AI, so no confirmation is requested — Manuel — closed |
| #37 required-check set is green but "Owner-area labels" is red | Cosmetic; not a required check | Open — Ikeee-AI |

**Decisions**
- Skip the labeler failure for now and revisit after #46 is approved — Manuel.
- Do not ask Adrian to confirm the #65/#35 coverage edits — Manuel.

**Blockers / risks**
- #37 awaits re-approval from s2100932 on head `02daa7d` (gate counts only latest-commit approvals) — s2100932 — open.
- Not verified: vendor-page facts in `docs/evidence/s2-ad-source-check.md`; evaluator tests were read, not run — Manuel — open.

**Plan alignment** — S2-MA: Partial. #37 is rebased, mergeable and has green required checks, but is not approved on the latest commit, merged or deployed. Sprint 2 deadline (17 Oct 3 PM) has passed.

**Next**
- Re-approve #37 on `02daa7d` — s2100932 — when available.
- Merge #46, #53, #65, then #37 once approved — Ikeee-AI — after gate.
- Labeler `pull_request_target` fix PR — Ikeee-AI — after #46.

| #36 (Jopher) and #37 (Manuel) append to the same test files with a duplicate test name | Merge conflict / shadowed test | Merge #37 first, Jopher rebases — Manuel/Jopher — open |
| #37 API reference marks 4 public routes as login-required | Wrong contract for integration | Manuel to correct — open |
| #35 says `Closes #12` (wrong issue); #39 `Closes #21` | Would auto-close issues before verification | Owners change to `Refs` — open |
| Merged PRs moved to Done (not Deployed verification) by board workflows | PR merge already includes smoke verification | Accepted for PRs; issues close only after owner verification |

**Decisions**
- Reviews are AI-assisted pre-reviews for the DevOps owner; they are not posted as approvals on teammates' PRs — Ikeee-AI.
- Unreviewed changes are blocked from production by the main guard rather than tolerated — Ikeee-AI.

**Blockers / risks**
- Teammate PRs need peer reviews and fixes (asked before 22:00 tonight) — all owners.
- #26, #46, #52, #41–#45 awaiting review — Manuel / area owners.
- OpenAI credit — Ikeee-AI.

**Plan alignment** — S2-IK: CI/CD scope delivered and live; Sprint 2 overall Partial for all developer tasks (see consultation packet). Team deadline (Sat 15:00) passed; Mika's PR arrived 15:55.

**Next**
- Merge teammate PRs as reviews arrive (`/pr-gate`), then verify live; confirm instructor consultation time — Ikeee-AI — tonight / Sunday.

## 2026-10-17 ~22:30 Asia/Manila — S2-AD support while Adrian is unavailable
**Who:** Ikeee-AI (AI-assisted: yes), covering for Adrian · **Task:** S2-AD (#20) · **PR:** #65

**Why:** Adrian is unavailable 17–18 Oct; review fixes on his #35 were needed before Consultation 2 (Mon 19 Oct 19:30).
**What Adrian delivered (his, unchanged, PR #35):** prompt/answer spec, two-gadget source pack with URLs, 10 evaluation cases, first evaluator script.
**What Ikeee-AI changed (PR #65, separate commit `f4e37b8`):** re-verified facts on official pages (Apple tech specs 111831; Samsung PH, Exynos 2400) and removed facts the pages do not state; single S24 variant; untrusted-snippet and one-variant rules; machine-readable sources/cases; evaluator now scores any answer set for all 10 cases; 8 tests showing it rejects invented facts and bad citations. Only the `Closes #12` line of #35's description was edited (to `Refs #20, #3`) so merging would not close the OpenAI issue.
**Status:** S2-AD remains **Partial** for Adrian; the support is credited to Ikeee-AI. Adrian is asked to read #65 and be able to explain the evaluator in Sprint 3.
