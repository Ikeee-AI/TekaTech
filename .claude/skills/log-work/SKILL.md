---
name: log-work
description: Record the work done in this session — tasks, evidence, errors, conflicts/contradictions, decisions, blockers and progress against the sprint plan — in the sprint work log. Use at the end of a work session, after finishing a task or PR, or whenever the user asks to document progress.
---

Runs in the current session because only this session knows what happened. Record facts, not intentions; never invent, backdate or tidy away failures.

## Where
- Sprint from today's date (Asia/Manila) and the schedule in `docs/sprints-2-to-5.md`.
- Append to `docs/sprints/sprint-<N>/worklog.md` (create with a one-line header if missing). Newest entry at the bottom.
- Contradictions that outlive the session also go in `docs/sprints/sprint-<N>/discrepancies.md` (one row each, with status).

## Gather (read-only)
- `git log --oneline` and `git status --short` since the last entry; current branch.
- `gh pr list --repo Ikeee-AI/TekaTech --state all --limit 10` and `gh run list --repo Ikeee-AI/TekaTech --limit 10` for links/results.
- This conversation: what was asked, done, decided, and what went wrong.

## Entry format

```markdown
## <YYYY-MM-DD HH:MM> Asia/Manila — <short title>
**Who:** <person who directed/did the work> (AI-assisted: yes/no) · **Task:** <task ID(s) e.g. S2-IK> · **Branch:** <branch>

**Done**
- <outcome> — evidence: <commit SHA / PR link / run link / file path>

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |

**Conflicts and contradictions**
| What conflicts (doc vs reality, doc vs doc, ownership overlap, plan vs actual) | Impact | Resolution / owner / status |

**Decisions** — <decision> — reason — who decided.

**Blockers / risks** — <item> — owner — due.

**Plan alignment** — task row status: Done / Partial / Blocked / Not started, per the Definition of Done (reviewed + checks + merged + deployed + verified). Note slips.

**Next** — <action> — owner — when.
```

## Rules
- Write "None" for an empty section; don't drop it.
- Link evidence; local test passes are labelled local. Metrics only from `pipeline-metrics`.
- Attribute work to whoever actually did it; mark AI assistance. Never write standups, reviews or approvals for a teammate.
- Never paste secrets, tokens, `.env` values or raw private user input.
- Show the entry to the user after writing. Committing the log follows the normal PR flow.
