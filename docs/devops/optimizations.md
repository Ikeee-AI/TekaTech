# Pipeline optimization log

Use measurements from actual hosted runs with comparable conditions. Planned improvements do not count as measured gains.

| Date / change | Before | After | Measurement links | Lesson |
| --- | --- | --- | --- | --- |
| Sprint 1 baseline: cached uv/npm installs, three independent jobs, cancel stale PR runs | No hosted baseline yet | Not measured | Pending first runs | Record cold and warm cache runs separately |

Potential later experiments: changed-path filtering, lint first, test split only if needed, reusable build outputs, and removing redundant work. Keep migration checks whenever SQL or relevant backend contracts change. Provider tests remain mocked so cost/outages do not block ordinary deployment.
