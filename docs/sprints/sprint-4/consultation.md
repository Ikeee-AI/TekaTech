# Consultation 4 packet — Sprint 4 (26–31 October 2026)

**Consultation: Monday 2 November 2026, 19:30 Asia/Manila** (confirmed by Ikeee-AI on 31 Oct). **Status cut-off: Monday 2 November, 14:00 Manila** (refreshed from 31 Oct 15:30 with the merges below). Production serves `c8da5b5` (current `main`); deployed smoke passed at 14:00 (exact commit, readiness, CORS, 4 gadgets). Rerun the production check about 19:20.

Format: 15 minutes, all five members.

**Sprint 4 gate (`docs/sprints-2-to-5.md`): mostly met; two conditions partial.**

**Merged since the 31 Oct cut-off** (held by the Actions-minutes outage, merged 2 Nov after the reset; each deployed and passed the main guard):

| PR | Owner | Merged (Manila) | Approved by | Main commit |
| --- | --- | --- | --- | --- |
| #176 S4-JO: acceptance rows 19–20 pass on production; D1, D3, D6 fixed | Jopher | 13:37 | Manuel, Ikeee-AI | `c760247` |
| #177 S4-IK: deploy challenge rehearsal evidence; timer fixes | Ikeee-AI | 13:39 | Jopher, Manuel | `6524d4f` |
| #174 S5-MA: optional general-knowledge answer on `POST /query`, off by default (#172) | Manuel | 13:42 | Jopher | `f75e76d` |
| #178 Incident record: GitHub Actions blocked by the monthly usage limit | Ikeee-AI | 13:45 | Manuel | `c8da5b5` |

Opened 2 Nov, waiting for Manuel's review (all checks green): #182 (cut Actions minutes), #183 (pilot plan and health sampler), #184 (31 Oct work log). Dependabot #179–#181 waiting for review.

| Gate condition | Evidence | Status |
| --- | --- | --- |
| Tagged release on a free public URL | [`v1.0.0`](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) on `5aa4635`, tagged 14:32; deployed smoke passed 14:24 (exact commit, readiness, CORS, 4 gadgets) | ✅ |
| Passing core acceptance | **20 of 20** journeys pass, 0 fail (#158, #176). Rows 19 (password-reset email) and 20 (data survives a redeploy, `5aa4635` → `d3f2192`) passed on production on 31 Oct | ✅ |
| Documented limitations | Release notes "Known limitations"; `docs/submission-manifest.md` "Disclosed gaps" | ✅ |
| Tested rollback | `rollback.yml` on production: back 1 min 35 s, forward 1 min 45 s; database restore to a disposable copy 14.0 s (#167) | ✅ |
| Measured pipeline improvements | PR checks median 37 s → 27 s (#107, after-measurement in #154); Vitest and Playwright jobs added (#137, #128) | ✅ |
| Complete submission evidence | 18 of 21 manifest items ready; open: Sprint 4 standups/retro (12; retro #168 has 4 of 5 members), final slide deck (14) (#167, #169) | ⚠️ Partial |
| Successful live deploy rehearsal | Rehearsed 31 Oct with #171 ([evidence](../../evidence/deploy-challenge-rehearsal-2026-10-31.md)): reached production and passed smoke, but took 122.6 min against a 30 min target. The pipeline took 3.9 min; the rest was waiting for review and merge. Evidence merged in #177 | ⚠️ Rehearsed, target missed |

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

Board: https://github.com/users/Ikeee-AI/projects/1 — Sprint 4 issues and PRs added on 31 Oct with statuses matching GitHub at that time (43 Done; #167 and #170 In review; follow-ups #168, #169 In Progress). Since then #167 and #170 merged (31 Oct) and #174, #176–#178 merged (2 Nov); the board columns were not re-checked on 2 Nov.

| Task | Owner | Delivered (merged and deployed) | Status | Remaining |
| --- | --- | --- | --- | --- |
| S4-AD | Adrian | Labelled s4 scoring profile and a 20-case rerun on current main, write-up updated (#166); first scored run recorded (#112) | **Partial** | Targets missed (supported claims 11/13, valid references 41/45, abstention 0/7, override 1/2). Demo cases and speaker notes for the AI deep dive not found in the repo. 0 reviews this sprint |
| S4-MI | Mika | Delete-spec UI (#143), UTC release dates (#141), slow-answer wording (#149), "no supporting source" label (#150), equal compare columns (#163), Add Specs hint (#165) | **Partial** | UI/accessibility audit report not in the repo; final deck in progress (PowerPoint → Canva, link to follow, Mika on 31 Oct); visible-change rehearsal not done (#169) |
| S4-MA | Manuel | Scoped retrieval ranking (#129), dev failure drill + rerun (#151), authorization matrix test + comparison cost (#157), API reference (#159), architecture notes (#161), malformed-request demo (#162, rehearsed on production 16/16 in #175), latency check + performance budget (#164); reviewed #167, #177, #178 | **Done** | Confirm #118 can close. Sprint 5 started early: general-knowledge backend (#174, merged 2 Nov) |
| S4-JO | Jopher | Delete-spec route (#127), failure-drill browser checks in CI (#128), correction re-index (#142), compare image fallback (#121), quick-start + fresh checkout (#155), acceptance report (#158), demo script (#160), rows 19–20 on production (#176, merged 2 Nov); reviewed #171, #170, #177 | **Done** | — |
| S4-IK | Ikeee-AI | Release `v1.0.0`; 15 merges on release day; full-history Gitleaks clean; rollback + restore rehearsals; Sprint 4 final metrics; submission manifest; board updated; support PRs (#130–#139, #145, #147); production drill (#152, #153); release records (#167) and challenge timer (#170) merged 31 Oct; challenge evidence (#177) and the Actions incident (#178) merged 2 Nov | **Partial** | Live deploy challenge under 30 min (Demo Day); Sprint 4 retro (#168) |

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
**Incidents:** no production incident in Sprint 4 ([incidents.md](../../devops/incidents.md)). One CI/CD incident: on 31 Oct from 10:34 UTC, GitHub Actions stopped starting jobs because October's included minutes were used up (981 runs) and the Actions budget is $0. Production was not affected (`d3f2192` stayed live). It recovered at the 1 Nov reset; the four held PRs re-ran and merged on 2 Nov (#178). Prevention: #182 merges the small PR workflows (estimated about 817 → 463 job starts for October's traffic; to be measured in November). One supervised production failure drill (#118, #153). The main guard blocked one deploy on 28 Oct because an approval was not on the merged commit (#144); nothing reached production.
**Optimizations:** [optimizations.md](../../devops/optimizations.md). The merge-to-live median rose from 2.77 (Sprint 3) to 3.88 min because release-day merges queued in one concurrency group and the browser job adds time.

## 4. Risks and next sprint — 2 min

| Risk | Mitigation | Owner | Date |
| --- | --- | --- | --- |
| Live deploy challenge took 122.6 min in rehearsal (target 30) because review and merge waited | On Demo Day, reviewer and merger watch live, the change and wording are agreed beforehand, and the timer runs with `--start`; aim for under 10 min | Mika, Jopher, Ikeee-AI | Demo Day |
| AI quality targets still missed | Sprint 5 regression cases from pilot failures; tune the prompt only where evidence justifies it | Adrian, Manuel | 7 Nov |
| Free Render API cold start (about a minute) during demos and the pilot | Warm 2 min before; record cold/warm timings in the pilot report | Ikeee-AI | 4–6 Nov |
| No enforced branch protection or staging | Manual gate + CI main guard; staging carried to Sprint 5 (#34); both disclosed | Ikeee-AI | Disclosed |
| Merge backlog before deadlines | Merge gate-passing PRs within 24 h | Ikeee-AI | Sprint 5 |
| GitHub Actions minutes run out again (stopped CI on 31 Oct) | #182 cuts job starts; the pilot health sampler runs on a laptop, not Actions (#183); check billing usage before the pilot and release days; decide on a small budget or ask about a public repo | Ikeee-AI | Before 4 Nov |
| General-knowledge answers (#174, live, off by default) shown without their label | Keep the flag off in the UI until Mika's "General knowledge, not from saved specs, unverified" label and Adrian's eval cases land together (#172) | Mika, Adrian, Manuel | Sprint 5 |

**Sprint 5 commitments (due Sat 7 Nov 15:00; pilot starts by Wed 4 Nov 12:00, at least 48 h):**
- **Adrian (S5-AD):** review pilot answer failures; at least five new regression cases; prompt changes only with evidence.
- **Mika (S5-MI):** pilot usability/accessibility fixes with before/after evidence; archive the submitted deck.
- **Manuel (S5-MA):** pilot backend/provider errors and performance; troubleshooting guide; failure-drill controls stay off for users.
- **Jopher (S5-JO):** triage pilot journey defects; rerun acceptance; recheck setup and seed.
- **Ikeee-AI (S5-IK):** pilot plan and health sampler in review (#183); run and monitor the pilot (uptime/health samples, errors, warm/cold timings, incidents); stable release; runbook handover with a second member demonstrating deploy/rollback.

## 5. Questions — 3 min

- Confirm the Demo Day date and the course code freeze relative to `v1.0.0`.
- Is the disclosed lack of enforced branch protection and staging acceptable, given the manual gate and main guard?
- Does a production rollback between two commits that differ only in docs count as the rollback demonstration, or must it cross a code change?

## Still to collect before the consultation

- [ ] Retro comment on #168 from Adrian (Jopher and Mika commented 31 Oct, Manuel 2 Nov). Sprint 3 retro #116 is complete (Adrian 26 Oct, Manuel 25 Oct).
- [x] Manuel's review of #167; Jopher's review of #170 (both merged 31 Oct).
- [ ] Mika: Canva view-only link for the final deck (#169).
- [x] Jopher: acceptance rows 19–20 on production (#176, merged 2 Nov).
- [ ] Manuel: review #182, #183 (needed before the Wed 4 Nov 10:00 freeze), #184.
- [ ] Rerun the production check about 19:20 and warm the API 2 min before the demo.
- [ ] Adrian: AI deep-dive demo cases and speaker notes (S4-AD deliverable), or a status comment.
