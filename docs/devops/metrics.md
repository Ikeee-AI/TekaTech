# Weekly pipeline metrics

Owner: the one DevOps Engineer. Record real GitHub Actions and Render deployment timestamps/run links before each consultation. The initial hosted PR run is recorded below. This is the baseline snapshot at 2026-10-11 19:19:19 UTC, before subsequent documentation updates; later runs must be added before consultation. Pending values are unknown, not zero.

| Week | Avg PR pipeline (min) | Main pipeline (min) | Success rate (%) | Production deploys | Avg merge-to-live (min) | Failed deploys | Recovery (min) | Change this week |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sprint 1 initial baseline | 0.67 (1 run) | Not run | 100 (1/1 completed) | 0 | Not applicable (no merge) | 0 (no deploy attempts) | Not applicable | First PR CI passed with caches, parallel checks and SQL integration |
| Sprint 2 (12–18 Oct; cut-off 18 Oct 15:41 Manila) | 0.68 (55 runs) | 2.17 (21 runs) | 100.0 (77/77 runs, run level; 1 first-attempt failure re-run, PE-4) | 21 | 2.27 (20 samples) | 0 (1 failed first attempt, no impact) | N/A (no production incident) | Metrics script; actionlint + gitleaks gates; main guard; scheduled ops; Dependabot; squash-only merges |
| Sprint 3 (interim: 18 Oct 15:41 – 23 Oct 17:30 Manila) | 0.76 (40 runs) | 2.70 (12 runs) | 98.1 (51/52 runs; 5 cancelled excluded) | 12 | 2.70 (12 samples) | 0 | N/A (no production incident) | Caching on public reads (#73); weekly live AI smoke job (#79) + key fix (#86); OpenAI keys rotated with a $10 prepaid hard cap (#76); fork-PR labeler (#67) |
| Sprint 3 final (18–25 Oct UTC; cut-off 25 Oct 19:45 Manila) | 0.71 (88 runs) | 2.75 (25 runs) | 99.1 (112/113 completed; 18 cancelled/skipped excluded) | 25 | 2.77 (25 samples) | 0 | N/A (no production incident) | Database job uses the runner's `psql` (#107, PR checks median 37 s → 27 s); offline prompt evaluation on prompt/eval PRs (#102); smoke-job key cleaning (#86) |
| Sprint 4 (interim: 26–28 Oct UTC; cut-off 28 Oct 23:10 Manila) | 0.66 (53 runs) | 2.70 (19 runs) | 100.0 (72/72 completed) | 19 | 4.09 (19 samples) | 0 | N/A (no production incident) | Vitest unit tests in the frontend job (#137); Playwright failure-drill browser job (#128); stacked review batch #130–#139 merged; readiness check and request IDs (#136); retrieval fix with manual SQL (#145, #129) |
| Sprint 4 final (26–31 Oct UTC; cut-off 31 Oct 14:45 Manila) | 0.72 (71 runs) | 2.78 (24 runs) | 100.0 (95/95 completed) | 24 | 3.88 (24 samples) | 0 | N/A (no production incident); rollback rehearsal 1 min 35 s | 15 PRs merged on release day; `v1.0.0` tagged on `5aa4635`; production rollback and database restore rehearsed; full-history Gitleaks clean |
| Sprint 5 interim (1–2 Nov UTC; cut-off 2 Nov 19:30 Manila) | 0.96 (16 runs) | 2.50 (16 runs) | 100.0 (32/32 completed) | 16 | 2.54 (16 samples) | 0 | 18 h 19 min CI/CD outage (31 Oct 10:34 UTC → first successful run 1 Nov 04:52 UTC); no production incident | Actions-minutes cut (#182): 8 → 6 jobs per PR opened, measured; labeler rules fixed (#190); pilot plan and sampler (#183); Dependabot updates merged (#179–#181) |
| Sprint 5 interim 2 (1–5 Nov UTC; cut-off 5 Nov 23:55 Manila) | 1.21 (60 runs) | 3.23 (50 runs) | 99.1 (109/110 completed; 1 cancelled/skipped excluded) | 50 | 2.80 (50 samples) | 0 | N/A (no production deploy failure); 3 Nov SQL-on-dev incident recovered in about 49 min | The one failure was a PR run on the #210 branch (3 Nov, fixed before merge); main had 0 CI failures. 50 deploys in 5 days (#194–#234). `pipeline_metrics.py` now retries transient `gh api` errors after four failed attempts on 5 Nov (TLS timeouts, one HTTP 502). Report: [sprint5-metrics-interim-2026-11-05.json](../evidence/sprint5-metrics-interim-2026-11-05.json) |
| Sprint 5 final (1–6 Nov UTC; cut-off 6 Nov 15:45 Manila, after the `v1.1.0` tag) | 1.21 (61 runs) | 3.25 (53 runs) | 99.1 (113/114 completed; 1 cancelled/skipped excluded) | 53 | 2.85 (53 samples) | 0 | N/A (no production deploy failure); 3 Nov SQL-on-dev incident recovered in about 49 min | `v1.1.0` tagged on `db49bc2` (6 Nov); since interim 2, three more main deploys (#235, #236, #239), smoke-checked on production on `a7c5c46` and `db49bc2` (#235's `6d8c5d5` was superseded within seconds, not checked on its own); the only failure is still the 3 Nov #210 PR run (main 0 CI failures). `pipeline_metrics.py` retries transient `gh api` errors (1eee327). Report: [sprint5-metrics-final.json](../evidence/sprint5-metrics-final.json) |

Measurement rules:

- Pipeline duration: start to finish of the whole workflow; record cancelled/superseded runs separately, never as successful.
- Success rate: successful completed check workflows / all completed check workflows, with scope and period recorded. Keep deploy failures separately visible.
- Production deploy count: actual successful live deployments, not hook requests.
- Merge-to-live: merge timestamp to BOTH services being live at that commit. Recovery: confirmed user-impacting failure to restored healthy behavior.
- Link each data point to a run/deploy/commit. Local command durations and mocked tests do not establish these metrics.

## Initial hosted data point

[CI run 38167468464](https://github.com/Ikeee-AI/TekaTech/actions/runs/38167468464), commit `b82e068499a5920821842b52c67e5fd70d20673b`, PR #1. Started `2026-10-11T19:18:39Z`; finished `2026-10-11T19:19:19Z`: 40 seconds (0.67 minutes). Backend job 18 seconds; frontend 22 seconds; database 36 seconds. Jobs ran in parallel. Deployment skipped because this is a PR. This single run establishes a baseline, not an optimization before/after comparison.

## Later verification snapshot

[PR run 38172679951](https://github.com/Ikeee-AI/TekaTech/actions/runs/38172679951), commit `a9d9bc39887b91154e4d096f0b8afddc09db58ae`, PR #15: successful; started `2026-10-11T20:33:02Z`, finished `2026-10-11T20:33:46Z`, 44 seconds (0.73 minutes). This is another observed run, not a complete weekly average or a measured optimization.

Initial free Render provisioning: frontend deploy `dep-db5v715ckfvc73biiuf0` took about 16 seconds (`20:37:24Z` to `20:37:40Z`). API provisioning took about 76 seconds (`20:37:09Z` to `20:38:25Z`), followed by a CORS-configuration deployment completed at `20:39:37Z`. Public smoke passed at `20:42:36Z`, all on 11 October 2026 UTC / 12 October locally. These were setup deployments before a merge; they do not establish main-pipeline duration or merge-to-live lead time. Record the eventual main workflow separately.

## First main deployment: 12 October 2026 local time

[Main run 38174257006](https://github.com/Ikeee-AI/TekaTech/actions/runs/38174257006) succeeded at merge commit `53f62e994e1431171608c999694b0206a0984dfb`. Merge: `2026-10-11T20:55:55Z`; workflow: `20:55:57Z` to `20:57:49Z`, **112 seconds (1.87 minutes)**. API deployment `dep-db5vg1bbc2fs73a956pg` finished at `20:57:39.692752Z`; frontend `dep-db5vg1nlk1mc73bcmb70` finished at `20:56:55.270767Z`. Both were live **104.692 seconds (1.74 minutes)** after merge.

This is one observed main release with two successful service deployments and no failed service deployments in that release.

## Sprint 2 snapshot: 16 October 2026

Window: Sprint 2 week in Manila time (12–18 Oct), i.e. `2026-10-11T16:00:00Z` to `2026-10-18T16:00:00Z`, workflow `ci.yml` only. Command: `python scripts/pipeline_metrics.py --label "Sprint 2 (to date)" --since 2026-10-11T16:00:00Z --until 2026-10-18T16:00:00Z`. Because the window starts at Manila midnight, it includes the PR #15 merge and [main run 38174257006](https://github.com/Ikeee-AI/TekaTech/actions/runs/38174257006) also described above as the first main deployment. The second deployment is [main run 38238577447](https://github.com/Ikeee-AI/TekaTech/actions/runs/38238577447) for PR #16, merge commit `68b4c5a6cc98852d72f98f818b8fd75de50d827a`. Lead time = PR `merged_at` to deploy-job completion, which only finishes after `deployed_smoke.py` confirms both hosts serve the commit. The GitHub "Dependency Graph" run is a different workflow and is excluded. This row is provisional until the Saturday deadline.

Independent production check at `2026-10-16T06:51:54Z`: `deployed_smoke.py` passed for `68b4c5a` (health, both hosts on the exact commit, 3 gadgets from the database, CORS). The first two attempts timed out while the free API woke; it passed after 55.3 seconds. Record cold starts separately from deployment lead time. It is not a complete weekly average or optimization comparison. Post-deploy smoke passed exact SHA, API health, one real gadget, frontend CORS and direct `/login`; see [safe evidence](../evidence/sprint1-main-deployment.json). Rollback/recovery has not been exercised.

## Sprint 2 final row (cut-off Sunday 18 October 2026, 15:41 Asia/Manila)

Source: `python scripts/pipeline_metrics.py --since 2026-10-11T16:00:00Z --until 2026-10-18T07:41:25Z`, workflow `ci.yml` only. **Raw output committed:** [`docs/evidence/sprint2-metrics.json`](../evidence/sprint2-metrics.json) (includes every deploy run link). The scheduled report produced the same metrics for its rolling window in [run 39030954463](https://github.com/Ikeee-AI/TekaTech/actions/runs/39030954463) (artifact `weekly-metrics`).

Definitions, so the two "about 2.2 minutes" values are not confused:
- **Main pipeline (2.17 min, 21 runs):** start to finish of each `push` run on `main` — checks, main guard, deploy hooks and smoke.
- **Merge → live (2.27 min, 20 samples):** the PR's `merged_at` to completion of that run's deploy job, which only succeeds after `deployed_smoke.py` sees both hosts on the exact commit. One main deploy (`ed37f45`, PE-1) had no PR, so there are 20 samples, not 21.
- **Success rate (77/77):** completed workflow **runs** whose final conclusion is `success`. Job-level skips by design (the deploy job on PR runs) are not failures. No run was cancelled or skipped.
- **Re-run disclosure:** main run [39038725331](https://github.com/Ikeee-AI/TekaTech/actions/runs/39038725331) (#26) failed on its **first attempt** because of the main-guard false positive (PE-4) and passed on a re-run ~5 min later. GitHub reports the final attempt, so it counts as a success above; counting first attempts, main success would be 20/21 and failed deploy attempts 1 (no production impact).
- **PR runs (55):** include the four teammate fork PRs, which ran no CI until fork workflows were enabled on 17 Oct (~22 h for #35, PE-2).

**Persistence across redeploys (Sprint 2 gate):** [`docs/evidence/sprint2-persistence.json`](../evidence/sprint2-persistence.json) — at the cut-off both hosts served `b3c98e0` and the API returned the same 3 gadgets (created 8 Aug and 12 Oct) after the 21 deploys listed in the metrics JSON. Read-only GET requests.

**Full-history secret scan:** gitleaks 8.30.1 runs on every PR and main run since #26; latest main run [39108438489](https://github.com/Ikeee-AI/TekaTech/actions/runs/39108438489): "38 commits scanned", "no leaks found".

## Sprint 3 interim row (23 October 2026, 17:30 Asia/Manila)

Source: `python scripts/pipeline_metrics.py --since 2026-10-18T07:41:25Z --until 2026-10-23T09:30:10Z`, workflow `ci.yml` only. The window starts at the Sprint 2 cut-off, so no run falls between the two rows. Raw output: [`docs/evidence/sprint3-metrics-interim.json`](../evidence/sprint3-metrics-interim.json). The final row will be computed at the Saturday cut-off.

- **The one failure (51/52):** PR run [39108805358](https://github.com/Ikeee-AI/TekaTech/actions/runs/39108805358) on 18 Oct 15:44 (PR #53), in the gitleaks full-history step: "leaks found: 1".
  - The branch was force-pushed 1 minute later, and the next run passed.
  - The flagged commit `e6e7b7f` changed only docs and evidence files. Gitleaks printed no rule or file because the step runs without `-v`.
  - Not recorded at the time. Checked on 23 Oct with a local gitleaks 8.30.1 run (checksum-verified): **false positive**, rule `generic-api-key`, a Git commit SHA under the JSON key `api_commit`. Details are in `docs/devops/incidents.md`.
- **Cancelled runs (5, excluded from the rate):** all were main push runs superseded by back-to-back merges on 23 Oct (same concurrency group): `a0ef344`, `8fd96be`, `0a8337a`, `e4cd02b`, `818e412`. The final main state of each batch was tested and deployed.
- **Main pipeline 2.70 min vs Sprint 2's 2.17 min.** Main runs now include the gitleaks history scan and actionlint (added late in Sprint 2) and the post-deploy smoke retries. The sample is 12 runs, so this is not yet a trend.
- **Merge → live (2.70 min, 12 samples):** from each PR's `merged_at` until that run's deploy job finished, after `deployed_smoke.py` confirmed both hosts were on the exact commit.
- **Recovery:** N/A. #85 (the first AI smoke-job run failing) was a secret-setup error in a scheduled check, not a production outage. Production served normally throughout.

Deploy runs in the window:
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39921588722
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39921422881
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39917503414
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39917475677
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39908877286
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39905853931
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39905783818
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39121654321
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39120000799
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39117644394
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39117462945
- https://github.com/Ikeee-AI/TekaTech/actions/runs/39117295509


## Sprint 3 final: 25 October 2026

Window: `2026-10-18` to `2026-10-25` UTC, workflow `ci.yml` only, cut-off 25 Oct 19:45 Manila. Command: `python scripts/pipeline_metrics.py --label "Sprint 3 final" --since 2026-10-18 --until 2026-10-25`. Full report with every run link: [sprint3-metrics-final.json](../evidence/sprint3-metrics-final.json). 25 production deploys, 0 failed, no CI failure on main. 18 cancelled or skipped runs are excluded from the success rate; most are back-to-back merges in the same concurrency group, where the last run deploys all of them. Latest deploy: [main run 40187481617](https://github.com/Ikeee-AI/TekaTech/actions/runs/40187481617) on `4667bc1`, verified with `deployed_smoke.py` at 19:12 Manila (both hosts on the commit, 4 gadgets, CORS passed). The window overlaps the interim row (18–23 Oct); the final row replaces it for Sprint 3 totals.

## Sprint 4 interim row: 28 October 2026

Window: `2026-10-26` to `2026-10-28` UTC (Mon 26 Oct 08:00 – Thu 29 Oct 08:00 Manila), workflow `ci.yml` only, cut-off 28 Oct 23:10 Manila. Command: `python scripts/pipeline_metrics.py --label "Sprint 4 interim" --since 2026-10-26 --until 2026-10-28`. Full report with every run link: [sprint4-metrics-interim.json](../evidence/sprint4-metrics-interim.json).

- **Deploys:** 19 production deploys, 0 failed, no CI failure on main. Latest: [main run 40712631037](https://github.com/Ikeee-AI/TekaTech/actions/runs/40712631037) on `f1e6151`.
- **#106 (28 Oct):** the main guard blocked one deploy, because the approval wasn't on the merged commit. That isn't counted as a failed deploy (nothing reached production); the re-run after Mika's approval deployed. Recorded in the Sprint 4 log and #144.
- **Merge-to-live:** the median rose to 4.09 min (Sprint 3: 2.77). On 28 Oct many merges landed within minutes of each other in the same concurrency group, so a merge often waited for the previous main run. The new Browser checks job also adds time to each main run. The sample isn't comparable with Sprint 3's until the final row.
- **Deployed smoke:** passed on `77aff2e` (19:04) and on `f9b4c9e` (22:50, after the supervised production failure drill, #118).

## Sprint 4 final row: 31 October 2026

Window: `2026-10-26` to `2026-10-31` UTC, workflow `ci.yml` only, cut-off 31 Oct 14:45 Manila (after the `v1.0.0` release). Command: `python scripts/pipeline_metrics.py --label "Sprint 4 final" --since 2026-10-26 --until 2026-10-31`. Full report with every run link: [sprint4-metrics-final.json](../evidence/sprint4-metrics-final.json).

- **Deploys:** 24 production deploys, 0 failed. Release commit `5aa4635`: [main run 41176164488](https://github.com/Ikeee-AI/TekaTech/actions/runs/41176164488), deployed smoke passed at 14:24 Manila.
- **Merge-to-live:** median 3.88 min (interim 4.09, Sprint 3 2.77). On 31 Oct, 12 merges landed within one minute and 3 more 17 minutes later. GitHub concurrency kept only the latest pending main run: 4 main runs deployed (`163ccba`, `7d2ab44`, `66af748`, `5aa4635`) and 11 superseded runs were cancelled (excluded from the success rate).
- **Rollback and restore:** not part of `ci.yml`, so not in the row's counts. `rollback.yml` rehearsal: 1 min 35 s back, 1 min 45 s forward ([evidence](../evidence/rollback-rehearsal-2026-10-31.md)); database restore to a disposable copy: 14.0 s ([evidence](../evidence/db-restore-2026-10-31.md)).

## Sprint 5 interim row: 2 November 2026

Window: `2026-11-01` to `2026-11-02` UTC, workflow `ci.yml` only, cut-off 2 Nov 19:30 Manila, before the pilot (Wed 4 Nov 12:00). Command: `python scripts/pipeline_metrics.py --label "Sprint 5 interim" --since 2026-11-01 --until 2026-11-02`. Full report with every run link: [sprint5-metrics-interim.json](../evidence/sprint5-metrics-interim.json).

- **Deploys:** 16 production deploys, 0 failed, one per merged PR on 2 Nov (#176, #177, #174, #178, #183, #185, #184, #182, #186, #187, #181, #180, #179, #188, #190, #189). Last: `83fe025`, [main run 41434471182](https://github.com/Ikeee-AI/TekaTech/actions/runs/41434471182), deployed smoke passed at 19:12 Manila. Merges were one at a time (`.local/merge-sequence.sh` waits for each deploy), so no main run was superseded this time.
- **Merge-to-live:** 2.54 min (Sprint 4 final 3.88), because the merges were serial instead of queued.
- **PR pipeline:** 0.96 min average over 16 runs (Sprint 4 0.72). Small sample, including re-runs of runs blocked on 31 Oct and three Dependabot PRs; not comparable yet. Recheck at the Sprint 5 final row.
- **Recovery (CI/CD, no production impact):** the [31 Oct Actions-minutes incident](incidents.md) ran from the first blocked run (31 Oct 10:34 UTC) to the first first-attempt success after the monthly reset ([Ops - production health, 1 Nov 04:52 UTC, run 41274762744](https://github.com/Ikeee-AI/TekaTech/actions/runs/41274762744)): **18 h 19 min**. Jobs could start from the 00:00 UTC reset (13 h 26 min); nothing triggered a run before 04:52.
- **Not in `ci.yml` counts:** the "Dependabot Updates" security job for `minimatch` failed twice on 2 Nov (`security_update_not_possible`: `eslint` 10.13 needs `minimatch` ^10, the fix is 11.0.1; dev-only dependency). It is not a CI or deploy failure.

## Sprint 5 final row: 6 November 2026

Window: `2026-11-01` to `2026-11-06` UTC, workflow `ci.yml` only, cut-off 6 Nov 15:45 Manila (after the `v1.1.0` tag at 15:36). Command: `python scripts/pipeline_metrics.py --label "Sprint 5 final" --since 2026-11-01 --until 2026-11-06`. Full report with every run link: [sprint5-metrics-final.json](../evidence/sprint5-metrics-final.json).

- **Compared with interim 2 (1–5 Nov):** +1 PR run, +3 main runs/deploys. The averages barely move (PR 1.21 → 1.21 min, main 3.23 → 3.25 min, merge-to-live 2.80 → 2.85 min), so the three 6 Nov deploys were typical. The window overlaps interim 2 almost entirely, so this is not an independent comparison.
- **Compared with Sprint 4 final (0.72 / 2.78 / 3.88 min):** PR and main runs are slower. Likely causes, not measured separately: the Playwright browser job and offline prompt evaluation on more PRs, and more frontend tests. Merge-to-live is faster.
- **6 Nov deploys:** [#235 `6d8c5d5`](https://github.com/Ikeee-AI/TekaTech/actions/runs/42176362114), [#236 `a7c5c46`](https://github.com/Ikeee-AI/TekaTech/actions/runs/42176368163), [#239 `db49bc2`](https://github.com/Ikeee-AI/TekaTech/actions/runs/42180181404). Deployed smoke passed on `a7c5c46` (06:50 UTC) and `db49bc2` (07:23 UTC).
- **Recovery:** no production deploy failed in the window. The 3 Nov SQL-on-dev incident (`incidents.md`) recovered in about 49 min.
- Release workflow runs (`release.yml`) are not in these numbers.

