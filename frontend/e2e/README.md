# Browser checks: failure drill (#119)

Automated checks that the **ask** (gadget page) and **compare** journeys recover safely when the AI fails, the S3-JO acceptance that was only proven by hand in `docs/pr-proof-s3/` (screenshots 05–11).

For each failure the check confirms:
1. the right safe error state appears (Mika's states from #95),
2. the question the user typed is still in the box,
3. **Try Again** sends the same question and shows a cited answer, without retyping.

| Drill mode (#84) | What the backend sends | Expected UI |
|---|---|---|
| `timeout` | 503 `DETAIL_TIMEOUT` | "The AI Timed Out" + Try Again |
| `quota` | 503 `DETAIL_UNAVAILABLE` | "AI Answers Are Unavailable" + Try Again |
| `bad_output` | 503 `DETAIL_UNUSABLE` | "Unusable AI Response" + Try Again |
| `empty` | 200, no sources | "No Evidence Found" (not an error) |

## Run it

From `frontend/`, once:

```bash
npm ci
npx playwright install chromium
```

Then:

```bash
npm run test:e2e
```

8 checks (4 modes × 2 journeys), about 15 seconds. On a failure, Playwright prints a `show-trace` command that replays the run step by step.

## How it stays safe and free

- Playwright builds the app and serves it on `127.0.0.1:4174` with **fake service addresses** (`api.e2e.test`, `supabase.e2e.test`), set in `playwright.config.js`. They override your local `frontend/.env`, so the checks can't reach dev, production, Supabase or OpenAI.
- `support/fakeApi.js` answers every API call inside the browser: two sample gadgets with one spec each, and the `POST /query` replies each check needs.
- No login, no database, no paid model calls.

## Why the fake replies can be trusted

The 503 sentences live in `fixtures/query-failures.json`. `backend/tests/test_failure_contract.py` fails if they ever differ from `DETAIL_*` in `backend/routers/query.py`, and the browser checks fail if the frontend stops recognising them. If the backend wording changes, both tests point at it.

## Drill mode against the real backend (planned)

After #118 runs the drill on TekaTech-dev, an opt-in mode will run the same checks against a local backend on **TekaTech-dev only**, with `failure_simulation_enabled=true` and the dev test admin (credentials from local environment variables, never committed), sending the real `X-Simulate-Failure` header. Never against production.
