# Live deploy challenge rehearsal: 31 October 2026

Sprint 4 gate item "successful live deploy rehearsal" and the Demo Day challenge (small visible change → reviewed PR → merge → automatic deploy, target 30 minutes). Change: Mika's one-line catalog tagline, [#171](https://github.com/Ikeee-AI/TekaTech/pull/171). Reviewer: Jopher. Merge and timing: Ikeee-AI. Raw report: [deploy-challenge-rehearsal-2026-10-31.json](deploy-challenge-rehearsal-2026-10-31.json), produced by `python scripts/deploy_challenge_timer.py --pr 171 --wait --smoke` (#170).

| Stage | Time (Manila) | Minutes from first commit |
| --- | --- | --- |
| First commit | 15:46:03 | 0.0 |
| PR opened | 15:46:54 | 0.8 |
| Required checks green | 15:47:46 | 1.7 |
| Teammate approval (Jopher) | 17:28:01 | 102.0 |
| Merged (Ikeee-AI) | 17:46:20 | 120.3 |
| Deploy job finished ([main run 41190044111](https://github.com/Ikeee-AI/TekaTech/actions/runs/41190044111)) | 17:48:17 | 122.2 |
| Production smoke passed on `1fbbaf5` | 17:48:38 | 122.6 |

**Result: target not met (122.6 min).** The pipeline itself took 3.9 minutes in total: 1.7 min of PR checks, then 2.3 min from merge to a verified production deploy. The other 118.7 minutes were people: 100.3 min waiting for the review and 18.3 min between approval and merge.

**What this rehearsal proves:** a visible change goes from code to verified production through a reviewed PR without bypassing any check, and the automation fits easily inside 30 minutes.

**What has to change for Demo Day:** the reviewer and the merger are present and watching when the PR opens. Everyone agrees on the change and its exact wording beforehand. Ikeee-AI starts the timer with `--start <time>+08:00` at the announced start and narrates each stage from its output. A realistic target is under 10 minutes: about 2 min of coding, 2 min of checks, 3 min of review and 3 min of deploy and smoke.

**Follow-up from the review:** Jopher noted the tagline ("Every AI answer links to the saved spec it came from") stops being true once the UI can request general-knowledge answers (#172). Change it in the same PR that adds the toggle.
