# TekaTech: weekly delivery plan, Sprints 2–5

Prepared 15 October 2026; revised against the CSP221A course website supplied by the team. All times are **Asia/Manila (UTC+8)**. Each sprint is one week, and **every task is due Saturday at 3:00 PM**. Earlier handoff times below allow integration and review before that deadline.

Source: [CSP221A Final Development Project guide](https://csp221a.vercel.app/), including its sprint tabs, DevOps track, consultation/Demo Day rubrics and final checklist. This is an assignment plan, not a completion report. Existing code must be verified before being accepted. GitHub assignees, board dates and reminders have not been updated by this document.

## Schedule and milestones

| Sprint / week | Week dates | Deadline for every task | Required milestone |
| --- | --- | --- | --- |
| 2 | 12–18 October 2026 | **Saturday, 17 October, 3:00 PM** | Reviewed, deployed core gadget/spec workflows; agreed AI quality baseline and provider readiness |
| 3 | 19–25 October 2026 | **Saturday, 24 October, 3:00 PM** | Integrated, source-grounded question answering and comparison using OpenAI |
| 4 | 26 October–1 November 2026 | **Saturday, 31 October, 3:00 PM** | Tagged release, deployment, recovery proof and demo-ready documentation |
| 5 | 2–8 November 2026 | **Saturday, 7 November, 3:00 PM** | Stabilized release after a monitored pilot, fixes and operational handover |

The website specifies four assessed sprints and four consultations. All course submission items must be ready by Sprint 4 or the instructor's earlier code freeze. Sprint 5 is the team's additional stabilization week, not an extra assessed sprint or an extension of the course deadline. The website does not give calendar dates for consultations, code freeze or Demo Day: the Saturdays above are the team's deadlines, not confirmed instructor appointments. Ikeee-AI confirms those appointments in Sprint 2 and brings preparation forward when needed. The website describes weekly sprint goals as a recommended pace; the acceptance gates below are our team's quality checks, and any reordering/slippage must be explained at consultation.

## Ownership: no duplicate implementation areas

| Member | Owns | Boundary |
| --- | --- | --- |
| Adrian — AI Developer | Versioned prompt assets, grounding/citation rules, answer behavior, evaluation datasets and executable evaluation/scoring code | Owns prompt/evaluation implementation and results; Manuel implements provider/retrieval/runtime code and its adapter to the evaluation runner |
| Mika — Frontend Engineer | Layouts, styling, responsive presentation, accessibility and shared visual components | Supplies UI components/state designs; Jopher implements API wiring, form behavior and application state |
| Manuel — Backend Engineer / AI Engineer | API contracts, shared auth, schema/migrations, provider adapters, indexing/retrieval, parsing and backend failure handling | Supplies foundations; Jopher implements feature-specific CRUD and business workflows |
| Jopher — Backend Developer / Frontend Developer | Gadget/spec/correction/comparison workflows, feature endpoints, API calls, form validation and feature state | Uses Manuel's contracts/auth and Mika's presentation; does not independently redesign those areas |
| Ikeee-AI — DevOps / release coordinator | CI/CD, hosting, deployment secrets, review/merge gates, release/rollback and operational evidence | Exactly one course DevOps Engineer; the other four members are Developers with the specialties above. Ikeee-AI remains the planned product-owner duty holder each week unless a recorded handoff changes that duty |

The weekly task IDs below are work packages. At sprint planning, split each into one- or two-day issues with a single owner, an acceptance check and one branch per issue. Use suffixes such as S3-AD.1 and S3-AD.2; inherit the package deadline and record earlier dependency handoffs. One task has one implementation owner. Reviewers are not coowners. When a shared file spans roles, choose one editor for that PR; other specialists supply requirements or review. Use separate, sequential PRs for changes to the same section.

**Provider rule:** OpenAI stays our chosen primary course-project and deployed AI provider. The website permits teams to choose their provider; OpenAI is the user’s project decision, not a course-mandated vendor. The optional Ollama local mode was dropped on 16 October 2026 (project owner decision); references to Ollama below are superseded, and only OpenAI results count for acceptance.

## Sprint 2 — make the core application verifiably usable

All five tasks below are due **17 October 2026, 3:00 PM**. Since this plan starts on Thursday, prioritize acceptance and fixes to existing code rather than broad new features.

| Task / owner | Work to complete | Deliverables | Required output / acceptance evidence | Deadline |
| --- | --- | --- | --- | --- |
| S2-AD — Adrian | Define grounded answers, citations, comparisons and insufficient-evidence behavior. Prepare factual references for two existing gadgets and 10 initial evaluation questions. Commit the prompt assets and implement the initial executable scoring/fixture runner. | Prompt/answer specification; source pack with at least five verified facts per gadget, source URLs and model/variant labels; 10 cases with expected facts or expected abstention. Versioned prompt files and a runnable evaluation command with documented inputs/outputs. | Manuel can implement the rules without guessing; every expected factual answer traces to a source; missing facts explicitly require an insufficient-evidence response. A peer can run the initial fixtures locally; Adrian can explain the prompt and scoring implementation. | Oct 17, 3 PM |
| S2-MI — Mika | Finish catalog, gadget detail, gadget/spec form and answer-panel presentation. Specify loading, empty, success and error states. Implement the authorized-delete confirmation UI and reusable labeled validation/error components. | Reusable visual components; responsive layouts; UI state checklist; keyboard/focus and contrast review. Presentation code PR and short explanation of component/accessibility decisions. | Screenshots at 360 px and 1280 px widths; no horizontal overflow or clipped controls; forms have visible labels and usable keyboard focus. All four CRUD actions have a usable screen or control; presentation contribution is identifiable in reviewed commits. | Oct 17, 3 PM |
| S2-MA — Manuel | Confirm schema/migrations, API payloads, access rules and shared error format. Verify a real OpenAI call. Document a relationship the app actually uses and the browser-to-API boundary; write auth/validation contract tests. | API/permission contract; reproducible migration check; auth/provider test results; provider configuration notes without secret values. Database schema outline and API reference draft; automated foundation tests for CI. | Unauthenticated and unauthorized protected requests are rejected; valid requests work; migration applies to a disposable test DB; one real backend OpenAI response is recorded safely. Provider access/credit failure stays an explicit blocker. Show gadgets linked to their spec records in a real feature; browser feature code does not directly query the database or call a model. Document the separate browser auth flow explicitly. | Oct 17, 3 PM |
| S2-JO — Jopher | Complete and verify gadget create/read/update/delete and spec save/list browser workflows using agreed contracts and UI. Load Adrian's verified test content through the supported workflow. Write automated CRUD/spec API tests and a safe local seed/setup command. | Feature endpoint/integration fixes; form validation and UI state wiring; CRUD/spec acceptance script. API test suite and idempotent local/test seed script using verified non-sensitive examples. | Create → list → view → edit → refresh persists correctly; authorized delete works and unauthorized delete fails; spec saving works without an AI call. Use a designated test environment and remove disposable test records. Tests run in CI, including malformed input; core records persist after both refresh and redeploy; seed/setup does not overwrite production data. | Oct 17, 3 PM |
| S2-IK — Ikeee-AI | Organize owner-specific subtasks, verify teammate repository access, arrange actual peer review, check CI and deploy the accepted core changes. Resolve OpenAI account/credit availability through the account owner. Wire API tests into PR CI and verify automatic deployment on every main merge. Establish environment separation and start the weekly consultation/DevOps evidence pack. | Board entries and access checklist; reviewed PR/CI links; deployment record with commit SHA; environment checklist; confirmed course freeze/submission date. PIPELINE.md draft, pipeline diagram, first metrics row for this plan, incident/scope logs, sprint log/retro, and a staging/preview plan with separate configuration. Record the branch-protection constraint and seek an instructor-accepted resolution. | Each accepted change has a real peer review, green required checks and matching deployed revision; live frontend/API smoke checks pass; primary-provider blocker is resolved or visibly recorded with owner and recovery date. At consultation 2 demonstrate full CRUD, pipeline API tests and merge-triggered deployment; present actual available Sprint 1 history without inventing reviews or metrics. Manual review policy is not claimed as enforced branch protection. | Oct 17, 3 PM |

**Sprint 2 gate:** verified core workflows and shared contracts are accepted, automated API tests pass in CI, and merges automatically deploy. Demonstrate an actively used table relationship and persistence across redeploys, not just refreshes. OpenAI readiness is a separate dependency for Sprint 3; if it is blocked, report a partial sprint outcome instead of claiming complete AI readiness. Save/index failures must not lose saved specifications.

## Sprint 3 — integrate grounded AI and complete feature journeys

All five tasks below are due **24 October 2026, 3:00 PM**.

| Task / owner | Work to complete | Deliverables | Required output / acceptance evidence | Deadline |
| --- | --- | --- | --- | --- |
| S3-AD — Adrian | Expand the evaluation set to at least 20 cases: 8 factual, 4 comparisons, 4 missing/ambiguous facts, 2 variant/conflicting-source cases and 2 attempts to override grounding rules. Tune the prompt from scored results. Extend the executable evaluation runner to score prompt revisions and emit machine-readable and human-readable results. | Versioned evaluation set, scoring rubric, prompt revision and scored OpenAI report. Prompt-change regression cases, runner CLI and AI feature write-up draft describing measured behavior. | At least 90% supported factual claims; 100% valid citation references; all four missing/ambiguous cases avoid invented facts; neither override case defeats grounding. Report failures and denominators, not only a score. Provider/model/prompt version and dataset version are attached to scores; checks assess output structure, grounding and references rather than exact generated wording. | Oct 24, 3 PM |
| S3-MI — Mika | Implement answer, comparison and citation presentation, including pending/failed indexing and insufficient-evidence states. Check visible states during the planned provider-failure drill and draft the presentation deck structure. | Answer/comparison components; readable source list; accessible loading/error/empty states; responsive evidence. Presentation-owned deck draft and UI evidence for timeout, malformed response and missing evidence. | Users can distinguish an answer, missing evidence and provider failure; citations are legible and keyboard accessible; mobile comparison layout stays usable. Draft allocates the course presentation timings and speaker slots; UI does not expose stack traces or silently present failure as success. | Oct 24, 3 PM |
| S3-MA — Manuel | Integrate Adrian's prompt into the OpenAI path; validate chunking, indexing, retrieval scope and output parsing. Implement consistent timeout/quota/malformed-output behavior. Provide mocked model tests and an opt-in, access-controlled failure simulator for timeout/provider error/bad output, disabled by default. | Provider/retrieval/parsing fixes and tests; safe source-reference validation; documented request bounds and provider errors. Mocked provider/output-processing tests, evaluation-provider adapter and safe failure-drill instructions. | Real OpenAI-backed query retrieves the correct gadget/variant sources and returns valid citations; invalid references are rejected or safely handled; timeout, quota, empty retrieval and malformed output have tested safe outcomes. Demonstrate the backend validating, transforming, storing or rejecting model output before the UI; pure pass-through is unacceptable. Failure simulation is unavailable to ordinary production users. | Oct 24, 3 PM |
| S3-JO — Jopher | Wire ask/compare, citation navigation, saved comparison links and correction submission/review journeys. Connect request failures and retry actions to the agreed states. Add integration checks that exercise the same failure drill through browser workflows; keep local setup examples in sync. | Feature/API integration; comparison/correction business logic; end-to-end test scripts and evidence. Failure/retry journey evidence and contribution to the reproducible local setup guide. | From a gadget page, a user asks a question, opens its source, compares gadgets and reopens a saved comparison; correction submission and authorized review persist. Failed requests recover without losing user input. A reviewer can follow the documented workflow and see safe UI recovery without depending on an actual provider outage. | Oct 24, 3 PM |
| S3-IK — Ikeee-AI | Deploy reviewed AI integration, verify hosted OpenAI configuration and record operational baselines. Confirm CI never depends on a paid live model call. Connect prompt-change evaluation to CI, enable a small budget-capped scheduled provider smoke job, implement a staging/preview environment if feasible, and measure a pipeline optimization. | Deployment and smoke-test record; warm/cold response-time and error-rate baseline with sample sizes; environment/provider matrix; CI evidence. Workflow changes, per-environment configuration/key inventory without values, non-production spending/request limits, updated metrics/optimization/incident logs and consultation 3 packet. | Hosted frontend → API → real OpenAI → cited response works; no laptop-local Ollama address is required by hosting; routine CI uses mocks; secrets and raw sensitive prompts stay out of evidence. Mocked tests run on routine PRs; prompt-change checks produce labeled evaluation reports; separate bounded live smoke/evaluation jobs cannot hold up unrelated deployments during a provider outage. Record before/after pipeline timings, not only application response times. | Oct 24, 3 PM |

**Sprint 3 gate:** the main OpenAI user journey passes on the deployed revision, the backend demonstrably processes the output, mocked LLM tests run in CI, and Adrian's evaluation meets the stated thresholds. The 20-case size and numerical targets are our team quality targets; the course asks for a small meaningful evaluation set without these specific numbers. Report local-model results separately. Stage real-provider tests deliberately; do not make repeated paid calls a routine CI requirement.

## Sprint 4 — harden, release and demonstrate

All five tasks below are due **31 October 2026, 3:00 PM**.

| Task / owner | Work to complete | Deliverables | Required output / acceptance evidence | Deadline |
| --- | --- | --- | --- | --- |
| S4-AD — Adrian | Rerun the fixed evaluation set against the release candidate. Review citation accuracy and write known AI limitations and demonstration examples. Finalize the AI feature write-up and prepare the three-minute AI deep dive with Manuel’s runtime evidence. | Release AI-quality report; approved prompt version; factual/compare/missing-evidence demo cases; limitations note. AI write-up, final results and speaker notes explaining evaluation, backend output processing and failure behavior. | Sprint 3 thresholds still pass; no unresolved critical fabricated-answer or citation defect in the release scenarios; examples are reproducible from stored sources. Explain own code and alternatives in rehearsal, and show the failure drill and evaluation evidence rather than only successful answers. | Oct 31, 3 PM |
| S4-MI — Mika | Audit the complete UI for responsive behavior, accessibility and consistent error/success presentation; fix presentation defects. Finish the slide deck and rehearse implementing a small visible UI change for the live deploy challenge. | UI audit and fixes; final screen/state inventory; demo screenshots. Final presentation deck, visual-change rehearsal PR and slide/source attribution. | Core paths work with keyboard and at 360 px/1280 px; focus, labels, contrast and status messages are checked; zero unresolved critical usability blockers. Deck fits 20 minutes and leaves 10 minutes for panel questions; a small visible change can be made through a reviewed PR without bypassing checks. | Oct 31, 3 PM |
| S4-MA — Manuel | Harden authorization, input limits, rate/retry behavior, provider failures and migrations. Measure retrieval/API bottlenecks and fix evidenced issues. Finish architecture/schema diagrams and API reference; prepare live malformed-request and model-failure demonstrations. | Backend failure/authorization regression results; documented limits; measured before/after performance report; migration compatibility notes. Architecture decision/trade-off notes, schema relationship diagram/outline, API reference and safe drill commands. | No unauthorized protected operation succeeds in tests; invalid input/provider outages yield safe responses; saved data survives AI failure; backend meets the performance budget agreed from Sprint 3 measurements. Explain backend/data/AI boundaries and stack choices; demonstrate malformed request handling, model failure and invalid output with no secret exposure. | Oct 31, 3 PM |
| S4-JO — Jopher | Run integrated user acceptance and fix workflow defects across CRUD, specs, ask/compare, sharing and corrections. Prepare user-facing instructions. Validate setup from a fresh checkout, finalize local seed data and lead the six-minute deployed CRUD/AI demo. Review Mika’s challenge PR. | User-journey acceptance report; workflow fixes; quick-start guide; user-demo script. Reproducible setup/seed evidence, updated README setup section and timed user-demo checklist. | A fresh test user completes all applicable core journeys on the release candidate; permissions and refresh persistence hold; no unresolved critical/high-priority workflow defects. CRUD and meaningful related data survive redeployment; challenge review is substantive and performed by a teammate; can explain feature code selected by the panel. | Oct 31, 3 PM |
| S4-IK — Ikeee-AI | Coordinate release freeze, release notes/version tag, CI deployment, operational checks and a recovery exercise. Assemble course evidence. Audit repository history for secrets, complete all 21 course checklist items and rehearse the live deploy challenge and production rollback. Prepare repository/production links for submission before code freeze. | Tagged release and deployed commit record; architecture/setup/environment/release documentation; backup/rollback runbook; recovery evidence; demo checklist. Complete PIPELINE.md/diagram, four-sprint metrics record, optimization log with comparable before/after runs, incident postmortems, sanitized history-scan result and submission manifest. | Exact tagged revision is live and smoke-tested; previous app release can be restored; database restoration is rehearsed on a disposable copy, with recovery time recorded; no destructive live restore; each contributor's actual PR/review evidence is linked. Release runs on a free public host; challenge reaches production within the 30-minute rehearsal while Ikeee-AI narrates stages; rollback is demonstrated with safe state handling. Any unavailable history, protection or staging requirement is disclosed, not marked complete. | Oct 31, 3 PM |

**Sprint 4 gate:** a tagged release on a free public URL, passing core acceptance, documented limitations, tested rollback, measured pipeline improvements, complete submission evidence and a successful live deploy rehearsal. All 21 course checklist items below are ready before the applicable freeze; unresolved items remain visibly incomplete. Treat production rollback as a controlled deployment procedure; rehearse without risking live user data.

## Sprint 5 — pilot, stabilize and hand over operations

All five tasks below are due **7 November 2026, 3:00 PM**. Begin the controlled pilot by **Wednesday, 4 November, 12:00 PM** so its minimum 48-hour observation window ends Friday noon and leaves time for fixes. Material fixes require affected checks to be rerun; a late blocker may prevent pilot acceptance by Saturday.

| Task / owner | Work to complete | Deliverables | Required output / acceptance evidence | Deadline |
| --- | --- | --- | --- | --- |
| S5-AD — Adrian | Review sanitized pilot failures for answer quality; add at least five regression cases; adjust prompt behavior where evidence justifies it. Maintain the prompt/evaluation contribution history after course submission. | Pilot AI findings; expanded evaluation set; prompt handover and post-fix score report. Pilot regression runner updates and reviewed prompt/evaluation PRs. | Expanded set retains Sprint 3 thresholds; each reported AI defect has a reproducible case and disposition; quality issues are routed to prompt, retrieval or source-content ownership. Keep the submitted release’s report intact and distinguish later pilot improvements. | Nov 7, 3 PM |
| S5-MI — Mika | Observe pilot usability and remove presentation/accessibility friction within the existing scope. Archive the submitted deck and update only the post-release UI maintenance material. | Prioritized usability findings; visual/accessibility fixes; component/style handover notes. Versioned presentation archive and current component documentation. | Pilot users can understand key controls, citations and status states; fixed presentation issues have before/after evidence; no unresolved critical/high-priority usability issue. Pilot improvements are traceable separately from the frozen course submission. | Nov 7, 3 PM |
| S5-MA — Manuel | Investigate pilot backend/provider errors and performance regressions; fix foundational defects; document troubleshooting. Validate failure-drill controls remain disabled for normal users and test updated troubleshooting instructions. | Backend fixes and regression evidence; API/provider troubleshooting guide; measured latency/error results. Post-release backend checks and versioned troubleshooting updates. | No unresolved critical/high-priority backend fault; agreed performance/error budgets hold during the measured pilot; failure recovery is verified; secrets/auth remain intact. A teammate can reproduce a safe diagnostic run without production secrets or destructive changes. | Nov 7, 3 PM |
| S5-JO — Jopher | Triage pilot user-journey defects, fix workflow/state issues and rerun end-to-end acceptance. Verify the updated local setup and seed process after pilot fixes. | Workflow defect log; fixes and regression evidence; finalized user guide and feature-maintenance notes. Fresh-checkout regression record and updated user workflow guide. | Pilot users complete all required journeys; no data-loss, permission or core-path blocker remains; fixed issues cannot be reproduced on the accepted revision. New contributors can start and test the stable version from documented inputs. | Nov 7, 3 PM |
| S5-IK — Ikeee-AI | Run the operational pilot, route incidents, coordinate the final stable release and hand over operation. Continue the metrics, incident and retrospective logs as team operations evidence, separate from the four assessed consultations. | At least 48-hour observation report with uptime/health samples, errors, warm/cold timings and incidents; stable release record; runbook, support/escalation contacts and maintenance checklist. Week 5 operations packet and separate stable-release changelog. | No unresolved critical/high-priority incident; final deployed revision passes smoke checks; recovery steps are executable; a second member demonstrates deployment/rollback using the guide while Ikeee-AI retains operational ownership. Course freeze artifacts remain traceable; no required course deliverable is deferred to this extra week. | Nov 7, 3 PM |

**Sprint 5 gate:** stable within measured pilot conditions, with documented limits, support ownership and recovery capability. This is the operational acceptance target; it is not a guarantee of uninterrupted service. Record hosting cold starts separately and confirm hosting capacity/budget against expected usage.

## Workflow: how the roles complement each other

| Stage | Responsible member | Handoff | Receiver / check |
| --- | --- | --- | --- |
| 1. Scope and acceptance | Ikeee-AI coordinates | Ordered tasks, one owner each, acceptance checks and dependencies | Every member confirms the bounded task; missing access/provider capacity is raised immediately |
| 2a. AI behavior | Adrian | Prompt text, expected facts, source/variant labels and evaluation cases | Manuel implements retrieval/provider/parsing behavior; Adrian later scores answers |
| 2b. Backend foundations | Manuel | API request/response/error contracts, schema changes and shared permission helpers | Jopher implements feature endpoints and integration against them |
| 2c. UI presentation | Mika | Components and visual states, labels, responsive/accessibility rules | Jopher supplies real data, form behavior and state transitions |
| 3. Feature assembly | Jopher | Working browser journeys, with source navigation and persistent feature data | Mika checks presentation; Manuel checks contract/auth use; Adrian checks the AI result |
| 4. Review and integration | A peer of the implementer | Reviewed PR plus passing checks; reviewers record actual findings | Ikeee-AI coordinates merge order and deployment; authors fix their own area |
| 5. Deployed acceptance | Each specialist for their own scope | Evidence tied to the deployed revision, including remaining failures | Ikeee-AI records acceptance and release/blocker decisions |
| 6. Operate and improve | Ikeee-AI coordinates | Incident routed to its technical owner and regression evidence returned | Adrian: answer behavior; Manuel: auth/provider/retrieval; Mika: presentation; Jopher: workflow/state |

### Concrete example: a cited gadget comparison

1. Adrian defines expected source-backed comparisons and how missing specifications must be handled.
2. Manuel defines the response/source contract and implements retrieval, provider execution and reference validation.
3. Mika supplies the comparison layout, loading/error presentation and citation component.
4. Jopher connects gadget selection, comparison requests, UI state, source navigation and saved links.
5. Adrian scores the result; Mika checks presentation; Manuel reviews integration/auth; a peer reviews every implementation PR.
6. Ikeee-AI deploys the accepted revision; the team verifies the same journey live and records evidence.

### Review responsibility

| Implementation owner | Primary reviewer | Additional specialist check when needed |
| --- | --- | --- |
| Adrian | Manuel | Jopher checks that expected behavior fits the user journey |
| Manuel | Jopher | Adrian reviews AI behavior/citation outcomes |
| Mika | Jopher | Adrian checks meaning of AI result/status presentation |
| Jopher | Manuel for backend/integration; Mika for frontend presentation | Split PRs when possible; Adrian checks AI user journeys |
| Ikeee-AI | Manuel | Relevant feature owner performs deployed smoke acceptance |

The author cannot provide their own peer approval. The guide expects protected main, required checks and required reviews. If the current private-repository plan prevents enforcement, Ikeee-AI records this as a course compliance gap in Sprint 2 and discusses an allowed resolution with the instructor. A manual merge checklist is only an interim control, not equivalent compliance. Do not change repository visibility or purchase a plan as part of this document update.

## Working rhythm and intermediate handoffs

### Remaining Sprint 2 time

- **Thursday, Oct 15, by 6 PM:** agree scope; Adrian supplies initial source/evaluation requirements, Manuel supplies contract/auth/provider readiness, Mika supplies UI states; Ikeee-AI checks access and blockers. If this checkpoint has already passed, complete it at the next work session before dependent integration.
- **Friday, Oct 16, by 12 PM:** owners have reviewable core changes; Jopher integrates the agreed inputs. Raise any missing dependency immediately.
- **Friday, by 6 PM:** peer review and core integration checks complete; assign any remaining blocker to one owner.
- **Saturday, Oct 17, 9 AM–12 PM:** final fixes, CI and deployment verification. **12–2 PM:** acceptance/demo. **2–3 PM:** evidence and blocker status submitted; all task deadlines remain 3 PM.

### Sprints 3, 4 and 5

- **Monday, by 12 PM:** kickoff, priorities, scope and acceptance agreed; review previous sprint carryover.
- **Tuesday, by 12 PM:** Adrian's requirements, Manuel's contract changes and Mika's UI states are handed off. Jopher uses agreed contracts to progress integration; changed contracts require an explicit handoff.
- **Wednesday, by 6 PM:** integrated work is ready for specialist checks. Sprint 5's pilot starts earlier, by Wednesday noon, on the accepted release baseline.
- **Thursday, by 6 PM:** implementation PRs are ready; tests and first evidence attached.
- **Friday, by 3 PM:** reviews and cross-role verification complete. **By 6 PM:** fixes or explicit blocker/recovery plan; release candidate ready.
- **Saturday, 9 AM–12 PM:** final checks and deployment. **12–2 PM:** deployed acceptance. **2–3 PM:** sprint review, output/evidence submission and next-sprint priorities.

Preserve two or three asynchronous standups per week, as the guide requests: use Monday/Wednesday/Friday for future sprints and Thursday/Friday for the remaining Sprint 2 time. Each member records completed work, next action, blockers and required handoff; report urgent blockers as they arise. Retain messages/links in the sprint log. Dependency owners respond during the same workday. End each sprint with a written retrospective: what worked, what did not, and one specific change for next sprint with an owner. These are planned team practices, not messages or reminders sent automatically.

## Definition of done and submission format

A code task is Done only after peer review, required CI checks, merge, deployment where applicable and evidence from the accepted revision. Document/evaluation tasks require peer review, a versioned artifact and verification against the relevant implementation. Existing files, screenshots or successful local checks alone do not establish deployed completion.

Every owner submits by the Saturday deadline:

1. Task ID and status: Done / Partial / Blocked.
2. PR or versioned deliverable link, reviewer and relevant commit SHA.
3. Test/evaluation results and user-visible output evidence, with environment/provider identified.
4. Remaining defects, impact, dependency owner and recovery date.
5. Next required handoff, standup/review links and retrospective input.
6. Brief technical explanation of their own change and one considered alternative; AI-assisted code remains the contributor’s responsibility.

Suggested evidence location once the team adds it to the repository: `docs/sprints/sprint-N/`. These are proposed locations, not files created by this plan. Keep credentials, tokens and private user input out of evidence.

**Priority definitions:** critical = data exposure/loss, authorization bypass or total core-service outage; high = a required user journey fails without a reasonable workaround. These must be resolved before release/operational acceptance. Lower-impact issues need an explicit owner and scheduled follow-up.

## Dependencies and scope control

- Confirm actual OpenAI credentials/credit early. The prior backlog recorded this as pending; this plan does not assert the current balance. Ikeee-AI coordinates account availability; Manuel verifies the technical call. If credit stays blocked, report it as a blocker; no local-model substitute is planned.
- Build the AI evaluation against verified stored specifications. Do not invent product facts, use placeholders as production sources or mix model variants silently.
- Confirm Adrian, Mika and Jopher's repository accounts/access before assigning hosted tasks. The plan names people without inventing usernames.
- Use a safe test dataset/environment for destructive acceptance checks. Schema changes belong to Manuel; hosting/secrets belong to Ikeee-AI.
- Set measured response-time/error budgets from Sprint 3 data before Sprint 4 begins. Record sample sizes and warm/cold behavior; do not promise latency the hosting plan cannot support.
- If a gate fails, keep the task Partial/Blocked, record the dependency and recovery date, and reprioritize openly. The Saturday deadline is a reporting/acceptance checkpoint, not permission to label incomplete work Done.
- Finish and stabilize current gadget/spec/question/compare/correction scope first. Add unrelated features only through a separately prioritized future backlog.

## Existing backlog alignment

Sprint 2 primarily closes acceptance for TTK-01, 03, 04 and 05, with TTK-08–11 readiness/review/provider work. Sprint 3 delivers TTK-02 and 07 with deployed TTK-11 proof. Sprint 4 completes TTK-06, 07, 12 and 13 release/recovery evidence. Sprint 5 validates sustained operation and closes pilot regressions across those same requirements. These assignments do not duplicate the existing parent issues; create owner-specific sprint subtasks beneath them when entering the plan on the board.

## Course alignment: missing or under-specified work now included

The following changes come from the [course guide](https://csp221a.vercel.app/). The original functionality plan remains, with these obligations integrated into the owner rows above.

| Gap in the previous plan | Assignment and deadline | Evidence to collect |
| --- | --- | --- |
| Sprint 2 API tests were not explicitly required to run in CI; persistence checked only across refresh | Jopher owns feature API tests; Manuel foundation tests; Ikeee-AI workflow wiring — Oct 17, 3 PM | CI run plus live refresh/redeploy persistence and related-record walkthrough |
| Separate environments and full pipeline stages were vague | Ikeee-AI drafts isolation in Sprint 2, implements feasible staging/previews in Sprint 3 — Oct 17 / Oct 24, 3 PM | Environment matrix, scoped configuration, PIPELINE.md and pipeline diagram; any limitation recorded |
| Prompt changes lacked an automatic evaluation path; Adrian's code contribution was unclear | Adrian owns prompt assets and executable evaluator; Manuel owns provider adapter; Ikeee-AI owns workflow triggers — Sprint 2 foundation / Sprint 3 integration | Versioned files, reviewed PRs, automatically generated evaluation artifacts |
| Weekly process and instructor consultation evidence were incomplete | Every member supplies evidence; Ikeee-AI assembles each packet — every Saturday, 3 PM, or earlier instructor appointment | Plan, small issues/PRs, standups, retro, risk/next-sprint plan, board and pipeline report |
| Pipeline metrics were mixed with application latency | Ikeee-AI records the specified delivery metrics every sprint; optimizes in Sprints 3–4 | Complete metric rows and comparable before/after pipeline runs |
| Demo Day challenge, panel drills and slide ownership were missing | Mika owns deck/UI challenge, Jopher reviews/demo, Manuel failure/API drills, Adrian AI deep dive, Ikeee-AI deploy narration — Oct 31, 3 PM | Timed rehearsal, reviewed change-to-live record and rollback evidence |
| Final checklist artifacts had no explicit ownership | Named assembly owners in the 21-item manifest below — no later than Oct 31, 3 PM or earlier freeze | Artifact links and reviewer confirmation; missing items remain open |

### Weekly consultation packet and presentation

The guide specifies a **15-minute consultation, all members attending, scored out of 20**. Our Saturday deadline prepares the packet; the instructor determines the actual appointment. Source: [consultations](https://csp221a.vercel.app/#consultations).

| Time | Lead | Content and role handoff |
| --- | --- | --- |
| 4 minutes | Jopher | Deployed increment walkthrough; Mika verifies display readiness; Adrian/Manuel supply the week's AI/API acceptance examples |
| 3 minutes | Ikeee-AI as planned PO | Board: committed work, accepted work, slipped work, reasons and revised owners/dates |
| 3 minutes | Ikeee-AI as DevOps | Pipeline changes, weekly delivery metrics, incidents and measured improvement |
| 2 minutes | Ikeee-AI coordinates | Top risk, concrete mitigation and next sprint's commitments; technical owner explains the risk |
| 3 minutes | All members | Questions about any code, decisions and alternatives; each person must explain their own work |

Bring the deployed application, current board, repository PRs, sprint log with standups/previous retro, and updated pipeline metrics. After the consultation, record feedback and the next action. Recover available Sprint 1 evidence honestly: absent historical standups/reviews/retros must be described as missing or reconstructed from dated evidence, never backdated or fabricated.

Course scoring is **30% consultations, 40% Demo Day, 30% individual track**. The four developers are assessed on identifiable ownership, code quality, steady contributions, collaboration and understanding; Ikeee-AI is assessed through the CI/CD track. A large final-day commit does not replace steady reviewed work. Source: [grading](https://csp221a.vercel.app/#grading) and [individual rubrics](https://csp221a.vercel.app/#rubrics).

### Required weekly DevOps metrics and artifacts

Ikeee-AI owns the following record, updated **before each consultation** and finalized by each Saturday deadline. These are delivery metrics, distinct from Manuel's application latency/retrieval measurements. Source: [DevOps track](https://csp221a.vercel.app/#devops).

| Field in pipeline-metrics-log.md | Measurement rule for this team |
| --- | --- |
| Sprint/week | Date range and relevant deployed commit(s) |
| Average PR pipeline duration, minutes | Completed PR runs in the stated window; include sample count and define skipped/cancelled-run treatment |
| Main pipeline duration, minutes | Main runs with aggregation/sample count stated consistently |
| Success rate, percent | Successful completed runs divided by eligible completed runs; give numerator/denominator |
| Production deployments | Successful deployment count with run/deploy links |
| Merge-to-live lead time, minutes | Merge timestamp to verified live revision; same method each week |
| Failed deployments | Count and links; distinguish CI test failures from deployment failures |
| Recovery time, minutes | Failure detection to verified restoration; mark N/A when no incident, not a fabricated zero |
| Change made | Optimization/configuration change and associated PR |

Required artifacts: pipeline configuration, `PIPELINE.md` describing stage purposes/triggers, pipeline diagram, metrics log, optimization log, deploy/rollback runbook and incident log with short postmortems. For every incident, record impact, detection, timeline, cause, recovery and a prevention task/owner. If no incidents occurred, record that accurately for the observation window.

Sprint 2 establishes or retrieves the baseline. Sprint 3 makes a measured optimization. Sprint 4 compares additional changes such as caching, fail-fast ordering, safe parallelism or redundant-run cancellation. Select techniques from measured bottlenecks, preserve required checks, and report regressions honestly. Use comparable workloads and multiple runs when available; do not invent a percentage improvement target or claim gains from one unusually fast run.

The site's mature pipeline is a reference, not a mandatory technology template. Justify applicable install/cache, lint/format, type-check, mocked unit tests, build, test-database integration, dependency/secret scans, deployed smoke and health-check stages. Keep main merges automatically deploying; the Saturday session verifies the cumulative increment rather than becoming a manual weekly deploy gate. Staging/previews are an improvement target in the guide; production is the minimum environment. Existing hosting/database choices may remain if justified and compatible with course requirements.

### AI-aware pipeline handoff and cost controls

- Adrian owns prompt assets, expected behavior, evaluation code and score interpretation. Manuel owns runtime output validation/provider adapters and supplies a stable evaluation interface. Ikeee-AI owns triggers, credentials, execution limits and report retention.
- Routine PR checks use mocked provider results and test response shape, valid references, error behavior and output processing. Exact model wording is not a stable assertion.
- Prompt changes trigger automatic regression evaluation. Run offline/fixture checks on ordinary PRs; use a separate trusted, budget-capped model evaluation workflow for genuine answer-quality measurement. Identify provider/model in every report. Mock success is not proof of live model quality; local-model evaluation is not OpenAI qualification.
- A small scheduled live-provider smoke job has a documented cadence, request/token cap, timeout and spending control. Initial team target: once per week; Ikeee-AI configures the actual job only during implementation with approved account settings. No scheduler or paid call is created by this planning update.
- Provider outages leave live AI checks visibly failed/pending but do not prevent unrelated changes from deploying. An AI behavior change still needs its relevant quality evidence before acceptance. Separate keys/configuration per environment and cap non-production expenditure; never expose keys in logs.

### Demo Day rehearsal and panel readiness

The website allocates **30 minutes: 20 minutes presenting plus 10 minutes of questions**, and requires a small requested visible change to reach production through a reviewed PR during that session. Exact Demo Day date remains instructor-confirmed. Source: [Demo Day](https://csp221a.vercel.app/#demo).

| Presentation slot | Lead | Deliverable |
| --- | --- | --- |
| 3 minutes: problem/product | Mika | Clear intended user, problem, value and scope in the deck |
| 4 minutes: architecture | Manuel | System/schema views, API boundaries, stack decisions and alternatives |
| 6 minutes: live product | Jopher | Production CRUD, persistence, meaningful related data and AI user journey |
| 3 minutes: AI deep dive | Adrian | Output-processing explanation with Manuel's implementation evidence, evaluation results and graceful failure |
| 4 minutes: delivery | Ikeee-AI | Pipeline/environments, measured trends, incidents and deployment narration |

Prepare draft slides in Sprint 3. Rehearse the full session before the Sprint 4 Saturday deadline. Challenge ownership: Mika implements a presentation-only change; Jopher reviews; Ikeee-AI coordinates the normal merge/pipeline and narrates; Manuel verifies health; Adrian checks relevant AI regression if affected. If the requested change is outside presentation, use the existing area owner with a separate peer reviewer. Do not bypass checks to hit the timer.

Practice provider failure/bad output, malformed API input, sanitized repository-history scan evidence and rollback to the previous production release. Keep fault injection controlled and reversible; ordinary users must not be able to enable it. Warm a sleeping service before the presentation, document cold-start limits, and prepare recovery procedures rather than treating screenshots as a substitute for a live demo.

### Final submission manifest: all 21 website checklist items

Every row is due **Sprint 4, October 31, 2026, 3:00 PM, or the instructor's earlier code freeze**. Start drafts in Sprints 2–3 as assigned above. Owner here means the person who assembles/verifies that artifact; technical authorship stays with each specialist. Suggested repository names below are planned outputs, not artifacts created by this document. Source: [final deliverables](https://csp221a.vercel.app/#deliverables).

| # | Required artifact | Single assembly owner | Expected output / verification |
| --- | --- | --- | --- |
| 1 | Tagged production release on a free public host | Ikeee-AI | Public URL, release tag, matching deployed SHA and live acceptance evidence |
| 2 | Frontend, backend and migration source | Jopher | Manifest linking each specialist's reviewed source/PRs; clean-checkout build verified |
| 3 | Complete .env.example with no secret values | Ikeee-AI | All required frontend/backend variables documented; technical owners verify their settings |
| 4 | Local seed data or setup script | Jopher | Safe reproducible setup/seed command tested away from production |
| 5 | README: product, roles, stack, setup | Ikeee-AI | Integrated README; Jopher contributes verified setup, specialists verify their own sections |
| 6 | Architecture diagram | Manuel | Frontend/API/database/AI/deployment boundaries and data flow explained |
| 7 | Schema diagram or outline | Manuel | At least two related tables and the relationship used by the application |
| 8 | API reference | Manuel | Requests, responses, validation, permissions and errors; Jopher supplies feature details |
| 9 | AI feature write-up and evaluation | Adrian | Prompt/retrieval/output-processing description, versioned dataset and measured results |
| 10 | Release changelog | Ikeee-AI | Changes, limitations and migration notes for the submitted tag |
| 11 | Board with sprint history | Ikeee-AI | Requirement mapping, owners, issue/PR links and accurate historical status |
| 12 | Four plans, standups and four retrospectives | Ikeee-AI | Sprint 1–4 logs compiled from each member's real evidence; historical gaps disclosed |
| 13 | Scope-change log when scope changed | Ikeee-AI | What/why/impact and instructor consultation record; record no changes only if true |
| 14 | Slide deck | Mika | Final timed deck with contributions from all five speakers |
| 15 | Repeatable AI failure simulation | Manuel | Safe controlled timeout/error/bad-output drill with Jopher's UI acceptance evidence |
| 16 | Pipeline configuration files | Ikeee-AI | Versioned executable CI/CD workflow files with reviewed changes |
| 17 | PIPELINE.md and pipeline diagram | Ikeee-AI | Stage/trigger rationale, environment paths and quality controls |
| 18 | Completed metrics log | Ikeee-AI | Sprint 1–4 delivery metrics with source runs; unavailable values labeled accurately |
| 19 | Optimization log | Ikeee-AI | Changes and comparable before/after measurements, including unsuccessful experiments |
| 20 | Deployment and rollback runbook | Ikeee-AI | Commands/steps, version selection, data compatibility and observed recovery proof |
| 21 | Incident log and postmortems | Ikeee-AI | Real incidents with corrective owners; explicitly state incident-free periods where supported |

Ikeee-AI prepares the repository and production URL submission before code freeze; submitting to a course portal is a later team action, not performed by this plan. Keep the final manifest linked to the frozen release. Course-required completion cannot move into Sprint 5 merely because the team scheduled a pilot there.

### Role continuity and scope changes

The guide allows the product-owner duty to rotate weekly; record the named duty holder each sprint. A formal role change is allowed once mid-project with a reason, advance notice to the instructor and documentation. The boundaries in this plan refine the agreed specialties rather than reassigning formal roles. Record product scope changes and tell the instructor at the next consultation; retain all seven core requirements. AI coding assistance is allowed by the guide, but each contributor must understand and explain every change they merge. Source: [team roles](https://csp221a.vercel.app/#team) and [FAQ](https://csp221a.vercel.app/#faq).
