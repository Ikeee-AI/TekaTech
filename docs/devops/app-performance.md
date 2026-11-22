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

### Answer settings benchmark (22 Nov 2026)

Benchmarked before changing anything, run locally against OpenAI; only the chat call is timed (embedding and retrieval are the same for every setting). Every `/query` answer now also carries a `Server-Timing` header (`embed`, `retrieve`, `generate`, `total`, in ms) and one log line, so live timings can be read per step.

**1. Evaluation set** (`scripts/benchmark_answer_settings.py`): 24 cases x 4 settings x 2 runs = 192 calls, about US$0.09, scored by `scripts/eval_runner.py` (rules s5).

| Setting | Median | p90 | Slowest | Cost / answer | Cases passed (run 1 / run 2) |
| --- | --- | --- | --- | --- | --- |
| `low` (production until now) | 3.02 s | 5.12 s | 8.24 s | $0.00063 | 21 / 23 |
| `low` + `verbosity=low` | 3.25 s | 4.61 s | 7.08 s | $0.00066 | 22 / 20 |
| `minimal` | 1.31 s | 1.80 s | 3.83 s | $0.00025 | 21 / 20 |
| `minimal` + `verbosity=low` | 1.26 s | 2.03 s | 2.89 s | $0.00024 | 22 / 21 |

Citation validity was 100% for every setting. Differences of 1-3 cases are within run-to-run noise (`low` itself moved by 2). TC-07 fails on every setting (prompt, not settings).

**2. Real catalog** (`scripts/benchmark_answer_settings_catalog.py`): 12 shopper questions on real phones (the phone page's 3 suggestion chips on iPhone 16, V50 5G, Reno14 5G, plus 3 comparisons), real spec chunks read from the public API, top 6 by the app's embedding model, the exact `/query` prompt; 2 runs each, about US$0.03 per run.

| Question type | `low` | `minimal` + `verbosity=low` |
| --- | --- | --- |
| One phone (18 answers) | 2.7 s median, 5.6 s slowest | 1.4 s median, 2.3 s slowest; all correct and cited |
| Comparison (6 answers) | 6.8 s median | 3.1 s median, but **wrong winner** on "Which one charges the fastest?" (said Reno14 80W over V50 90W) in both runs |

**Decision (owner, 22 Nov):** one-phone questions use `minimal` + `verbosity=low` (`answer_settings()` in `routers/query.py`); comparisons and catalog-wide questions keep `low`. Confirmation run with the app's rule: one-phone median 2.70 s -> 1.34 s (slowest 4.31 s -> 2.07 s); comparisons unchanged in setting and correct. Raw results stay in the owner's `.local/` (not committed): `answer-settings-2026-11-22.*`, `catalog-bench-2026-11-22.*`, `catalog-bench-app-2026-11-22.*`.

### Chat memory and prompt v2 benchmark (22 Nov 2026)

Owner report: the gadget chat "cannot remember" — asked whether a phone runs Genshin Impact smoothly, then "can it run smoothly?", it answered about the display. Causes: each question reached the model alone, and prompt v1 refused judgements the specs do not state. Fix: the chat sends its last 3 turns (`history`), and prompt v2 adds a SUITABILITY and a CONVERSATION rule. Benchmarked before switching:

**1. Evaluation set, v1 vs v2** (same 24 cases, app settings, 2 runs, 96 calls, about US$0.04): v1 passed 21 and 20, v2 passed **22 and 22** (fixes TC-10 and TC-21, no new failures; TC-07 and TC-24 fail on both). Citation validity 100% for both; median 1.49 s vs 1.60 s.

**2. Follow-up conversations** (`scripts/benchmark_conversation.py`): 5 two-turn conversations on real phones (V50 5G x2, iPhone 16, Reno14 5G, Galaxy S25), 2 runs, 60 calls, about US$0.04.

| Variant | Median | Slowest | Unsupported values | Cost / answer |
| --- | --- | --- | --- | --- |
| before (v1, follow-up sent alone) | 1.96 s | 4.78 s | 0 | $0.00043 |
| **after (v2 + earlier turn, fast settings)** | 2.42 s | 3.59 s | 0 | $0.00049 |
| after with `low` reasoning | 5.37 s | 9.12 s | 0 | $0.00121 |

Read side by side: "before" answered "Can it run Genshin Impact smoothly?" with "I can't answer that definitively"; "after" said Genshin is not in the specs, then gave a hedged judgement from the cited chip, RAM, 120 Hz display and battery. "Is that enough for a full day of gaming?" after a battery question and "How far can it zoom?" after a telephoto question kept their subject. `low` reasoning was twice as slow and no better, so the fast one-phone settings stay. **Decision (owner asked for both fixes, 22 Nov):** prompt v2 is live in code (`PROMPT_VERSION = "v2"`), history on. Raw results: `.local/prompt-v2-eval-2026-11-22.*`, `.local/conversation-bench-2026-11-22.*`.

