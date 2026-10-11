# Weekly pipeline metrics

Owner: the one DevOps Engineer. Record real GitHub Actions and Render deployment timestamps/run links before each consultation. The initial hosted PR run is recorded below. This is the baseline snapshot at 2026-10-11 19:19:19 UTC, before subsequent documentation updates; later runs must be added before consultation. Pending values are unknown, not zero.

| Week | Avg PR pipeline (min) | Main pipeline (min) | Success rate (%) | Production deploys | Avg merge-to-live (min) | Failed deploys | Recovery (min) | Change this week |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sprint 1 initial baseline | 0.67 (1 run) | Not run | 100 (1/1 completed) | 0 | Not applicable (no merge) | 0 (no deploy attempts) | Not applicable | First PR CI passed with caches, parallel checks and SQL integration |
| Sprint 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
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
