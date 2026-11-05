# S5-MA: questions for the owner (5 Nov 2026)

From Manuel (S5-MA) to Ikeee-AI. **Open questions, not decisions.** Answer in the PR or in the issue, and record the outcome in the Sprint 5 log. Delete this file once all three are answered.

Hi Ikeee, S5-MA update. I need three answers to finish my results before Sat 3 PM.

**Done**
- Troubleshooting guide: #220 merged, and Jopher followed section 1 with it.
- #118: confirmation posted. It can be closed (#151 and #153 are merged).
- #205: I posted the decision to close it, because #210 already covers it. Please close the issue, I can't tell if I'm allowed to.
- Free read-only latency sample on production on 4 Nov: 240 requests, 0 errors, cached reads about 0.12 s, same as 30 Oct. A second sample is running now. Both go into one PR when it finishes.
- On 4 Nov: `FAILURE_SIMULATION_ENABLED` is not in `render.yaml`, the non-admin and anonymous tests pass, full backend suite 679 passed, production served `bd2393d`.
- Reviewed and approved #221 to #227. Opened #228 (`eval_adapter --scope`, optional).

**Three questions**
1. **Performance budget.** In `docs/evidence/backend-performance-2026-10-30.md` I proposed: cached read median at most 0.5 s, any single cache miss at most 1.5 s, 0 errors in at least 50 requests, cold start disclosed but not budgeted. Do you accept it, change it, or reject it? Without your answer I can say "measured X", but not "the budget held".
2. **Paid `/query` sample.** May I send about 10 questions to production `/query` (roughly 5 US cents) for the first real production latency numbers for it? I would do it once the pilot window is over, so it does not disturb it. I can use fewer questions, or skip it and say so in the report.
3. **Failure-drill variable.** Your #118 evidence shows it removed from Render on 28 Oct. Could you confirm it is still unset on the production API service today? I can't see the dashboard.

**One more thing**
- Your 5 Nov log says the pilot is "not started (on hold)". When does the 48-hour window start? My second latency sample and the `/query` sample should be timed to it, and my first sample (4 Nov) is labelled "before the pilot".

**Also, when you have time**
- The test threads from the #210 local tests were written to the production database (from your #212 log). Please delete them before the pilot.

I will not merge or change anything during the pilot window unless you say so.
