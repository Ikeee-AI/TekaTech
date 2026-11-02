# Sprint 5 work log (2–7 November 2026)

## 2026-11-02 16:41 Asia/Manila — CI back, 9 merges, Adrian's S4 takeover, TechSpecs adapter and trial check
**Who:** Ikeee-AI (AI-assisted: yes; Claude Code, with the `ai-engineer` agent for the takeover and the `backend-engineer` agent for the TechSpecs adapter, both reviewed and extended by Ikeee-AI) · **Task:** S4-IK, S5-IK, takeover of S4-AD, support for S5-MA · **Branch:** several (listed per item)

**Done**
- **CI recovered after the 31 Oct Actions-minutes outage.** The monthly reset worked: Dependabot CI ran green at 09:14. Failed runs on #174 and #178 were re-run. The 31 Oct afternoon work-log commit moved to its own PR (#184), so #178 kept its approval on its head commit.
- **Held PRs merged and deployed** (main pipeline, main guard and deploy all green): #176 Jopher's acceptance rows 19–20 → `c760247` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41395073114)); #177 deploy-challenge evidence → `6524d4f` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41395335425)); #174 Manuel's general-knowledge backend, off by default → `f75e76d` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41395589194)); #178 Actions-minutes incident → `c8da5b5` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41395822952)). These four were merged from the Ikeee-AI account at 13:37–13:45, outside this Claude session. The session's gate script then found them already merged and stopped without acting.
- **New PRs opened and merged after Manuel's approval on the head commit:**
  - #183 pilot plan and health sampler → `b7d0c80`, merged by Manuel ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41397987080)).
  - Through `.local/merge-sequence.sh`: #185 Consultation 4 packet refresh → `d3d6d59` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41411293745)); #184 31 Oct work log → `a813843` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41411717546)); #182 Actions-minutes cut (labels + reviewer in one job, ruff inside PR policy) → `8a0045a` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41412086422)); #186 S4-AD takeover → `f79d812` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41413652336)); #187 TechSpecs adapter (disabled) → `1461fda` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41413992445)).
- **Production checks** (`scripts/deployed_smoke.py`: exact commit, readiness, CORS, gadget count; read-only):
  - passed on `c8da5b5` at 14:00 and on `8a0045a` at 16:22 (database 660 ms);
  - passed on `1461fda` at 16:36, 4 gadgets.
  - Free GETs before the demo: iPhone 15, Poco X7 Pro and Infinix Note 50 Pro 5G+ each have 1 indexed spec; Rog Ally has none; Galaxy S24 is not on production.
- **Consultation 4 packet refreshed** (#185): cut-off moved to 2 Nov 14:00, acceptance 20 of 20, CI incident and new risks added, checklist updated. Standups are still marked missing.
- **Takeover of S4-AD from Adrian** (#186, approved by Manuel; Adrian notified in the PR description). Contents:
  - AI demo cases: `docs/demo/ai-demo-cases.md`.
  - AI deep-dive speaker notes: `docs/demo/ai-deep-dive-speaker-notes.md`.
  - Release AI-quality report and known limitations in `docs/ai-feature-writeup.md`. The 31 Oct scores are reused, not re-run, and all four targets are reported as missed: supported 11/13, valid references 41/45, abstention 0/7, override 1/2.
  - General-knowledge evaluation gains an `answer_basis` check and a mocked `/query` scoring test.
  - Adrian's delivered work (#166, #112, #89, #90, #105) stays credited to him. S5-AD stays his. No paid model calls; prompts unchanged.
- **TechSpecs adapter, shipped disabled** (#187, approved by Manuel):
  - Admin-only `GET /techspecs/search` and `POST /techspecs/import`. The import saves through the normal spec path with a "Source: TechSpecs" line.
  - Disabled by default: 503 with no outbound call. Nothing on Render.
  - `backend/scripts/techspecs_probe.py` checks the parser with a free-trial key: at most 3 calls a run, prints shape and counts only, stores nothing.
  - 639 tests passed locally; CI green.
- **TechSpecs permission email sent** by Ikeee-AI to support@techspecs.io. It asks to store and display specs for under 50 products with attribution, and which plan covers storage if a paid one is needed. Noted on [#187](https://github.com/Ikeee-AI/TekaTech/pull/187#issuecomment-6570864928).
- **TechSpecs trial check** (Ikeee-AI's laptop; trial keys only in the local `backend/.env`; nothing stored): 6 calls over 4 runs. The real v5 shape was recorded as field names and counts on [#187](https://github.com/Ikeee-AI/TekaTech/pull/187#issuecomment-6572112804). One iPhone 15 parsed into 166 lines in 11 sections (about 9.9k characters). The parser was cleaned up in `3acd178`.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `STOP #176: state=MERGED`, then `STOP #178: state=MERGED` from the gate script | The PRs had already been merged from the Ikeee-AI account outside this session | The script stopped without acting; each merge was confirmed green afterwards — resolved |
| `can't open file '...\.local\wt-techspecs\.local\wt-techspecs\backend\scripts\techspecs_probe.py'` | The `!` shell started in a worktree, so the relative path doubled | Re-ran with an absolute `cd` — fixed |
| TechSpecs search HTTP 400: `{"code":"too_small","path":["query","size"],"message":"Number must be greater than or equal to 10"}` (2 calls) | Our client sent `size=5`; the docs list `size` without its minimum | `search()` requests at least 10 and cuts the list to the requested size (`8e4c1de`); the probe now shows provider error messages with the key masked (`4b78259`) — fixed |
| TechSpecs HTTP 502 `origin_bad_gateway` (Cloudflare) (1 call) | TechSpecs' server; our client mapped it to `unavailable` as designed | Waited about 30 min and re-ran — resolved |
| One detail lookup returned 404 for an id that search had just returned | TechSpecs search lists items its detail endpoint can't return | Import already answers 404 and saves nothing — accepted, noted on #187 |
| Probe `test_shape_never_includes_values` failed: nested spec fields shown as "not expanded" | The shape printer's depth limit (4) was below the real nesting (data → items → [0] → section → field) | `SHAPE_DEPTH = 7` — fixed before the first live call |
| `pydantic_core.ValidationError: 3 validation errors for Settings` running the probe in the worktree | Worktrees have no `.env` (by design) | Run from the main `backend/`, where the owner's `.env` is — worked around |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #186's demo cases TC-09 and TC-14 use the Galaxy S24, which is not on production | Only the dev database can reproduce them; a production demo must use other gadgets | Tonight: iPhone 15 and Poco vs Infinix. Later: add the S24 to production or swap the cases — Ikeee-AI / Adrian — open |
| TechSpecs docs: `category` "in the request body" in prose, a query parameter in the OpenAPI spec; `size` listed without its minimum of 10 | The client was built on the documented shape and failed until the real error was seen | Client follows observed behaviour; recorded on #187 — resolved |
| `docs/ai-feature-writeup.md` said the UI labels general-knowledge answers; no UI exists yet | Overstated delivery | Corrected in #186 — resolved |
| Four merges at 13:37–13:45 happened outside this session, from the Ikeee-AI account | Two actors merging at once could conflict | Each was checked as gated and green afterwards; confirm who merged — Ikeee-AI — open |
| The handoff says Ikeee-AI integrates reviewed work; #183 was merged by Manuel, its reviewer | Process deviation only: approval and checks were in place | Noted; no action needed — closed |

**Decisions**
- Move the 31 Oct work-log commit to its own PR rather than push it onto #178, so #178's approval stays on its head — Ikeee-AI.
- Take over only Adrian's overdue Sprint 4 items, not S5-AD, which isn't due until 7 Nov — Ikeee-AI.
- No paid evaluation rerun: reuse the 31 Oct scores and report missed targets as missed — Ikeee-AI.
- Build the TechSpecs integration but ship it disabled. A paid plan does not by itself grant storage rights; storing needs a written yes. Trial use is limited to the local probe (no storing; findings as field names and counts) — Ikeee-AI.
- Merge #187 before the pilot freeze, since it is disabled and changes nothing for users — Ikeee-AI.

**Blockers / risks**
- General-knowledge UI toggle and label (#172) not started; due Tue 3 Nov 15:00, otherwise after the pilot (freeze Wed 10:00) — Mika — 3 Nov.
- TechSpecs permission: no reply yet; nothing may be stored until written permission arrives — Ikeee-AI — open.
- `eval_adapter.py` has no general-knowledge mode (contract in the write-up) — Manuel — Sprint 5.
- Dependabot #179–#181 need review before the freeze or wait until after the pilot — Ikeee-AI / area owners — 4 Nov 10:00.
- Sprint 4 retro (#168) still missing Adrian's comment; only he can write it — Adrian — open.
- #182's combined labels/reviewer job is not yet seen on a real PR event — Ikeee-AI — next PR (this one).

**Plan alignment**
- S4-AD: demo cases, limitations, speaker notes and release report **Done by takeover** (reviewed, merged, deployed). The Sprint 3 thresholds still don't pass, and that is reported as missed. Adrian's row stays **Partial** for the parts he didn't deliver.
- S4-IK: unchanged since 31 Oct: **Done** except the live deploy challenge (rehearsed, target missed).
- S5-IK: pilot plan and monitor **Done** (#183 merged and deployed); Actions-minutes prevention merged (#182), saving to be measured in November; pilot not started (Wed 4 Nov 12:00).
- S5-MA: general-knowledge backend **merged and deployed** (#174); TechSpecs adapter (support, #187) merged and disabled.

**Next**
- Consultation 4 at 19:30: wake the site at 19:25; delete "Demo Day Phone" afterwards — Ikeee-AI, Jopher — today.
- Check #182's combined job on this log's PR — Ikeee-AI — today.
- Chase Mika on the general-knowledge UI and the deck link — Ikeee-AI — Tue 3 Nov morning.
- Pilot pre-checks (Actions minutes left, OpenAI balance, laptop sleep off); start the monitor at 11:55 — Ikeee-AI — Wed 4 Nov.

## 2026-11-02 19:22 Asia/Manila — Evening: Dependabot updates, labels, monitor dry run, metrics
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S5-IK, support for S5-MA · **Branch:** several (listed per item)

**Done**
- **Dependabot updates merged and deployed:**
  - #181 `uv-build` ≥0.13.6 → `8a33e76`.
  - #180 `openai` 3.41, `fastapi` 0.162, `pydantic-settings` 2.16.2, `pytest` 9.2 → `2216eb8` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41422431785)).
  - #179 five frontend bumps → `f44a947` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41422878150)).
  - Before merging, each was re-tested locally on main `1461fda`: backend 648 passed, app import OK; frontend lint clean, build OK, Vitest 209 passed, `npm audit` 0. Approvals: Manuel (#180, #181), Ikeee-AI (#179, after reading it; Dependabot is the author).
- **Real AI check after the `openai` update:** Ikeee-AI asked on production (iPhone 15, "What are the key specs…", about 17:49) and got a cited answer ("Answer based on 1 cited spec"; A16, display, cameras, IP68). The answer cache is in-process and was emptied by the 17:45 deploy, so this was a real OpenAI call.
- **#188** (2 Nov log) merged → `479d7a9`.
- **#190** owner-area label rules matched to the real file layout → `b07aa8e`. The first PR after it (#191) was labelled `area:ai` automatically.
- **#189** (Manuel) `eval_adapter.py --mode gk`, approved by Jopher → `83fe025` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41434471182)). Production smoke passed on `83fe025` at 19:12.
- **#191** opened: the write-up now says the adapter's GK mode exists (waiting for Manuel).
- **Pilot monitor dry run** (`scripts/pilot_monitor.py`, 4 samples over 4 min, results kept locally, not committed):
  - API 4/4 up, with one cold start of **43.5 s** (the API had last been checked about 7 min earlier), warm median 0.55 s.
  - Frontend 4/4 up, median 0.18 s.
  - The summary report works.
- **Sprint 5 interim metrics** (`docs/devops/metrics.md`, [report](../../evidence/sprint5-metrics-interim.json)): 16 deploys, 0 failed; merge-to-live 2.54 min; success 32/32.
- **#182 measured:** 8 → 6 jobs per PR opened (`docs/devops/optimizations.md`).
- **31 Oct incident closed** with recovery time 18 h 19 min (`docs/devops/incidents.md`).

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| "Dependabot Updates" for `minimatch` failed twice on main (`security_update_not_possible`) | Alert #28 (GHSA-g3hv-75wg-m249, medium) needs `minimatch` 11.0.1; `eslint` 10.13.0 and `@eslint/config-array` require `^10.2.x`. Dev-only, transitive; not in the built site or backend | No change before the pilot; wait for an `eslint` release. Dismissing the alert is the owner's decision — open |
| First smoke check after #188's merge exited 1 with no output | The script was given `479d7a9` before that commit was fetched locally | Re-ran after `git fetch`: passed — fixed |
| #190's description said its own run would use the new label rules | The labeler runs on `pull_request_target`, which reads the config from main | Description corrected before review; verified on #191 instead — fixed |
| A first draft of the incident timeline gave a re-run time for #178 that was not checked | Only #174's re-run time was confirmed | Reworded to the confirmed facts before committing — fixed |
| `git worktree remove` failed with "Filename too long" for the scratch test worktree | Windows path length (`node_modules`) | Removed with a `\?\` long path and pruned — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| Earlier today the packet and this log assumed Consultation 4 was 2 Nov 19:30; the owner said at about 18:05 that there is no consultation tonight | The demo checklist and the 19:20 check were not needed | New date to be confirmed — Ikeee-AI — open |
| I suggested Mika as #179's reviewer; the review table has no Dependabot row, and the reviewer workflow assigns Dependabot PRs to Ikeee-AI | Wrong request to a teammate | Mika corrected it; Ikeee-AI reviewed #179 — resolved |
| #179 shows two approvals from Ikeee-AI on the same head, one not made from this session | Like the 13:37 merges, another session or tab may be acting as Ikeee-AI | Owner to confirm — open |
| The API cold-started 43.5 s only about 7 min after a successful check, while Render's free tier normally sleeps after about 15 min idle | One sample; may mean more cold starts during the pilot than expected | Watch in the 48 h pilot data — Ikeee-AI — 6 Nov |

**Decisions**
- Merge Dependabot PRs before the freeze after a local re-test on current main, smallest risk first (#181, #180, #179), then make one real AI call because tests mock OpenAI — Ikeee-AI.
- Keep `eval_adapter.py` labelled backend only (Manuel's script), not AI — Ikeee-AI.
- Record #182's saving per PR event now; the monthly minutes figure waits for November's billing page — Ikeee-AI.

**Blockers / risks**
- General-knowledge UI (#172) still has no PR; due Tue 3 Nov 15:00, merge cutoff Wed 10:00 — Mika.
- Alert #28 (`minimatch`) keeps a failing Dependabot job on main until `eslint` moves to `minimatch` 11 or the alert is dismissed — Ikeee-AI decision.
- Consultation 4 date unknown — Ikeee-AI.

**Plan alignment**
- S5-IK: pilot plan, sampler and dry run **Done**; Actions-minutes saving **measured per event**, monthly figure pending; Sprint 5 interim metrics recorded; pilot not started (Wed 4 Nov 12:00).
- S5-MA: eval adapter GK mode **Done** (#189: reviewed, merged, deployed).
- S5-MI: GK UI **Not started** (no PR).

**Next**
- Merge #191 after Manuel's review — Ikeee-AI — Tue 3 Nov.
- Chase Mika on the GK UI and the deck link; ask Adrian for the #168 retro comment — Ikeee-AI — Tue 3 Nov morning.
- Pilot pre-checks (Actions minutes left, OpenAI balance, laptop sleep off) — Ikeee-AI — Tue 3 Nov.
- Freeze 10:00, start the monitor 11:55, pilot 12:00 — Ikeee-AI — Wed 4 Nov.
