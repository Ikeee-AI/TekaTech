# Consultation 4 packet — Sprint 4 (26–31 October 2026)

**Consultation: Monday 2 November 2026, 19:30 Asia/Manila** (confirmed by Ikeee-AI on 31 Oct). **Status cut-off: Saturday 31 October, 15:30 Manila.** Refresh PR states and the production check before the consultation.

Format: 15 minutes, all five members.

**Sprint 4 gate (`docs/sprints-2-to-5.md`): mostly met; two conditions open.**

| Gate condition | Evidence | Status |
| --- | --- | --- |
| Tagged release on a free public URL | [`v1.0.0`](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) on `5aa4635`, tagged 14:32; deployed smoke passed 14:24 (exact commit, readiness, CORS, 4 gadgets) | ✅ |
| Passing core acceptance | 18 of 20 journeys pass, 0 fail (#158); rows 19–20 (password-reset email, data survives a redeploy) not yet run on production | ✅ (2 rows pending) |
| Documented limitations | Release notes "Known limitations"; `docs/submission-manifest.md` "Disclosed gaps" | ✅ |
| Tested rollback | `rollback.yml` on production: back 1 min 35 s, forward 1 min 45 s; database restore to a disposable copy 14.0 s (#167) | ✅ |
| Measured pipeline improvements | PR checks median 37 s → 27 s (#107, after-measurement in #154); Vitest and Playwright jobs added (#137, #128) | ✅ |
| Complete submission evidence | 18 of 21 manifest items ready; open: Sprint 4 standups/retro (12), final slide deck (14) (#167, #169) | ⚠️ Partial |
| Successful live deploy rehearsal | Not yet run; timer ready (#170); needs Mika's visible change and Jopher's review (#169) | ❌ |

## 1. Live demo — 4 min (lead: Jopher)

Script: [`docs/demo/user-demo-script.md`](../../demo/user-demo-script.md) (#160). Warm the free Render API about 2 minutes before. On production use only clearly labelled test text and list anything created.

| # | Journey on https://tekatech-web.onrender.com | Owner |
| --- | --- | --- |
| 1 | Gadget page → ask → cited answer with "Answer based on N cited specs" → click `[1]` → source card | Jopher (Mika's UI, Manuel's backend) |
| 2 | Compare gadgets (equal-width columns, #163) → AI trade-off comparison → share link in a new tab | Jopher |
| 3 | New non-admin user: sign up → create gadget → add specs → index → cited answer; admin pages refused | Jopher |
| 4 | Correction → admin Review Queue (word diff) → approve → spec re-indexes | Jopher / Ikeee-AI (admin) |
| 5 | Malformed requests (`scripts/demo_malformed_requests.py`, #162) and the failure drill from evidence (#151, #153) | Manuel |

## 2. Board — 3 min (Ikeee-AI as product owner)

Board: https://github.com/users/Ikeee-AI/projects/1 — Sprint 4 issues and PRs added on 31 Oct with statuses matching GitHub (43 Done; #167 and #170 In review; follow-ups #168, #169 In Progress).

| Task | Owner | Delivered (merged and deployed) | Status | Remaining |
| --- | --- | --- | --- | --- |
| S4-AD | Adrian | Labelled s4 scoring profile and a 20-case rerun on current main, write-up updated (#166); first scored run recorded (#112) | **Partial** | Targets missed (supported claims 11/13, valid references 41/45, abstention 0/7, override 1/2). Demo cases and speaker notes for the AI deep dive not found in the repo. 0 reviews this sprint |
| S4-MI | Mika | Delete-spec UI (#143), UTC release dates (#141), slow-answer wording (#149), "no supporting source" label (#150), equal compare columns (#163), Add Specs hint (#165) | **Partial** | UI/accessibility audit report and final deck not in the repo; visible-change rehearsal not done (#169) |
| S4-MA | Manuel | Scoped retrieval ranking (#129), dev failure drill + rerun (#151), authorization matrix test + comparison cost (#157), API reference (#159), architecture notes (#161), malformed-request demo (#162), latency check + performance budget (#164) | **Done** | Review #167; confirm #118 can close |
| S4-JO | Jopher | Delete-spec route (#127), failure-drill browser checks in CI (#128), correction re-index (#142), compare image fallback (#121), quick-start + fresh checkout (#155), acceptance report (#158), demo script (#160) | **Done**, 2 acceptance rows pending | Rows 19–20 on production; review Mika's challenge PR |
| S4-IK | Ikeee-AI | Release `v1.0.0`; 15 merges on release day; full-history Gitleaks clean; rollback + restore rehearsals; Sprint 4 final metrics; submission manifest; board updated; support PRs (#130–#139, #145, #147); production drill (#152, #153) | **Partial** | #167 and #170 need review; live deploy challenge; Sprint 4 retro (#168) |

PRs reviewed this sprint (merged 26–31 Oct UTC, excluding own): Manuel 32, Jopher 17, Mika 7, Ikeee-AI 4, Adrian 0.
Merged PRs authored: Ikeee-AI 20, Manuel 7, Jopher 7, Mika 6, Adrian 1, Dependabot 5.
Standups: **missing** — no Sprint 4 standup thread was opened.

## 3. DevOps report — 3 min (Ikeee-AI)

**Pipeline changes this sprint (live):** Vitest unit tests in the frontend job (#137); Playwright failure-drill browser job (#128); readiness check `/health/ready` and request IDs (#136); `rollback.yml` and `release.yml` used for real for the first time.

**Metrics** (`python scripts/pipeline_metrics.py --since 2026-10-26 --until 2026-10-31`, cut-off 31 Oct 14:45 Manila; [report](../../evidence/sprint4-metrics-final.json)):

| PR pipeline avg | Main pipeline avg | Success | Deploys | Merge-to-live median | Failed deploys |
| --- | --- | --- | --- | --- | --- |
| 0.72 min (71 runs) | 2.78 min (24 runs) | 100.0% (95/95) | 24 | 3.88 min (24 samples) | 0 |

**Recovery:** rollback 1 min 35 s, roll-forward 1 min 45 s ([evidence](../../evidence/rollback-rehearsal-2026-10-31.md)); database restore to a disposable copy 14.0 s ([evidence](../../evidence/db-restore-2026-10-31.md)).
**Security:** secret guard passed; Gitleaks 8.30.1 on full history, no leaks; pip-audit and npm audit clean (31 Oct).
**Incidents:** no production incident in Sprint 4 ([incidents.md](../../devops/incidents.md)). One supervised production failure drill (#118, #153). The main guard blocked one deploy on 28 Oct because an approval was not on the merged commit (#144); nothing reached production.
**Optimizations:** [optimizations.md](../../devops/optimizations.md). The merge-to-live median rose from 2.77 (Sprint 3) to 3.88 min because release-day merges queued in one concurrency group and the browser job adds time.

## 4. Risks and next sprint — 2 min

| Risk | Mitigation | Owner | Date |
| --- | --- | --- | --- |
| Live deploy challenge never rehearsed before Demo Day | Run it with the timer (#170): Mika's change, Jopher's review, Ikeee-AI narrates; target under 30 min | Mika, Jopher, Ikeee-AI | Before Demo Day |
| AI quality targets still missed | Sprint 5 regression cases from pilot failures; tune the prompt only where evidence justifies it | Adrian, Manuel | 7 Nov |
| Free Render API cold start (about a minute) during demos and the pilot | Warm 2 min before; record cold/warm timings in the pilot report | Ikeee-AI | 4–6 Nov |
| No enforced branch protection or staging | Manual gate + CI main guard; staging carried to Sprint 5 (#34); both disclosed | Ikeee-AI | Disclosed |
| Merge backlog before deadlines | Merge gate-passing PRs within 24 h | Ikeee-AI | Sprint 5 |

**Sprint 5 commitments (due Sat 7 Nov 15:00; pilot starts by Wed 4 Nov 12:00, at least 48 h):**
- **Adrian (S5-AD):** review pilot answer failures; at least five new regression cases; prompt changes only with evidence.
- **Mika (S5-MI):** pilot usability/accessibility fixes with before/after evidence; archive the submitted deck.
- **Manuel (S5-MA):** pilot backend/provider errors and performance; troubleshooting guide; failure-drill controls stay off for users.
- **Jopher (S5-JO):** triage pilot journey defects; rerun acceptance; recheck setup and seed.
- **Ikeee-AI (S5-IK):** run and monitor the pilot (uptime/health samples, errors, warm/cold timings, incidents); stable release; runbook handover with a second member demonstrating deploy/rollback.

## 5. Questions — 3 min

- Confirm the Demo Day date and the course code freeze relative to `v1.0.0`.
- Is the disclosed lack of enforced branch protection and staging acceptable, given the manual gate and main guard?
- Does a production rollback between two commits that differ only in docs count as the rollback demonstration, or must it cross a code change?

## Still to collect before the consultation

- [ ] Retro comments on #168 from Adrian, Mika, Manuel and Jopher (Ikeee-AI posted 31 Oct); Sprint 3 retro comments from Adrian and Manuel (#116).
- [ ] Manuel's review of #167; Jopher's review of #170.
- [ ] Mika: final deck link and a time for the deploy challenge rehearsal (#169).
- [ ] Jopher: acceptance rows 19–20 on production (#169).
- [ ] Adrian: AI deep-dive demo cases and speaker notes (S4-AD deliverable), or a status comment.
