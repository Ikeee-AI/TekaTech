# Demo Day deck — draft outline (S3-MI, Refs #55)

**Status:** Sprint 3 draft: structure, timings and speakers are set, and slide content is placeholders. Each speaker supplies their own section's content. Mika assembles and finishes the deck in Sprint 4 (S4-MI, due Oct 31, 3:00 PM).

**Session length (course rule):** 30 minutes = **20 minutes presenting + 10 minutes panel questions.** A small visible change requested by the panel must reach production through a reviewed PR during the session. Source: [CSP221A Demo Day](https://csp221a.vercel.app/#demo); the team split is from `docs/sprints-2-to-5.md` → "Demo Day rehearsal and panel readiness". The Demo Day date is still to be confirmed by the instructor.

## Timing and speakers

| Clock | Minutes | Speaker | Part |
| --- | --- | --- | --- |
| 0:00–3:00 | 3 | Mika | 1. Problem and product |
| 3:00–7:00 | 4 | Manuel | 2. Architecture |
| 7:00–13:00 | 6 | Jopher | 3. Live product demo |
| 13:00–16:00 | 3 | Adrian | 4. AI deep dive |
| 16:00–20:00 | 4 | Ikeee-AI | 5. Delivery: pipeline, metrics, live deploy |
| 20:00–30:00 | 10 | Everyone | Panel questions (backup slides ready) |

Presenting total: 3 + 4 + 6 + 3 + 4 = **20 minutes**.

## Slide outline

Per-slide times are targets. Each speaker can re-split their own minutes, but not go over their part's total.

### 1. Problem and product — Mika (3 min)

| # | Slide | Time | Content (to fill) | Source |
| --- | --- | --- | --- | --- |
| 1 | Title: TekaTech, the team, the roles | 0:20 | Logo, one-line pitch, five names and roles | README roster |
| 2 | The problem | 0:50 | Shoppers can't easily compare gadget specs, and AI answers without sources can't be trusted | Mika |
| 3 | Who it's for and what it does | 1:00 | Intended user; catalog, compare, ask with numbered citations, corrections | Mika, product screenshots |
| 4 | Scope | 0:50 | What's in (CRUD, specs, cited AI answers, comparison) and what's out, plus known limits (free-tier cold start) | Mika, with Ikeee-AI |

### 2. Architecture — Manuel (4 min)

| # | Slide | Time | Content (to fill) | Source |
| --- | --- | --- | --- | --- |
| 5 | System diagram | 1:20 | Browser → FastAPI → Supabase (Postgres + pgvector, auth) → OpenAI; Render hosting | Manuel (architecture diagram, checklist item 6) |
| 6 | Data model and relationships | 1:00 | Tables and how they relate (gadgets → spec documents → corrections, etc.) | Manuel |
| 7 | API boundaries and auth | 1:00 | Backend owns all data and AI access; route-level auth; admin flag in `app_metadata` | Manuel |
| 8 | Stack choices and alternatives | 0:40 | Why each choice, and what was considered instead | Manuel |

### 3. Live product demo — Jopher (6 min)

| # | Slide | Time | Content (to fill) | Source |
| --- | --- | --- | --- | --- |
| 9 | Demo route | 0:20 | The path we'll follow, shown as a checklist | Jopher (S4-JO demo script) |
| — | **Live on production** | 5:00 | Create/edit a gadget → add specs → data persists after refresh → related data → ask a cited question → compare → share link | Jopher, live |
| 10 | Backup screenshots | 0:40 | Only if the live site fails; never used in place of a working live demo | Jopher; Mika's 360/1280 px UI screenshots |

### 4. AI deep dive — Adrian (3 min)

| # | Slide | Time | Content (to fill) | Source |
| --- | --- | --- | --- | --- |
| 11 | How an answer is made | 1:00 | Retrieval → numbered context → model → output checks (invalid citations removed, shape validated) | Adrian, with Manuel's implementation evidence (#75, #83) |
| 12 | Evaluation results | 1:10 | Evaluation set size, scores, what changed after prompt changes | Adrian (evaluation report) |
| 13 | Graceful failure | 0:50 | What users see for an answer vs missing evidence vs AI failure (timeout, unavailable, malformed reply) | Adrian; screenshots in `frontend/docs/screenshots/s3/` |

### 5. Delivery — Ikeee-AI (4 min)

| # | Slide | Time | Content (to fill) | Source |
| --- | --- | --- | --- | --- |
| 14 | Pipeline and environments | 1:00 | PR checks → review gate → main → Render deploy → smoke test | Ikeee-AI (`PIPELINE.md`, pipeline diagram) |
| 15 | Measured trends | 1:00 | Pipeline duration, success rate, deploys, merge-to-live time across sprints | Ikeee-AI (`docs/devops/metrics.md`) |
| 16 | Incidents and recovery | 0:40 | Incidents with short postmortems, and how rollback works | Ikeee-AI (incident log, runbook) |
| 17 | Live change → production | 1:20 | Narrate the panel's requested change moving through PR → checks → merge → deploy | Ikeee-AI narrates; see "Live change" below |

### Panel questions — everyone (10 min)

| # | Slide | Use |
| --- | --- | --- |
| 18 | Questions | Team slide on screen during Q&A |
| B1 | Backup: AI failure drill | Controlled provider failure or bad output, and what the UI shows (Manuel, Adrian, Mika) |
| B2 | Backup: malformed API input | Request rejected with a safe error (Manuel) |
| B3 | Backup: secret scan | Sanitized repository-history scan result (Ikeee-AI) |
| B4 | Backup: rollback | Restoring the previous production release (Ikeee-AI) |
| B5 | Backup: cold start | Measured first-load time and the "server is waking up" banner (Ikeee-AI, Mika) |

Each member must be able to explain their own code, including AI-assisted code.

## Live change during the session

Ownership is from the team plan:
- **Implements:** Mika, a presentation-only change.
- **Reviews:** Jopher.
- **Merge and narration:** Ikeee-AI runs the normal merge and pipeline, and narrates.
- **Health check:** Manuel.
- **AI check:** Adrian checks for AI regressions if affected.

If the request is outside presentation, its area owner implements it with a separate reviewer. **Checks are never bypassed to beat the timer.**

To decide in Sprint 4: when in the 20 minutes the change starts so it is live by slide 17. One option is to start it during Part 3 so the pipeline runs while Jopher presents.

## Before Demo Day

- [ ] Each speaker fills in their section's slides (content owners above).
- [ ] Mika assembles the deck and source/slide attribution (S4-MI).
- [ ] Full timed rehearsal before Oct 31, 3:00 PM: 20 minutes, with Q&A practice.
- [ ] Rehearse the live change → production, and rollback.
- [ ] Warm the free-tier services before presenting (cold start measured at 42.5 s).
- [ ] Confirm the Demo Day date and room setup with the instructor.
