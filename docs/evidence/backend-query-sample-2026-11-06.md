# Capped `POST /query` sample and "budget held" write-up, 6 Nov 2026 (S5-MA)

Run by Manuel (`s2302827-byte`, AI-assisted: yes, Claude Code), at about 16:50 Manila on Fri 6 Nov. Raw rows: [`backend-query-sample-2026-11-06.json`](backend-query-sample-2026-11-06.json). This closes the two open items in [`backend-pilot-2026-11-04.md`](backend-pilot-2026-11-04.md): the paid `/query` sample and the budget comparison.

**Approval:** Ikeee-AI approved this sample on #229 (worklog, 5 Nov): at most 10 questions, at most $0.10, run once, before Sat 7 Nov 15:00. It was run once, with no retries.

## 1. The `/query` sample

Production API, anonymous (no login, no special headers), from the owner's laptop in Manila. The free host was awake (`/health` 0.43 s before the first question). **8 distinct questions plus 1 repeat of question 1** (9 requests; the repeat is expected to be an answer-cache hit and costs nothing). One request at a time, 7 s apart, so the 10-per-minute limit was never close. The questions are in the JSON.

| # | Question (short) | Status | Seconds | Sources | Cited |
| --- | --- | --- | --- | --- | --- |
| 1 | iPhone 15 chip | 200 | 6.39 | 3 | yes |
| 2 | Poco x7 Pro battery | 200 | 3.32 | 3 | yes |
| 3 | Infinix Note 50 Pro 5G+ screen | 200 | 3.27 | 3 | yes |
| 4 | Rog Ally RAM | 200 | 3.75 | 3 | yes |
| 5 | iPhone 15 vs Poco x7 Pro battery | 200 | 6.40 | 3 | yes |
| 6 | iPhone 15 wireless charging | 200 | 2.70 | 3 | yes |
| 7 | Infinix Note 50 Pro 5G+ cameras | 200 | 2.97 | 3 | yes |
| 8 | Poco x7 Pro weight | 200 | 6.37 | 3 | yes |
| 9 | repeat of 1 | 200 | **0.25** | 3 | yes |

- **Errors: 0 of 9.** All were `answer_basis: "specs"`, `retrieval: "vector"`, `model_used: openai:gpt-5-mini`, with `invalid_citations_removed: 0`.
- **New questions (8): median 3.5 s, fastest 2.7 s, slowest 6.4 s.** Three of them took almost exactly 6.4 s (6.39, 6.40, 6.37); I do not know why and did not investigate. The other five took 2.7-3.8 s.
- **Repeat: 0.25 s**, so the answer cache works on production.
- **Cost:** 8 paid answers. The OpenAI usage is not visible from outside, so this is an estimate: PR #157 measured about $0.0009 per answer, which gives under one cent in total, far under the $0.10 cap. Treat it as an estimate, not a bill.
- **Not measured:** answer quality. This is a latency and error sample, not an evaluation (the evaluation is in `eval-s5-2026-11-05.md`).

For context, earlier figures were never production samples: about 2.5 s average after the cost cap (4 answers, #103) and 4 s single / 6 s comparison on dev (#157). This is the first real production sample of `/query`.

## 2. Did the budget hold?

The performance budget was proposed in `backend-performance-2026-10-30.md` and **accepted by Ikeee-AI on 5 Nov** (#229, worklog). It covers the public read routes. Measurements are from the two free read-only runs (4 and 5 Nov, PR #230).

| Measure | Budget | Measured | Held? |
| --- | --- | --- | --- |
| Cached read, median | at most 0.5 s | 0.116-0.129 s (eight route medians over two runs) | **Yes** |
| Cache miss, any single request | at most 1.5 s | worst 1.265 s (a warm-up miss on `/gadgets`, 4 Nov); the 36 deliberate misses on 5 Nov were all at most 0.733 s | **Yes**, but the 1.265 s leaves only 0.235 s of margin |
| Errors | 0 in at least 50 requests | 0 of 528 sampled read requests (plus 8 warm-ups), and 0 of 9 `/query` requests | **Yes** |
| Cold start | disclosed, not budgeted | 42.7 s (`/health`, 4 Nov); about 62 s for the first `/query` after idle on 5 Nov (#233), which includes the answer | Disclosed |

**What this does and does not show**
- **"Held" means: held in the samples I took.** All of them were taken **before** the pilot. The pilot was moved past Sprint 5 on 5 Nov ([`scope-changes.md`](../scope-changes.md)), so there is **no measurement during a pilot window**, and I do not claim the budget held during one.
- The budget has no figure for `/query`. Its numbers above are information, not a pass or fail.
- One laptop, one network, a free host, a few evenings. Treat the numbers as ranges, not guarantees.
- The weakest figure is the cache-miss ceiling (1.265 s is one request).
- No backend fault was found, so there are no fixes with regression evidence from this task. The failure-drill controls were checked separately (`failure-drill-controls-2026-11-05.md`).
