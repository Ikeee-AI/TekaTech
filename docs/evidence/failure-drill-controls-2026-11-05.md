# Failure-drill controls stay off for normal users, 5 Nov 2026 (S5-MA)

Run by Manuel (`s2302827-byte`, AI-assisted: yes, Claude Code). Part of the S5-MA acceptance check "failure-drill controls remain disabled for normal users". Pilot status: not started (owner's log of 5 Nov), so this is a pre-pilot check.

## Production: one anonymous request with the drill header

`POST https://tekatech-api.onrender.com/query`, question "How big is the battery?", header `X-Simulate-Failure: timeout`, **no login**.

| What | Result |
| --- | --- |
| Status | 200 |
| Body | A normal answer citing 3 sources (battery sizes) |
| `X-Simulated-Failure` response header | **absent** |
| `X-Request-ID` | `75108b4dec634bf8b02118d30cf10825` |
| Cost | One real answer, about 1 US cent |

An ordinary visitor cannot trigger the drill. This matches the anonymous control in `failure-drill-prod-2026-10-28.md`, run by Ikeee-AI.

The request took 62 s because the free host was waking up. It is not a latency figure and is not used as one.

Limit: the code returns before it reads the header when `FAILURE_SIMULATION_ENABLED` is unset (`_requested_simulation` in `backend/routers/query.py`). So this shows the variable is off in the running service, but it does not show the Render dashboard value. That confirmation is asked of the owner in #229.

## Local checks, same day

| Check | Result |
| --- | --- |
| `uv run --frozen pytest tests/test_failure_simulation.py` | 14 passed (includes non-admin and anonymous callers ignored even when the flag is on, and the `render.yaml` guard) |
| `git grep FAILURE_SIMULATION_ENABLED -- render.yaml` | no match |

## Recovery path

Not re-run on production here. The recovery evidence is the supervised drill of 28 Oct (`failure-drill-prod-2026-10-28.md`): flag set, four failure modes returned the documented messages, flag removed, `/health/ready` stayed 200, off-check passed.
