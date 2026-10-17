---
name: review-deliverable
description: Evaluate a teammate's submitted deliverable (usually a PR) against their sprint work package in docs/sprints-2-to-5.md and produce an Accept / Changes requested / Support-or-takeover scorecard. Use when a teammate submits a PR or deliverable, or when asked whether the team is on plan.
---

Arguments: a PR number (or path/link to a non-PR deliverable) and optionally the task ID (e.g. `S2-JO`). Read-only until the user decides; never approve, comment on, push to or merge a teammate's PR yourself.

## 1. Identify the work package
- `gh pr view <n> --repo Ikeee-AI/TekaTech --json number,title,author,body,headRefName,headRefOid,files,reviews,statusCheckRollup,createdAt,url`
- Map the author/changed files to the owner and task row (`docs/sprints-2-to-5.md` ownership table + the current sprint). If unclear, ask the user which task ID this claims.
- Extract that row's **Deliverables** and **Required output / acceptance evidence** as a numbered checklist, plus the sprint gate items it affects.

## 2. Evaluate
- Delegate a specialist read to the matching agent (`ai-engineer`, `backend-engineer`, `frontend-engineer`, `integration-engineer`) asking it to check the diff against the checklist and project invariants — read-only, no edits.
- Run the `pre-reviewer` agent for invariants, ownership mixing and secrets.
- Check out the PR in a separate worktree (`git worktree add ../tekatech-review-<n> <headRefOid>`) and run the relevant checks there: `uv run --frozen pytest -q` (backend), `npm ci; npm run lint; npm run build` (frontend). Remove the worktree after.
- CI status from `statusCheckRollup` on the head commit.
- Evidence the row requires (screenshots, eval results, recorded OpenAI response, seed run) must actually be present; "described" is not "delivered".

## 3. Scorecard
Write `docs/sprints/sprint-<N>/reviews/<task-id>-pr<n>.md`:

| # | Required item | Status (Met / Partial / Missing) | Evidence (file:line, run link) | Fix needed |

Then one verdict:
- **Accept** — all required items met, checks green; still needs a real teammate approval (`pr-gate`).
- **Changes requested** — list concrete fixes for the owner, smallest first, with the deadline from the plan.
- **Support / takeover recommended** — only if the deadline would otherwise be missed or the work is unusable. State exactly which items, who should take them (by role boundary) and that the owner should be told first.

## 4. Honesty rules for corrections
If the user decides you or another member will correct or build part of a deliverable:
- Do it on a separate branch/PR (or as commits clearly authored by whoever does the work), never by rewriting the owner's commits.
- Record it in the sprint log: what was taken over, by whom, why, and what the original owner delivered. Use `Co-authored-by` only for people who actually contributed.
- The original owner must still be able to explain the merged code if it remains in their area; flag this for the consultation.
- Never mark the owner's task Done for work they did not do, and never write reviews, standups or approvals in their name.

## 5. Report back
Give the user: verdict, top three gaps, whether the sprint gate is at risk, and the next action with owner and time.
