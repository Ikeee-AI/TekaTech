# Production rollback rehearsal: 31 October 2026

Owner: Ikeee-AI (DevOps, AI-assisted: yes). Work package S4-IK ("previous app release can be restored"). Runbook: [deploy-runbook.md](../deploy-runbook.md#rollback).

**Method:** `.github/workflows/rollback.yml` (Actions → Rollback production), dispatched twice with `gh workflow run` by Ikeee-AI. The workflow refuses commits not on main or without green required checks, triggers both Render deploy hooks for the exact SHA, then runs `scripts/deployed_smoke.py` against production.

**Safety:** the rollback target `7d2ab44` and the release `5aa4635` differ only in docs and evaluation files (PRs #155, #158, #166), so users saw the same application throughout. No database change.

| Step | Target | Run | Started → finished (UTC) | Recovery time | Smoke |
| --- | --- | --- | --- | --- | --- |
| Roll back | `7d2ab44053ad9fb13dd635e717dafe7fe7a6f77d` | [41176698815](https://github.com/Ikeee-AI/TekaTech/actions/runs/41176698815) | 06:27:46 → 06:29:21 | **1 min 35 s** | passed: both hosts on `7d2ab44`, readiness passed, CORS passed, 4 gadgets, waited 81 s for the new build |
| Roll forward | `5aa4635e75b959dac7497d943fbfe0156e3d2189` | [41176827303](https://github.com/Ikeee-AI/TekaTech/actions/runs/41176827303) | 06:29:40 → 06:31:25 | **1 min 45 s** | passed: both hosts on `5aa4635`, readiness passed, CORS passed, 4 gadgets, waited 92 s |

Afterwards `/health` returned `{"status":"ok"}` and production matched main, so no revert PR was needed. `v1.0.0` was tagged on `5aa4635` at 06:32 UTC.

**Limits:** this rehearses the deploy mechanics, not a rollback across a breaking code or schema change. Recovery time here excludes detection time; a real incident adds it.
