# Consultation 2 packet — Sprint 2 (12–18 October 2026)

**Consultation: Monday 19 October 2026, 7:30 PM Asia/Manila** (confirmed by Ikeee-AI on 17 Oct). **Status cut-off: Sunday 18 October, 15:41 Manila** — metrics, persistence and PR states below are as of then and are refreshed before the consultation. The team's internal deadline was Saturday 17 October, 3:00 PM; work finished after it is reported with its actual time.

Format: 15 minutes, all five members, scored /20.

| Course check (Consultation 2) | Evidence | Status |
| --- | --- | --- |
| API tests in the pipeline | `Backend tests` runs the mocked pytest suite on every PR (fork PRs since 17 Oct); auth/validation tests merged in #36, more in #37 | ✅ |
| Every merge deploys automatically | 21 production deploys, 0 failed (one first attempt re-run, PE-4); every merge since 17 Oct also passes the main guard | ✅ |
| Full CRUD through API and UI | API CRUD + Mika's UI (#39, live: create/edit forms, admin-only delete); Jopher's browser CRUD proof on TekaTech-dev (#36) | ✅ live demo to confirm |
| Persistence across redeploys (team gate) | Same 3 production gadgets after 21 deploys; `docs/evidence/sprint2-persistence.json` | ✅ |

## 1. Live demo — 4 min (lead: Jopher)

Warm the free Render API ~2 minutes before (cold start ~55 s). Destructive steps only on **TekaTech-dev**; on production show reads, create/edit of a clearly named demo record, and the non-admin delete refusal.

| # | Journey on https://tekatech-web.onrender.com | Owner |
| --- | --- | --- |
| 1 | Log in → create gadget → list → view → edit → refresh persists | Jopher (Mika's UI) |
| 2 | Save a spec without an AI call; it shows as pending | Jopher / Manuel |
| 3 | Delete button only for admins; API refuses non-admin delete | Mika / Manuel |
| 4 | Data present after redeploy (evidence file) | Ikeee-AI |
| 5 | Gadget → spec relationship on the detail page | Manuel / Jopher |

## 2. Board — 3 min (Ikeee-AI as product owner)

Board: https://github.com/users/Ikeee-AI/projects/1 — Sprint 2 issues #20–#24 with real statuses; Sprint 3 issues #54–#58 ready.

| Task | Owner | Delivered | Status | Remaining |
| --- | --- | --- | --- | --- |
| S2-AD | Adrian | #35 merged (spec, source pack, 10 cases, first evaluator) | **Partial** | Review fixes completed by Ikeee-AI while Adrian was unavailable: #65 (in review); evaluator tightening #66 |
| S2-MI | Mika | #39 merged and live (components, all UI states, 38 screenshots at 360/1280 px; admin-only delete after Jopher's review) | **Done pending live check** | Confirm in the demo |
| S2-MA | Manuel | #37 (auth contract tests, corrected API reference); 16 reviews | **Partial / Blocked** | Jopher's re-approval and rebase after #36; real OpenAI call blocked by credit |
| S2-JO | Jopher | #36 merged (6 API tests, dev-only seed script, browser CRUD proof) | **Done pending live check** | Remove duplicate test when #37 lands |
| S2-IK | Ikeee-AI | CI/CD, guardrails, environments, board, security fixes, metrics, packet | **Done for CI/CD scope** | Instructor items below |

Review counts this sprint (PRs reviewed, excluding one's own; GitHub search `reviewed-by:`, 18 Oct): Manuel 16, Ikeee-AI 6, Jopher 2, Mika 0, Adrian 0. Detailed scorecards: `docs/sprints/sprint-2/reviews/sprint-2-deliverable-reviews.md`.

## 3. DevOps report — 3 min (Ikeee-AI)

**Pipeline changes this sprint (live):** metrics script from real run data; actionlint and gitleaks (full history) gates; main guard (unreviewed code cannot deploy) with retry fix; daily production health check with auto-incident; weekly metrics + dependency audit (fails on findings); Dependabot security and version PRs; owner-area labels; guarded rollback and tag-based release notes; squash-only merges; Actions allowlist; fork PR CI with read-only token. In review: automated PR review + reviewer assignment (#46). Diagram: `docs/devops/engineering-workflow.html`.

**Metrics** (`docs/evidence/sprint2-metrics.json`, cut-off 18 Oct 15:41):

| Avg PR pipeline | Main pipeline | Success rate | Prod deploys | Merge→live | Failed deploys | Recovery |
| --- | --- | --- | --- | --- | --- | --- |
| 0.68 min (55 runs) | 2.17 min (21 runs) | 100% (77/77 runs, final attempts) | 21 | 2.27 min (20 samples) | 0 (1 failed first attempt, re-run) | N/A (no production incident) |

**Process exceptions** (`docs/devops/incidents.md`, no production impact): PE-1 one direct commit to main → main guard; PE-2 fork PRs ran no CI for up to ~22 h → fork workflows enabled; PE-3 weekly audit could not fail → fixed and proven; PE-4 main guard false positive on #26 → retry fix (#64).

**Security:** full-history secret scan clean (38 commits, latest main run). Dependency audit found 22 advisories (incl. one critical, pyjwt) → all fixed through reviewed Dependabot PRs; 0 open alerts.

**Optimization:** quality gates measured at ~1 s each; the measured speed optimization is Sprint 3 (#31).

## 4. Risks and next sprint — 2 min

| Risk | Impact | Mitigation | Owner | Date |
| --- | --- | --- | --- | --- |
| OpenAI credit exhausted | Sprint 3 grounded-AI gate cannot pass | Top up or capped key; Manuel records one real call | Ikeee-AI / Manuel | before 21 Oct |
| Reviews concentrated on one member | Slower merges; uneven process evidence | Reviewer auto-assignment (#46); every member reviews at least one PR per sprint | Ikeee-AI | Sprint 3 |
| No enforceable branch protection (HTTP 403) | Direct pushes possible | Main guard blocks deploy + opens issue; ask instructor | Ikeee-AI | Consultation 2 |
| Member availability (S2-AD covered by Ikeee-AI) | Ownership and explanation gaps | Covered work recorded; owner reviews it on return | Adrian / Ikeee-AI | Sprint 3 |
| Public `/query` once OpenAI is paid again | Cost/abuse | Decision #59 | Ikeee-AI / Manuel | Sprint 3 |

**Sprint 3 commitments (due 24 Oct):** #54 Adrian (20-case evaluation on real answers), #55 Mika (answer/citation states, deck draft), #56 Manuel (prompt in OpenAI path, output validation, failure simulator), #57 Jopher (ask/compare/correction journeys), #58 Ikeee-AI (prompt-eval CI #32, capped live smoke #33, staging #34, measured optimization #31). Kickoff agenda: #62.

## 5. Questions — 3 min

Every member explains their own code and one alternative they considered (AI-assisted code included). For S2-AD: Adrian explains the spec and cases; Ikeee-AI explains the support changes in #65.

## Still to collect
- [ ] Standup comments in #60 from each member
- [ ] Retro comment in #61 from each member before Monday 7:30 PM
- [ ] Final metrics/persistence refresh on Monday afternoon
