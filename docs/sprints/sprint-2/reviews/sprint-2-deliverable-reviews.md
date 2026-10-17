# Sprint 2 deliverable reviews (17 October 2026, ~19:00 Asia/Manila)

Method: `/review-deliverable` procedure — each PR checked against its task row in `docs/sprints-2-to-5.md`; CI evidence reused (all four PRs: Backend tests, Frontend lint and build, Database migrations green after fork workflows were enabled at ~18:55). These are AI-assisted pre-reviews for the DevOps owner. **They are not the required teammate approval.**

Times are Asia/Manila. Team deadline was Saturday 17 October, 3:00 PM.

---

## S2-AD — Adrian — [PR #35](https://github.com/Ikeee-AI/TekaTech/pull/35) (opened Fri 21:03, on time)

| # | Required item | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | Prompt/answer spec Manuel can implement | Met | `prompts/S2-AD-prompt-spec.md` §1: grounding, `[n]` citations, bold/bullets, comparison and abstention rules | Add the rule that retrieved snippets are **untrusted data** (prompt-injection guard required by CLAUDE.md) |
| 2 | ≥5 verified facts × 2 gadgets with URLs and variant labels | Partial | iPhone 15 and Galaxy S24, 5 facts each, official URLs | S24 fact 2 mixes **Snapdragon or Exynos** variants (plan: never mix variants silently) — pick one variant/region. iPhone 15 "3349 mAh" is not on Apple's spec page (Apple does not publish mAh) — cite a source that states it or drop it. Add access dates |
| 3 | 10 cases with expected facts or abstention | Met | 10 cases: 7 factual incl. 1 comparison, 3 abstentions | Expected answers should include their `[n]` citation so citation validity can be scored |
| 4 | Runnable evaluator with documented inputs/outputs | Partial | `scripts/eval_runner.py` runs; README explains how | Only **3 of 10** cases are encoded, and it scores a hard-coded `mock_llm_engine` that returns the expected text — it cannot detect a bad prompt or answer. Score real (or recorded) outputs and check `[n]` validity |
| 5 | Versioned prompt files | Partial | Spec document only | The actual prompt text used by `backend/routers/query.py` is not versioned as an asset yet (Sprint 3 with Manuel) |
| 6 | Process | Issue | — | Body says **`Closes #12`** (TTK-11 OpenAI connectivity) — wrong issue and would auto-close it on merge. Change to `Refs #20` (and `Refs #3`). Body claims a README ownership update that was actually pushed **directly to main** (`ed37f45`) |

**Verdict: Changes requested → Sprint 2 status Partial.** Small, focused fixes; reviewer Manuel.

---

## S2-MI — Mika — [PR #39](https://github.com/Ikeee-AI/TekaTech/pull/39) (opened Sat 15:55, ~1 hour late)

| # | Required item | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | Reusable components, responsive layouts | Met | `components/ui/` Alert, Button, ConfirmDialog, ErrorState, FormField, BackLink; GadgetForm, Navbar | — |
| 2 | Loading/empty/success/error states | Met | Screenshots of catalog loading/empty/error, specs error, AI answer empty/error, delete error | — |
| 3 | Screenshots at 360 px and 1280 px | Met | **38 screenshots** in `frontend/docs/screenshots/` | — |
| 4 | Labels and keyboard focus; contrast | Met (claimed) | `FormField.jsx`, `frontend/docs/ui-presentation.md` | Reviewer should tab through forms once in the browser |
| 5 | All four CRUD actions have a control | Partial | Create/edit forms; gadget delete **works** (calls real admin `DELETE /gadgets/{id}`) | **Spec delete calls `DELETE /gadgets/{id}/specs/{id}`, which does not exist** — always fails. Hide it until Manuel/Jopher add the endpoint. Description says delete buttons "don't do anything", which is inaccurate |
| 6 | `npm run lint` clean, identifiable reviewed contribution | Met / Issue | CI lint + build green | One 3,536-line commit across 75 files; touches Jopher's area (`pages/**`, `api/client.js`) and the prompt-coupled `AnswerText.jsx` (colour classes only — parsing unchanged, safe) |
| 7 | Process | Issue | — | `Closes #21` would auto-close the issue before deployed verification → use `Refs #21`. PR checklist left unticked |

**Verdict: Accept with small changes → strongest deliverable of the sprint, status Partial until merged and verified live.** Reviewer Jopher (also owns the overlapping pages/API wiring).

---

## S2-MA — Manuel — [PR #37](https://github.com/Ikeee-AI/TekaTech/pull/37) (opened Sat 14:15, on time)

| # | Required item | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | Unauthenticated/unauthorized requests rejected — tests in CI | Met | 401 tests for create/update gadget and spec ingest; 422 field validation; CI green | — |
| 2 | API/permission contract and shared error format | Partial | New API reference + error format in `backend/README.md` | **4 auth claims are wrong**: `GET /gadgets`, `GET /gadgets/{id}/specs`, `POST /comparisons`, `POST /query` are **public** in code but documented as logged-in/401. `/stats/*` routes missing. Opening sentence "all routes require a token" is misleading |
| 3 | Migration applies to a disposable DB | Met | CI database job; PR notes TekaTech-dev verification | — |
| 4 | One real OpenAI response or explicit blocker | Blocked (honest) | PR states credit exhausted | Record owner + recovery date in #22 |
| 5 | Relationship used in a real feature; browser auth flow documented | Met | README "Browser-to-API boundary" section | — |
| 6 | Process | Issue | — | **Conflicts with Jopher's #36**: both append to the end of `test_gadgets.py` and `test_specs.py`, both add `test_ingest_spec_requires_login` (duplicate name — one would silently shadow the other) and duplicate "missing name → 422" tests. PR body still has the template's `Closes #...` placeholder → `Refs #22` |

**Verdict: Changes requested → Partial (OpenAI blocked).** Fix the four auth rows; merge #37 first, then Jopher rebases #36 and drops duplicates. Reviewer Jopher.

---

## S2-JO — Jopher — [PR #36](https://github.com/Ikeee-AI/TekaTech/pull/36) (opened Sat 11:32, on time)

| # | Required item | Status | Evidence | Fix needed |
| --- | --- | --- | --- | --- |
| 1 | API tests in CI incl. malformed input | Met | 6 tests: malformed id 422, missing name 422, missing/whitespace spec text 422/400, unauthenticated spec save 401, unauthenticated delete 401; CI green; 6 small commits | — |
| 2 | Create → list → view → edit → refresh persists (browser) | Missing | — | Browser journey evidence (or E2E notes) on TekaTech-dev |
| 3 | Authorized delete works, unauthorized fails | Partial | 401 test; existing non-admin 403 test | Wire/verify Mika's delete UI end to end |
| 4 | Spec save works without an AI call | Not shown | — | Existing tests cover it; link them in the PR |
| 5 | Idempotent seed script, refuses production | Missing | — | Seed script against TekaTech-dev |
| 6 | Persistence after redeploy | Missing | — | Joint check with Ikeee-AI after merges |
| 7 | Process | Issue | — | Overlaps Manuel's #37 (see above): rebase after #37, remove duplicate tests. `Refs #2` good; add `Refs #23` |

**Verdict: Accept tests after de-duplication → S2-JO status Partial** (tests delivered; browser workflows, seed script and redeploy persistence outstanding). Reviewer Manuel.

---

## Sprint 2 summary for the consultation

| Task | Owner | Status | One-line reason |
| --- | --- | --- | --- |
| S2-AD | Adrian | Partial | Spec + 10 cases + source pack delivered; evaluator only scores a mock; variant mixing |
| S2-MI | Mika | Partial (near Met) | Components, states and 38 screenshots delivered; spec-delete control has no backend; late, single large commit |
| S2-MA | Manuel | Partial / Blocked | Auth contract tests + docs delivered; 4 wrong auth rows; OpenAI blocked by credit; 9 reviews given |
| S2-JO | Jopher | Partial | 6 API tests delivered; CRUD browser journey, seed script and redeploy persistence missing |
| S2-IK | Ikeee-AI | Partial → see merge/deploy evidence | CI/CD, guardrails, environments, board delivered; merges in progress |

Process exceptions to disclose: `ed37f45` direct push to main (Adrian); fork-based PRs ran no CI until settings were fixed on 17 Oct ~18:55; #36/#37 ownership overlap; three PRs used `Closes #` against the Definition of Done.
