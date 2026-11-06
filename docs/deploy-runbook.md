# Deployment and rollback runbook

Owner: project owner (the team's DevOps Engineer, also contributing full-stack code). Chosen baseline: GitHub Actions + free Render API/static frontend + existing Supabase database. The private remote repository, Sprint 1 PR #15 and 13 issues are created. PR checks pass. Both services are linked to main with Render auto-deploy off; GitHub deploy hooks are configured. Main run 38174257006 deployed commit 53f62e9, and exact version, database, CORS and direct-login checks passed; see `docs/evidence/sprint1-main-deployment.json`. Initial provisioning is recorded separately.

## First-time setup

1. GitHub is connected as Ikeee-AI. [TekaTech](https://github.com/Ikeee-AI/TekaTech) is private, both branches are pushed, and [merged PR #15](https://github.com/Ikeee-AI/TekaTech/pull/15) introduced the application/foundation work. Main has the deployed application. The owner-directed initial merge lacked another teammate review; require real review before subsequent merges.
2. The [13 issues](https://github.com/Ikeee-AI/TekaTech/issues) are created (#2-14). Frontend, product-owner and DevOps items #5/7/9/10/11/13 are assigned to Ikeee-AI. The private board now exists with all 13 issues. Ikeee-AI is product owner; Manuel Mirasol owns backend/database/AI. Follow `docs/team-review.md` for completed access/assignments and pending real review.
3. Configure main branch protection/rules: one other teammate review, dismiss stale approvals, require `Backend tests`, `Frontend lint and build`, and `Database migrations`; prohibit force pushes and routine direct commits. Verified for this repository: GitHub returned HTTP 403 with "Upgrade to GitHub Pro or make this repository public to enable this feature." Protection remains disabled. Keep reviewed PRs as the team workflow while deciding an eligible plan/visibility; no paid upgrade or visibility change was made.
4. The existing Supabase project is ACTIVE_HEALTHY and its two migrations are verified; see `docs/evidence/supabase-sprint-1.json`. For future work, wait for ACTIVE_HEALTHY before inspecting/applying SQL: COMING_UP returned an empty catalog before the restored schema became visible. Export/inspect the existing schema/RPC and apply only compatible tracked SQL. The migration handles the inspected five-column legacy retrieval overload without CASCADE; unexpected signatures or dependents abort. Confirm `scripts/sprint1_check.py` database checks pass.
5. The existing services were created through the Render connector on `tekatech/sprint-1`, before main had application code. Reuse API `srv-db5v6sijnfac73brl4mg` (`https://tekatech-api.onrender.com`) and static frontend `srv-db5v70tckfvc73biitc0` (`https://tekatech-web.onrender.com`) in the confirmed TekaTech workspace; do not create duplicates. The API is free and the database stays in Supabase. `render.yaml` remains a configuration reference; no Blueprint was provisioned.
6. Set backend host configuration: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGINS` equal to the actual frontend origin, and `RATE_LIMIT_STORAGE_URI=memory://`. Keep one worker/replica for memory counters; use healthy shared Redis if scaling later. Non-secret proxy settings for per-visitor rate limits: `TRUST_PROXY_HEADERS` stays `false` (one shared bucket behind the proxy) until the hop count is confirmed from real traffic, then `true` with `TRUSTED_PROXY_HOPS=1` (see "Rate-limit buckets behind the proxy"). `render.yaml` lists them, but because no Blueprint was provisioned they take effect only once set on the API service in the Render dashboard.
7. Set frontend host configuration: `VITE_API_BASE_URL` to the actual API URL, `VITE_SUPABASE_URL`, and the separate publishable `VITE_SUPABASE_ANON_KEY`. Rebuild after changing these values. Configure Supabase Auth site/redirect URLs for the live frontend and local development.
8. After provisioning, set each Render service's linked branch to main and keep auto-deploy off before the first reviewed merge. Update the Blueprint's source branch to main after that merge for future configuration changes. Copy each secret deploy hook into GitHub repository Actions secrets as `RENDER_BACKEND_DEPLOY_HOOK` / `RENDER_FRONTEND_DEPLOY_HOOK`. Set repository Actions variables `PRODUCTION_API_URL` and `PRODUCTION_FRONTEND_URL` to the actual host origins. The deploy job reads them only on pushes to main after all three check jobs pass. GitHub Free restricts environment secrets for private repositories, so this baseline uses separate production hook names at repository scope; hosting secrets remain on Render. Do not require manual deployment approval if each reviewed merge should deploy automatically. A Blueprint's initial provisioning deploy is setup; the class evidence should include a later pipeline-triggered deploy.
9. Run PR CI, obtain the other teammate review, and merge. The main pipeline checks the merged commit, then triggers both hosts with that exact SHA and polls the public smoke checks for version, data and CORS. It explicitly fails deployment if hooks are missing.
10. Wait for both Render deployments to become live. Confirm frontend bundle, backend deploy and repository commit match. Run the smoke checks below, then record URLs, CI run, commit and browser evidence in `docs/sprint-1.md`.

Do not paste credentials into chat, issue bodies, screenshots or Git. Enter them only into local ignored `.env` files or the appropriate host/CI secret store.

## Verify a deployment

- Open backend `/health`: process should return `{"status":"ok"}`. This is liveness only (and Render's health check path) and does not prove database readiness.
- Open backend `/health/ready`: 200 with `"database":"ok"` and a `latency_ms` means the API reached the database; 503 with `"database":"error"` means it did not (the body never contains the cause; look up the response's `X-Request-ID` in the API logs). A 404 means the deployed release predates the endpoint; `deployed_smoke.py` reports that as `readiness: skipped`.
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

## Rate-limit buckets behind the proxy

Status: **UNVERIFIED** until the steps below are run against production and recorded. Unit tests prove the key function's logic, not Render's actual header behavior.

Why: Render's proxy is the socket peer of the API, so with the default key every visitor shares one bucket (for example one site-wide 10/minute on `/query`). With `TRUST_PROXY_HEADERS=true` the API keys on the `X-Forwarded-For` entry counted `TRUSTED_PROXY_HOPS` from the right (default 1 = rightmost). Proxies append to this header, so entries a client sends itself are always further left and are ignored; an entry that is missing or not an IP falls back to the socket peer, never to a left-hand entry. IPv6 clients are bucketed per /64. Render's docs do not state the exact `X-Forwarded-For` layout (checked 2026-10-27: [web services](https://render.com/docs/web-services), [logging / `Rndr-Id`](https://render.com/docs/logging#tracing-with-requestid-and-rndr-id), [DDoS protection via Cloudflare](https://render.com/docs/ddos-protection)), so the hop count must be confirmed from real traffic. Uvicorn's own proxy-header rewriting stays off (no `--forwarded-allow-ips`), because trusting every forwarded value would let clients pick their own bucket.

Verify after the settings are live (no AI calls; `/health/ready` is limited to 30/minute and costs one small database read per request):

1. Hop count. From one machine run `curl -s -o /dev/null https://tekatech-api.onrender.com/health/ready`, then the same with `-H "X-Forwarded-For: 203.0.113.9"`. In the Render API logs find both `request ... path=/health/ready` lines (match `rndr_id` to the `Rndr-Id` response header). Expected for `TRUSTED_PROXY_HOPS=1`: `xff_entries=1` for the first and `xff_entries=2` for the second (Render appended exactly one entry and kept the client's). If the first shows `xff_entries=2`, a second proxy appends an entry and the hop count must be 2; if the second also shows 1, Render replaces client values (also safe with 1 hop). The log records only the count, never the addresses.
2. Separate buckets. From network A (for example home Wi-Fi) send 31 requests within one minute: `for i in $(seq 31); do curl -s -o /dev/null -w "%{http_code}
" https://tekatech-api.onrender.com/health/ready; done`. The last should be `429`. Immediately send one request from network B (for example a phone hotspot): expected `200`. If B also gets `429`, all visitors still share a bucket: the setting is not live or the hop count is wrong.
3. Spoofing. While A is still limited, send from A with `-H "X-Forwarded-For: 198.51.100.77"`: expected `429` (a client-chosen value does not open a new bucket).
4. Record date, networks (no IP addresses), status codes and the deployed SHA in `docs/devops/incidents.md` or the sprint log, then change the status above to VERIFIED.

If any step fails, set `TRUST_PROXY_HEADERS=false` on the API service (restores the previous shared-bucket behavior) and open a finding.

## Routine deployment

Each issue gets a feature branch and a reviewed PR. Required CI jobs pass before merging. On main the pipeline repeats checks and triggers deployment. Verify the live version and record timestamps; a successful hook request is not deployment completion.

## Rollback

Preferred code rollback preserves the reviewed history:

1. Find the last known good deployed commit in Render and the metrics/run log. Identify the broken merged change.
2. Create a branch from current main, for example `tekatech/rollback-TTK-10`.
3. `git revert <BROKEN_COMMIT>` (use the correct merge-parent option only if the change was a merge commit). Do not reset/force-push main.
4. Open a PR, get another teammate review and passing checks, then merge. The pipeline deploys the reverted main state.
5. Check `/health`, `/health/ready` (404 is expected if the restored release predates it), `/gadgets`, frontend/API wiring and affected behavior. Record time to recover and an incident postmortem.

For an urgent outage, the DevOps Engineer may redeploy the last known good commit. Preferred: **Actions → Rollback production → Run workflow** with the full 40-character SHA and the reason (incident issue). The workflow (`.github/workflows/rollback.yml`) refuses commits that are not on main or lack successful `Backend tests`, `Frontend lint and build` and `Database migrations` checks, triggers both Render hooks for that exact SHA, and runs the same smoke checks as a release; its summary and artifact are the recovery evidence. Fallback: Render's deploy controls. Immediately reconcile main with a reviewed revert PR so automatic deployment does not restore the broken code. Record the emergency action. Never roll schema backward by dropping tables; inspect compatibility and restore data from backups only with explicit team approval.

Rollback rehearsal status: **RUN on production, 31 October 2026** ([evidence](evidence/rollback-rehearsal-2026-10-31.md)). `rollback.yml` restored `7d2ab44` in 1 min 35 s and rolled forward to `5aa4635` in 1 min 45 s, both smoke-tested. The two commits differed only in docs/evaluation files, so the rehearsal had no user impact; a rollback across a code or schema change has not been rehearsed.

Second-member demonstration: **done by Jopher, 6 November 2026.** Jopher (`s2100932`) ran `rollback.yml` on production twice on 6 Nov: (1) 11:10–11:17 Manila, back to `e22758b` in 1 min 37 s ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/42154924236)) and forward to `1170d19` in 1 min 41 s ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/42155490274)), results on [#237](https://github.com/Ikeee-AI/TekaTech/issues/237) at 11:22; (2) 16:35–16:39 Manila, back to the tagged `db49bc2` (`v1.1.0`) in 1 min 39 s ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/42188771228)) and forward to `3d9be35` in 1 min 33 s ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/42189100078)), results on [#240](https://github.com/Ikeee-AI/TekaTech/pull/240). All four runs succeeded with their built-in smoke checks; each pair differed only in docs/script files, so users saw no change. A rollback across a code or schema change is still not rehearsed.

Tips from that demonstration: the **Run workflow** button only appears after you open **Rollback production** in the Actions workflow list; and the job stays yellow (running) for about a minute while the website rebuilds, which is normal.

## Database backup and restore

Production runs on the Supabase free plan, which has no point-in-time recovery or downloadable scheduled backups. The team's backup method is a logical export of the six application tables (the original five plus `user_gadgets`, My Gadgets, since 3 Nov 2026) through the REST API, restored into a disposable PostgreSQL + pgvector built from the tracked SQL:

```bash
uv run --no-project --python 3.12 --with pgserver==0.1.4 --with "psycopg[binary]==3.2.3" \
  python scripts/db_restore_rehearsal.py --env-file backend/.env --report .local/db-restore.json
```

The script exports read-only, applies `backend/tests/sql/ci_roles.sql` and `assemble_sql.py` output to a throwaway local database, restores rows in foreign-key order, checks row counts, relationships and vector search, reports timings, then deletes the copy and the export (`--keep` keeps them). It refuses the production project. A source project that hasn't applied `backend/sql/user_gadgets.sql` yet is listed under `tables_missing_in_source` instead of failing. The 31 Oct rehearsal below predates that table and has not been re-run with it. Restore rehearsal status: **RUN on TekaTech-dev, 31 October 2026** ([evidence](evidence/db-restore-2026-10-31.md)): 180 rows in 14.0 s, all checks passed. Never restore into the live project without explicit team approval; Supabase Auth users are not part of this export.

## Release tagging

After the release candidate is merged and verified live, push a version tag on that main commit (for example `git tag v1.0.0 <sha>` then `git push origin v1.0.0`). `.github/workflows/release.yml` refuses tags not on main and creates a GitHub Release with notes generated from merged PRs. Add known limitations and migration notes to the release before announcing it. Tagging does not deploy.

References: [Render Blueprint](https://render.com/docs/blueprint-spec), [deploy hooks and exact commit deployment](https://render.com/docs/deploy-hooks).
