# Consultation 2 packet — Sprint 2 (12–18 October 2026)

**Status as of Saturday 17 October 2026, ~20:15 Asia/Manila.** The team deadline was Saturday 3:00 PM; items finished after it are marked with their actual time. Consultation time: ⏳ to be confirmed with the instructor. Format: 15 minutes, all five members, scored /20.

Course checks for Consultation 2: **full CRUD through API and UI · API tests running in the pipeline · every merge deploys automatically.**

| Course check | Evidence | Status |
| --- | --- | --- |
| API tests in the pipeline | `Backend tests` job runs the mocked pytest suite on every PR, including fork PRs since 17 Oct; new auth/validation tests in #36 and #37 | ✅ (teammate test PRs awaiting peer review) |
| Every merge deploys automatically | 10 main deploys this sprint, 0 failed; 7 gated merges on 17 Oct each deployed and smoke-verified; deploys now also require the main guard | ✅ |
| Full CRUD through API and UI | API CRUD exists; Mika's #39 adds create/edit/delete UI (delete gadget wired to the admin API); browser journey on the deployed app not yet demonstrated | 🟡 pending #39 merge + Jopher's journey |
| Persistence across redeploys (team gate) | Same 3 production gadgets (created 8 Aug / 12 Oct) after seven redeploys on 17 Oct | ✅ |

## 1. Live demo — 4 min (lead: Jopher)

Warm the free Render API ~2 minutes before (cold start ~55 s). Destructive rehearsal on **TekaTech-dev**, never production.

| # | Journey on https://tekatech-web.onrender.com | Owner | Ready? |
| --- | --- | --- | --- |
| 1 | Log in → create gadget → list → view → edit → refresh persists | Jopher (Mika UI) | 🟡 after #39 |
| 2 | Save a spec without an AI call; shows as pending | Jopher / Manuel | ✅ existing feature |
| 3 | Non-admin delete refused; admin delete works | Manuel / Jopher | 🟡 API tested; UI after #39 |
| 4 | Data present after redeploy | Ikeee-AI | ✅ evidence above |
| 5 | Gadget → spec relationship in the feature | Manuel / Jopher | ✅ gadget detail lists its specs |

## 2. Board — 3 min (Ikeee-AI as product owner)

Board: https://github.com/users/Ikeee-AI/projects/1 — Sprint 2 issues #20–#24, all PRs placed with real statuses.

| Task | Owner | PR | Status | Reason / next |
| --- | --- | --- | --- | --- |
| S2-AD | Adrian | [#35](https://github.com/Ikeee-AI/TekaTech/pull/35) (Fri 21:03) | **Partial** | Spec, 2×5 facts, 10 cases delivered; evaluator scores a mock, 3/10 cases; S24 variants mixed. Fixes requested; reviewer Manuel |
| S2-MI | Mika | [#39](https://github.com/Ikeee-AI/TekaTech/pull/39) (Sat 15:55, ~1 h late) | **Partial (near Met)** | Components, all UI states, 38 screenshots at 360/1280 px; spec-delete control has no backend; reviewer Jopher |
| S2-MA | Manuel | [#37](https://github.com/Ikeee-AI/TekaTech/pull/37) (Sat 14:15) | **Partial / Blocked** | Auth contract tests + API reference (4 auth rows to correct); OpenAI blocked by credit; reviewed 9 PRs; reviewer Jopher |
| S2-JO | Jopher | [#36](https://github.com/Ikeee-AI/TekaTech/pull/36) (Sat 11:32) | **Partial** | 6 API tests; browser CRUD journey, seed script outstanding; overlaps #37 (rebase after it) |
| S2-IK | Ikeee-AI | #17, #19, #25, #27, #29, #30, #40 merged; #26, #46, #52 in review | **Done for CI/CD scope; Partial overall** | Pipeline, guardrails, environments, board, metrics delivered and live; instructor dates and OpenAI credit open |

Detailed scorecards: `docs/sprints/sprint-2/reviews/sprint-2-deliverable-reviews.md`.

## 3. DevOps report — 3 min (Ikeee-AI)

**Pipeline changes this sprint (all live unless noted):** metrics script from real run data; actionlint workflow lint; scheduled production health check with auto-incident; weekly metrics + dependency audit; Dependabot version updates and security-fix PRs; owner-area PR labels; guarded one-click rollback and tag-based release notes; **main guard** (unreviewed code cannot deploy); squash-only merges; Actions allowlist; fork PR CI with read-only token. In review: gitleaks history scan (#26), automated PR review (#46), audit fix (#52). Diagram: `docs/devops/engineering-workflow.html`.

**Metrics (final, `scripts/pipeline_metrics.py`, Sprint 2 window):**

| Avg PR pipeline | Main pipeline | Success rate | Prod deploys | Merge→live | Failed deploys | Recovery |
| --- | --- | --- | --- | --- | --- | --- |
| 0.66 min (37 runs) | 2.19 min (10 runs) | 100% (48/48) | 10 | 2.19 min (9 samples) | 0 | N/A (no incident) |

**Incidents / process exceptions** (`docs/devops/incidents.md`): no production incident. PE-1 direct push to main (`ed37f45`) → main guard added; PE-2 fork PRs ran no CI for up to ~30 h → fork workflows enabled; PE-3 weekly audit could not fail → fixed in #52 and proven.

**Security:** full-history secret scan clean (all branches). Dependency audit: 18 advisories in 3 Python packages + 1 high npm (#28) → Dependabot fix PRs #41–#45 awaiting review.

**Optimization:** quality gates cost ~1 s each (measured); the measured speed optimization is Sprint 3 (#31).

## 4. Risks and next sprint — 2 min

| Risk | Impact | Mitigation | Owner | Date |
| --- | --- | --- | --- | --- |
| OpenAI credit exhausted | Sprint 3 grounded-AI gate cannot pass | Top up or capped key; Manuel records one real call | Ikeee-AI / Manuel | before 19 Oct |
| Review bottleneck on Manuel; three members gave no reviews | Slow merges, uneven process scores | Automatic reviewer assignment (#46); each member reviews at least one PR per sprint | Ikeee-AI | Sprint 3 |
| No enforceable branch protection (403) | Direct pushes possible | Main guard blocks deploys + opens issue; ask instructor | Ikeee-AI | Consultation 2 |
| Vulnerable dependencies (pyjwt etc.) | Security debt | Merge Dependabot PRs #41–#45 after review | Manuel / Mika | Sprint 3 start |

**Sprint 3 commitments (due 24 Oct):** grounded OpenAI answers end to end; Adrian's 20-case evaluation scoring real outputs; Manuel's output validation and failure simulator; Jopher's ask/compare/correction journeys; Mika's answer/citation states; Ikeee-AI's prompt-eval CI (#32), capped live smoke (#33), staging (#34) and one measured pipeline optimization (#31).

## 5. Questions — 3 min

Every member explains their own code and one alternative they considered (AI-assisted code included).

## Still to collect
- [ ] Standup entries (Thu/Fri/Sat) written by each member — none recorded in the repository yet
- [ ] One retro input each: what worked, what didn't, one change for Sprint 3
- [ ] Instructor: consultation time and code-freeze date
