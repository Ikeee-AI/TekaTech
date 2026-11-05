# Backend latency and error sample, before the pilot (4 Nov 2026, S5-MA)

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
