---
name: verify-deploy
description: Verify that production (Render frontend + Railway API) serves an exact commit with working database path and CORS, using scripts/deployed_smoke.py, and record safe evidence. Use after a main merge, before a consultation, or when asked whether production is healthy.
---

Read-only against production. No AI calls, no record writes.

1. Target commit: argument, else `git rev-parse origin/main` after `git fetch origin main`.
2. Find the latest main CI run for that SHA: `gh run list --repo Ikeee-AI/TekaTech --branch main --limit 5 --json databaseId,headSha,status,conclusion,url`. Report its deploy-job result.
3. Run from the repo root (URLs from PIPELINE.md / README; retries cover a fresh Railway deploy still starting):
   `python scripts/deployed_smoke.py --api-url https://tekatech-api-production-549b48c9.up.railway.app --frontend-url https://tekatech-web.onrender.com --commit <sha> --attempts 12 --delay 10 --report .local/deployed-smoke-<shortsha>.json`
4. Report pass/fail per check, commit, gadget count and timestamps. A stale commit means the deploy hasn't finished or failed — say which, don't guess.
5. On failure: do not redeploy or roll back yourself. Offer the `incident` skill and the rollback steps in `docs/deploy-runbook.md`.
