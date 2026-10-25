# Consultation 3 packet — Sprint 3 (19–25 October 2026)

**Consultation: date and time not yet confirmed (missing)**. **Status cut-off: Sunday 25 October, 19:45 Manila.** Metrics, PR states and production checks below are as of then; refresh them before the consultation. The team deadline was Saturday 24 October, 3:00 PM; the carry-over cutoff was Sunday 25 October, 12:00 PM. Work finished after the deadline is reported with its actual time.

Format: 15 minutes, all five members.

**Sprint 3 gate (`docs/sprints-2-to-5.md`): not met.** Three of four conditions pass; the evaluation thresholds do not.

| Gate condition | Evidence | Status |
| --- | --- | --- |
| Main OpenAI user journey passes on the deployed revision | Cited live answer 22 Oct 23:16, 5/5 claims supported, 3/3 references valid (`docs/evidence/openai-production-2026-10-22.md`); Jopher's live journey on #57 (Sat 23:24), admin review step Sun 00:04; production verified on `4667bc1` Sun 19:12 | ✅ |
| Backend demonstrably processes the output | Invalid `[n]` removed and counted as `invalid_citations_removed`; cut-off answer (`finish_reason == "length"`) returns 503; empty answer rejected (#83, #103) | ✅ |
| Mocked LLM tests run in CI | `Backend tests` on every PR; no paid model call in routine CI; offline prompt evaluation on prompt/eval PRs (#102) | ✅ |
| Adrian's evaluation meets the stated thresholds | Scored run on 20 cases, 25 Oct (`docs/evidence/eval-s3-2026-10-25.md`): supported claims 5/13 (target ≥90%), valid references 15/15 (target 100%), abstention 0/7 as scored, override 1/2 | ❌ |

## 1. Live demo — 4 min (lead: Jopher)

Warm the free Render API about 2 minutes before (cold start about 42–55 s). On production, use only clearly labelled test text ("TekaTech Sprint 3 check"), and list anything created.

| # | Journey on https://tekatech-web.onrender.com | Owner |
| --- | --- | --- |
| 1 | iPhone 15 page → ask a broad question → cited answer → click `[1]` → source card opens | Jopher (Mika's UI, Manuel's backend) |
| 2 | Compare two gadgets → share link → reopen it in a new tab | Jopher |
| 3 | Submit a correction → admin Review Queue → reject/approve persists after reload | Jopher / Ikeee-AI (admin) |
| 4 | Missing evidence: question about a gadget with no specs → safe "no spec information" answer | Mika / Manuel |
| 5 | Failure recovery, from evidence (not a live outage): server down keeps the typed question and retries (`docs/pr-proof-s3/05`–`11`) | Jopher / Mika |

The failure simulator (#84) is admin-only and off in production; it has **not** been run live. Show it on TekaTech-dev only if the team rehearses it first.

## 2. Board — 3 min (Ikeee-AI as product owner)

Board: https://github.com/users/Ikeee-AI/projects/1 — Sprint 3 issues #54–#58 are still open; update their status before the consultation.

| Task | Owner | Delivered | Status | Remaining |
| --- | --- | --- | --- | --- |
| S3-AD | Adrian | 20-case set (#81), runner with versions, per-type and override scoring, Markdown report (#80), removed-citation counting (#89), abstention-leak scoring (#90), write-up (#82, #105), scored OpenAI report (#112, opened Sun 08:06) | **Partial** | Targets missed; most failures are retrieval (#88). Prompt not tuned (not justified by this run). Scorer gaps on canned abstention replies (#66). No true two-source conflict case yet |
| S3-MI | Mika | Answer, missing-evidence and AI failure states (#95), keyboard-accessible citations (#96), pending/failed indexing (#97), mobile comparison (#98), "server is waking up" banner (#99), UI evidence (#100, `frontend/docs/s3-ui-evidence.md`), deck draft (#111, opened Sun 01:16) | **Done for UI; deck late** | Deck draft after the Sat deadline (before the Sun noon cutoff). No status or plan comment on #55 |
| S3-MA | Manuel | Versioned prompt (#83), output validation and cost cap (#103), timeout/quota/malformed/empty-retrieval handling with mocked tests (#75), admin-only failure simulator and evaluator adapter (#84) | **Partial** (his own status, #56) | Failure drill not run on the deployed app; retrieval threshold drops narrow questions (#88) |
| S3-JO | Jopher | Ask/compare/share/correction journeys with failure recovery (#91, merged Sat 15:47), 17 screenshots in `docs/pr-proof-s3/`, live journey on production (#57), duplicate category fix (#110) | **Partial** (his own status, #57) | Automated browser check of the failure drill moved to Sprint 4; broken external image fallback on the compare page |
| S3-IK | Ikeee-AI | OpenAI restored with rotated keys and a $10 prepaid cap (#76); weekly capped live smoke job (#79, #86); offline prompt evaluation in CI (#102); caching with before/after latency (#73, #92); pipeline optimization −10 s median (#107, merged Sun); metrics and #59 decision (#94); work log (#87, #114) | **Partial** | Staging (#34) not started; #32 still open (its offline part merged in #102); Sprint 3 retro |

Review counts this sprint (PRs updated since 19 Oct that each person reviewed, excluding their own; GitHub search `reviewed-by:`, 25 Oct): Manuel 24, Jopher 8, Adrian 5, Ikeee-AI 4, Mika 0.

Standups on #72 (asked for daily before 9:00 AM): Adrian 2, Jopher 2, Manuel 1, Mika 0, Ikeee-AI 0.

Timeliness, from GitHub timestamps (details in `worklog.md`, 23 Oct 13:30 and 25 Oct 19:03):
- Thursday plan and first-PR milestones: Adrian and Manuel late; Mika and Jopher missed them.
- All Sunday noon carry-over items were delivered on time.

## 3. DevOps report — 3 min (Ikeee-AI)

**Pipeline changes this sprint (live):**
- Weekly budget-capped live OpenAI smoke job, never a required check (#79), with key cleaning (#86).
- Offline prompt evaluation on prompt/eval PRs (#102).
- Database job uses the runner's `psql` instead of an apt install (#107).
- Takeover runbook skill (#108).
- The fork-PR labeler (#67) and Dependabot continue.

**Metrics** (`python scripts/pipeline_metrics.py --since 2026-10-18 --until 2026-10-25`, cut-off 25 Oct 19:45 Manila):

| Avg PR pipeline | Main pipeline | Success rate | Prod deploys | Merge→live | Failed deploys | Recovery |
| --- | --- | --- | --- | --- | --- | --- |
| 0.71 min (88 runs) | 2.75 min (25 runs) | 99.1% (112/113 completed; 18 cancelled/skipped excluded) | 25 | 2.77 min (25 samples) | 0 | N/A (no production incident) |

Cancelled runs are mostly back-to-back merges in the same concurrency group; the last run of each batch deploys all of them.

**Measured optimization:**
- **Pipeline (#31, #107):** PR checks wall median 37 s → 27 s (−27%). Before: n = 60 runs. After: n = 5 runs of one commit, a small sample, so recheck on the next 5 ordinary PRs.
- **Application (#73):** public-read cache. `/gadgets` median 0.385 s → 0.217–0.238 s on a cache hit. Source: `docs/devops/optimizations.md`.

**Incidents:**
- No production incidents.
- The first live smoke run failed with `UnicodeEncodeError`: an invisible character got into the GitHub secret during setup (#85). It was fixed in #86 and verified by a later run. This was a job-setup error with no user impact; it is recorded in `worklog.md`, not in `incidents.md`.

**Security** (25 Oct, in the Sprint 4 log):
- Gitleaks 8.30.1 full-history scan: 204 commits across all branches, no leaks.
- `npm audit --omit=dev`: 0 vulnerabilities. `pip-audit`: none.
- One high dev-only alert (`zod`, through the ESLint plugin) is fixed in #115, waiting for review.

**AI spending controls:**
- $10 prepaid balance, auto-reload off; the project is limited to `text-embedding-3-small` and `gpt-5-mini`.
- Answers are capped at 1,500 completion tokens with `reasoning_effort` set to `low`.
- `/query` stays public (#59), guarded by a rate limit of 10 requests per minute.

## 4. Risks and next sprint — 2 min

| Risk | Impact | Mitigation | Owner | Date |
| --- | --- | --- | --- | --- |
| Retrieval threshold 0.5 drops narrow questions (#88) | Evaluation fails; users get "no spec information" for answerable questions | Measure the threshold on the 20 cases, then re-score as a separate labelled run | Manuel, then Adrian | Sprint 4 |
| Scorer misreads canned abstentions (#66) | Abstention score understated | Decide the scoring rule; re-score the same answers as a separate analysis | Adrian | Sprint 4 |
| Failure drill never run live; no automated browser drill check | Course demo item unproven | Rehearse on TekaTech-dev, then on production with the admin header | Manuel, Jopher | before 31 Oct |
| Shared $10 prepaid balance | Live AI stops when it runs out | Spending checked weekly by the smoke job; cost cap in #103 | Ikeee-AI | ongoing |
| Uneven participation (Mika: no status, standups or reviews; reviews concentrated on Manuel) | Explanation gaps at consultation; slow merges | Every member reviews at least one PR and posts standups Mon/Wed/Fri | all, Ikeee-AI follows up | Sprint 4 |
| No enforceable branch protection | Manual merge gate only | `pr-gate` skill + main guard; disclose, don't claim | Ikeee-AI | ongoing |

**Sprint 4 commitments (due Sat 31 Oct, 3:00 PM, or the instructor's earlier freeze):**

| Member | Commitment |
| --- | --- |
| Adrian | Release evaluation and write-up; AI presentation |
| Mika | UI/accessibility audit, final deck, visible-change rehearsal |
| Manuel | Security/reliability hardening, architecture/schema/API docs, failure drills |
| Jopher | Fresh-checkout acceptance and production user demo |
| Ikeee-AI | Tagged release, history-scan evidence, rollback and live deploy rehearsal, 21-item submission manifest |

Carry-over into Sprint 4: #88, #66, #32, #34, the browser failure-drill check, and the compare-page image fallback.

## 5. Questions — 3 min

Every member explains their own code and one alternative they considered, including AI-assisted code.
- **Adrian:** why the prompt was not tuned after a missed target.
- **Manuel:** how output is validated before the UI.
- **Ikeee-AI:** that #89 was approved and merged by the same person.

## Still to collect
- [ ] Confirm the Consultation 3 date and time with the instructor
- [ ] Sprint 3 retro comment from each member on #116
- [ ] Mika: S3-MI status comment on #55
- [ ] Status update and close/carry-over decision on #54–#58
- [ ] Ikeee-AI's own standups were not posted on #72 this sprint; say so if asked
- [ ] Refresh metrics and `verify-deploy` on the consultation day
