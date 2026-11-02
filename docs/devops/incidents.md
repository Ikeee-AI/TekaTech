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
