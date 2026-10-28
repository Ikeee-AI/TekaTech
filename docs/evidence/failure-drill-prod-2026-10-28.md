# Failure drill on production — 28 October 2026 (#118)

The supervised, time-boxed production drill from `backend/README.md` ("Supervised production drill", #152). It is the second half of #118; the TekaTech-dev half is in `failure-drill-dev-2026-10-28.md` (Manuel, #151).

- **Service:** `tekatech-api` on Render, serving `main` at `f9b4c9e`.
- **Operator:** Ikeee-AI.
  - Set and removed `FAILURE_SIMULATION_ENABLED` in the Render dashboard; it was never added to `render.yaml`.
  - Sent the requests with the production admin account.
  - The token was kept in a local file outside the repo, never printed, and deleted afterwards. The saved evidence contains no token (checked).
- **Assistance:** AI-assisted (Claude Code), which ran the request script and wrote this record.
- **Raw results:** `failure-drill-prod-2026-10-28.json`.

## Window (Asia/Manila)

| Step | Time |
| --- | --- |
| Flag set in Render; deploy started ("Environment updated") | 22:32 |
| Deploy with the flag live | 22:33 |
| Drill requests sent | 22:44 |
| Flag removed; deploy started | 22:47 |
| Deploy without the flag live | 22:48 |
| Off-check + `deployed_smoke.py` (`f9b4c9e`: passed) | 22:50 |

The flag was on for about **15 minutes**. Render kept the previous instance serving during both restarts, and `/health/ready` returned 200 throughout.

## Results with the flag on

`POST /query`, question "How big is the battery?", with the `X-Simulate-Failure` header:

| Caller | Header | Status | Body | `X-Simulated-Failure` |
| --- | --- | --- | --- | --- |
| admin | `timeout` | 503 | "The AI took too long to answer. Please try again." | `timeout` |
| admin | `quota` | 503 | "AI answers are temporarily unavailable. Spec browsing still works." | `quota` |
| admin | `bad_output` | 503 | "The AI returned an answer we couldn't use. Please rephrase and try again." | `bad_output` |
| admin | `empty` | 200 | the normal "I couldn't find any spec information…" answer, 0 sources | none (as documented) |
| anonymous | `timeout` | 200 | a normal cited answer | none: an ordinary visitor can't trigger the drill |

The simulated cases made no OpenAI call. The anonymous control made one real answer, costing about a cent.

## Results with the flag off

| Caller | Header | Status | Body | `X-Simulated-Failure` |
| --- | --- | --- | --- | --- |
| admin | `timeout` | 200 | a normal cited answer | none: the drill is off |

`FAILURE_SIMULATION_ENABLED` was then confirmed absent from the Render Environment list. `render.yaml` doesn't mention it, and `tests/test_failure_simulation.py` still guards that.

## Not covered here

- The browser view of these messages is covered by the Playwright failure-drill checks (#128), which run in CI on every change.
- A non-admin logged-in control wasn't run on production (no non-admin production session). The dev run in #151 covers it, and the anonymous control above shows the same gate.
