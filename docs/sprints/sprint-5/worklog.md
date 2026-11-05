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

## 2026-11-02 22:47 Asia/Manila — General-knowledge UI taken over and live; #172 closed
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code with the `frontend-engineer` agent, reviewed and extended by Ikeee-AI) · **Task:** takeover of the S5-MI #172 UI item (with Mika's agreement), S5-IK · **Branch:** `tekatech/s5-takeover-mika-gk-ui`, `tekatech/s5-ik-writeup-adapter-gk`, `tekatech/s5-ik-metrics-log-2026-11-02b`

**Done**
- **General-knowledge UI (#193)** was built first as a local fallback, then opened as a takeover once Mika agreed (she had not started it).
  - **Contents:**
    - an "Allow General Knowledge" toggle, off by default and not saved between visits;
    - an amber "General knowledge: not from saved specs, unverified" label, with the sources and cited badge hidden;
    - the panel intro switches while the toggle is on;
    - the #171 catalog line reworded.
  - **Checks:** Vitest 209 → 227; lint and build clean.
  - **Reviews:** Mika was added at her request so she stays informed. Jopher and Manuel approved on head `276ff73`.
  - **Merged and deployed:** `1c844d2` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41456799300)).
- **Browser check before the PR:** run on local dev (TekaTech-dev, Pixel 9 with no specs) with headless Chromium at 1280 and 360 px.
  - Toggle off: request unchanged, "No Evidence Found".
  - Toggle on: `allow_general_knowledge: true` sent, label shown, intro switched.
  - Keyboard Tab and Space work; no horizontal overflow.
  - Screenshots committed to `frontend/docs/screenshots/gk-*.png`.
- **Also merged and deployed:**
  - #191 write-up line → `e66b8aa` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41456048319));
  - #192 Sprint 5 interim metrics, #182 measurement, incident closed → `89b01c6` ([run](https://github.com/Ikeee-AI/TekaTech/actions/runs/41456404333)).
- **Production verification:** deployed smoke passed on `1c844d2` at 21:56 Manila, and the frontend bundle contains the toggle. Ikeee-AI checked the live site and reported it working: box off, answers unchanged; box on, a labelled general-knowledge answer.
- **#172 closed** with a summary: prompt #173, backend #174, adapter #189, UI #193, and the open follow-ups.
- **Explained to the owner:** general-knowledge answers come from OpenAI `gpt-5-mini`'s training knowledge through our own API call. They do not come from TechSpecs (disabled, nothing stored) or from a web search.
- **Day total:** 18 PRs merged and deployed on 2 Nov; none open at 22:47.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `browserType.launch: Executable doesn't exist at ...\chromium_headless_shell-1248\...` | #179 updated Playwright to 1.64.1, which expects a newer Chromium than the one installed locally (1243) | Pointed the check at the installed Chromium with `executablePath`; no download. Local Playwright tests now need `npx playwright install chromium`; CI installs its own browser — worked around |
| Second Vite start failed with exit 1 (port 5173 in use) | The first check's Vite process (`node ... vite.js`) survived `TaskStop` of its `npx` parent | The surviving server served the same worktree with live reload, so the screenshots show current code. Identified PID 20776 and stopped it; ports 5173 and 8000 confirmed free — fixed |
| Full-page 360 px screenshots showed the sticky top bar covering the label | Full-page capture of a sticky header | Element screenshots with the header made static; layout itself fine (label 2 lines, no overflow) — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| The same Pixel 9 question on dev gave "Tensor G4" at about 20:00 and "I don't recognize the Pixel 9 as a confirmed model" at about 21:00 | General-knowledge answers vary by run; gk-v1's unknown-product rule can fire on a real product | UI labelled both correctly; recorded on #193 and #172 as a regression-case candidate — Adrian (S5-AD) — open |
| Panel intro said "Answers use only the specs saved… instead of guessing" above a general-knowledge answer | Misleading copy | Intro now switches while the toggle is on (`6e96d6b`) — resolved |
| My earlier "yes" to "did we notify Mika" referred only to an @mention in #186; no direct reminder had been sent | Overstated | Corrected in the same session; Mika then agreed to the takeover — resolved |

**Decisions**
- Build the UI fallback before Mika's deadline, but keep it local until she agreed — Ikeee-AI.
- Keep the toggle unsaved between visits (opt-in, unverified answers) — Ikeee-AI.
- Retake the screenshots after the intro change, accepting one more general-knowledge call (about 0.1 cent), so the evidence matches the merged code — Ikeee-AI.
- Close #172 once the owner had verified it on production — Ikeee-AI.

**Blockers / risks**
- General-knowledge answers are non-deterministic and spend the shared $10 OpenAI balance (about 0.1 cent each), and `/query` is public. The toggle is off by default and the rate limit applies; watch spend during the pilot — Ikeee-AI — 4–6 Nov.
- No scored evaluation of real general-knowledge answers (paid; needs a database without the iPhone 15 / Galaxy S24 specs) — Ikeee-AI / Adrian — Sprint 5, optional.

**Plan alignment**
- S5-MI: the #172 UI item is **Done by takeover** (reviewed, merged, deployed, verified). Mika's own Sprint 5 tasks (pilot usability fixes, deck archive, component notes) remain hers.
- #172 overall: **Done** (closed).
- S5-IK: unchanged since the evening entry; pilot starts Wed 4 Nov 12:00.

**Next**
- Pilot pre-checks: Actions minutes left after 18 merges, OpenAI starting balance, laptop sleep off — Ikeee-AI — Tue 3 Nov.
- Ask Adrian for the #168 retro comment; propose the general-knowledge regression case to him — Ikeee-AI — Tue 3 Nov.
- Freeze 10:00, start the monitor 11:55, pilot 12:00 — Ikeee-AI — Wed 4 Nov.

## 2026-11-03 12:35 Asia/Manila — Pilot on hold; admin-curated catalog (#195); My Gadgets dashboard (#197)
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S5-IK; takeovers of Jopher/Manuel (#195) and Manuel/Jopher/Mika (#197) areas at the owner's request · **Branch:** `tekatech/s5-ik-log-2026-11-03`

**Done**
- **#194 merged and verified** (Sprint 5 log, 2 Nov late evening). Manuel approved on head `713cc4c`, squash-merged as `e6ce641`; [run 41561815091](https://github.com/Ikeee-AI/TekaTech/actions/runs/41561815091) green including the deploy job. Deployed smoke passed on `e6ce641` at 09:48 Manila (readiness, CORS, 4 gadgets).
- Local checkout: switched from the stale `tekatech/s4-ik-integration` to `main` (116 commits behind; every branch commit had a counterpart on main, checked with `git cherry` plus subject match). Deleted the stale local branch. `uv sync --frozen` and `npm ci` refreshed. The untracked `,txt` (owner's notes) was moved out of the repo to the owner's Documents folder.
- **#195: admin-curated catalog** ([PR](https://github.com/Ikeee-AI/TekaTech/pull/195)). `POST /gadgets`, `PATCH /gadgets/{id}`, `POST .../specs` and `POST .../specs/{id}/index` are now admin-only. UI controls are hidden for non-admins, and `/add` and `/edit` are `adminOnly`. Docs and the Demo Day script were updated (it now needs an admin demo account).
  - Manuel approved on `37f2095`. Merged as `158c745`, [run 41573344196](https://github.com/Ikeee-AI/TekaTech/actions/runs/41573344196) green. Smoke passed at 11:40.
  - Browser check in Chrome on production: the admin sees every control. A regular account sees none, Suggest Correction still opens, and `/add` and `/edit` redirect to the catalog. Recorded in the PR.
- **Issue #196** ([link](https://github.com/Ikeee-AI/TekaTech/issues/196)) assigned to Jopher: sign-up and first-login gaps (no "email confirmed" notice, silent expired links, no resend, start page lost, sign-up hard to find).
- **#197: My Gadgets dashboard** ([PR](https://github.com/Ikeee-AI/TekaTech/pull/197)).
  - New table `user_gadgets` (`backend/sql/user_gadgets.sql`), `/me/gadgets` GET/PUT/DELETE scoped to the session user, a `/my-gadgets` page, and Add to My Gadgets on catalog cards.
  - Non-admins land on My Gadgets after log-in. Compare & Ask AI works for 2–5 selected gadgets.
  - Local: pytest 666 passed, vitest 241 passed, eslint clean, build ok. CI database job applied the new SQL twice plus the acceptance checks: green.
  - The owner applied the SQL in Supabase before the merge. Manuel and Mika approved on `8d06d91`. Merged as `f3c6d69`, [run 41577812337](https://github.com/Ikeee-AI/TekaTech/actions/runs/41577812337) green. Smoke passed at 12:26 (database 155 ms).
  - Browser check on production with a regular account: empty dashboard → added 2 gadgets from the catalog → listed → Compare & Ask AI opened `/compare` with both (no AI question asked) → removed both → empty again. Recorded in the PR.
- **Backup coverage for the new table** (this branch, `9397d9f`). `scripts/db_restore_rehearsal.py` now exports and checks `user_gadgets`: composite-key paging, reported (not failed) if the source project lacks the table, and an orphan check. `docs/deploy-runbook.md` updated. Local: compiles and `--help` runs. **The rehearsal itself was not re-run.**

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `billing API unavailable: Expecting value: line 1 column 1 (char 0)` from `gh api /users/Ikeee-AI/settings/billing/usage` | Endpoint not available to this token or account | Owner to read Actions minutes in the GitHub billing page — open |
| `No matching deferred tools found` for the Claude in Chrome tools | Extension not connected to the session | Owner ran `/chrome`; tools loaded — fixed |
| Test: `Unable to find role="button" and name /remove phone 1/i` | The accessible name was computed as "RemovePhone 1 from My Gadgets": the leading space inside the `sr-only` span is dropped | New controls use an explicit `aria-label` — fixed in #197 (see contradictions for older controls) |
| Restore script would page `user_gadgets` with `order=id` (no such column) | New table has a composite key | `ORDER_BY` per table — fixed on this branch, not yet run against a project |
| `bash: unexpected EOF while looking for matching '` when appending this entry; the first commit on this branch went out without it | Shell quoting in a heredoc | Entry added in a follow-up commit on the same branch — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| `docs/devops/pilot-plan.md` and the 2 Nov "Next" put the pilot at Wed 4 Nov 12:00; the owner put it on hold on 3 Nov ("so much lacking currently in the system") | The plan's "start by Wednesday noon so fixes fit before Saturday" no longer holds | New date or drop to be decided and recorded in `docs/scope-changes.md` — Ikeee-AI — open |
| Demo Day script signed in with a non-admin account, but create/specs became admin-only in #195 | Live create step would fail | Script now uses an admin demo account (#195); the account needs `app_metadata.is_admin` — Jopher/Ikeee-AI — open |
| Jopher's Sprint 4 acceptance evidence shows a new user creating a gadget | Contradicts current behaviour | Kept as history; scope-change rows dated 3 Nov explain it — resolved |
| Older catalog card controls use the same `sr-only` leading-space pattern ("Ask AI<span> about …", "Details<span> for …") | Screen readers likely read joined words | Not changed in #197 (other owner's area) — Mika — open |
| Runbook said the backup exports "the five application tables" after `user_gadgets` was added | Backups would miss users' lists | Fixed on this branch — resolved once merged |

**Decisions**
- Hold the 48-hour pilot until the gaps are fixed — owner's judgement — Ikeee-AI.
- The catalog is admin-curated, and regular accounts contribute through reviewed corrections (option A) — the original product plan — Ikeee-AI.
- Build #195 and #197 as Ikeee-AI takeovers and tell the area owners — deadline pressure — Ikeee-AI.
- My Gadgets includes list, remove, Ask AI (via the gadget page) and Compare & Ask AI (via the Compare page) — reuses existing pages — Ikeee-AI.
- Non-admins land on My Gadgets after log-in; admins land on the catalog — Ikeee-AI.
- First-login fixes go to Jopher as issue #196, not a takeover — Ikeee-AI.

**Blockers / risks**
- ~~The Supabase email sending limit is unchecked.~~ **Resolved at about 13:15:** it was 2 emails/hour. Production now uses Brevo custom SMTP at 30/hour, and a test sign-up email arrived instantly in the inbox and its link signed the user in (`docs/devops/environments.md`, E7) — Ikeee-AI.
- Admin landing after log-in is covered by unit tests only, not clicked through on production — Ikeee-AI — next admin log-in.
- The backup rehearsal with `user_gadgets` has not been run — Ikeee-AI — Sprint 5.
- Actions minutes for November are unknown (billing API unavailable) — Ikeee-AI — 3 Nov.

**Plan alignment**
- S5-IK: pilot **Not started (on hold)**. #194, #195 and #197 are **Done** (reviewed, checks, merged, deployed, verified).
- #196 (Jopher): **Not started**.

**Next**
- Merge this log/backup PR after review — Ikeee-AI — 3 Nov.
- ~~Check Supabase Authentication → Rate Limits (emails)~~ — done 3 Nov (Brevo SMTP, see above).
- Make the Demo Day account an admin; tell Jopher — Ikeee-AI — before Demo Day.
- Continue the gap review of the remaining journeys (ask, compare/share, corrections, admin) — Ikeee-AI — 3–4 Nov.
- Decide the pilot date or drop it, and record it — Ikeee-AI — after the gaps are triaged.

## 2026-11-03 17:45 Asia/Manila — Gadget AI chat with saved conversation (#210); specs grouped by source (#211)
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S5-IK (owner-requested product gaps; takeovers across Manuel, Jopher and Mika areas) · **Branch:** `tekatech/s5-ik-gadget-ai-thread`, `tekatech/s5-ik-spec-source-cards`

**Done**
- **Per-gadget AI conversation** — PR [#210](https://github.com/Ikeee-AI/TekaTech/pull/210), commits `e7ee46e`, `28a9e41`, `f7cd23c`.
  - New table `user_questions` (`backend/sql/user_questions.sql`). The owner applied it in the Supabase SQL Editor on 3 Nov; afterwards the backend's service-role client read the table (0 rows).
  - `POST /query` stays public and saves a turn only for a valid session asking about exactly one gadget. A failed save never fails the answer. New `GET`/`DELETE /me/gadgets/{id}/questions` (caller's own thread only).
  - `regenerate: true` on `/query` replaces the caller's newest saved turn for the same question instead of adding a duplicate. An error retry never sends it.
  - The gadget page's AI box is now a chat (`GadgetChatPanel`): scrollable conversation with a jump-to-latest button, message box at the bottom (Enter sends, Shift+Enter new line), user bubbles right and answers left, New Chat deletes the thread. The Compare page panel is unchanged.
  - Local: backend 679 passed; frontend lint clean, build ok, vitest 249 passed; Playwright failure drill 8/8 passed after the fix below.
  - The owner clicked through the chat locally (dev servers against the project's database) and confirmed it works. **Not yet checked on production** (unmerged).
- **Specifications grouped by source** — PR [#211](https://github.com/Ikeee-AI/TekaTech/pull/211), commit `cd6df58`. One collapsible card per source link (link and date once, chunks as rows, first card open), `Label: value` lines as a fact list, per-card AI readiness, admin **Index All for AI**. Frontend only. Local: lint clean, build ok, vitest 248 passed. CI [run 41610944164](https://github.com/Ikeee-AI/TekaTech/actions/runs/41610944164) passed. The owner checked it locally. **Not yet checked on production** (unmerged).
- Docs in the PRs: `docs/database.md` (step 8 for the new table), `docs/quick-start.md`, `backend/README.md` API rows, `docs/scope-changes.md`, `CLAUDE.md`/`AGENTS.md`.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| CI [run 41609712543](https://github.com/Ikeee-AI/TekaTech/actions/runs/41609712543) on `28a9e41`: Browser checks (failure drill) failed, 4 gadget-page tests ✘ after 30 s each | `e2e/failure-drill.spec.js` still looked for the old "Question to Ask" box and "Ask" button, which the chat replaced. The dependent-test search had covered `src/` but not `e2e/` | Spec updated for the chat (box label, Send button, question kept as the chat bubble) — `f7cd23c`; 8/8 passed locally; CI [run 41612210371](https://github.com/Ikeee-AI/TekaTech/actions/runs/41612210371) on `f7cd23c` all green — fixed |
| Local `npx playwright test`: all 8 failed with "Executable doesn't exist … npx playwright install" | Playwright's Chromium was not installed on the laptop | `npx playwright install chromium` — fixed |
| `bash: unexpected EOF while looking for matching '` while editing `SpecManager.jsx` | Shell quoting in a heredoc | Edit moved into a script file; nothing had been written — fixed |
| ESLint `react-refresh/only-export-components` on `SpecManager.jsx` | Helper functions exported from a component file | Moved to `frontend/src/utils/specLayout.js` — fixed |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #210 and #211 change UI in Mika's area, endpoints/wiring in Jopher's and schema in Manuel's | Ownership overlap | Built as Ikeee-AI takeovers at the owner's request; area owners tagged for review in each PR — open until reviewed |
| Local testing runs against the project's production database (local backend `.env`) | Test questions spend real OpenAI credit and write real `user_questions` rows | Owner informed before testing; clear test threads with New Chat — open (no separate dev DB in use) |

**Decisions**
- Saved conversation only for signed-in users asking about a single gadget. Earlier turns are **not** sent to the model, so prompt and cost are unchanged — Ikeee-AI.
- Regenerate replaces the saved turn rather than keeping both — Ikeee-AI (owner).
- Chat UI only on the gadget page; comparisons keep `AIComparisonPanel` — Ikeee-AI.
- Specs redesign in its own PR (#211), not added to #210 — one branch per issue — Ikeee-AI.
- Existing spec labels kept (Index for AI, Ready for AI, Suggest Correction) because the demo script and quick-start use them — Ikeee-AI.

**Blockers / risks**
- #210 and #211 need one teammate approval each before merge — Manuel / Jopher / Mika — 4 Nov.
- Spec cards group by the exact link text, so `www.` or a trailing `/` makes a second card. Normalising was offered to the owner, not done — Ikeee-AI — if requested.

**Plan alignment**
- #210: **Partial** (checks green on `f7cd23c`; not reviewed, merged or deployed).
- #211: **Partial** (checks passed; not reviewed, merged or deployed).
- Pilot: still **Not started (on hold)**.

**Next**
- Get reviews on #210 and #211, merge, then do the production check (chat: ask two questions, reload, New Chat; specs: cards and dropdown) and record it in each PR — Ikeee-AI — after approval.

## 2026-11-03 19:11 Asia/Manila — Evening: six PRs merged and verified (#200, #208, #198, #209, #211, #212); #210 review answered
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code). The owner ran every merge command; Claude Code ran the gate and the production checks. · **Task:** S5-IK (integration, release checks); S5-JO PRs merged as integrator · **Branch:** `main`, `tekatech/s5-ik-gadget-ai-thread`, `tekatech/s5-ik-spec-source-cards`

**Done**
- **Merged and verified, one at a time.** Each PR passed the manual `pr-gate` first (approval from another teammate on the head commit, the required checks green, one owner, no secret files). After each merge: the `main` CI run, including the deploy job, passed, and `scripts/deployed_smoke.py` confirmed production served that commit (CORS and readiness passed, 4 gadgets). Reports are in `.local/deployed-smoke-<sha>.json` (local, untracked).

  | PR | Owner | Merge commit | CI run | Smoke (UTC) |
  | --- | --- | --- | --- | --- |
  | [#200](https://github.com/Ikeee-AI/TekaTech/pull/200) admin Index All Pending, Compare back, catalog guide | Ikeee-AI | `2f90f26` | [41615341534](https://github.com/Ikeee-AI/TekaTech/actions/runs/41615341534) | passed 10:01 |
  | [#208](https://github.com/Ikeee-AI/TekaTech/pull/208) image link preview/validation | Jopher | `966ac86` | [41619766929](https://github.com/Ikeee-AI/TekaTech/actions/runs/41619766929) | passed 10:32 |
  | [#198](https://github.com/Ikeee-AI/TekaTech/pull/198) sign-up confirmation feedback | Jopher | `7e3d88a` | [41621671556](https://github.com/Ikeee-AI/TekaTech/actions/runs/41621671556) | passed 10:46 |
  | [#209](https://github.com/Ikeee-AI/TekaTech/pull/209) account page | Jopher | `bb86491` | [41622757236](https://github.com/Ikeee-AI/TekaTech/actions/runs/41622757236) | passed 10:54 |
  | [#211](https://github.com/Ikeee-AI/TekaTech/pull/211) specs grouped by source | Ikeee-AI | `60d3e92` | [41624275236](https://github.com/Ikeee-AI/TekaTech/actions/runs/41624275236) | passed 11:05 |
  | [#212](https://github.com/Ikeee-AI/TekaTech/pull/212) worklog (afternoon) | Ikeee-AI | `b017915` | [41624831143](https://github.com/Ikeee-AI/TekaTech/actions/runs/41624831143) | passed 11:09 |
- **Combined pre-merge check for Jopher's three PRs.** Their CI had run before `main` moved, and #198 and #209 both edit `App.jsx`. So #198, #208 and #209 were trial-merged onto `main` (`2f90f26`) in a throwaway worktree, which was removed afterwards. Result: no conflicts; eslint clean, vitest 299 passed, build ok, Playwright failure drill 8/8 (local).
- **#211 rebased onto #200.** Both PRs changed `SpecManager.jsx` and both added an "Index All". #200's gadget-level **Index All Pending** was kept, because it shows progress and stops at the rate limit. #211's per-card "Index All for AI" was removed. Force-pushed as `02eeb58`; Mika re-approved the rebased commit before the merge.
- **#210 review answered.** Jopher requested changes. His blocking point (the failure-drill browser check) was already fixed in `f7cd23c`. His notes 4 (out-of-date wording) and 5 (put a failed question back in the message box) were done in `f1dbf10`, and the e2e check now uses his suggested latest-message locator. The PR description was rewritten for the chat UI, and each note got a reply in [the PR](https://github.com/Ikeee-AI/TekaTech/pull/210#issuecomment-6600564526). CI on `f1dbf10` is green ([41615153627](https://github.com/Ikeee-AI/TekaTech/actions/runs/41615153627)).
- **Overlap comment on Manuel's issue [#205](https://github.com/Ikeee-AI/TekaTech/issues/205#issuecomment-6602277151).** #210 already links signed-in single-gadget questions to the user in `user_questions`. Suggested narrowing #205 to a cross-gadget "Recent questions" panel on that table; the decision is Manuel's.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| `gh pr merge 200 --squash` from Claude Code: "Permission for this action was denied by the Claude Code auto mode classifier" | The session's permission settings don't let the assistant merge | The owner ran each merge as `! gh pr merge <n> --squash` — resolved (by design) |
| Rebase of #211: conflicts in `frontend/src/components/SpecManager.jsx` and `docs/quick-start.md` | #200 and #211 both rewrote the indexing code | Resolved in #200's favour (see Done); `waitFor` unused-import lint error fixed; checks re-run green — fixed |
| Playwright, after the #210 note-5 change: strict mode violation, `getByText('What chip does the iPhone 15 use?')` resolved to 2 elements | The question is now both the chat's latest message and back in the box | Assert the box value plus the `listitem` "Latest question: …" — fixed in `f1dbf10` |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #200 and #211 each added an "Index All" to the spec section | Two buttons doing the same job | #211 dropped its per-card version — resolved |
| Issue #205 (Manuel) planned `query_history.user_id` and `/me/questions`; #210 stores signed-in questions in `user_questions` | Two designs for one feature | Comment posted; Manuel to narrow or close #205 — open |
| Main CI shows `Main guard (reviewed PR required)` as a job, yet the repo has no enforced branch protection | A reader could take the job for enforcement; the merges still relied on the manual gate | Unchanged; `pr-gate` reports say "not enforced" — open (known) |

**Decisions**
- Merge one PR at a time and verify production after each, instead of a batch, so a failure points to one change — Ikeee-AI.
- Keep #200's Index All Pending over #211's per-card version — Ikeee-AI.
- Jopher's non-blocking #210 notes 1–3 (save after the response, delete-then-insert on Regenerate, FK to `auth.users`) deferred until after the pilot / to #204 — Ikeee-AI, agreed in the #210 reply.

**Blockers / risks**
- #210 needs Jopher's re-review to clear "Changes requested" — Jopher — 4 Nov.
- #211's new spec cards: **not yet checked in a browser on production** (the smoke check covers API, CORS and DB only) — Ikeee-AI — 3–4 Nov.
- The UI of #208, #198 and #209 was not clicked through on production by Ikeee-AI. Jopher's PRs include screenshots from his local runs — Jopher/Ikeee-AI — before the pilot.

**Plan alignment**
- #200, #211: **Done** for merge/deploy/smoke; #211's browser check on production is pending, so strictly **Partial** until recorded.
- #198, #208, #209 (S5-JO): merged, deployed, smoke-checked — **Partial** until a production click-through is recorded.
- #210: **Partial** (green, awaiting re-review).
- Pilot: **Not started (on hold)**.

**Next**
- Owner checks #211's spec cards on production; record it in #211 — Ikeee-AI — 3 Nov.
- After Jopher re-approves #210: check it still merges, merge, check it on production (ask two questions, reload, Regenerate, New Chat), record it in the PR — Ikeee-AI — 4 Nov.
- Production click-through of the account page, sign-up feedback and image-link check — Jopher (Ikeee-AI to confirm) — 4 Nov.
- Manuel to decide on #205 — Manuel — after #210 merges.

## 2026-11-03 23:04 Asia/Manila — Late evening: #210 merged; production check found the SQL on dev only (incident, fixed)
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code). The owner ran the merge and the SQL; Claude Code ran the gate, smoke and browser checks. · **Task:** S5-IK (#210 release, production checks) · **Branch:** `main`, `tekatech/s5-ik-log-2026-11-03-eve`

**Done**
- **Entry above re-checked against GitHub.** All six merges, commits, CI runs and smoke reports match. Jopher re-approved #210 on `f1dbf10` at 19:15, four minutes after the entry was written, so its "awaiting re-review" lines went out of date.
- **#210 gate: PASS (manual, not enforced protection).** Approved on head `f1dbf10` by Manuel (`s2302827-byte`) and Jopher (`s2100932`); the three required checks plus the failure drill were green. The head was behind `main`, so it was trial-merged onto `b017915` in a throwaway worktree (removed): no conflicts, secret guard passed, pytest 679 passed, app import ok, eslint clean, vitest 315 passed, build ok.
- **Merged** by the owner at 21:26 as `3986bf1`. [main run 41644306595](https://github.com/Ikeee-AI/TekaTech/actions/runs/41644306595): all jobs passed, deploy included. `deployed_smoke.py` passed at 13:29:32 UTC on the first attempt (commit match, CORS and readiness passed, database 299 ms, 4 gadgets); report in `.local/deployed-smoke-3986bf1.json`.
- **Production browser check (Claude Code in Chrome, test account, iPhone 15)**, after the SQL fix below:

  | Step | Result |
  | --- | --- |
  | Load earlier questions | GET 200, empty thread |
  | Ask 2 questions, reload | Both answered with a citation (`/query` 200) and both came back after reload |
  | Ask a 3rd, Regenerate, reload | 3 turns, not 4: the saved turn was replaced. Saved turns show no Regenerate/Copy (by design) |
  | New Chat, reload | Thread empty; Render logged `status=204` at 22:22:06 and 22:23:13 |

  6 paid `/query` calls in total. The test account's iPhone 15 thread was cleared at the end.
- **#211 browser check on production (light):** iPhone 15 shows one collapsible card for support.apple.com with the date, "Ready for AI", Hide/Show and Suggest Correction. No gadget on production has more than one source, so several cards side by side were not seen.
- **Incident recorded** in [incidents.md](../../devops/incidents.md) (2026-11-03, SQL applied to dev only). `pr-gate` now requires SQL to be applied to the live project (`lqswcmkzygqmnblaukco`), named by its ref, before merging. A correction was posted on #210.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| Gadget page: "Couldn't load your earlier questions right now."; `GET /me/gadgets/{id}/questions` 503; Render: `Gadget questions read failed: APIError` | `user_questions.sql` had been applied to TekaTech-dev only; the live project had no table | Owner applied it to the live project at about 22:15 and ran the PR's checks — fixed (incident) |
| Chrome extension: "Browser extension is not connected" | The extension was not connected to this session | Owner ran `/chrome` — fixed |
| Read-only probe of `user_questions` from the local backend: "Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Production Reads]" | The session may not read production data | Diagnosed in the SQL Editor (owner) and the Render logs instead — by design |
| Chrome network capture showed `DELETE …/questions` as 503 twice | The capture tool reported a wrong status; the app logged 204 for both and the rows were deleted | Not an app bug; withdrawn. Confirm statuses in the Render log before reporting one |
| Render search for `Gadget questions delete failed` on the Deploys page: "No matching results" | That box searches deploys, not logs | Searched Logs (`method=DELETE`) — resolved |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #210's description said the SQL was "applied"; it was applied to TekaTech-dev, not the live project | Saved questions failed on production for about 49 min | Correction comment on #210; gate rule added — resolved |
| Supabase shows a "PRODUCTION" badge on TekaTech-dev's `main` branch | Easy to take dev for the live project | Gate now asks for the project ref from the SQL Editor URL — resolved |

**Decisions**
- Fix forward (apply the SQL), no revert: the deploy was healthy and the failure was one feature with a visible notice — Ikeee-AI.
- Statuses seen in the browser extension are confirmed in the Render log before being reported as a bug — Ikeee-AI.

**Blockers / risks**
- `deployed_smoke.py` doesn't check signed-in routes or new tables, so a missing migration only shows in a browser check — Ikeee-AI — open (not planned; the gate covers it).
- The UI of #208, #198 and #209 still hasn't been clicked through on production — Jopher/Ikeee-AI — 4 Nov.

**Plan alignment**
- #210: **Done** (reviewed, merged, deployed, checked on production; incident recovered).
- #211: **Done** (browser check recorded above).
- #198, #208, #209 (S5-JO): **Partial** until a production click-through is recorded.
- Pilot: **Not started (on hold)**.

**Next**
- Production click-through of the account page, sign-up feedback and image-link check — Jopher (Ikeee-AI to confirm) — 4 Nov.
- Manuel to decide on #205 now that #210 is live — Manuel — 4 Nov.
- Clean up the old worktrees whose branches are merged — Ikeee-AI — when convenient.

## 2026-11-05 01:39 Asia/Manila (updated 02:45) — 4 Nov: Mika's #214 and #216 merged; PR-policy diff fixed (#218); #217, #219, #220 merged; #215 fixes taken over (#222)
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code). The owner ran every merge; Claude Code ran the gates, pre-reviews and smoke checks. · **Task:** S5-IK (gate, release, pipeline), with S5-MI and S5-JO merges · **Branch:** `main`, `tekatech/s5-ik-policy-three-dot`, `tekatech/s5-ik-log-2026-11-04`, `tekatech/s5-takeover-mika-215`

**Done**
- **Pre-review of Mika's #214, #215, #216** (AI-assisted, not a teammate review; Jopher's approvals are the reviews that count). Scorecards in [reviews/](reviews/): #214 Accept, #216 Accept, #215 Changes requested (Close button 32 px → 40 px and `min-h-10` on Try Again; focus lost after picking a gadget, plus a test). A trial merge of all three onto `3986bf1` had no conflicts: eslint clean, 322 vitest tests passed, build ok. The owner posted the #215 comment at 00:09.
- **#214 merged** at 00:31 as `4301d28`; [main run 41675006592](https://github.com/Ikeee-AI/TekaTech/actions/runs/41675006592) passed and the smoke check passed at 00:34. The new accessible names were checked on production.
- **#216 merged** at 00:51 as `814ef00`; [main run 41678490521](https://github.com/Ikeee-AI/TekaTech/actions/runs/41678490521) passed and the smoke check passed at 00:54. The 96 px `object-cover` preview box is in the deployed `GadgetForm` bundle.
- **#218, PR policy uses a three-dot diff** (`.github/workflows/pr-review.yml:48`). The two-dot diff also listed files that `main` changed after a branch started, so #215 was flagged for #210's SQL. Approved by Manuel and Jopher; merged at 13:43 as `8141b35`; [main run 41781030716](https://github.com/Ikeee-AI/TekaTech/actions/runs/41781030716) passed; smoke passed at 13:50 (database 279 ms, 4 gadgets).
- **#217, 3 Nov evening log, incident and gate rule.** Approved by Manuel and Jopher; merged at 17:52 as `bd2393d`; [main run 41810408566](https://github.com/Ikeee-AI/TekaTech/actions/runs/41810408566) passed; smoke passed at 17:55 (355 ms).
- **#219, Jopher's demo script update.** Approved by Manuel; gate PASS; merged at 00:04 on 5 Nov as `a6b8392`; [main run 41863926579](https://github.com/Ikeee-AI/TekaTech/actions/runs/41863926579) passed (deploy finished 00:08); smoke passed at 00:29 on the 3rd attempt (database 1,017 ms after the free API slept).
- **#220, Manuel's troubleshooting guide.** Gate PASS (Jopher approved `de5dea8` after following section 1 with only the guide). Merged by the owner at 01:44 on 5 Nov as `ad7e566`; [main run 41880077701](https://github.com/Ikeee-AI/TekaTech/actions/runs/41880077701) passed (deploy finished 01:47); smoke passed at 01:50 on the first attempt (database 451 ms, 4 gadgets).
- **#215 fixes taken over (owner's decision: Mika is busy with other work this week).** [#222](https://github.com/Ikeee-AI/TekaTech/pull/222) keeps Mika's commit `563f737` unchanged, merges current `main`, and adds Ikeee-AI's commit `732b369` (AI-assisted): Close 32 → 40 px and `min-h-10` on Try Again; focus back on Add Gadget after the page reloads, or on the heading at the 5-gadget limit; two tests that fail without the fix. eslint clean, vitest 31 files / 324 tests passed, build ok. The owner approved the comment on #215 (posted 02:01) and the PR. CI on #222 passed, **PR policy included**: the #218 fix confirmed on a branch that started before #210. Reviewers: Jopher, Manuel.
- **Old worktrees cleaned up:** 40 worktrees whose branches were merged were removed with their local branches. Their SHAs are saved, so each can be restored with `git branch <name> <sha>`.
- **Dependabot alert #28** (dev-only, waiting for eslint to allow minimatch 11) was left open by the owner. On 5 Nov the API answers `410 Alert number 28 has been withdrawn`: the advisory itself was withdrawn, so nothing is left to do.

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| #215 `PR policy` failed: SQL changed without notes | Two-dot diff in `pr-review.yml` (see #218) | Fixed in #218. #215's check runs again on Mika's next push; a re-run would reuse the old workflow |
| `deployed_smoke.py` for #218: "Both hosts must serve the expected commit" after 12 attempts | I passed the short SHA `8141b35`; the script compares the full SHA | Re-ran with the full SHA, passed first time. Not a deploy problem |
| Main run for #219 still showed `queued` at 00:15 (10+ min) | githubstatus.com: Actions "degraded_performance". The jobs had actually run 00:04–00:08; only the shown status lagged | Waited; the run finished green. Not an incident |
| `gh pr comment … --body-file -`: "Body cannot be blank" | The `!` prompt does not pass stdin | Comment saved to a file and posted with `--body-file <path>` |
| Removing worktrees: "Filename too long" (5 folders) | Deep `node_modules` paths on Windows | Removed with literal paths in Git Bash |
| `gh pr merge 220` by Claude Code: "Permission … denied by the Claude Code auto mode classifier. Reason: [Unrequested Commit in a Connected App]" | Merges are run by the owner | Owner ran the merge at 01:44 — by design |
| No CI run appeared for #222 for a few minutes after it was opened | githubstatus.com: Actions "partial_outage" | Runs started at 02:03; all passed. Not an incident |
| #220 main run: two jobs showed no result after the run had finished | Same Actions status lag | The deploy job only runs when every check passes, and it passed — display only |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| #220's title says "draft", but the body says the open check isn't a merge blocker and Jopher has done it | Unclear whether it's ready | Treated as ready and merged with the title unchanged — Ikeee-AI — resolved |

**Decisions**
- Dependabot #28 stays open, not dismissed (dev-only; the fix waits on eslint). Now withdrawn upstream — Ikeee-AI.
- The smoke check is always given the full commit SHA — Ikeee-AI.
- Take over the two #215 fixes instead of waiting for Mika; her feature stays hers and she is co-author on the squash merge — Ikeee-AI (owner).

**Takeovers**
| Item | Original owner | Taken over by | Time | Reason | PR | What the owner delivered |
| --- | --- | --- | --- | --- | --- | --- |
| #215 fixes: 40 px touch targets; focus after adding a gadget, with tests | Mika (S5-MI) | Ikeee-AI (AI-assisted, Claude Code) | 5 Nov 02:01 | Mika busy with other work this week; S5-MI due Sat 7 Nov 15:00 | #222 | The whole Add Gadget feature (`563f737`): search panel, `?ids=` update, dedupe, 5-gadget limit, Escape/Close focus, 4 tests |

**Blockers / risks**
- #222 needs a teammate approval on `732b369` before Sat 7 Nov 15:00 — Jopher (or Manuel) — open.
- The production click-through of #198, #208, #209 and Manuel's decision on #205 were not recorded on 4 Nov — Jopher, Manuel — open.

**Plan alignment**
- #214, #216 (S5-MI): **Done**. #215 / #203 (S5-MI): **Partial**. Mika delivered the feature; the two fixes are an Ikeee-AI takeover in #222, awaiting review.
- #218 (S5-IK pipeline fix): **Done**. #217 log: **Done**.
- #219 (S5-JO demo script): **Done**. #220 (S5-MA troubleshooting guide): **Done**.
- Pilot: **Not started (on hold)**.

**Next**
- Review #222 — Jopher (or Manuel) — 5 Nov. Then gate, merge with Mika as co-author, smoke check, keyboard-only browser check at 360 px and 1280 px, and close #215 — Ikeee-AI — by Sat 7 Nov 15:00.
- Click-through of #198, #208, #209 and a #205 decision — Jopher, Manuel — 5 Nov.

## 2026-11-05 14:45 Asia/Manila — #222 merged, deployed and checked; #215 closed; #221 merged
**Who:** Ikeee-AI (AI-assisted: yes, Claude Code) · **Task:** S5-MI takeover (#215/#203), S5-IK · **Branch:** tekatech/s5-ik-log-2026-11-05

**Done**
- #222 (takeover of the #215 fixes) merged by the owner at 13:53 as `aa230a1`, with Mika (`meka-moka`) as co-author on the squash commit. Approvals were on the head commit `732b369` by s2302827-byte (Manuel) and s2100932 — evidence: https://github.com/Ikeee-AI/TekaTech/pull/222
- Main run for `aa230a1`: all six jobs passed, including the main guard, and the deploy job finished at 13:56:21 — evidence: https://github.com/Ikeee-AI/TekaTech/actions/runs/41976820274
- Deployed smoke check passed at 13:56:40 on the first attempt: production serves `aa230a1`, readiness and the database path pass (260 ms), CORS passes, 4 gadgets — evidence: `scripts/deployed_smoke.py`, report kept locally in `.local/deployed-smoke-aa230a1.json` (not committed)
- #215 closed at 14:27 with a comment pointing to #222 and `aa230a1`. Issue #203 was closed automatically by the #222 merge at 13:53 — evidence: https://github.com/Ikeee-AI/TekaTech/pull/215
- Keyboard-only browser check of Compare → Add Gadget on production passed 22 of 22 steps at 14:32. It was a headless Playwright/Chromium script using only Tab, Shift+Tab, Enter, Escape and typing, at 360 px and 1280 px. At both widths: no sideways scrolling; Add Gadget reachable with a visible focus ring; Enter opens the panel with focus in the search box; Escape and Close both return focus to Add Gadget; **Close is 40×40**; **Try Again is 40 px tall** and Enter reloads the list; a search result is reached with one Tab (52 px tall); Enter adds the gadget to `?ids=`; **focus returns to Add Gadget after the page reloads**. Read-only: no share link and no AI question. The Try Again state was produced by blocking one `GET /gadgets` inside the headless browser only — evidence: the script and screenshots are in the session scratchpad (not committed)
- #221 (4 Nov log) merged by the owner at 14:39 as `e3852b9` — evidence: https://github.com/Ikeee-AI/TekaTech/pull/221 · main run https://github.com/Ikeee-AI/TekaTech/actions/runs/41981907637: all six jobs passed, including deploy (docs-only change, so no smoke check needed)

**Errors and fixes**
| Error (exact message, secrets redacted) | Cause | Fix / status |
| --- | --- | --- |
| The owner reported #222 as merged twice, but GitHub showed it `open`, `merged: false`, and main was still `ad7e566` | The first two merge attempts didn't complete. No error output was captured, so the exact cause is unknown | Claude Code checked the state through the API before each smoke check; none ran against the wrong commit. `! gh pr merge 222 --squash` from the terminal worked. Resolved |
| #221 reported as merged but still `open` at 14:33 | Same as above | Merged by `! gh pr merge 221 --squash` at 14:39. Resolved. The terminal command is the reliable way to merge |
| Claude in Chrome: "Browser extension is not connected" | The extension wasn't running or connected in Chrome | Used the repo's own Playwright (1.64.1) and installed Chromium, headless, instead |
| First keyboard-check run: 10/22 passed | Bugs in Claude Code's script, not the app: the Escape check matched another `role="group"` on the page; the Close search tabbed forward (Close comes before the search box) and pressed Enter on unrelated buttons, which only changed the page address — no data was written | Script fixed: the panel is found by its label, Close is reached with Shift+Tab, and Enter is pressed only when focus is on the expected element. Rerun 22/22 |

**Conflicts and contradictions**
| What conflicts | Impact | Resolution / owner / status |
| --- | --- | --- |
| The Add Gadget button is 36 px tall at 1280 px but 40 px at 360 px, while #222 set 40 px for Close and Try Again | Still above the WCAG 2.2 AA 24 px minimum; only a consistency question | Mika's decision whether to make it 40 px everywhere — Mika — open (not a blocker) |

**Decisions**
- Production checks after a merge start only once the GitHub API reports `merged: true` and `origin/main` has moved, not when someone says it's merged — reason: twice today the merge hadn't gone through — Ikeee-AI.
- The keyboard-only check was run headlessly because the Chrome extension wasn't available. This counts as the browser check for #222 — Ikeee-AI.

**Blockers / risks**
- The production click-through of #198, #208, #209 and Manuel's #205 decision were still open in the 4 Nov entry; not rechecked this session — Jopher, Manuel — open.
- Pilot: still on hold by the owner's decision (3 Nov).

**Plan alignment**
- #215 / #203 (S5-MI Compare add gadget): **Done**. Reviewed, checks pass, merged (`aa230a1`), deployed, smoke-checked and browser-checked on production. Mika delivered the feature; Ikeee-AI took over the two review fixes (#222). Done ahead of the Sat 7 Nov 15:00 deadline.
- #221 (4 Nov log): **Done** (merged, main run and deploy green).
- Pilot: **Not started (on hold)**.

**Next**
- Remove the `tekatech-takeover-215` worktree now that #222 is merged (`git worktree remove`, using literal paths in Git Bash if Windows reports "Filename too long") — Ikeee-AI — 5 Nov.
- Click-through of #198, #208, #209 and a #205 decision — Jopher, Manuel — 5 Nov.
- Optional: Add Gadget at 40 px on desktop — Mika — her call.
