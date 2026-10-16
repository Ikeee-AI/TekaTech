---
name: pr-gate
description: Check whether a TekaTech PR satisfies the team merge gate (other-teammate approval, three required checks green on the latest commit, single owner, no secrets) before Ikeee-AI merges it. Use when asked "can I merge PR N" or to triage open PRs.
---

Branch protection is unavailable on this private repo, so this skill is the interim manual gate. It is **not** enforced protection; say so in the report.

For PR `<n>` (or each open PR from `gh pr list --repo Ikeee-AI/TekaTech`):
1. `gh pr view <n> --repo Ikeee-AI/TekaTech --json author,reviews,headRefOid,statusCheckRollup,files,mergeable,title,url`
2. Gate:
   - At least one `APPROVED` review whose author ≠ PR author, submitted on the current `headRefOid` (stale approvals don't count).
   - `Backend tests`, `Frontend lint and build`, `Database migrations` all `SUCCESS` on the head commit.
   - Changed files map to one owner per `docs/sprints-2-to-5.md`; otherwise recommend splitting.
   - No `.env`/account files; invoke the `pre-reviewer` agent for a deeper read if useful.
   - SQL changes include manual application instructions.
3. Print a PASS/BLOCKED table with the reason per item.
4. Merging is outward-facing: only after PASS **and** the user explicitly says to merge, run `gh pr merge <n> --squash --repo Ikeee-AI/TekaTech`, then run the `verify-deploy` skill for the merge commit. Never merge on a BLOCKED gate, and never approve PRs yourself.
