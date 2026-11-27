# Main / production incident log

No main-branch or production-deployment incidents have been recorded as of 16 October 2026. The application is deployed on Render: main runs [38174257006](https://github.com/Ikeee-AI/TekaTech/actions/runs/38174257006) (`53f62e9`) and [38238577447](https://github.com/Ikeee-AI/TekaTech/actions/runs/38238577447) (`68b4c5a`) deployed and passed smoke checks, with no failed main build or deployment. Do not manufacture incidents for grading.

Local preparation findings on 12 October 2026 (not production incidents): invalid UTF-8 blocked the frontend build and was corrected; configured Supabase project DNS failed; the one provider test returned credit_balance_exhausted. The database blocker is resolved. Provider credit was restored on 22 October 2026, when a real local embeddings call passed ([evidence](../evidence/openai-local-2026-10-22.json)). Hosting status is tracked in the deploy runbook and metrics.

For every later broken build reaching main or failed production deployment, add:

- Date, affected commit, workflow/deploy link and impact.
- Detection and recovery timestamps.
- What happened and root cause.
- Fix or rollback, and a concrete prevention step.
- Responsible teammate and follow-up issue.

## Database setup finding: restore timing and RPC ambiguity

12 October 2026; setup finding, not a production outage. The project reported COMING_UP and catalog queries returned no public relations. The foundation migration applied while restoration was finishing. The restored schema then exposed two `match_spec_documents` overloads with the same argument names, so PostgREST rejected backend calls with PGRST203. Existing data remained intact.

Fix: inspect the ACTIVE_HEALTHY schema, save its function definitions locally, verify the known old five-column signature has zero dependent objects, and remove only that overload through a registered reconciliation migration. All six read-only backend database checks then passed, and FastAPI `/gadgets` returned 200.

Prevention: wait for ACTIVE_HEALTHY before schema inspection; abort unknown signatures/dependents; run the legacy-overload and public-vector cases in CI. The Supabase advisor findings remain documented in `docs/evidence/supabase-sprint-1.json` for hardening.

## Sprint 2 process exceptions (no production impact)

### PE-1 — Unreviewed commit reached main (16 Oct 2026)
- **What:** `ed37f45` "Add Adrian Flores as AI Developer in README" was committed directly to `main` through the GitHub web editor (16 Oct 19:54 Manila), without a PR or review. Main CI ran and deployed it ([run 38896878097](https://github.com/Ikeee-AI/TekaTech/actions/runs/38896878097)).
- **Impact:** documentation-only, one line; production behaviour unchanged. Process impact: a merge to main without teammate review.
- **Detection:** 17 Oct during the Saturday status review (commit had no associated PR).
- **Cause:** branch protection and rulesets are unavailable on this private Free-plan repository (HTTP 403), so direct pushes cannot be blocked; the rule was only a team convention.
- **Prevention:** `Main guard` job ([#40](https://github.com/Ikeee-AI/TekaTech/pull/40), live since `20909ab`): a commit without a merged, teammate-approved PR no longer deploys and opens a `process` issue. Guard tested against history (blocks `ed37f45` and the unreviewed #15 merge). Team reminded: all changes through PRs. Owner: Ikeee-AI.

### PE-2 — Teammate PRs ran no CI (16–17 Oct 2026)
- **What:** PRs #35, #36, #37 and #39 were opened from forks. Fork PR workflows were disabled by default on the private repository, so none of them ran the required checks.
- **Detection:** 17 Oct ~18:30 Manila (PR checks list empty). **Recovery:** fork PR workflows enabled with read-only token and no secrets; PRs re-triggered; all four green by ~19:00. About 22 hours for the earliest PR (#35: opened Fri 16 Oct 21:03, checks green Sat 17 Oct ~19:00 Manila).
- **Prevention:** settings recorded in PIPELINE.md; teammates now have write access and should push branches to the main repository.

### PE-3 — Weekly dependency audit could not fail (17 Oct 2026)
- **What:** the first run of `ops-weekly.yml` ([39030954463](https://github.com/Ikeee-AI/TekaTech/actions/runs/39030954463)) found 18 known vulnerabilities in 3 packages but reported success: steps ran without `pipefail` so `audit | tee` masked the exit code.
- **Detection:** same evening, by checking the run against the known findings in #28. **Fix:** [#52](https://github.com/Ikeee-AI/TekaTech/pull/52) sets `shell: bash`; verified on the branch ([39031057744](https://github.com/Ikeee-AI/TekaTech/actions/runs/39031057744)) — audit now fails correctly.
- **Lesson:** verify a new check can fail before trusting its green result. Owner: Ikeee-AI.

### PE-4 — Main guard false positive blocked an approved deploy (17 Oct 2026)
- **What:** after PR #26 (approved by Manuel on its final commit) was squash-merged at 21:57:54 Manila, the main guard ran 2 s later, before GitHub had linked commit `28132c9` to the PR. It reported "no merged pull request", skipped the deploy and opened #63 ([run 39038725331](https://github.com/Ikeee-AI/TekaTech/actions/runs/39038725331)).
- **Impact:** none for users — a CI-only change; production stayed on the previous good commit `7cb92f3` for ~5 minutes.
- **Detection:** immediately, by the gated merge script (`STOP #26: main pipeline/deploy not successful`).
- **Recovery:** re-ran the failed jobs once GitHub had linked the PR; guard passed, deploy and smoke succeeded. #63 closed as a false positive. Recovery time ≈ 5 min.
- **Cause:** the guard assumed the commit→PR link exists the moment `main` changes; it is created asynchronously.
- **Prevention:** [#64](https://github.com/Ikeee-AI/TekaTech/pull/64) retries the lookup up to 6×10 s before failing. Owner: Ikeee-AI.

## 2026-10-18 gitleaks finding on PR #53 (false positive, recorded 23 Oct)

- **What:** PR run [39108805358](https://github.com/Ikeee-AI/TekaTech/actions/runs/39108805358) at 15:44 Manila failed the full-history secret scan: "leaks found: 1". The branch was force-pushed at 15:45, and the next run passed. Nobody recorded it at the time; it was found while computing the Sprint 3 metrics.
- **Check (23 Oct, 17:39 Manila, Ikeee-AI, AI-assisted):** ran gitleaks 8.30.1 locally (Windows build, SHA-256 checked against the release's checksum file) on the flagged commit `e6e7b7f` only, with `--redact`.
- **Result:** rule `generic-api-key`, `docs/evidence/sprint2-persistence.json` line 4. The value is `b3c98e0e593771c977011cadffef24b8498cde48`, a commit in this repository (#36), stored under the key `"api_commit"`. The key name plus a 40-character hex value matched the generic rule. The force-push renamed the key to `"backend_commit"`, which is what main has today.
- **Impact:** none. No credential was exposed, and nothing needs rotating.
- **Lesson:** record every red secret-scan run, even when the next push passes, and check it before moving on. The CI step runs without `-v`, so the log only shows the count. A local `gitleaks git --redact --log-opts="<sha>~1..<sha>"` gives the rule and file without showing the value.


## 2026-10-31: GitHub Actions stopped starting jobs (October minutes used up)

**Status: resolved 1 Nov 2026** (recovery time 18 h 19 min to the first first-attempt success; jobs could start from the 00:00 UTC reset). CI/CD outage; **no production impact.** Owner: Ikeee-AI (pipeline/hosting).

- **Affected:** PR #174 head `c45c3f4` (Manuel's rebase). Every workflow on the push failed in 1–2 s with zero steps: [CI 41193288864](https://github.com/Ikeee-AI/TekaTech/actions/runs/41193288864), [PR automated review 41193288867](https://github.com/Ikeee-AI/TekaTech/actions/runs/41193288867), [owner-area labels 41193288338](https://github.com/Ikeee-AI/TekaTech/actions/runs/41193288338). The jobs' annotation: "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings".
- **Impact:** no workflow can start, so no PR can pass the merge gate, main can't deploy, and the scheduled ops jobs (daily production smoke, weekly AI smoke) can't run. Production was unaffected: it kept serving `d3f2192`, which passed its deployed smoke at 09:53 UTC ([main run 41190208701](https://github.com/Ikeee-AI/TekaTech/actions/runs/41190208701)). PRs #174, #176 and #177 were held unmerged.
- **Timeline (UTC):**
  - 09:56: last successful workflow run ([41190689611](https://github.com/Ikeee-AI/TekaTech/actions/runs/41190689611)).
  - 10:34: first blocked runs, on Manuel's push.
  - About 10:40: detected and reported by Manuel to Ikeee-AI, with the annotation and his local test run (586 passed).
  - 10:45–10:47: confirmed by Ikeee-AI on the account's billing pages.
  - 1 Nov 00:00 UTC (08:00 Manila): monthly included usage reset.
  - 1 Nov 04:52 UTC: first workflow to succeed on its first attempt, the scheduled production health check ([run 41274762744](https://github.com/Ikeee-AI/TekaTech/actions/runs/41274762744)). **Recovery time: 18 h 19 min** from the first blocked run.
  - 2 Nov, morning UTC: the blocked runs on #174 and #178 were re-run and passed (#174's CI finished 05:35 UTC); #176, #177, #174 and #178 merged and deployed 05:37–05:47 UTC.
  - 2 Nov 08:20 UTC: prevention #182 merged (fewer job starts per PR event; measured 8 → 6 jobs per PR opened, see [optimizations.md](optimizations.md)).
- **Root cause:** the repository is private, so Actions minutes count against the account's monthly included usage. October's metered Actions usage reached about $12.50 gross (1–31 Oct; $0 billed every day). The account's **"Ikeee-AI – Actions" budget is $0.00 with "Usage blocked"**, so once the included usage was used up, GitHub stopped starting jobs instead of billing. No payment failed. Volume: **981 workflow runs in October** (CI 346, PR automated review 262, owner-area labels 201, reviewer assignment 92, ops 23, Dependabot about 50). Every job is billed as at least one minute. Release day alone (31 Oct) had about 20 merges and pushes.
- **Fix:** wait for the 1 Nov reset (no cost). Then re-run the failed jobs on #174 (no new push needed), re-check the gate on #174, #176 and #177, merge, and run `verify-deploy`. Fallback, if a change must ship before the reset: raise the Actions budget to a small cap (for example $5, which needs a payment method). Not used, because nothing was urgent.
- **Prevention (Ikeee-AI, Sprint 5):**
  1. Fold the three small PR workflows (automated review, owner-area labels, reviewer assignment; 555 runs in October) into one job, and record the before/after minutes in `optimizations.md`.
  2. Turn on the included-usage alert and check the billing page before release days.
  3. Add Actions minutes used to the weekly metrics row.
  4. Ask the instructor whether the repository may be public: unlimited Actions minutes, and enforced branch protection becomes available on the free plan. The full-history Gitleaks scan on 31 Oct was clean.
  - Follow-up issue: to be opened with the owner's go-ahead.
- **Lesson:** a $0 budget is a good safety net against surprise charges, but it turns "out of minutes" into a full CI/CD stop. Watch the usage as closely as the deploys.


## 2026-11-03: saved questions failed on production (SQL applied to dev only)

**Status: resolved 3 Nov 2026** (about 49 min from deploy to recovery). Partial feature outage on production; answers kept working. Owner: Ikeee-AI (PR author and release; the SQL was applied by the owner).

- **Affected:** #210 (per-gadget AI conversation), merge commit `3986bf1`, [main run 41644306595](https://github.com/Ikeee-AI/TekaTech/actions/runs/41644306595) (all jobs green, deploy job included). The deployed smoke check passed at 13:29:32 UTC (`.local/deployed-smoke-3986bf1.json`, local): it covers `/version`, CORS and readiness, not the new table.
- **Impact:** for signed-in users, `GET /me/gadgets/{id}/questions` answered 503 and the gadget page showed "Couldn't load your earlier questions right now." Questions asked in that window were answered normally but not saved (the save is wrapped so it never fails `/query`). Anonymous use, the catalog, specs and comparisons were unaffected. No data was lost or exposed.
- **Timeline (UTC):**
  - 13:26: #210 merged by the owner after the manual gate; the gate accepted the PR's "applied" note for `backend/sql/user_questions.sql`.
  - 13:29: deploy live; smoke passed.
  - About 13:30–13:43: detected during the production browser check (Claude Code in Chrome, test account): the questions request returned 503 on iPhone 15 and Rog Ally. Render logged `Gadget questions read failed: APIError` (seen 13:43–13:49 in the "last hour" view; earlier lines were outside that window).
  - 13:48: the owner ran `to_regclass('public.user_questions')` in the SQL Editor, which returned the table, but the project was **TekaTech-dev** (`efdgguybkampozuvqjrz`); its own `main` branch shows a "PRODUCTION" badge.
  - About 14:15: cause found (production uses the live project `lqswcmkzygqmnblaukco`); the owner applied `user_questions.sql` there and ran the PR's checks (RLS on; `authenticated` has no SELECT).
  - About 14:18: recovered. The page loaded with GET 200; two questions were saved and survived a reload; Regenerate replaced its turn; New Chat cleared the thread (Render logged `status=204` at 14:22:06 and 14:23:13). **Recovery time: about 49 min** from the deploy.
- **Root cause:** the migration was applied to the dev project only, and #210's description recorded it as "applied" without saying which project. Neither the merge gate nor the smoke check checks the live database for a new table, so nothing caught it before users could.
- **Fix:** applied `backend/sql/user_questions.sql` to the live project (replay-safe). No code change, revert or redeploy.
- **Prevention (Ikeee-AI):**
  1. `pr-gate` now requires a PR with SQL changes to name the project it was applied to, and that project must be the live one (`lqswcmkzygqmnblaukco`), checked before merging (done 3 Nov, with this record).
  2. Corrected on #210: the SQL reached the live project at about 14:15 UTC, after the merge.
  - Follow-up issue: none opened; the gate change covers it. Optional later: extend `scripts/deployed_smoke.py` with a signed-in check, which needs a test-account token in CI (not planned).
- **Lesson:** "applied" means nothing without the project ref. The Supabase "PRODUCTION" badge marks a project's main branch, not the live project.

## 2026-11-08: scheduled production health check timed out (Render API)

**Status: resolved by 9 Nov 2026, recorded 13 Nov.** Ops-health failure on production. The cause was not confirmed. Owner: Ikeee-AI.

- **Affected:** production API on Render's free tier, expected commit `3d9be35`. [Run 42448801063](https://github.com/Ikeee-AI/TekaTech/actions/runs/42448801063) (scheduled `Ops - production health`) opened incident issue [#243](https://github.com/Ikeee-AI/TekaTech/issues/243).
- **Impact:** unknown for users. The check got no response at all: all 12 smoke attempts, 25 s apart (04:57–05:01 UTC), ended in `TimeoutError`. It returned no HTTP error and no wrong commit. Nobody checked the site by hand during the window, and no user report was received.
- **Timeline (UTC):**
  - 2026-11-08 04:57: first timed-out attempt.
  - 2026-11-08 05:01: run failed after attempt 12/12; #243 opened automatically. **Detected** (13:01 Manila).
  - The issue was not acted on at the time; there was no manual re-run or log check.
  - 2026-11-09 05:05: next scheduled run ([42565284577](https://github.com/Ikeee-AI/TekaTech/actions/runs/42565284577)) passed. **Recovery: within about 24 h.** This is an upper bound, because the check runs once a day.
  - 10–12 Nov: daily runs passed ([42768012291](https://github.com/Ikeee-AI/TekaTech/actions/runs/42768012291), [42963658470](https://github.com/Ikeee-AI/TekaTech/actions/runs/42963658470), [43166364726](https://github.com/Ikeee-AI/TekaTech/actions/runs/43166364726)).
  - 2026-11-13: #243 closed with a note.
- **Root cause:** not confirmed. The API was not reachable within the smoke timeout for about 5 minutes. The likely causes are a free-tier Render instance that was slow to wake from idle or stalled on Render's side. Render logs for that window were not checked before they aged out.
- **Fix:** none needed; the service recovered without any change.
- **Prevention (Ikeee-AI):**
  1. Since 12 Nov the production API runs on Railway Hobby, which does not sleep when idle (#250). The Render API is only a fallback until about 19 Nov.
  2. Look at an automatic `incident` issue on the day it opens: re-run the health check by hand and check the host logs while they still cover the window. Without that, recovery time can only be bounded by the next daily run.
  - Follow-up issue: none.
- **Lesson:** an automatic issue is only detection. Without someone looking the same day, the cause and the real recovery time are lost.

## 2026-11-11: first Railway deploys from CI failed (`Invalid RAILWAY_TOKEN`)

**Status: resolved 11 Nov 2026, recorded 13 Nov** (from the 12 Nov worklog and the run logs). Failed production deploy; no user impact. Owner: Ikeee-AI.

- **Affected:** #250's merge commit `c4cce99`, [main run 43068375474](https://github.com/Ikeee-AI/TekaTech/actions/runs/43068375474), and the next main commit `3658c58`, [run 43068554699](https://github.com/Ikeee-AI/TekaTech/actions/runs/43068554699) attempts 1 and 2. All failed at the new `Deploy backend to Railway` step. In each run the Render frontend hook had already run and `Verify live commit…` was skipped.
- **Impact:** none for users. The live API was the Railway build deployed by hand during the cutover (`02762f5`, about 00:33 Manila on 12 Nov), and it kept serving. The frontend rebuilds that ran contained no frontend change (#250 changed no `frontend/` files). For about 11 minutes, `main` was not what the API served.
- **Timeline (UTC, 11 Nov):**
  - 17:27:39: main run for `c4cce99` started.
  - 17:28:55: failed at `Deploy backend to Railway`: `Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.` **Detected** at once, while the owner and Claude Code were watching the first CI deploy.
  - 17:28:47–17:30:25: `3658c58` run, attempt 1, same error. 17:33:41–17:33:55: attempt 2, after the secret was saved again, same error.
  - Between 17:34 and 17:38 (exact time not recorded): cause found. A third project token was tested from a folder that wasn't linked, then saved with `gh secret set RAILWAY_TOKEN --body …`.
  - 17:38:23–17:39:48: attempt 3 succeeded: Railway deploy of `3658c58`, deployed smoke passed. **Recovered: about 11 min** from the first failure (17:28:55 → 17:39:48).
- **Root cause:** the token was piped into `gh secret set` from Windows PowerShell 5.1, which added a trailing CRLF to the stored secret. Railway's CLI sent the token with the line break and got "Invalid". The token itself was valid; the manual `railway up` during the cutover had worked from a logged-in CLI, not with this secret.
- **Fix:** a new token saved with `--body` (no pipe). The two earlier tokens were deleted in Railway by the owner.
- **Prevention (Ikeee-AI):**
  1. Runbook: save secrets with `--body`, never by piping from PowerShell, and test a new token from a folder that isn't linked first (`docs/deploy-runbook.md`, Railway section; added 13 Nov).
  - Follow-up issue: none.
- **Lesson:** a secret can be wrong in ways nobody can see. When a credential that works by hand fails in CI, suspect how it was stored before suspecting the credential.


## 2026-11-27: main deploy of #300 failed (Railway built the new `backend/Dockerfile`)

**Status: resolved 27 Nov 2026 (#304), recovery 24.6 min.** Failed production deploy; no user impact. Owner: Ikeee-AI.

- **Affected:** #300's merge commit `cecea63` (judge Docker setup), [main run 45970637526](https://github.com/Ikeee-AI/TekaTech/actions/runs/45970637526). Backend, frontend, database and browser checks and the main guard passed; `Deploy backend to Railway` failed (`1/1 replicas never became healthy! Healthcheck failed!`), so `Verify live commit…` was skipped. The Render frontend hook had already run; #300 changed no frontend code the static site builds (its `frontend/Dockerfile` is ignored by Render).
- **Impact:** none for users. Railway kept serving the previous deploy, `02e1bfa` (#302), and `/version` returned it throughout. `main` has been ahead of the API since then; #300 only adds the local Docker files and docs, so no feature is missing from production.
- **Timeline (UTC, 27 Nov):**
  - 09:04:18: main run for `cecea63` started.
  - 09:05:17: `Deploy backend to Railway` started; Railway built from `backend/Dockerfile` (`uv sync`, CPython 3.12 image) instead of Railpack.
  - 09:06:21–09:07:46: six `/health` attempts, all "service unavailable".
  - 09:07:58: step failed. **Detected** at once: the owner's Claude Code session was watching the run, and the deployed smoke check reported the API still on `02e1bfa`.
  - About 09:15: cause found (Dockerfile picked up by `railway up backend --path-as-root`; the image starts uvicorn on port 8000, not `$PORT`). Fix PR #304 opened.
  - 09:30:17: #304 (approved by Manuel on `9ad2ab6`) merged as `5a86eb2`; [main run 45974250128](https://github.com/Ikeee-AI/TekaTech/actions/runs/45974250128) deployed with Railpack.
  - 09:32:35: deployed smoke passed on `5a86eb2` (both hosts on the commit, 23 gadgets). **Recovered: 24.6 min** from the failed step (09:07:58 → 09:32:35). The next deploy (`f4ffb7f`, #303) also passed.
- **Root cause:** CI uploads `backend/` to Railway with `--path-as-root`. Railway builds a `Dockerfile` found at the root of the upload in preference to the `RAILPACK` builder set in `.railway/railway.ts`. `backend/Dockerfile` was written for local Docker (fixed port 8000) and never meant for Railway. The Docker PR's own CI could not catch it: PR runs don't deploy, and the `Docker images` workflow only runs the image locally.
- **Fix:** #304 renames it to `backend/api.Dockerfile` (compose `dockerfile:`, `docker.yml`, `.dockerignore`, `docs/docker.md`), so Railway builds with Railpack exactly as before.
- **Prevention (Ikeee-AI):**
  1. `backend/tests/test_railway_build.py` fails if a file named `Dockerfile` appears in `backend/` again.
  2. When a PR adds build files (Dockerfile, Procfile, `nixpacks.toml`, `railpack.json`) under `backend/`, check what Railway would do with them before merging, because a PR run never deploys.
  - Follow-up issue: none.
- **Lesson:** a file added for one platform can change how another platform builds the same folder. Build-detection files are deploy configuration even when the PR says production is unchanged.
