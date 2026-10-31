# Backend performance check, 30 Oct 2026 (S4-MA)

Closes the loop on the Sprint 4 acceptance line "backend meets the performance budget agreed from Sprint 3 measurements". Raw samples: `backend-performance-2026-10-30.json`.

## Finding first: no numeric budget was ever written down
The plan (`docs/sprints-2-to-5.md`, risk list) said to set measured response-time and error budgets from Sprint 3 data before Sprint 4. Searching the repository, the issues and the pull requests finds none: Sprint 3 issue #58 asked for a **baseline**, which exists in `docs/devops/app-performance.md` (#92), and every other "budget" hit is about the $10 OpenAI spend. So this page compares today's numbers with that baseline and **proposes** a budget; the team has not agreed one.

## What was measured
Production API (`https://tekatech-api.onrender.com`), read-only `GET` requests, from the owner's laptop in Manila, on 30 Oct 2026. Same method as the baseline: one request at a time, a new connection each, wall-clock time. 20 samples per route after one warm-up request. No `/query` calls (each is a paid OpenAI call), no writes.

| Route | n | Errors | Median (all) | Cache HIT median | Cache MISS (n) | Fastest / slowest |
| --- | --- | --- | --- | --- | --- | --- |
| `/health` (no database, the floor) | 20 | 0 | 0.115 s | n/a | n/a | 0.096 / 0.125 s |
| `/gadgets` | 20 | 0 | 0.115 s | 0.114 s (19) | 1.005 s (1) | 0.104 / 1.005 s |
| `/stats/spec-coverage` | 20 | 0 | 0.116 s | 0.116 s (19) | 0.525 s (1) | 0.098 / 0.525 s |
| `/stats/trending-questions` | 20 | 0 | 0.116 s | 0.116 s (19) | 0.427 s (1) | 0.108 / 0.427 s |

**80 of 80 requests returned 200.** The first request took 0.33 s: the host was already awake, so **this is not a cold-start sample**.

## Against the Sprint 3 baseline (`app-performance.md`, 23 Oct)
| | Baseline (23 Oct) | Today (30 Oct) |
| --- | --- | --- |
| `/health` floor | 0.268 s | 0.115 s |
| Cached reads | 0.217–0.238 s (n=45 each) | 0.114–0.116 s (n=19 each) |
| Cache miss | 0.496–0.673 s (n=5 each) | 0.427–1.005 s (n=1 each) |
| Errors | 0 of 200 | 0 of 80 |

- Cached reads are still about as fast as the floor, so the database is not in the path for a hit, as before.
- The floor itself halved, so the network between this laptop and Render was faster today. **Differences between the two runs are mostly the network, not the code.** Compare the cached reads with the floor, not with the old absolute numbers.
- The miss samples are one per route: they agree with the baseline's range, and the 1.0 s on `/gadgets` is a single slow read, not a trend.

## Proposed budget (a proposal, not agreed)
| Measure | Proposed | Measured |
| --- | --- | --- |
| Cached read, median | at most 0.5 s | 0.115 s (today), 0.23 s (baseline) |
| Cache miss, any single request | at most 1.5 s | 0.43–1.0 s today; 0.5–0.7 s baseline |
| Errors on these routes | 0 in a sample of at least 50 | 0 of 80 today, 0 of 200 baseline |
| Cold start | disclosed, not budgeted | 42–55 s in four earlier samples |
| `POST /query` | no budget yet | see below |

All proposed values leave a wide margin over what was measured, on purpose: the numbers come from one laptop, a few runs and a free host, and the plan says not to promise latency the hosting plan cannot support.

## What this does not cover
- **`POST /query` latency has no real sample.** It costs money per call. What exists: single observations of 6–11 s on a cold or just-woken host (`app-performance.md`), an average of 2.5 s after the cost cap on four answers (PR #103), and about 4 s (single gadget) and 6 s (comparison) between consecutive answers in the dev cost measurement (PR #157). None is a production sample.
- **No new cold start** was measured today.
- One laptop, one network, one afternoon. Treat it as a range.

## Related before/after evidence from this sprint
| Change | Result | Where |
| --- | --- | --- |
| Read cache (#73) | Cached reads 40–62% faster | `docs/devops/app-performance.md` |
| Answer cap (#103) | Cost about 60% lower, average answer time 4.5 s to 2.5 s (4 answers) | PR #103 |
| Retrieval cutoff (#88) | Supported claims 5 of 13 to 11 of 13 | `docs/evidence/eval-s4-2026-10-26-scoped.md` |
| Comparison cost | About $0.0009 per answer; worst case about $0.004 | PR #157 |
