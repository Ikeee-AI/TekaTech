# Deployment and rollback runbook

Owner: project owner (the team's DevOps Engineer, also contributing full-stack code). Chosen baseline: GitHub Actions + free Render API/static frontend + existing Supabase database. The private remote repository, ready-for-review PR #15 and 13 issues are created. The first hosted PR CI run passed. No Render services or production deployment have been verified yet.

## First-time setup

1. GitHub is connected as Ikeee-AI. [TekaTech](https://github.com/Ikeee-AI/TekaTech) is private, both branches are pushed, and [ready-for-review PR #15](https://github.com/Ikeee-AI/TekaTech/pull/15) proposes the application/foundation work. Main contains only the bootstrap commit; the PR still needs another teammate review.
2. The [13 issues](https://github.com/Ikeee-AI/TekaTech/issues) are created (#2-14); the four DevOps-owned items are assigned to Ikeee-AI. Assign the remaining teammates and create the project board described in `docs/backlog.md`. The current Git connection lacks Projects scope and the in-app browser is signed out, so the board remains pending. Declare the remaining developers and the week's product owner in README.
3. Configure main branch protection/rules: one other teammate review, dismiss stale approvals, require `Backend tests`, `Frontend lint and build`, and `Database migrations`; prohibit force pushes and routine direct commits. Verified for this repository: GitHub returned HTTP 403 with "Upgrade to GitHub Pro or make this repository public to enable this feature." Protection remains disabled. Keep reviewed PRs as the team workflow while deciding an eligible plan/visibility; no paid upgrade or visibility change was made.
4. The existing Supabase project is ACTIVE_HEALTHY and its two migrations are verified; see `docs/evidence/supabase-sprint-1.json`. For future work, wait for ACTIVE_HEALTHY before inspecting/applying SQL: COMING_UP returned an empty catalog before the restored schema became visible. Export/inspect the existing schema/RPC and apply only compatible tracked SQL. The migration handles the inspected five-column legacy retrieval overload without CASCADE; unexpected signatures or dependents abort. Confirm `scripts/sprint1_check.py` database checks pass.
5. While the first PR is awaiting review, create a Render Blueprint from `render.yaml` on `tekatech/sprint-1`. With no explicit branch pinned in the blueprint, services initially inherit that branch so they can provision before main has application code. Use the free API plan and static site; retain Supabase for the database. Record the actual generated backend and frontend URLs (do not assume service names guarantee exact URLs).
6. Set backend host configuration: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGINS` equal to the actual frontend origin, and `RATE_LIMIT_STORAGE_URI=memory://`. Keep one worker/replica for memory counters; use healthy shared Redis if scaling later.
7. Set frontend host configuration: `VITE_API_BASE_URL` to the actual API URL, `VITE_SUPABASE_URL`, and the separate publishable `VITE_SUPABASE_ANON_KEY`. Rebuild after changing these values. Configure Supabase Auth site/redirect URLs for the live frontend and local development.
8. After provisioning, set each Render service's linked branch to main and keep auto-deploy off before the first reviewed merge. Update the Blueprint's source branch to main after that merge for future configuration changes. Copy each secret deploy hook into GitHub repository Actions secrets as `RENDER_BACKEND_DEPLOY_HOOK` / `RENDER_FRONTEND_DEPLOY_HOOK`. Set repository Actions variables `PRODUCTION_API_URL` and `PRODUCTION_FRONTEND_URL` to the actual host origins. The deploy job reads them only on pushes to main after all three check jobs pass. GitHub Free restricts environment secrets for private repositories, so this baseline uses separate production hook names at repository scope; hosting secrets remain on Render. Do not require manual deployment approval if each reviewed merge should deploy automatically. A Blueprint's initial provisioning deploy is setup; the class evidence should include a later pipeline-triggered deploy.
9. Run PR CI, obtain the other teammate review, and merge. The main pipeline checks the merged commit, then triggers both hosts with that exact SHA and polls the public smoke checks for version, data and CORS. It explicitly fails deployment if hooks are missing.
10. Wait for both Render deployments to become live. Confirm frontend bundle, backend deploy and repository commit match. Run the smoke checks below, then record URLs, CI run, commit and browser evidence in `docs/sprint-1.md`.

Do not paste credentials into chat, issue bodies, screenshots or Git. Enter them only into local ignored `.env` files or the appropriate host/CI secret store.

## Verify a deployment

- Open backend `/health`: process should return `{"status":"ok"}`. This alone does not prove database readiness.
- Open backend `/gadgets`: should return JSON loaded from the real database (an empty list is valid).
- Open the live frontend and inspect its successful `/gadgets` request to the actual API. Verify loading, empty/data and error states; refresh a gadget/detail route once records exist.
- Confirm browser Supabase requests are for Auth only, and data/AI requests target FastAPI.
- Run from `backend/` with actual URLs:

```powershell
uv run python scripts/sprint1_check.py --api-base https://YOUR-API.onrender.com --frontend-url https://YOUR-FRONTEND.onrender.com --output ../.local/deployed-smoke.json
```

After adding provider credit, run the same command with `--ai` ONCE to verify the OpenAI embeddings path. The command reads real database metadata/data and makes one small embeddings request; it never writes fixture records. A provider connectivity success does not prove a full grounded answer flow.

Temporary Sprint 1 alternative: from the local backend directory, run `uv run python scripts/sprint1_check.py --ai --ai-provider ollama --ai-model qwen3:8b`. This already passed and validated structured output; see `docs/evidence/local-llm-sprint-1.json`. It uses a local installed model rather than OpenAI credit. It does not redirect application RAG or give the hosted API access to the laptop. Render's free backend resources are for FastAPI, not the 5.2 GB local model.

Wake a sleeping API before consultation. Confirm current free-plan limits on the host before provisioning. No paid plan or paid database is configured in the blueprint.

## Routine deployment

Each issue gets a feature branch and a reviewed PR. Required CI jobs pass before merging. On main the pipeline repeats checks and triggers deployment. Verify the live version and record timestamps; a successful hook request is not deployment completion.

## Rollback

Preferred code rollback preserves the reviewed history:

1. Find the last known good deployed commit in Render and the metrics/run log. Identify the broken merged change.
2. Create a branch from current main, for example `tekatech/rollback-TTK-10`.
3. `git revert <BROKEN_COMMIT>` (use the correct merge-parent option only if the change was a merge commit). Do not reset/force-push main.
4. Open a PR, get another teammate review and passing checks, then merge. The pipeline deploys the reverted main state.
5. Check `/health`, `/gadgets`, frontend/API wiring and affected behavior. Record time to recover and an incident postmortem.

For an urgent outage, the DevOps Engineer may redeploy the last known good commit through Render's deploy controls. Immediately reconcile main with a reviewed revert PR so automatic deployment does not restore the broken code. Record the emergency action. Never roll schema backward by dropping tables; inspect compatibility and restore data from backups only with explicit team approval.

Rollback rehearsal status: NOT RUN. A written runbook is not evidence of a tested rollback.

References: [Render Blueprint](https://render.com/docs/blueprint-spec), [deploy hooks and exact commit deployment](https://render.com/docs/deploy-hooks).
