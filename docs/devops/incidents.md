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
