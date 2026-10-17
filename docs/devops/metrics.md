# Weekly pipeline metrics

Owner: the one DevOps Engineer. Record real GitHub Actions and Render deployment timestamps/run links before each consultation. The initial hosted PR run is recorded below. This is the baseline snapshot at 2026-10-11 19:19:19 UTC, before subsequent documentation updates; later runs must be added before consultation. Pending values are unknown, not zero.

| Week | Avg PR pipeline (min) | Main pipeline (min) | Success rate (%) | Production deploys | Avg merge-to-live (min) | Failed deploys | Recovery (min) | Change this week |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sprint 1 initial baseline | 0.67 (1 run) | Not run | 100 (1/1 completed) | 0 | Not applicable (no merge) | 0 (no deploy attempts) | Not applicable | First PR CI passed with caches, parallel checks and SQL integration |
| Sprint 2 (12–18 Oct; as of 17 Oct 20:04 Manila) | 0.66 (37 runs) | 2.19 (10 runs) | 100.0 (48/48 completed) | 10 | 2.19 (9 samples) | 0 | N/A (no production incident) | Metrics script; actionlint + gitleaks gates; main guard; scheduled ops; Dependabot; squash-only merges |
| Sprint 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| Sprint 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |

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

## Sprint 2 final row: 17 October 2026

Computed with `python scripts/pipeline_metrics.py --since 2026-10-11T16:00:00Z --until 2026-10-17T12:04Z` (Sprint 2 week in Manila time; `ci.yml` only). Raw JSON kept locally; the scheduled `ops-weekly.yml` produced the same values for its rolling window ([run 39030954463](https://github.com/Ikeee-AI/TekaTech/actions/runs/39030954463), artifact `weekly-metrics`).

- **PR pipeline:** 37 completed PR runs, average 0.66 min. Includes the four teammate fork PRs, which only started running CI after fork workflows were enabled on 17 Oct ~18:55 Manila.
- **Main pipeline:** 10 runs, average 2.19 min; **10 successful production deploys, 0 failed**. Seven of them were the gated merge sequence on 17 Oct (#19, #17, #25, #27, #29, #30, #40; 19:42–20:01 Manila), each smoke-verified before the next merge.
- **Merge → live:** 2.19 min average over 9 PR-backed deploys. The tenth main deploy (`ed37f45`) was a direct push without a PR, so it has no merge timestamp; it is recorded as a process exception in `docs/devops/incidents.md`.
- **Success rate:** 48/48 completed runs; no cancelled or skipped runs in the window.
- **Recovery time:** N/A — no production incident.
- **Persistence across redeploys (Sprint 2 gate):** production served the same 3 gadgets (created 8 Aug and 12 Oct) after all seven 17 Oct redeploys (checked at ~20:00 Manila, commit `a79076d`).
