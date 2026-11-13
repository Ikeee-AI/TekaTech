# Plan: move the backend API from Render to Railway

**Status: approved by Ikeee-AI on Sat 7 Nov 2026 00:52 Manila ("yes we go for it, later this Saturday"). Work starts after the Sprint 5 review (Sat 7 Nov 15:00), with step 1 on the Free Trial.** Hobby ($5/month) is only needed when the trial ends, about 30 days later; confirm it then. **Update Wed 11 Nov 2026 03:13 Manila: Ikeee-AI reports the $5 Railway purchase is done (owner's statement; plan, billing date and usage limit not yet checked in this repo).** **Update Thu 12 Nov 2026: steps 1–5 done.** Project `tekatech` / service `tekatech-api` in Singapore on the **Hobby** plan (confirmed on the Usage page), replica cap 1 vCPU / 1 GB, compute usage limit **$10**. `RAILWAY_TOKEN` is saved as a GitHub secret. Railway tokens start with `rlwy_`; they are *not* UUIDs as section 3 assumed, so `check_secrets.py` now has a pattern. Dashboard variables stayed *staged* until the owner clicked Deploy, so the first start failed on missing settings. Parallel run from a manual `railway up`: `/health`, `/health/ready` (database ok), `/version`, 4 gadgets and CORS passed on https://tekatech-api-production-549b48c9.up.railway.app. **Cutover ~00:33 Manila:** `tekatech-web`'s `VITE_API_BASE_URL` now points to the Railway URL. The live bundle calls only Railway; the owner signed in and opened a gadget page in incognito, and Railway's logs show those requests. Until this branch is merged, Railway runs branch commit `02762f5` (manual upload) and `PRODUCTION_API_URL` stays on Render. Remaining: merge the reviewed branch, set `PRODUCTION_API_URL` to the Railway URL, first CI deploy to Railway, rollback rehearsal on Railway, 7-day Render fallback, then step 6. Every step that spends money, creates an account, adds a secret or changes production waits for Ikeee-AI's explicit go. The frontend stays on Render (`tekatech-web`). The database stays on Supabase.

Owner: Ikeee-AI (hosting, CI/CD, secrets). Backend code change: Manuel (one small change in `backend/main.py`, see step 3). Review: one other teammate per PR, as usual.

## 0. Decide first: is the move required?

The project memory says the move is "required to separate the frontend and backend hosting". **The course page does not require it.** On 6 Nov the course site (https://csp221a.vercel.app/) says the host is the team's choice. It lists Render *or* Railway for the backend only as a recommended free stack, and says "Any other free host is fine too … as long as the app is publicly reachable and you can explain the trade-offs." Today the frontend and backend are already two separate Render services with separate URLs and separate deploy hooks.

So the move is optional. Reasons that could still justify it:

| For | Against |
| --- | --- |
| **No cold starts.** The Render free API sleeps after about 15 min idle; the first request then took 42.7 s (measured 4 Nov). A Railway Hobby service stays running. | **New monthly cost** (about $5/month, section 1). The project has no budget line for it yet. |
| Frontend and backend on different providers, if the instructor or team wants that. | Work and risk close to Demo Day: 2 workflows, 1 backend change, about 40 doc mentions of the Render URL, a new secret, and a cutover. |
| Railway lets you choose the Singapore region (`asia-southeast1-eqsg3a`), the same region as today. | Rollback to commits from before the cutover needs a different path (section 6). |

**Owner decision needed:** (a) go ahead anyway, (b) go ahead only after Sprint 5 is reviewed, or (c) don't move, and fix cold starts another way, for example the existing warm-up step before demos. This plan assumes (b). **Decided 7 Nov 00:52 Manila: (b), starting later on Sat 7 Nov.**

## 1. Cost (Railway pricing page, read 6 Nov 2026)

| Plan | Fee | Included usage | Notes |
| --- | --- | --- | --- |
| Free Trial | $0 | $5 one-time, expires after 30 days, **no card** | 2 projects, 5 services, 1 custom domain. Enough to build and test everything before paying |
| Free | $0 | $1/month | 0.5 GB RAM max. Our API would likely use more than $1/month of usage |
| **Hobby** | **$5/month** | $5/month of usage included | Usage above $5 is charged in full |

Usage prices: about $20 per vCPU-month, $10 per GB RAM-month, $0.05 per GB egress, billed per second.

**Estimate (not measured):** one uvicorn worker at about 0.25 GB RAM and very low CPU comes to about $2.5 RAM + about $1 CPU + egress of a few cents, which is roughly $3.5–4.5/month. That fits inside Hobby's included $5, so **the expected bill is $5/month**. Measure it during the trial (Railway's usage page) before upgrading. Set a **usage limit** in Railway billing (for example $10) so a runaway can't bill more.

**Spend approval needed:** Hobby at $5/month from the end of the trial, on the owner's card. Nobody else's card or account.

## 2. What changes and what doesn't

| Piece | Today | After |
| --- | --- | --- |
| API host | Render free web service `tekatech-api`, https://tekatech-api.onrender.com | Railway service `tekatech-api` in the Singapore region, `https://<name>.up.railway.app` (a custom domain is optional) |
| Frontend | Render static site `tekatech-web` | **Unchanged.** Only `VITE_API_BASE_URL` changes, which needs a rebuild |
| Database, auth | Supabase live project `lqswcmkzygqmnblaukco` | **Unchanged.** No SQL, no migration |
| Deploy trigger | `ci.yml` "Deploy main after checks" calls the Render backend and frontend deploy hooks with `ref=<sha>` | Frontend: same Render hook. Backend: `railway up` from a checkout of that exact SHA (section 4) |
| Rollback | `rollback.yml` calls both Render hooks for a known-good SHA | Same workflow; backend step uses `railway up` from that SHA |
| Commit check | `/version` reads `RENDER_GIT_COMMIT` | Reads an explicit commit value set at deploy (step 3) |
| Rate limit | `memory://`, single worker; `TRUST_PROXY_HEADERS=false` | Same. Keep proxy trust **off** on Railway too, until its hop count is confirmed from real traffic (runbook "Rate-limit buckets behind the proxy") |

## 3. Steps

Each step names who does it. Claude Code can prepare PRs and checks, but **never** enters secrets, creates the account or pays.

**Step 1: Account and project (owner, trial, no card).**
1. Ikeee-AI signs up at railway.com with the Ikeee-AI GitHub account and starts the Free Trial.
2. Create project `tekatech` and an empty service `tekatech-api`. Set its region to **Southeast Asia (Singapore)**. **Don't** connect GitHub autodeploy (reason in section 4).
3. Project Settings → Tokens: create a **project token** for the `production` environment. Save it as the GitHub repository secret `RAILWAY_TOKEN` (Settings → Secrets and variables → Actions). Never paste it into chat, docs or a commit.

**Step 2: Variables (owner, in the Railway dashboard).**
Enter the same names as on Render (`docs/devops/environments.md`): `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGINS=https://tekatech-web.onrender.com`, `RATE_LIMIT_STORAGE_URI=memory://`, `TRUST_PROXY_HEADERS=false`, `TRUSTED_PROXY_HOPS=1`. Copy the values from the Render dashboard; they never pass through chat. **Never** set `FAILURE_SIMULATION_ENABLED`.

**Step 3: Code and config PR (Manuel for `main.py`, Ikeee-AI for the rest; one PR each).**
- `backend/main.py` `/version`: return `APP_COMMIT`, falling back to `RENDER_GIT_COMMIT`, then `local`, so it works on both hosts during the switch. Manuel's PR, with a test.
- `backend/railway.json` (Railway config as code): build `pip install uv==0.12.3 && uv sync --frozen --no-dev --python 3.12`; start `.venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`; healthcheck path `/health`. **Check during the trial** that Railway sets `PORT`; the variables reference page doesn't list it.
- `ci.yml` deploy job and `rollback.yml`: replace the backend Render hook call with the Railway CLI (pinned version), run from a checkout of the target SHA: `railway variables --set APP_COMMIT=<sha> --skip-deploys`, then `railway up --service tekatech-api --ci`. Keep the frontend Render hook. Keep `deployed_smoke.py` unchanged; it checks `/version`, the database path and CORS against `PRODUCTION_API_URL`.
- `scripts/check_secrets.py`: Railway project tokens are UUIDs, so a pattern would flag every UUID. Rely on GitHub secret scanning and Gitleaks instead, and say so in the PR.

**Step 4: Parallel run (Ikeee-AI; production unchanged).**
Deploy the current `main` SHA to Railway with a manual run of the new step. Then check the Railway URL directly:
- `/health` and `/health/ready` (database ok);
- `/version` shows the SHA;
- `/gadgets` returns the same 4 gadgets;
- the CORS preflight from `https://tekatech-web.onrender.com` passes (`deployed_smoke.py --api-url <railway-url>`).

No AI calls. Both APIs read the same database, which is safe because the API stores no state of its own.

**Step 5: Cutover (Ikeee-AI, a quiet hour, announced in the group chat).**
1. Render `tekatech-web` → `VITE_API_BASE_URL` = Railway URL → redeploy the frontend.
2. GitHub variable `PRODUCTION_API_URL` = Railway URL.
3. Run `deployed_smoke.py` against both URLs, then do one sign-in and one catalog click-through.
4. Record the times in the worklog.

The cutover makes no database change.

**Step 6: Keep Render as a fallback for 7 days, then retire it (Ikeee-AI).**
Leave `tekatech-api` on Render running, on the free plan at no cost, with autodeploy off. After 7 clean days, suspend it, remove `RENDER_BACKEND_DEPLOY_HOOK` and the API block from `render.yaml`, and update the docs.
**Done early, 13 Nov 2026 (owner's decision, after 1 day instead of 7):** API block removed from `render.yaml`, fallback steps removed from `ci.yml`/`rollback.yml`, secret removed, Render service suspended by the owner. Railway had passed CI deploys, the rollback rehearsal and the idle check. Same day, `backend/railway.json` was replaced by `.railway/railway.ts`, because Railway stops reading config-as-code files on 2026-12-01 (settings applied with `railway config apply`; see `.railway/README.md`).

**Step 7: Docs (Ikeee-AI).** Update `PIPELINE.md`, `docs/deploy-runbook.md`, `docs/devops/environments.md`, `support-and-maintenance.md`, the README URLs and the scripts with the hard-coded Render API URL (`pilot_monitor.py`, `deploy_challenge_timer.py`, `demo_malformed_requests.py`). Add a `docs/scope-changes.md` entry with the reason and the cost.

## 4. Why CI deploys with `railway up` instead of Railway's GitHub autodeploy

Railway's GitHub autodeploy with "Wait for CI" holds a deploy until **every GitHub Actions workflow on the commit has finished**. Our `ci.yml` deploy job waits for the API to show the new commit (`deployed_smoke.py`, up to 5 min). Each would wait for the other: Railway waits for the workflow, and the workflow waits for Railway. The smoke step would time out and fail, so Railway would then skip the deploy.

Deploying from CI with `railway up` keeps today's rules: deploy only after the three checks and the main guard pass, deploy the exact SHA, and verify it. Rollback stays one workflow that does the same thing. The cost is that Railway's built-in `RAILWAY_GIT_COMMIT_SHA` isn't set for CLI deploys, so `/version` reads `APP_COMMIT` (step 3).

## 5. Verification (what "done" means)

- The CI deploy on a new main commit succeeds, and `deployed_smoke.py` passes against the Railway URL for that SHA. **Done 12 Nov 2026:** runs 43068554699 (`3658c58`) and 43070610868 (`f836e3b`).
- A `rollback.yml` rehearsal on a docs-only pair passes on Railway, as on 31 Oct and 6 Nov. **Done 12 Nov 2026:** 1 min 17 s back to `3658c58`, 1 min 16 s forward to `f836e3b`, both smoke-tested ([evidence](../evidence/rollback-rehearsal-2026-11-12-railway.md)).
- The first request after 30+ min idle answers in under 5 s. The Render baseline is 42.7 s. **Done 13 Nov 2026:** 0.31 s after about 20 h 35 min idle ([evidence](../evidence/railway-idle-first-request-2026-11-13.md)).
- Railway usage after 7 days, extrapolated to a month, is at most $5, or the owner accepts the measured figure.
- The scope-change entry and docs are merged.

## 6. Rollback of the migration itself

**No longer possible since 13 Nov 2026:** step 6 retired the Render API. Before that, undoing the migration took minutes:
1. Set `VITE_API_BASE_URL` back to `https://tekatech-api.onrender.com` and redeploy the frontend.
2. Set `PRODUCTION_API_URL` back.
3. Revert the workflow PR.

No data moves, so there is nothing to restore.

`rollback.yml` on Railway can only restore SHAs that contain the step-3 `/version` change. For older SHAs, use Railway's dashboard rollback (three dots on a past deployment, limited by plan retention) (the Render fallback is gone since 13 Nov).

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Bill grows (a loop, high traffic) | Railway usage limit; check the usage page weekly; public `/query` is already rate-limited and the OpenAI balance is a $10 prepaid cap |
| Trial ends before Hobby is chosen | Services stop, but production is still on Render until cutover; cut over only after upgrading |
| Build differs from Render (Railpack/Nixpacks detection) | Explicit start command and health check (in `railway.json`, since 13 Nov `.railway/railway.ts`); parallel run in step 4 before cutover |
| Railway's proxy changes the visitor IP | Proxy trust stays off (all visitors share one bucket), same as today on Render |
| Token leak | Project token limited to the production environment, stored only as a GitHub secret; rotate it in Railway if exposed |
| Change near Demo Day | Don't start before the Sprint 5 review (Sat 7 Nov 15:00); keep Render as a fallback for 7 days (cut short to 1 day by the owner on 13 Nov) |

## 8. Open questions for the owner

1. ~~Move or not (section 0)? If yes, when?~~ **Answered 7 Nov: yes, after the Sprint 5 review on Sat 7 Nov.**
2. ~~Approve Hobby at $5/month from the end of the trial, with a usage limit of about $10?~~ **Answered 11 Nov: the owner purchased $5 of Railway.** Still to confirm: that it is the Hobby plan, and that a usage limit (about $10) is set in Railway billing.
3. Custom domain (for example `api.<domain>`), or the free `*.up.railway.app` URL?
4. Who reviews the workflow PR: Manuel (backend) or Jopher?

Sources (read 6 Nov 2026): [Railway pricing](https://railway.com/pricing), [variables reference](https://docs.railway.com/reference/variables), [regions](https://docs.railway.com/reference/deployment-regions), [GitHub autodeploys / Wait for CI](https://docs.railway.com/guides/github-autodeploys), [deployment actions / rollback](https://docs.railway.com/guides/deployment-actions), [Railway GitHub Actions guide](https://railway.com/guides/github-actions), [course page](https://csp221a.vercel.app/).
