# Backend and provider troubleshooting guide

Owner: Manuel Mirasol (S5-MA, `docs/sprints-2-to-5.md`). **Draft, 4 Nov 2026**, written against `main` at `bd2393d`. It has not yet been followed by a second person, and the "Safe diagnostic run" section has not been timed. Update the "Last checked" line whenever you change it.

Who it is for: a teammate who sees an error during or after the Sprint 5 pilot and has **no production secrets**. Everything in sections 1–3 works with public URLs and the mocked test suite only. Anything that needs a dashboard or a key says who to ask.

Production URLs (from the README, check them if in doubt): API `https://tekatech-api-production-549b48c9.up.railway.app` (Railway since 12 Nov 2026; before that `https://tekatech-api.onrender.com`), site `https://tekatech-web.onrender.com`.

---

## 1. Safe diagnostic run (no secrets, no writes, no AI calls)

Do these in order. Stop at the first one that fails and go to section 3.

| Step | Command | Healthy result |
| --- | --- | --- |
| 1 | `curl -s https://tekatech-api-production-549b48c9.up.railway.app/health` | `{"status":"ok"}`. This only proves the process is up. (On the old free Render host the first call after idle took 42–55 s; Railway Hobby doesn't sleep.) |
| 2 | `curl -s https://tekatech-api-production-549b48c9.up.railway.app/health/ready` | `{"status":"ok","database":"ok","latency_ms":…}`. `503` with `"database":"error"` means the API cannot reach Supabase (section 3, "Database"). Limit: 30 per minute. |
| 3 | `curl -s https://tekatech-api-production-549b48c9.up.railway.app/version` | `{"commit":"<sha>"}`. Compare with the latest commit on `main` to see what is deployed. `local` means no deploy commit was set (Railway: `APP_COMMIT`; Render: `RENDER_GIT_COMMIT`). |
| 4 | `python scripts/deployed_smoke.py --api-url https://tekatech-api-production-549b48c9.up.railway.app --frontend-url https://tekatech-web.onrender.com --commit <sha from step 3>` | Public checks only (version, frontend page, one database read, CORS). No AI calls. It is the same script CI runs after a deploy. |
| 5 | `cd backend && uv run pytest -q` | All tests pass. They mock Supabase and OpenAI, so this proves the code, not production. |
| 6 | `python scripts/pilot_monitor.py summary --samples .local/pilot/samples.jsonl` | Summary of the pilot samples Ikeee-AI is collecting. Read-only. Ask for the samples file. |

Rules for a diagnostic run: only `GET` requests to production; no `POST /query` (it spends the shared OpenAI credit); never print a key or paste a token; never set `FAILURE_SIMULATION_ENABLED` outside the supervised drill.

## 2. Reading an error

Every API response has an **`X-Request-ID`** header (the browser can read it). Quote it when you report a problem. The API log has one line per request (method, path, status, duration, request id; no question text and no tokens), so Ikeee-AI can find the exact request in Render's logs.

What `POST /query` returns when something goes wrong. The wording is the contract the browser tests check (`backend/tests/test_failure_contract.py`).

| Status | Message the user sees | Cause | Are saved specs safe? |
| --- | --- | --- | --- |
| 503 | "The AI took too long to answer. Please try again." | OpenAI call timed out | Yes. Try again once. |
| 503 | "AI answers are temporarily unavailable. Spec browsing still works." | Any other OpenAI failure: outage, **no credit left (quota)**, bad key, rate limit at the provider | Yes |
| 503 | "The AI returned an answer we couldn't use. Please rephrase and try again." | Empty or malformed model output, or the answer hit the length cap (`finish_reason == "length"`, 1500 tokens). A partial answer is never shown. | Yes |
| 503 | "We couldn't look up specs to answer that right now. Please try again shortly." | The database step failed after the question was already embedded (and billed) | Yes |
| 429 | rate-limit message | Over 10 questions per minute from the same client address | Yes |
| 422 | validation detail | Bad request body (empty question, too long, wrong types) | Yes, nothing was changed |
| 200 | "no relevant specs" style answer, `answer_basis: "none"` | Nothing matched. Not a fault. See "Answers" below. | Yes |

The details of a provider failure go to the log, never to the user.

## 3. Symptom → cause → check → fix

### Cold start or "site is slow the first time"
- **Cause:** Render free services sleep when idle. Measured cold start: 42–55 s. Since 12 Nov 2026 the API is on Railway Hobby, which doesn't sleep; this now applies only to the Render fallback API and the static frontend's first load.
- **Check:** run step 1 twice; the second call is fast.
- **Fix:** none needed. Warm `/health` and then the site 2 minutes before a demo. Record cold starts separately from latency in any report.

### "AI Answers Are Unavailable" / 503 on `/query`
1. Check `/health/ready`. If the database is `error`, go to "Database".
2. If the database is fine, the cause is the provider. The usual one is **no prepaid credit**, then a bad or rotated key, then a real OpenAI outage.
3. **Fix:** this needs the Render dashboard or the OpenAI account, which only Ikeee-AI has. Send them the `X-Request-ID` and the time. Do not retry in a loop: every attempt that reaches the provider can cost money.
4. Browsing gadgets, specs and comparisons keeps working while the AI is down.

### 429 Too Many Requests
- **Limits** (per client IP): `/query` 10 per minute; saving specs 20 per hour; indexing a spec 20 per hour; creating a comparison 20 per hour; My Gadgets and saved questions 60 to 120 per hour; `/health/ready` 30 per minute.
- **Check:** wait for the window to pass. The browser shows "Too many indexing requests. Wait a little, then retry." for indexing.
- **Fix:** wait. Do not raise a limit to get past a test. Several people behind one network share one address, so a classroom can hit the limit together.
- **Storage:** counters are kept in memory (`memory://`), per process. On a single Render instance this is correct. A restart resets them. If the API is ever scaled to more than one instance, a shared store (`redis://`) is required. If a configured store is unreachable, the API **refuses to start on purpose**. Do not add an in-memory fallback.

### Index for AI fails
- **Cause:** embedding provider error, or the saved text changed while indexing (a content-match check refuses stale vectors).
- **What the user sees:** "Indexing Failed — Your Spec Is Saved" and a **Retry Indexing** button.
- **Fix:** press Retry Indexing once the provider is back. Saved text is never lost. Admins can use **Index All Pending**, which stops at the 20 per hour limit or a session problem.

### Answers are wrong, uncited or "no relevant specs"
- **Not indexed:** a gadget whose specs are still "Pending AI Indexing" has nothing to retrieve. Index them first.
- **Scope:** a question about one gadget gets the nearest chunks whatever their score; a question across the whole catalog only keeps chunks above a 0.5 similarity threshold. Asking about one gadget is more reliable.
- **Cache:** identical or very similar questions can be answered from the answer cache (`cached: true`, `cache_match`). Saved answers are dropped when a correction is approved and when a gadget's specs change, so a stale cached answer after an edit is a bug: report it with the `X-Request-ID`.
- **Citations:** the backend removes `[n]` markers that do not point to a snippet it sent (`invalid_citations_removed` in the response). A high count is a prompt-quality signal for Adrian, not a backend fault.
- **General knowledge mode:** answers with `answer_basis: "general_knowledge"` are unverified and uncited by design. They only appear when the request allows it.

### Database ("DNS failure", "521", `/health/ready` is 503)
- **Cause:** a paused Supabase project shows first as DNS failure, then Cloudflare 521, and takes a few minutes to wake after it is resumed. Not an app bug.
- **Fix:** Ikeee-AI resumes the project in the Supabase dashboard. Wait a few minutes, then run step 2 again.

### Browser says "CORS" or "Failed to fetch"
- **Cause:** the site's address is missing from the API's `cors_origins`, or the site was built with the wrong `VITE_API_BASE_URL`. Vite bakes `VITE_*` values in at build time, so a changed value needs a rebuild.
- **Check:** the browser console shows the exact blocked origin. If the API is simply asleep, the same error can appear; run step 1 first.
- **Fix:** Ikeee-AI changes `cors_origins` or rebuilds the frontend.

### Login problems or "admin buttons missing"
- Signing in goes through Supabase directly; the API then verifies the token on each request.
- Admin is the flag `app_metadata.is_admin` on the Supabase user. Only the service-role key can set it, so a user can never grant it to themselves. Since 3 Nov the catalog is admin-curated, so a normal account has no Add Gadget, Add Specs or Index for AI. That is expected.
- A member lands on **My Gadgets** after login; an admin lands on the catalog.

### Failure-drill controls (must stay off)
- `FAILURE_SIMULATION_ENABLED` must be **unset** in production. It is not in `render.yaml`, and a test fails if it appears there (`test_production_service_never_enables_it`).
- Even when it is on, the `X-Simulate-Failure` header works only for a signed-in **admin**. Anonymous and non-admin callers are ignored silently (`test_anonymous_caller_is_ignored_even_when_enabled`, `test_non_admin_is_ignored_even_when_enabled`).
- Only the DevOps Engineer turns it on, for a supervised, time-boxed drill (`backend/README.md`, "Supervised production drill"), and removes it straight afterwards.

## 4. What not to do

- Do not paste keys, tokens, `.env` contents or the Supabase service-role key anywhere, including screenshots.
- Do not loop requests at `/query`; each one can cost money.
- Do not add `FAILURE_SIMULATION_ENABLED` to `render.yaml`.
- Do not add an in-memory fallback for the rate limiter.
- Do not "fix" a stored-prompt-injection concern by quietly gating spec ingestion; ingestion is already admin-only since 3 Nov and corrections reach the model only after an admin approves them.
- Do not run SQL on production without telling Ikeee-AI. Nothing auto-migrates; SQL is applied by hand (`docs/database.md`, `docs/deploy-runbook.md`).
- Do not delete or edit real gadgets while testing. Use a clearly named test record and remove it afterwards.

## 5. Who to ask

| Problem | Ask |
| --- | --- |
| Render, Supabase dashboard, OpenAI account or credit, environment variables, deploy or rollback | Ikeee-AI (DevOps) |
| API behaviour, auth, schema, retrieval, provider adapter | Manuel |
| Wrong or uncited answers, prompt wording | Adrian |
| Display, accessibility, citation rendering | Mika |
| A user journey that breaks end to end | Jopher |

## 6. First run, 4 Nov 2026

One real run of section 1, from the author's laptop at 11:31 UTC (19:31 Manila), before the pilot started (the owner's log of 5 Nov says it was on hold). Public GET requests only. No AI calls, no writes.

| Step | Result |
| --- | --- |
| 1. `/health` | 200, **42.7 s** (cold start, in the 42-55 s range above), second call fast |
| 2. `/health/ready` | 200, database ok, 1049 ms on the first call after waking |
| 3. `/version` | 200, commit `bd2393d`, equal to the tip of `main` |
| 4. `deployed_smoke.py` | passed: exact version, 4 gadgets, CORS, readiness; database latency 257 ms |
| 5. `uv run pytest -q` | 679 passed |

Reading it: the slow first `/health` and the 1049 ms readiness are the same wake-up, not a fault. The 257 ms in the smoke run is the normal figure once awake. Also checked the same day: `python scripts/check_secrets.py` passed, and `render.yaml` has no `FAILURE_SIMULATION_ENABLED`. This is one run from one laptop on a free host; treat the numbers as a range.

## 7. Versioning

| Date | Commit | Change |
| --- | --- | --- |
| 4 Nov 2026 | `bd2393d` | First draft. Not yet followed by a second person. |
| 4 Nov 2026 | `bd2393d` | Added section 6, the first diagnostic run. |
| 5 Nov 2026 | `bd2393d` | Section 6 and this line no longer say the pilot had started. |

**Last checked against `main` at `bd2393d` on 4 Nov 2026.** Not yet covered: results from the pilot itself, which had not started when this was written. Add real cases here as they happen.
