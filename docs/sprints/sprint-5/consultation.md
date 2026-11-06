# Week 5 operations packet: Sprint 5 (2–7 November 2026)

**Not an assessed consultation.** Sprint 5 is the team's extra stabilization week after the four assessed sprints (`docs/sprints-2-to-5.md`). This packet is the S5-IK "Week 5 operations packet" deliverable, in the same 15-minute shape as the consultations so the team can run a review on Saturday.

**Refreshed Friday 6 November 2026, 15:45 Manila:** `v1.1.0` tagged on `db49bc2` (15:36); production serves `db49bc2`, deployed smoke passed 15:23 (readiness, CORS, 4 gadgets, database 505.9 ms). #235, #236 and #239 merged and deployed today. The rest of this packet is as of the earlier cut-off below unless marked.

**Status cut-off: Thursday 5 November 2026, about 22:30 Manila (draft).** Production serves `1170d19` (current `main`); the deployed smoke check passed at 19:43:21 (exact commit, readiness, database path 236 ms, CORS, 4 gadgets). Refresh this packet before the Saturday review.

**Sprint 5 gate** ("stable within measured pilot conditions, with documented limits, support ownership and recovery capability"): **partly met.** The pilot did not run (scope change below). Limits, support ownership and recovery are documented; the second-member rollback demonstration is still to come.

| Gate condition | Evidence | Status |
| --- | --- | --- |
| Measured pilot (≥ 48 h) | **Not run.** On hold since 3 Nov; moved past Sprint 5 on 5 Nov (`docs/scope-changes.md`). Pre-pilot measurements only: read-route latency/errors (#230), failure-drill controls (#233), fresh checkout (#232) | ❌ Moved |
| Documented limits | `docs/releases/v1.1.0.md` "Known limitations"; `CHANGELOG.md` | ✅ (released `v1.1.0`, 6 Nov) |
| Support ownership | `docs/devops/support-and-maintenance.md`: owners and backups per area, severity and response, maintenance checklist | ✅ (in this branch, not merged yet) |
| Recovery capability | `rollback.yml` rehearsed on production 31 Oct (1 min 35 s); restore rehearsal on dev (31 Oct, before `user_gadgets`/`user_questions`). **Second-member deploy/rollback demonstration not done yet** | ⚠️ Partial |
| Final deployed revision passes smoke | Passing on every merge this week; final candidate on Sat 7 Nov | ⏳ Sat |
| No unresolved critical/high incident | No production incident in Sprint 5 so far. One on 3 Nov (SQL applied to dev only, 49 min) was resolved (`docs/devops/incidents.md`) | ✅ |

## 1. Live demo (lead: Jopher)

Script: [`docs/demo/user-demo-script.md`](../../demo/user-demo-script.md) (updated in #219). Warm the free Render API about 2 minutes before. On production, use only clearly labelled test text.

| # | Journey on https://tekatech-web.onrender.com | Owner | Verified |
| --- | --- | --- | --- |
| 1 | Sign up → confirmation feedback; expired link → resend (#198) | Jopher | 4 Nov (Jopher), #198 rechecked 5 Nov |
| 2 | Account page: email, role, change password (#209) | Jopher | 4 Nov (Jopher) |
| 3 | My Gadgets: add from the catalog → compare 2–5 → ask across them (#197) | Jopher | 3 Nov (Ikeee-AI) |
| 4 | Gadget page chat: ask → cited answer → reload keeps it → New Chat (#210) | Jopher | 3 Nov (Ikeee-AI) |
| 5 | Compare → Add Gadget by keyboard (#222) | Jopher / Mika | 5 Nov, 22/22 at 360 and 1280 px |
| 6 | Admin: image-link check blocks a web page, accepts an image (#208) | Ikeee-AI (admin) | 5 Nov |
| 7 | Failure-drill controls off for normal users (#233) and the Render check | Manuel | 5 Nov |

## 2. Board (Ikeee-AI as product owner)

Status uses the Definition of Done: reviewed, checks passed, merged, deployed and verified.

| Task | Owner | Delivered (merged and deployed) | Status | Remaining |
| --- | --- | --- | --- | --- |
| **S5-AD** | Adrian, **taken over by Ikeee-AI on 5 Nov** (inactive since 31 Oct) | By Ikeee-AI (AI-assisted, `ai-engineer` agent): evaluator `--rules s5` (#224), five regression cases and dataset v3 (#225), post-fix score report (#226), prompt/eval handover (#227). Adrian's own Sprint 5 contribution: none | **Partial** | Targets not met under s3 (supported 14/16, valid refs 59/64, abstention 0/8, override 1/2). Pilot-failure review not possible (no pilot). Open prompt defects TC-24 and GK-06 |
| **S5-MI** | Mika | Screen-reader names (#214), image preview matches the card (#216), Compare add gadget (#215; fixes taken over in #222) | **Partial** | Pilot usability findings (no pilot); deck archive and component/style handover notes not seen |
| **S5-MA** | Manuel | Troubleshooting guide (#220), GK eval adapter (#189), latency/error samples (#230), `eval_adapter --scope` (#228), failure-drill controls check (#233); #205 decided and closed; reviewed #221–#227, #232, #234 | **Partial** (pilot parts only) | Paid `/query` sample (approved ≤ $0.10) and the "budget held" write-up; "budgets hold during the measured pilot" can't be shown without a pilot |
| **S5-JO** | Jopher | Image-link check (#208), sign-up feedback (#198), account page (#209), demo script (#219), quick-start and feature-maintenance notes (#231), fresh-checkout record (#232); production click-through 4 Nov; reviewed #222, #229, #230, #233 | **Done** except pilot journeys | Pilot journeys (no pilot) |
| **S5-IK** | Ikeee-AI | Pilot plan and sampler (#183); Actions-minutes cut (#182); admin-curated catalog (#195), My Gadgets (#197), spec cards (#211), gadget chat (#210); GK UI takeover (#193); gates, merges and smoke checks for every PR above; Render check; #208 admin check; release record, changelog, support checklist (#235); gk-v2 prompt (#236, S5-AD takeover); **`v1.1.0` tagged on `db49bc2` (6 Nov)**; Sprint 5 final metrics row (6 Nov) | **Partial** | 48-hour observation report (no pilot); second-member rollback demonstration; retrospective |

Merged since `v1.0.0`: 55 commits on `main` (as of `1170d19`); 58 at the `v1.1.0` tag (`db49bc2`), adding #235, #236 and #239 (Jopher's Max Price slider fix, approved by Manuel and Mika). Takeovers this sprint are recorded in the Sprint 5 worklog "Takeovers" tables (S5-MI #172 UI, S5-MI #215 fixes, S5-AD).

**Standups: missing.** No Sprint 5 standup thread was opened; the worklog is the only daily record.

## 3. DevOps report (Ikeee-AI)

**Pipeline changes this sprint (live):** fewer jobs per PR (#182, 8 → 6 job starts per opened PR, measured); owner-area labels match the real layout (#190); PR policy lists only the PR's own files (#218); `pr-gate` requires SQL on the live project ref first (after the 3 Nov incident). From 5 Nov, small Ikeee-AI doc changes are batched on one branch without a PR to save Actions minutes.

**Metrics** (`python scripts/pipeline_metrics.py --label "Sprint 5 interim 2" --since 2026-11-01 --until 2026-11-05 --workflow ci.yml`, cut-off 5 Nov 23:55 Manila; [report](../../evidence/sprint5-metrics-interim-2026-11-05.json)):

| PR pipeline avg | Main pipeline avg | Success | Deploys | Merge-to-live avg | Failed deploys |
| --- | --- | --- | --- | --- | --- |
| 1.21 min (60 runs) | 3.23 min (50 runs) | 99.1% (109/110) | 50 | 2.80 min (50 samples) | 0 |

The one failed run was a PR run on the #210 branch (3 Nov), fixed before merge; main had no CI failure. Pipeline times rose against Sprint 4 (PR 0.72 → 1.21 min, main 2.78 → 3.23 min). The likely causes are GitHub Actions degradation on 4–5 Nov and the browser-check job; that hasn't been measured separately. The first four attempts on 5 Nov failed on single `gh api` errors (TLS handshake timeouts, one HTTP 502); `pipeline_metrics.py` now retries transient errors. Take the final row on Sat 7 Nov.

**Incidents:** [incidents.md](../../devops/incidents.md). 31 Oct to 1 Nov: Actions stopped for 18 h 19 min (minutes used up), no production impact. 3 Nov: saved questions failed on production because `user_questions.sql` was applied to dev only; recovered in about 49 min, and the gate rule was added.

**Operations checks on 5 Nov:** Render dashboard has no `FAILURE_SIMULATION_ENABLED`, and no environment group is linked; production `user_questions` has 0 rows (no test threads left); Dependabot API shows 0 open alerts.

**Optimizations:** [optimizations.md](../../devops/optimizations.md).

## 4. Risks and next steps

| Risk | Mitigation | Owner | Date |
| --- | --- | --- | --- |
| The pilot didn't run, so the Sprint 5 gate can't be met as written | Disclosed as a scope change; pre-pilot evidence labelled as such; run the pilot after the course if the team continues | Ikeee-AI | Disclosed 5 Nov |
| Rollback not yet demonstrated by a second member | Book Manuel or Jopher for a supervised `rollback.yml` run on a docs-only pair of commits, following the runbook | Ikeee-AI + Manuel/Jopher | Fri 6 Nov |
| AI quality targets missed; prompt defects TC-24, GK-06 | Owner decides whether to bump to `v2`/`gk-v2` with a ~$0.02 dev rerun, or disclose and defer | Ikeee-AI (prompt owner) | Fri 6 Nov |
| GitHub Actions minutes run out again | Batch small changes (5 Nov rule); check billing usage before release day | Ikeee-AI | Sat 7 Nov |
| Home internet drops (merges and metrics failed on 5 Nov) | Confirm every merge through the API before the next; rerun metrics when stable | Ikeee-AI | Ongoing |
| Thin catalog (4 gadgets); a wrong release date on Poco x7 Pro | #201 catalog work; disclosed in the release limitations | Ikeee-AI | After Sprint 5 |

**After Sprint 5:** no further course sprint. Post-course backlog: the pilot, staging (#34), catalog growth (#201), admin overview (#206), delete account (#213), image upload (#202), TechSpecs import once authorized.

## 5. Questions for the team

- Is a docs-only rollback pair enough for the second-member demonstration, as on 31 Oct, or should it cross a code change?
- Prompt defects TC-24 and GK-06: fix in Sprint 5 or disclose and defer?
- Who runs the pilot after the course, if anyone?

## Still to collect before the Saturday review

- [ ] **Retrospective comments from every member.** Each member writes their own; see [`retrospective.md`](retrospective.md). Nobody's comment is written for them.
- [ ] Adrian's Sprint 4 retro comment on #168 (still missing; Jopher, Mika and Manuel commented).
- [ ] Mika: deck archive (versioned) and component/style handover notes (S5-MI), or a status comment.
- [ ] Manuel: paid `/query` sample (≤ 10 questions, ≤ $0.10) and the "budget held" write-up.
- [ ] Manuel or Jopher: second-member deploy/rollback demonstration.
- [x] Ikeee-AI: rerun the metrics; final metrics row; tag `v1.1.0`; final smoke check (all 6 Nov: smoke 15:23, tag 15:36, metrics row 15:45).
- [ ] Standups: none recorded this sprint; write "missing" in the final report rather than reconstructing them.
