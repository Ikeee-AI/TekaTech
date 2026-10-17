# Main / production incident log

No main-branch or production-deployment incidents have been recorded as of 16 October 2026. The application is deployed on Render: main runs [38174257006](https://github.com/Ikeee-AI/TekaTech/actions/runs/38174257006) (`53f62e9`) and [38238577447](https://github.com/Ikeee-AI/TekaTech/actions/runs/38238577447) (`68b4c5a`) deployed and passed smoke checks, with no failed main build or deployment. Do not manufacture incidents for grading.

Local preparation findings on 12 October 2026 (not production incidents): invalid UTF-8 blocked the frontend build and was corrected; configured Supabase project DNS failed; the one provider test returned credit_balance_exhausted. The database blocker is resolved; provider credit and hosting remain pending.

For every later broken build reaching main or failed production deployment, add:

- Date, affected commit, workflow/deploy link and impact.
- Detection and recovery timestamps.
- What happened and root cause.
- Fix or rollback, and a concrete prevention step.
- Responsible teammate and follow-up issue.

## Database setup finding: restore timing and RPC ambiguity

12 October 2026; setup finding, not a production outage. The project reported COMING_UP and catalog queries returned no public relations. The foundation migration applied while restoration was finishing. The restored schema then exposed two `match_spec_documents` overloads with the same argument names, so PostgREST rejected backend calls with PGRST203. Existing data remained intact.

Fix: inspect the ACTIVE_HEALTHY schema, save its function definitions locally, verify the known old five-column signature has zero dependent objects, and remove only that overload through a registered reconciliation migration. All six read-only backend database checks then passed, and FastAPI `/gadgets` returned 200.

Prevention: wait for ACTIVE_HEALTHY before schema inspection; abort unknown signatures/dependents; run the legacy-overload and public-vector cases in CI. The Supabase advisor findings remain documented in `docs/evidence/supabase-sprint-1.json` for hardening.

## Sprint 2 process exceptions (no production impact)

### PE-1 — Unreviewed commit reached main (16 Oct 2026)
- **What:** `ed37f45` "Add Adrian Flores as AI Developer in README" was committed directly to `main` through the GitHub web editor (16 Oct 19:54 Manila), without a PR or review. Main CI ran and deployed it ([run 38896878097](https://github.com/Ikeee-AI/TekaTech/actions/runs/38896878097)).
- **Impact:** documentation-only, one line; production behaviour unchanged. Process impact: a merge to main without teammate review.
- **Detection:** 17 Oct during the Saturday status review (commit had no associated PR).
- **Cause:** branch protection and rulesets are unavailable on this private Free-plan repository (HTTP 403), so direct pushes cannot be blocked; the rule was only a team convention.
- **Prevention:** `Main guard` job ([#40](https://github.com/Ikeee-AI/TekaTech/pull/40), live since `20909ab`): a commit without a merged, teammate-approved PR no longer deploys and opens a `process` issue. Guard tested against history (blocks `ed37f45` and the unreviewed #15 merge). Team reminded: all changes through PRs. Owner: Ikeee-AI.

### PE-2 — Teammate PRs ran no CI (16–17 Oct 2026)
- **What:** PRs #35, #36, #37 and #39 were opened from forks. Fork PR workflows were disabled by default on the private repository, so none of them ran the required checks.
- **Detection:** 17 Oct ~18:30 Manila (PR checks list empty). **Recovery:** fork PR workflows enabled with read-only token and no secrets; PRs re-triggered; all four green by ~19:00. About 30 hours for the earliest PR (#35).
- **Prevention:** settings recorded in PIPELINE.md; teammates now have write access and should push branches to the main repository.

### PE-3 — Weekly dependency audit could not fail (17 Oct 2026)
- **What:** the first run of `ops-weekly.yml` ([39030954463](https://github.com/Ikeee-AI/TekaTech/actions/runs/39030954463)) found 18 known vulnerabilities in 3 packages but reported success: steps ran without `pipefail` so `audit | tee` masked the exit code.
- **Detection:** same evening, by checking the run against the known findings in #28. **Fix:** [#52](https://github.com/Ikeee-AI/TekaTech/pull/52) sets `shell: bash`; verified on the branch ([39031057744](https://github.com/Ikeee-AI/TekaTech/actions/runs/39031057744)) — audit now fails correctly.
- **Lesson:** verify a new check can fail before trusting its green result. Owner: Ikeee-AI.

### PE-4 — Main guard false positive blocked an approved deploy (17 Oct 2026)
- **What:** after PR #26 (approved by Manuel on its final commit) was squash-merged at 21:57:54 Manila, the main guard ran 2 s later, before GitHub had linked commit `28132c9` to the PR. It reported "no merged pull request", skipped the deploy and opened #63 ([run 39038725331](https://github.com/Ikeee-AI/TekaTech/actions/runs/39038725331)).
- **Impact:** none for users — a CI-only change; production stayed on the previous good commit `7cb92f3` for ~5 minutes.
- **Detection:** immediately, by the gated merge script (`STOP #26: main pipeline/deploy not successful`).
- **Recovery:** re-ran the failed jobs once GitHub had linked the PR; guard passed, deploy and smoke succeeded. #63 closed as a false positive. Recovery time ≈ 5 min.
- **Cause:** the guard assumed the commit→PR link exists the moment `main` changes; it is created asynchronously.
- **Prevention:** [#64](https://github.com/Ikeee-AI/TekaTech/pull/64) retries the lookup up to 6×10 s before failing. Owner: Ikeee-AI.
