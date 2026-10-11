# Main / production incident log

No main or production incidents have been recorded because the application has not yet been published or deployed. Do not manufacture incidents for grading.

Local preparation findings on 12 October 2026 (not production incidents): invalid UTF-8 blocked the frontend build and was corrected; configured Supabase project DNS failed; the one provider test returned credit_balance_exhausted. The external blockers remain open.

For every later broken build reaching main or failed production deployment, add:

- Date, affected commit, workflow/deploy link and impact.
- Detection and recovery timestamps.
- What happened and root cause.
- Fix or rollback, and a concrete prevention step.
- Responsible teammate and follow-up issue.
