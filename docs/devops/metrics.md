# Weekly pipeline metrics

Owner: the one DevOps Engineer. Record real GitHub Actions and Render deployment timestamps/run links before each consultation. No hosted runs exist yet. Pending values are unknown, not zero.

| Week | Avg PR pipeline (min) | Main pipeline (min) | Success rate (%) | Production deploys | Avg merge-to-live (min) | Failed deploys | Recovery (min) | Change this week |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sprint 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Added caches, parallel checks, SQL integration and deployment gate |
| Sprint 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| Sprint 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| Sprint 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |

Measurement rules:

- Pipeline duration: start to finish of the whole workflow; record cancelled/superseded runs separately, never as successful.
- Success rate: successful completed check workflows / all completed check workflows, with scope and period recorded. Keep deploy failures separately visible.
- Production deploy count: actual successful live deployments, not hook requests.
- Merge-to-live: merge timestamp to BOTH services being live at that commit. Recovery: confirmed user-impacting failure to restored healthy behavior.
- Link each data point to a run/deploy/commit. Local command durations and mocked tests do not establish these metrics.
