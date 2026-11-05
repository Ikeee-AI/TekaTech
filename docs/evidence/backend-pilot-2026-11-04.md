# Backend latency and error samples, before the pilot (4 and 5 Nov 2026, S5-MA)

First of the S5-MA "measured latency/error results". Raw samples: `backend-pilot-2026-11-04.json`. **This is the free, read-only part.** The paid `POST /query` sample is not in this file; it needs Ikeee-AI's approval and is planned for after the pilot window.

## What was measured
Production API (`https://tekatech-api.onrender.com`), read-only `GET` requests, from the owner's laptop in Manila, at 11:39 UTC (19:39 Manila) on Wed 4 Nov, while the pilot was still on hold (Ikeee-AI's log of 5 Nov: pilot not started). Same method as `backend-performance-2026-10-30.md`: one request at a time, a new connection each, wall-clock time. One warm-up request per route, then **60 samples per route**. No `/query` calls, no writes, no login.

| Route | n | Errors | Median | Cache HIT (n) | Cache MISS on warm-up | Fastest / slowest |
| --- | --- | --- | --- | --- | --- | --- |
| `/health` (no database, the floor) | 60 | 0 | 0.119 s | n/a | n/a | 0.106 / 0.310 s |
| `/gadgets` | 60 | 0 | 0.117 s | 0.117 s (60) | 1.265 s | 0.105 / 0.213 s |
| `/stats/spec-coverage` | 60 | 0 | 0.120 s | 0.120 s (60) | 0.595 s | 0.108 / 0.280 s |
| `/stats/trending-questions` | 60 | 0 | 0.116 s | 0.116 s (60) | 0.326 s | 0.106 / 0.233 s |

**240 of 240 sampled requests returned 200** (plus 4 warm-up requests, also 200).

## Cold start (recorded separately)
The first `/health` of the day, in the diagnostic run in `docs/troubleshooting.md` section 6 (about 8 minutes earlier), took **42.7 s**. This sample was taken on an awake host, so it is **not** a cold-start sample. Cold starts are disclosed, not budgeted.

## Against the proposed budget
The budget is **my proposal and has not been accepted** by Ikeee-AI (`backend-performance-2026-10-30.md`, "Proposed budget"). The comparison is shown for information, not as a pass.

| Measure | Proposed | Measured today |
| --- | --- | --- |
| Cached read, median | at most 0.5 s | 0.116-0.120 s |
| Cache miss, any single request | at most 1.5 s | 0.326-1.265 s (3 samples, one per route) |
| Errors on these routes | 0 in at least 50 | 0 of 240 |
| Cold start | disclosed | 42.7 s (earlier the same day) |

## Against earlier runs
| | 23 Oct baseline | 30 Oct | 4 Nov |
| --- | --- | --- | --- |
| `/health` floor | 0.268 s | 0.115 s | 0.119 s |
| Cached reads | 0.217-0.238 s | 0.114-0.116 s | 0.116-0.120 s |
| Errors | 0 of 200 | 0 of 80 | 0 of 240 |

The 4 Nov numbers match 30 Oct, so there is no sign of a backend latency regression so far. The 23 Oct figures were taken on a slower network, so compare cached reads with the `/health` floor, not with the old absolute numbers.

## Limits
- All 180 sampled reads on the three data routes were cache hits, because the one warm-up request filled the cache. **The miss figure rests on 3 requests**, one per route. It is weak evidence; the 1.265 s on `/gadgets` is a single read.
- One laptop, one network, one evening, a free host. Treat it as a range.
- It says nothing about `POST /query` latency, which is where a regression would cost money. That sample is still to do.
- It is a pre-pilot sample. Repeat it once the pilot has actually started and again at the end of the window.

---

## Second run, Thu 5 Nov (08:07 UTC, 16:07 Manila): burst plus spaced samples
Raw samples: `backend-pilot-2026-11-05.json`. Same method and the same four routes, from the same laptop, read-only `GET`, no `/query`, no login. As on 4 Nov, **the pilot had not started** (the owner's log of 5 Nov says "not started, on hold"), so this is a second pre-pilot sample, not a pilot measurement. Two parts:
- **Burst:** 60 requests per route, 0.3 s apart (as on 4 Nov). Almost all are cache hits.
- **Spaced:** 12 rounds, one request per route every 65 s. The answer caches live 60 s (`GADGETS_TTL_SECONDS`, `STATS_TTL_SECONDS`), so each of these is a **real cache miss**. This fills the gap left on 4 Nov, when the miss figure rested on 3 requests.

| Route | Burst n | Burst errors | Burst median (hits) | Spaced n | Spaced median (misses) | Spaced fastest / slowest |
| --- | --- | --- | --- | --- | --- | --- |
| `/health` (no database, the floor) | 60 | 0 | 0.127 s | 12 | 0.260 s | 0.241 / 0.288 s |
| `/gadgets` | 60 | 0 | 0.128 s (60 hits) | 12 (12 misses) | 0.543 s | 0.308 / 0.733 s |
| `/stats/spec-coverage` | 60 | 0 | 0.129 s (60 hits) | 12 (12 misses) | 0.534 s | 0.352 / 0.698 s |
| `/stats/trending-questions` | 60 | 0 | 0.124 s (60 hits) | 12 (12 misses) | 0.361 s | 0.226 / 0.496 s |

**292 of 292 requests returned 200** (240 burst, 48 spaced, 4 warm-up).

Reading it:
- **The spaced `/health` is slower than the burst `/health`** (0.26 s against 0.127 s) although `/health` touches no database. A new connection after 65 s of idle costs about 0.13 s more, so the spaced numbers include that connection cost. Subtract it when comparing with the cached figures: the database work of a miss is roughly 0.1-0.4 s.
- **Cache misses: 36 samples, slowest 0.733 s**, against a proposed ceiling of 1.5 s. With the 4 Nov warm-up misses (0.326-1.265 s) the worst miss seen in two runs is 1.265 s.
- **Cached reads: median 0.124-0.129 s**, the same as 4 Nov (0.116-0.120 s) and 30 Oct (0.114-0.116 s). No sign of a regression.
- **Errors: 0 of 536 requests** across the two runs (244 on 4 Nov, 292 on 5 Nov); 528 of them were sampled requests and 8 were warm-ups. All returned 200.

## Against the proposed budget (still not accepted by the owner)
| Measure | Proposed | Measured, two runs |
| --- | --- | --- |
| Cached read, median | at most 0.5 s | 0.116-0.129 s |
| Cache miss, any single request | at most 1.5 s | 0.226-1.265 s (36 spaced + 6 warm-up misses) |
| Errors on these routes | 0 in at least 50 | 0 of 528 sampled requests |
| Cold start | disclosed | 42.7 s on 4 Nov |

The budget is still **my proposal**: see PR #229 for the question to Ikeee-AI. Without an answer, this file reports measurements only.

## Still to do
- **A sample inside the pilot window.** Both runs are pre-pilot. Repeat once the pilot has started and again at the end.
- **`POST /query`** has no production sample. It needs the owner's approval to spend credit.
