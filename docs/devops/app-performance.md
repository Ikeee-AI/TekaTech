# Application response times (production)

This page covers application latency: how long the live API takes to answer. Pipeline durations are in [metrics.md](metrics.md) and pipeline changes in [optimizations.md](optimizations.md).

Method, unless a row says otherwise:
- `curl` from the owner's laptop in Manila to `https://tekatech-api.onrender.com`, recording `time_total` and the response's `X-Cache` header.
- Requests run one at a time. The network round trip is included, so `/health` (no database) shows the floor.
- Medians are reported with the sample count `n`; small samples are labelled.

## Caching (#73): before and after

| Route | Before: no cache, `096f8f2`, 22 Oct 00:26, warm, n=10 | After: cache HIT, `61deaa2`, 23 Oct 16:12–16:19, n=45 | After: cache MISS, same run, n=5 |
| --- | --- | --- | --- |
| `/health` (no DB, floor) | 0.206 s (0.190–0.304) | 0.268 s (0.187–0.393), n=50 | — |
| `/gadgets` | 0.385 s (0.322–1.306) | **0.230 s** (0.190–0.732) | 0.496 s (0.414–1.083) |
| `/stats/spec-coverage` | 0.476 s (0.441–0.810) | **0.238 s** (0.182–1.031) | 0.673 s (0.480–1.331) |
| `/stats/trending-questions` | 0.570 s (0.367–1.717) | **0.217 s** (0.181–0.316) | 0.514 s (0.441–1.218) |

Errors: 0 of 200 requests in the after run (all HTTP 200).

**Reading it:**
- **Cached reads now take about as long as `/health`.** The database part of the request is gone; what's left is the network round trip from Manila to Render's Singapore region.
- **Compared with the before medians,** cached reads are 40% faster on `/gadgets` (0.385 → 0.230 s), 50% on `/stats/spec-coverage` and 62% on `/stats/trending-questions`.
- **The two runs had different network conditions.** The `/health` floor was 0.206 s before and 0.268 s after. Subtracting it, the database share of a `/gadgets` read went from about 0.18 s to about 0.
- **A cache MISS costs about what an uncached read used to** (0.5–0.7 s). It happens at most once per route per 60 s TTL, and after each write.
- **Caching does not help the cold start below.**

Before-run details are in PR #73. Raw after samples: [latency-2026-10-23-61deaa2.tsv](../evidence/latency-2026-10-23-61deaa2.tsv). The run had 5 rounds, about 65 s apart so the 60 s TTL expired between rounds, with 10 requests per route each round.

## Cold start (Render free plan)

The free API sleeps after about 15 minutes without traffic. The first request then waits for the service to start.

| Date | Commit | First request after idle | n | Notes |
| --- | --- | --- | --- | --- |
| 16 Oct | `68b4c5a` | 55.3 s | 1 | Sprint 2 work log |
| 19 Oct 22:30 | — | 42.54 s (`/health`), after about 3 h idle | 1 | Consultation 2 measurement, Sprint 2 work log |
| 22 Oct 00:26 | `096f8f2` | 42.65 s | 1 | Before-run of #73 |
| 23 Oct 16:37 | `61deaa2` | 52.56 s (`/health`; TCP connect 0.11 s, so all the wait is service start), after 17 min idle | 1 | The `/gadgets` request right after: 1.09 s, cache MISS (first database call) |

Four samples so far: 42.5–55.3 s, median about 48 s. Each is a single request, so this is a range, not a precise figure. Caching and cold start are separate problems. Cold-start mitigation (a "server is waking up" UI state, S3-MI; a warm-up ping before demos) is tracked in #58 and #55.

## AI answers (`POST /query`)

Not baselined with a sample yet: each request is a paid OpenAI call and writes a `query_history` row. Single observations so far:

| When | Question type | Result | Time |
| --- | --- | --- | --- |
| 22 Oct 23:01 | No specs on file (embedding only) | 200, safe "no spec information" | 9.2 s, includes wake-up |
| 23 Oct 14:30 | Broad iPhone 15 question | 200, cited answer, `gpt-5-mini` | 11.3 s |
| 23 Oct 14:30 | Narrow iPhone 15 question | 200, no match (#88) | 6.4 s |

A small, budget-capped sample (for example 10 questions, about 5 US cents) can be added once #77 caps the answer length. Timings before and after #77 would then be comparable.
