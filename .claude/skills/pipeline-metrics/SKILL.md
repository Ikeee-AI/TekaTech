---
name: pipeline-metrics
description: Compute the weekly DevOps delivery-metrics row (PR/main duration, success rate, deploys, merge-to-live, failed deploys) from real GitHub Actions runs and update docs/devops/metrics.md. Use before each consultation or when asked for pipeline metrics.
---

Arguments: optional sprint label and UTC window, e.g. `Sprint 2 2026-10-12 2026-10-18`. Default to the current sprint from `docs/sprints-2-to-5.md` (Manila week Mon–Sun, converted to UTC dates).

1. `gh api user --jq .login` must print an account with access to `Ikeee-AI/TekaTech`. If not, stop and tell the user to run `! gh auth login` as Ikeee-AI. Never print tokens.
2. From the repo root run:
   `python scripts/pipeline_metrics.py --label "<label>" --since <from> --until <to> --report .local/metrics-<label>.json`
3. Show the printed row and the JSON's run-link lists. Recovery time stays `N/A` unless `docs/devops/incidents.md` has a recovered incident in the window — then compute it from its recorded timestamps.
4. Replace the matching `Pending` row in `docs/devops/metrics.md` with the row, fill "Change this week" from merged DevOps PRs (ask if unknown), and add a short dated section linking the deploy runs.
5. Never round N/A into 0, never merge runs from outside the window, and say if the sample is too small to compare.
