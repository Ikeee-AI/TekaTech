# Failure drill on TekaTech-dev, 28 Oct 2026 (#118, dev half)

Run by Manuel Mirasol (S4-MA). A local backend at `main` `77aff2e`, connected to TekaTech-dev, was started with `FAILURE_SIMULATION_ENABLED=true`. Requests went to `POST /query` with a dev admin session, then with a non-admin session and with none. Session tokens and emails are not recorded. Raw results: `failure-drill-dev-2026-10-28.json`.

| Caller | Flag | `X-Simulate-Failure` | Status | Outcome |
| --- | --- | --- | --- | --- |
| admin | on | `timeout` | 503 | "The AI took too long to answer. Please try again."; response header `X-Simulated-Failure: timeout` |
| admin | on | `quota` | 503 | "AI answers are temporarily unavailable. Spec browsing still works." |
| admin | on | `bad_output` | 503 | "The AI returned an answer we couldn't use. Please rephrase and try again." |
| admin | on | `empty` | 200 | the normal "couldn't find any spec information" answer, 0 sources, `model_used: none` |
| admin | on | `TIMEOUT` | 503 | same as `timeout` (case-insensitive) |
| admin | on | `nonsense` | 422 | lists the valid modes |
| non-admin | on | `timeout` | 200 | normal answer, no `X-Simulated-Failure` header |
| anonymous | on | `timeout` | 200 | normal answer, no `X-Simulated-Failure` header |
| admin | **off** | `timeout` | 200 | normal answer, no `X-Simulated-Failure` header |

The simulated cases never call OpenAI. The three normal answers cost well under one cent.

## Not done yet
- The UI view of each message on dev: the Playwright checks added in #128 cover the browser side.
- The production run (admin header on the deployed app) and the check that `FAILURE_SIMULATION_ENABLED` is unset on Render afterwards. These need a window with Ikeee-AI, who owns Render.
