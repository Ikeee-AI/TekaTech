---
name: incident
description: Record a real main/production incident with a short postmortem in docs/devops/incidents.md and route the fix to its technical owner. Use when a main build breaks, a deploy fails or production misbehaves.
---

Only record incidents that actually happened; never manufacture one for grading.

1. Gather facts: failing run (`gh run view <id> --repo Ikeee-AI/TekaTech --log-failed`, trimmed, secrets redacted), affected commit, deploy/smoke evidence, and detection time (UTC).
2. Identify the owner by area (`docs/sprints-2-to-5.md` workflow stage 6): Adrian answer behavior, Manuel auth/provider/retrieval, Mika presentation, Jopher workflow/state, Ikeee-AI pipeline/hosting.
3. Append to `docs/devops/incidents.md`: date, commit, run/deploy links, impact, detection → recovery timeline, root cause (or "under investigation"), fix or rollback, prevention task + owner + follow-up issue.
4. If recovery is needed, point to the rollback section of `docs/deploy-runbook.md`; any revert PR, redeploy or issue creation needs the user's explicit go-ahead.
5. After recovery, run `verify-deploy` and fill in recovery minutes; the `pipeline-metrics` skill reads them.
