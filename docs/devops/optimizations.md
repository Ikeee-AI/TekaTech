# Pipeline optimization log

Use measurements from actual hosted runs with comparable conditions. Planned improvements do not count as measured gains.

| Date / change | Before | After | Measurement links | Lesson |
| --- | --- | --- | --- | --- |
| Sprint 1 baseline: cached uv/npm installs, three independent jobs, cancel stale PR runs | No pre-change hosted baseline | First hosted run: 40 seconds | Baseline only; improvement not measured | [Initial run](https://github.com/Ikeee-AI/TekaTech/actions/runs/38167468464); record cold and warm cache runs separately |
| 2026-10-17 quality gate (cost, not an optimization): actionlint 1.7.12 + shellcheck in Backend tests (#25) | Backend job 14 s without the gate ([run 38898417649](https://github.com/Ikeee-AI/TekaTech/actions/runs/38898417649), branch from main) | Step ~1 s; job 19 s ([run 38889524499](https://github.com/Ikeee-AI/TekaTech/actions/runs/38889524499)) | Single runs: +5 s job difference mostly runner variance (the step itself measured ~1 s); not an average | Cheap checks first; negligible cost for catching broken workflows |
| 2026-10-17 quality gate (cost): gitleaks 8.30.1 full-history scan (#26, awaiting re-approval) | Backend job 19 s (actionlint only) | Step ~1 s; job 18 s ([run 38897611805](https://github.com/Ikeee-AI/TekaTech/actions/runs/38897611805)); `fetch-depth: 0` adds no measurable checkout time on this small repo | Single run | Revisit if history grows |
| Sprint 3 target (#31): path filters / fail-fast ordering | Sprint 2 average PR pipeline 0.66 min (37 runs) | Pending | — | Use comparable multi-run samples |

Potential later experiments: changed-path filtering, lint first, test split only if needed, reusable build outputs, and removing redundant work. Keep migration checks whenever SQL or relevant backend contracts change. Provider tests remain mocked so cost/outages do not block ordinary deployment.
