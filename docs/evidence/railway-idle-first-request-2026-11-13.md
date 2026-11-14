# Railway API: first request after idle (13 Nov 2026)

Check from the Railway migration plan, section 5: "The first request after 30+ min idle answers in under 5 s. The Render baseline is 42.7 s." **Result: passed.** The first request answered in 0.31 s.

- **Target:** production API `https://tekatech-api-production-549b48c9.up.railway.app` (Railway Hobby, Singapore, 1 replica), serving `f836e3b` (from `/version`).
- **Idle time:** about **20 h 35 min**. From Railway's request log (`railway logs --since 24h --json`), the last request before this test was the scheduled health check on 2026-11-12 06:11:26 UTC (`/health`, `/health/ready`, `/version`, `/gadgets`). No other requests reached the API in between.
- **Method:** read-only `curl` from the owner's laptop in the Philippines (home connection), 2026-11-13 02:46:16 UTC (10:46 Manila). Four routes, one request each, in order. Then 5 more rounds of `/health` and `/gadgets`. No sign-in, no AI calls, no writes. Run by Ikeee-AI, AI-assisted (Claude Code).

## First requests after idle

| Route | HTTP | Total time (client) | Server time (Railway log) |
| --- | --- | --- | --- |
| `/health` (first request) | 200 | **0.31 s** (DNS 0.11 s, TLS done 0.25 s) | 1.6 ms |
| `/health/ready` (database check) | 200 | 1.34 s | 1121.9 ms |
| `/version` | 200 | 0.20 s | 1.8 ms |
| `/gadgets` (first, cache miss) | 200 | 0.49 s | 275.4 ms |

## Warm requests (5 rounds)

| Route | Times (s) | Median |
| --- | --- | --- |
| `/health` | 0.170, 0.173, 0.224, 0.172, 0.203 | 0.173 s |
| `/gadgets` | 0.214, 0.204, 0.198, 0.212, 0.173 | 0.204 s |

All 14 requests returned 200.

## Notes

- **No cold start:** the first request after more than 20 hours idle was as fast as the warm ones. On the Render free API, the same kind of first request took 42.7 s (4 Nov).
- `/health/ready` takes about 1.1 s on the server whether the API is idle or warm. On 12 Nov the health check measured 1123.7 ms for it too. That time is the database round trip to Supabase, not the Railway host. It is a readiness check only; user pages don't call it.
- The Railway CLI printed a notice: `railway.json` (config as code) is deprecated in favour of `.railway/railway.ts`, and "existing files keep working until 2026-12-01". `backend/railway.json` must be migrated before that date. This is tracked in the Sprint 5 worklog (13 Nov).
- One sample from one location. It shows that the service doesn't sleep. It is not a load or latency benchmark.
