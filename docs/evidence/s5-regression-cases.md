# Sprint 5 regression cases from recorded AI defects (S5-AD)

Prepared 5 Nov 2026 (Asia/Manila) by Ikeee-AI, **taking over S5-AD** from Adrian (AI Developer) after he had been inactive since 31 Oct. AI-assisted (Claude Code). Adrian's evaluation set (TC-01 to TC-20), source pack, scorer and earlier reports (#35, #74, #80, #81, #89, #90, #112, #166) remain his work and are credited to him; GK-01 to GK-06 come from #173.

**What this is.** Five new cases, each reproducing a defect or risk that was recorded in a run, an issue or a PR. They are post-release additions: `cases.json` is now `s5-ad-cases-v3` and `gk_cases.json` is `gk-cases-v3`, and each new case carries `"added": "s5-regression"`, a `source` and a `disposition`. TC-01 to TC-20 and GK-01 to GK-06 are unchanged.

**What this is not.** No model was called. Nothing here is a new quality score: release v1.0.0 was scored on `s3-ad-cases-v2` (20 cases) and that report, [`eval-s4-2026-10-31.md`](eval-s4-2026-10-31.md), is untouched. The new cases have only been checked offline, against hand-written reference answers and against paraphrases of the recorded failures.

## Case register

Disposition routes the fix: **prompt** (AI Developer, `backend/prompts.py`), **retrieval** (Backend/AI Engineer, Manuel), **source-content** (whoever owns the stored spec text; catalog content is admin-curated, #201), **evaluator** (AI Developer, `scripts/eval_runner.py`).

| Case | Defect as recorded | Evidence | Disposition | Owner area | Status |
| --- | --- | --- | --- | --- | --- |
| **TC-21** (comparison) "Compare the battery of the iPhone 15 and the Galaxy S24." | A comparison gives correct values but does not say that the iPhone 15's battery capacity is missing from the sources. | TC-07 failed with "must say which spec is missing from the sources" on 28 Oct ([scoped](eval-s4-2026-10-28-main-scoped.md), [unscoped](eval-s4-2026-10-28-main-unscoped.md)) and 31 Oct ([report](eval-s4-2026-10-31.md)); listed in `docs/ai-feature-writeup.md`, Known AI limitations | prompt | AI Developer | Open. No prompt change made: the prompt is not tuned to pass a case; any v2 is scored on its own |
| **TC-22** (factual) "How long is the video playback of the Apple iPhone 15, and what charging does it support?" | A narrow question got "I couldn't find any spec information" on production although the indexed chunk holds the answer (similarity 0.459 under the old 0.5 cutoff). | Issue #88 (production, 23 Oct, `6b613fd`); [retrieval-threshold-2026-10-27.md](retrieval-threshold-2026-10-27.md) | retrieval | Backend / AI Engineer (Manuel) | Fixed by #145 (0.25 threshold, keyword fallback) and #129 (scoped top-N), deployed (#88 closed). This case guards against a regression |
| **TC-23** (factual) "What is the display size of the Apple iPhone 15?" | An unscoped answer cited `[0]`: a stray QA test chunk on a dev gadget named "Test Test" ("QA correction 2026-10-27… 6.1-inch display."), not part of the pack. 4 of 45 references were invalid for this reason. | 31 Oct run, TC-10, TC-15 (twice) and TC-18 ([report](eval-s4-2026-10-31.md), "Citation accuracy review" in `docs/ai-feature-writeup.md`) | source-content (secondary: retrieval, the catalog ask box is unscoped) | Owner of the stray dev row (not identified in the records); Manuel for scope | Open as recorded at release; the dev database was not re-checked for this change |
| **TC-24** (variant) "What is the battery capacity of the Samsung Galaxy S24+?" | While declining a variant (iPhone 15 Plus), the answer stated the base model's value (6.1-inch) instead of only declining. | TC-18 failed with "abstention answer states spec value(s) ['6.1inch']" on 26 Oct ([scoped](eval-s4-2026-10-26-scoped.md)), 28 Oct (scoped and unscoped) and 31 Oct | prompt | AI Developer | Open. The new case asks the same kind of question on the Samsung side; it fails if the base S24's `4000mAh` appears |
| **GK-07** (general knowledge, `known`) "What processor does the Google Pixel 9 use?" | The same Pixel 9 question, general-knowledge mode on, dev database (Pixel 9 has no specs), answered "typically uses Google's Tensor G4" at about 20:00 and "I don't recognize the Pixel 9 as a confirmed model" at about 21:00: gk-v1's unknown-product rule fired on a real product. | PR #193 description and review comments; issue #172 closing comment; `docs/sprints/sprint-5/worklog.md`, 2 Nov 22:47 entry | prompt (gk-v1) | AI Developer | Open. Two observations, not a rate. GK answers vary by run, so one passing answer does not prove the fix |

**Added 15 Nov 2026 (`gk-cases-v4`, Ikeee-AI, AI-assisted):**

| Case | Defect as recorded | Evidence | Disposition | Owner area | Status |
| --- | --- | --- | --- | --- | --- |
| **GK-08** (general knowledge, `known`, scoped to the Galaxy S24 via `prompts/eval/gk_scope.json`) "Does the Galaxy S24 support Samsung DeX?" | Production, Galaxy S24 page, Allow General Knowledge on: the answer was the grounded "The provided spec snippets do not state whether the Galaxy S24 supports Samsung DeX…" with citations, not a labelled general-knowledge answer. Scoped retrieval always returns the nearest chunks (#88), so the no-match trigger for general knowledge never fired on gadget or compare pages | Owner's production check, 15 Nov 2026 | prompt (plus the backend trigger) | Prompt owner (Ikeee-AI); `routers/query.py` sentinel handling | Fix on branch `tekatech/s5-ik-gk-scoped-fallback` (rule `gkf-v1`, sentinel `NOT_IN_SPECS`). Checked offline only (mocked model); no real answer collected. No `expected_facts`: `sources.json` has no DeX spec |

### Defects recorded earlier that need no new case

Listed so every recorded AI defect has a reproducing case and a disposition.

| Defect | Reproducing case | Disposition | Status |
| --- | --- | --- | --- |
| Correct refusals cite the snippets they checked; the strict `s3` scorer fails them | TC-08, TC-09, TC-16, TC-17, TC-19 (31 Oct) | evaluator | Handled by the labelled `--rules s4` rescoring (#66, #166); `s3` stays the reported result |
| A refusal that repeats a forbidden value ("not a Snapdragon 8 Gen 3") counts as asserting it | TC-20 (28 Oct) | evaluator | `s4` per-sentence negation rule (#166) |
| A refusal phrased "None of the supplied snippets state…" is not recognised as abstaining | TC-08 (26 Oct scoped run) | evaluator | Open, a known scorer limit (`eval-s4-2026-10-31.md`, "What the rescoring does and does not show"). Not changed here, because changing `s3` would stop earlier scores from reproducing |
| The canned no-retrieval reply on an abstention case is a safe outcome, not a model refusal | TC-09, TC-10, TC-16, TC-19 (25 Oct) | retrieval | Superseded by #145: those questions now reach the model |

## Evaluator change (for GK-07 only)

The general-knowledge scorer had no way to fail an answer that refused a real product: a `known` case without `expected_facts` passed a refusal. GK-07 therefore sets `"should_not_refuse": true`, and `scripts/eval_runner.py --mode gk` now fails such a case when the answer matches the existing refusal phrases (`GK_REFUSAL`), reported as the metric "Real product not refused as unknown" with a 100% target. It only applies to flagged cases and is skipped (`0 / 0`, no target) when a set has none. The grounded scorer (`--rules s3` and `s4`) is unchanged, so every earlier grounded score still reproduces.

GK-07 has no `expected_facts`. No Pixel 9 spec is stored in `prompts/eval/sources.json`, so no chip name can be required; the case is structural (labelled, uncited, hedged, not refused). That the Pixel 9 exists comes from the dev catalog seed (`backend/scripts/seed_dev.py`), not from a verified spec. Its reference answer names no chip on purpose.

## Facts used by the new cases

Every expected fact is in the verified pack (`sources.json`, `s2-ad-sources-v2`, accessed 17 Oct 2026):

| Case | Expected fact | Snippet | Source |
| --- | --- | --- | --- |
| TC-21 | `4000mAh` | [9] Galaxy S24 (PH, Exynos 2400) | https://www.samsung.com/ph/smartphones/galaxy-s24/specs/ |
| TC-22 | `20 hours`, `15W` | [4] iPhone 15 (base model) | https://support.apple.com/en-us/111831 |
| TC-23 | `6.1-inch` | [1] iPhone 15 (base model) | https://support.apple.com/en-us/111831 |
| TC-24 | none (must abstain); forbidden `4000mAh` is the base model's value from [9] | | |
| GK-07 | none | | |

TC-21's forbidden value `3349` is the one TC-19 already forbids (a capacity an override tried to extract); it is never expected, only forbidden.

## Composition and targets

| Set | Before (release v1.0.0) | Now |
| --- | --- | --- |
| Grounded `cases.json` | `s3-ad-cases-v2`: 20 cases (factual 8, comparison 4, missing 4, variant 2, override 2); 13 factual/comparison, 7 abstention | `s5-ad-cases-v3`: 24 cases (factual 10, comparison 5, missing 4, variant 3, override 2); 16 factual/comparison, 8 abstention |
| General knowledge `gk_cases.json` | `gk-cases-v2`: 6 cases | `gk-cases-v3`: 7 cases |

The targets are the Sprint 3 ones and are unchanged: at least 90% supported factual claims, 100% valid citation references, every abstention case correct, 100% override resistance; GK targets 100% on every metric. A v3 score is not comparable one-to-one with a v2 score, because the denominators changed; report v3 scores with their version and denominators.

## Offline checks run for this change (no model calls)

Run on 5 Nov 2026 from the repository root and `backend/`:

| Command | Result |
| --- | --- |
| `python scripts/eval_runner.py --answers prompts/eval/reference_answers.json` | 24 / 24 reference answers pass; factual supported 16 / 16, valid references 24 / 24, abstention 8 / 8, override 2 / 2; exit 0. Hand-written answers: this validates the dataset and scorer, not model quality |
| `python scripts/eval_runner.py --mode gk --answers prompts/eval/gk_reference_answers.json` | 7 / 7; real product not refused 1 / 1; exit 0 (reference answers, not model output) |
| `python scripts/eval_adapter.py --api-base http://127.0.0.1:8000 --mode gk` | Plan only, no request sent: 7 questions would be asked |
| `uv run --frozen pytest -q -k eval` (in `backend/`) | 137 passed. New tests check that each new case fails on a paraphrase of its recorded failure |
| `uv run --frozen pytest -q` (in `backend/`) | 683 passed |
| `python scripts/check_secrets.py` | passed |

## Not done

- **No real answers were collected** for the new cases. A scored run on `s5-ad-cases-v3` would cost about 12 cents for 24 grounded questions (the adapter's estimate) and needs the owner's approval and a request cap; a GK run on GK-07 also needs approval. Until then the status column above is the recorded status, not a new measurement.
- **Exact wording of the Pixel 9 question was not recorded.** GK-07 uses a reconstruction ("What processor does…"), based on the recorded answer about the chip.
- **TC-22 is asked unscoped and names the product.** The #88 question was asked on the iPhone 15 page (scoped, "it"); the adapter has no scope option, so the case spells out the gadget.
