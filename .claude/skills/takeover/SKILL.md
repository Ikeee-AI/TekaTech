---
name: takeover
description: Take over a teammate's unfinished sprint item after its deadline (Sprint 3 carry-over: Sun 25 Oct 2026 12:00 PM Manila). Checks what is still undelivered, tells the owner first, then runs the per-role runbook (Adrian's scored evaluation and #90 rebase, Mika's deck draft, Jopher's live journey evidence, Manuel's missing reviews) on a separate Ikeee-AI branch with honest attribution. Use when the user says "take over", "takeover", or asks what is left at the noon cutoff.
---

Arguments: optional role (`adrian`, `mika`, `jopher`, `manuel`) or item; default = check everything.

A takeover is **Ikeee-AI's own work** on a separate branch and PR. It never rewrites, re-authors or approves in the owner's name. The owner's task row stays **Partial** for the part they did not deliver; the takeover item is credited to Ikeee-AI (AI-assisted). Every outward step (comment, push, PR, paid call, production write) still needs the user's go-ahead.

## 0. Check the time and what is still open

1. Manila time: `powershell -NoProfile -Command "[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'Singapore Standard Time')"`. Before the cutoff, only report; do not take anything over.
2. Status of each item (read-only):

| Item | Owner | Delivered when | Check |
|---|---|---|---|
| Re-approve #89, #90; review #107 | Manuel | approval on the current head | `pr-gate` skill |
| Rebase #90 onto main | Adrian | #90 base `main`, only his own commit on top, MERGEABLE | `gh pr view 90 --json baseRefName,mergeable,commits` |
| Scored OpenAI evaluation (20 cases) | Adrian | PR open with the report | `gh pr list --author s2302756-cloud --state all --search "created:>=2026-10-24"` |
| Presentation deck draft | Mika | PR open | `gh pr list --author meka-moka --state all --search "created:>=2026-10-24"` |
| Live-site journey evidence | Jopher | screenshots posted on #57 | `gh issue view 57 --comments` |

3. Report a table Delivered / Missing per item, then ask the user which missing items to take over.

## 1. Before taking over (every item)

- Post on the owner's issue/PR (the user approves the text), e.g. "Taking over <item> at 12:00 as agreed in the group chat; your <delivered parts> stay credited to you." Do not wait for a reply after the cutoff.
- Branch from fresh main: `tekatech/s3-takeover-<role>-<item>`. Commits authored by Ikeee-AI; no Claude attribution (user rule).
- PR title starts `Takeover (S3-XX):`; body says what was taken over, why (deadline), what the owner delivered, and that the work is AI-assisted.
- Reviewer: any teammate **except the PR author** (fallback order in section 6).
- Afterwards: `log-work` entry (takeover table row) and the consultation note "taken over by Ikeee-AI".

## 2. Adrian (S3-AD) — use the `ai-engineer` agent

### 2a. #90 rebase (if Adrian has not done it)
Only after #89 is merged. The branch lives in this repo, so it can be pushed, but say so on #90 first.
```
git fetch origin
git switch -c takeover-90 origin/feature/s3-ad-abstention-leaks
git reset --hard 5cf0f37          # Adrian's own abstention commit; drops the #89 merge commit
git rebase origin/main
git push --force-with-lease origin takeover-90:feature/s3-ad-abstention-leaks
```
Retarget the PR base to `main` if GitHub has not. Check the diff is only Adrian's 3 files (`git diff origin/main --stat`). Re-approval must come from someone other than Adrian (and the PR stays Adrian's: his authorship is unchanged).

### 2b. Scored OpenAI evaluation (paid: ~$0.10 for 20 cases plus a few cents of embeddings)
Needs the user's explicit OK and the dev key in `backend/.env` (never print or edit `.env`).
1. Confirm `backend/.env` points at **TekaTech-dev** without printing it: from `backend/`, `uv run --frozen python -c "from config import settings; print(settings.supabase_url.split('//')[1].startswith('efdgguybkampozuvqjrz.'))"` must print `True`. If `False`, stop: the user edits `.env`; never run the eval against production.
2. Seed the pack as one chunk per snippet (OpenAI embeddings, cents): `uv run --frozen python scripts/seed_dev.py --with-specs`.
3. Start the API locally: `uv run --frozen uvicorn main:app --port 8000` (background).
4. Plan only: `python scripts/eval_adapter.py --api-base http://127.0.0.1:8000`. Fix any pre-check message before spending.
5. With approval: `python scripts/eval_adapter.py --api-base http://127.0.0.1:8000 --yes --out .local/answers-live.json` (about 2 minutes, paced for the rate limit).
6. Score: `python scripts/eval_runner.py --answers .local/answers-live.json --report .local/eval-live.json --markdown .local/eval-live.md`. Exit code 1 means a target was missed, not that the run failed.
7. Report at `docs/evidence/eval-live-2026-10-25.md`: provider, model, `prompt_version`, dataset version, date, commit; per target the **numerator/denominator** (supported factual claims ≥90%, valid citation references 100% counting `invalid_citations_removed`, 4/4 missing/ambiguous with no invented facts, 2/2 override cases keep grounding); every failure listed with its case id. Add a row to `docs/ai-feature-writeup.md` results table.
8. **Do not tune the prompt to pass.** A missed target is reported as missed and becomes a Sprint 4 item for Adrian.
9. Stop the local server.

## 3. Mika (S3-MI) — use the `frontend-engineer` agent

Deck **draft** (structure, not finished slides): `docs/presentation/deck-draft.md`.
- Course final presentation: **20 minutes + 10 minutes questions**; must show a small visible change → reviewed PR → merge → automated deploy, malformed-request handling, a controlled model failure, and production rollback.
- One table: slide #, title, content/evidence source (link to repo evidence, e.g. `docs/pr-proof-s3/`, `frontend/docs/ui-evidence*`, `docs/devops/metrics.md`), speaker, minutes. Minutes sum to 20.
- Speaker slots by ownership: Ikeee-AI (intro, DevOps pipeline, metrics, rollback, live deploy challenge), Manuel (architecture, backend validation, failure drill), Adrian (AI grounding, evaluation results), Jopher (live user journeys), Mika (UI states, accessibility). Mark the split as a **proposal** for the team to confirm.
- Mika finishes the actual slides in Sprint 4 (S4-MI); say so in the PR.

## 4. Jopher (S3-JO) — use the `integration-engineer` agent

Live-site journey evidence on https://tekatech-web.onrender.com, posted on #57.
- Read-only checks first: `verify-deploy` skill.
- The click-through **writes production data** (a saved comparison, a correction) and spends a few `/query` cents: get the user's OK, use clearly-labelled test text ("TekaTech Sprint 3 check"), and list what was created.
- Walk the user through it one click at a time (they are new to dashboards); they save screenshots to `C:\Users\ivana\Pictures\Screenshots\`. Steps: open a gadget → ask a question → click a citation (source opens) → compare two gadgets → copy the share link → reopen it in a new tab → submit a correction → (admin) see it in the corrections list.
- Copy the screenshots to `docs/pr-proof-s3/live/` (no personal data, no tokens or emails visible), open a PR, and comment on #57 with the PR link and the deployed commit.
- The automated failure-drill browser check stays a Sprint 4 item; do not build it here.

## 5. Manuel (S3-MA) — reviews cannot be taken over

Nobody can approve "for" Manuel. If his reviews are missing at the cutoff, ask the next reviewer (section 6). The user may approve a PR they did not author only after reading it themselves and asking explicitly; then post the approval from the Ikeee-AI account with a body that states what was checked.

## 6. Fallback reviewers (author can never self-approve)

| PR author | First | Then |
|---|---|---|
| Adrian (#89, #90) | Manuel | Jopher, then Ikeee-AI (the user, after reading it) |
| Ikeee-AI (#107, every takeover PR) | Manuel | Adrian, Jopher, Mika |
| Mika | Jopher | Adrian |
| Jopher | Manuel | Mika |

Approvals on an older head do not count; re-request after every push.

## 7. Finish

- `pr-gate` → merge on PASS with `--match-head-commit <full sha>` → `verify-deploy`.
- `log-work`: a "Takeovers" table (item, original owner, taken over by, time, reason, PR, what the owner had delivered).
- `consultation-packet`: mark each takeover; the owner should still be able to explain their own delivered parts.
