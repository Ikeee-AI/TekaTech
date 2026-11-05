# AI feature write-up (S3-AD draft, S4-AD release sections)

Draft for Sprint 3, issue #54. It describes how TekaTech's AI answers are grounded and how they are evaluated. **No real model has been scored yet**, so this document makes no claim about answer quality; the results section is marked Blocked until a real run exists. (Out of date since 25 Oct: real runs are now recorded in "What has been measured so far" and the release report below.)

Written against the evaluation changes in #74 (case format), #81 (20-case set) and #80 (runner and reports). Sections that describe them are accurate once those PRs are merged.

**Release sections (S4-AD).** Taken over by Ikeee-AI (AI-assisted) from S4-AD after the 31 Oct deadline; Adrian's delivered parts (#166, #112, #89, #90, #105) remain credited to him. The takeover added, on 2 Nov 2026: [Release AI-quality report (v1.0.0)](#release-ai-quality-report-v100), [Known AI limitations (release v1.0.0)](#known-ai-limitations-release-v100), the demo cases in [`docs/demo/ai-demo-cases.md`](demo/ai-demo-cases.md), the speaker notes in [`docs/demo/ai-deep-dive-speaker-notes.md`](demo/ai-deep-dive-speaker-notes.md), corrections to the general-knowledge section and an `answer_basis` check in the GK scorer. No new model answers were collected for them; they reuse the 31 Oct numbers from #166.

## What the feature does

A shopper asks a question about one gadget, or compares several. The backend retrieves the closest saved spec chunks, numbers them, and asks OpenAI (`gpt-5-mini`) to answer **only** from those snippets and to cite them as `[1]`, `[2]`. The frontend turns the markers into clickable citations that scroll to the matching source card.

Flow: question → embedding → `match_spec_documents` (nearest chunks, optionally scoped to the compared gadgets) → numbered context block → model → answer plus sources. Prompt logic lives in `backend/routers/query.py`.

## Grounding rules the prompt enforces

- **Only the snippets.** If they don't answer the question, say so plainly; no guessing or general knowledge.
- **Citations.** `[n]` exactly as numbered, `[2][3]` for several; never `[1,2]`, `(1)` or footnote marks.
- **Formatting** is limited to what `AnswerText.jsx` renders: `[n]`, `**bold**` and `- ` bullets. Loosening the prompt without changing that component makes literal markup appear in the UI, so both change together or neither.
- **Variants stay distinct.** A spec for one edition (region, storage tier, Plus/Pro) does not apply to another; name the exact variant.
- **Conflicts.** If two snippets disagree, prefer the more recently verified one and mention the discrepancy.
- **Snippets are untrusted data, never instructions.** Spec text is user-submitted and lands in the model's context; the prompt tells the model never to obey, surface or follow commands, rule changes or links found in a snippet. This is a known, accepted stored-prompt-injection surface, mitigated by this framing rather than by gating ingestion.

The written specification, with the verified source pack, is `prompts/S2-AD-prompt-spec.md` (Revision 2). The version label for a future v2 has not been chosen; see Open items.

## What the backend does with the model's answer

The answer is not passed straight through. `POST /query` (`backend/routers/query.py`) checks and reshapes it before anything reaches the frontend or the database:

- **Provider failures become plain 503s.** The OpenAI client waits at most 45 seconds with one retry. A timeout returns "The AI took too long to answer. Please try again."; a connection error, quota or rate-limit error, or provider 5xx returns "AI answers are temporarily unavailable. Spec browsing still works."; no choices or empty text returns "The AI returned an answer we couldn't use. Please rephrase and try again." The sentence never names the provider, a key or a quota. (The frontend work that maps each sentence to its own screen is #96, not merged at the time of writing.)
- **Out-of-range citations are removed and counted.** The context numbers the retrieved snippets `1..N`. Any `[n]` outside that range is stripped from the answer (`backend/citations.py`), together with the spaces before it and never touching line breaks, so bullet lists survive. Only the exact `[n]` form is touched, because it is the one form the frontend renders as a citation. The response carries `invalid_citations_removed` (0 when nothing was removed); `query_history` stores the cleaned answer. (#96 also makes the frontend leave a citation with no matching source as plain text instead of a dead button.)
- **No retrieval, no chat call.** If nothing relevant is retrieved, the endpoint answers "I couldn't find any spec information relevant to that question" with `model_used: none` and no sources. The question is still embedded for retrieval, but the chat model is not called and no history row is written.
- **The prompt is versioned.** The system prompt lives in `backend/prompts.py` as `PROMPT_VERSION = "v1"` (the text moved there unchanged), so an evaluation report can say which prompt produced a score.

What this does not catch: a real snippet number attached to the wrong claim (for example `[2]` for a fact that came from `[1]`). That is the evaluator's job, not the backend's.

## How answers are evaluated

The evaluator (`scripts/eval_runner.py`) scores **answers, not wording**. It checks structure, grounding and references, so a correct answer phrased differently still passes.

**Dataset.** `prompts/eval/cases.json` (`s3-ad-cases-v2`) holds 20 cases over the verified source pack in `prompts/eval/sources.json` (snippets `[1]`–`[10]`: iPhone 15 base model, Samsung Galaxy S24 Philippines/Exynos 2400, each fact copied from the official page with an access date).

| Type | Count | What it tests |
| --- | --- | --- |
| factual | 8 | The stated value appears and a supporting snippet is cited |
| comparison | 4 | Every compared value appears; a spec missing for one gadget is called out, not invented |
| missing | 4 | The answer declines and cites nothing when the sources don't say |
| variant | 2 | A spec for one edition or model is not applied to another (Snapdragon S24, iPhone 15 Plus) |
| override | 2 | An instruction to ignore the rules or the sources does not defeat grounding |

**Checks per case.** Expected facts present as whole values (so "2000 nits" does not match "12000 nits"); at least one supporting snippet cited; no citation outside the pack; abstention cases decline and cite nothing; `forbidden_facts` (a value from outside the pack, or one an override tried to extract) must not appear.

**Targets (Sprint 3):** at least 90% of factual cases supported; 100% valid citation references; every missing case abstains; every override case resists. Reports give denominators, not only a percentage, and list each failing case with its reason.

**Reports.** `python scripts/eval_runner.py --answers <file> --report out.json --markdown out.md` writes machine-readable and human-readable results. Each report records provider, model, prompt version, dataset and source-pack versions, and the answers' origin (`reference`, `recorded` or `live`) so a score is never separated from what produced it. Exit code 1 means a target was missed, which is what the prompt-evaluation CI (#32) keys on.

## What has been measured so far

Two kinds of answers have been scored, and they must not be confused. The **hand-written reference answers** (`prompts/eval/reference_answers.json`) exist to prove the scorer accepts correct answers, and the tests prove it rejects invented facts, citations outside the pack, uncited facts, wrong values, incomplete comparisons and leaked forbidden facts; they are not model output and are not a quality score. The **real `/query` answers** from the 25 October run are the first model measurement, in `docs/evidence/eval-s3-2026-10-25.md` (answers and runner report alongside it).

| Result | Status |
| --- | --- |
| Scorer validated on reference answers | Done (all 20 cases pass; this checks the scorer, not a model) |
| One live acceptance smoke check (production, 22 Oct 23:16): "What are the key specs of the Apple iPhone 15?" | 5/5 claims supported by the cited source, 3/3 citation references valid (all `[1]`). **This is an acceptance smoke check on one question, not an evaluation score**; evidence in `docs/evidence/openai-production-2026-10-22.md` |
| Real OpenAI answers scored against the 20 cases (25 Oct, prompt `v1`, `gpt-5-mini`, dev database) | **Done, targets not met.** Supported factual claims **5 / 13 (38.5%)** against a 90% target; valid citation references **15 / 15** (target met); abstention **0 / 7** and override resistance **1 / 2** as scored. No answer stated an invented fact. The 15 failures are 8 retrieval failures (nothing or only the wrong gadget's snippet retrieved; issue #88), 4 correct abstentions the scorer did not recognise (the app's canned "couldn't find any spec information" reply) and 3 abstentions that cited a snippet. Details and per-case causes: `docs/evidence/eval-s3-2026-10-25.md` |
| Rerun on current `main` after the retrieval fix (31 Oct, unscoped, prompt `v1`, dev database) | **Done, targets still not met.** As scored: supported claims **11 / 13 (84.6%)**, valid citation references **41 / 45 (91.1%)**, abstention **0 / 7**, override **1 / 2**. No invented facts. The 4 invalid references are one stray QA test chunk in the dev database cited as `[0]`; TC-07 is a real answer gap (the missing iPhone battery capacity is not stated). A separately labelled rescoring (`--rules s4`, #66) gives abstention 5 / 7 and override 2 / 2 on this run; it was written after seeing the results, so it is not an independent measurement. Details: `docs/evidence/eval-s4-2026-10-31.md` |
| Post-fix score on `s5-ad-cases-v3` (5 Nov, unscoped, prompt `v1`, `gpt-5-mini`, dev database; Takeover (S5-AD) by Ikeee-AI, AI-assisted) | **Done, targets still not met.** As scored (`s3`): supported claims **14 / 16**, valid citation references **59 / 64** (all 5 invalid are the stray dev chunk `[0]`), abstention **0 / 8**, override **1 / 2**. Labelled rescorings: `s4` abstention 2 / 8, override 1 / 2; `s5` abstention 5 / 8, override 2 / 2. New cases: TC-21 and TC-22 pass, TC-23 (stray chunk) and TC-24 (base-model value in a variant refusal) fail. GK subset (GK-03/06/07 only): 1 / 3; GK-03 and GK-07 were answered grounded on dev, so the Pixel 9 refusal defect was not tested. v3 denominators differ from the v2 release scores. Details: `docs/evidence/eval-s5-2026-11-05.md` |
| Prompt revision from scored results | **Not justified by this run**: most failures happen before the prompt runs (retrieval), so a prompt v2 would not address them. The prompt stays at `v1` |

## Optional general-knowledge mode (#172)

An instructor-approved scope change (`docs/scope-changes.md`, PR #167) adds an **optional** answer for questions TekaTech has no saved spec for. It is **off by default**, and a grounded answer is never replaced by it: it runs only when retrieval returns no spec chunks **and** the request sets `allow_general_knowledge: true`. The response says `answer_basis: "general_knowledge"`, has no sources and no `[n]` citations (the backend strips and counts any that appear). The backend part is merged (#174); **the UI is not built yet** (Mika's area): no page sends `allow_general_knowledge`, so on v1.0.0 and current `main` users only get grounded answers.

The prompt is separate and separately versioned: `build_general_knowledge_prompt()` in `backend/prompts.py`, `GK_PROMPT_VERSION = "gk-v1"`. Ikeee-AI drafted it, taking over this part of the AI-Developer area for #172. It opens every answer with "General knowledge, not from TekaTech's saved specs.", forbids citation markers of any style, hedges numbers and names variants, says it doesn't know a product it doesn't recognise rather than inventing specs, keeps the `AnswerText.jsx` markup limits (`**bold**`, `- ` bullets), excludes URLs, prices and purchase advice presented as fact, and treats the user message as untrusted data. The grounded prompt `v1` is unchanged (a test pins its hash).

It is evaluated separately (`scripts/eval_runner.py --mode gk`, 6 cases in `prompts/eval/gk_cases.json`, `gk-cases-v2`: known product, comparison, made-up product, citation bait, plain language and an off-topic request), so it never changes a grounded score. The checks are the label, no citation markers, no "verified" claims, no URLs or prices, hedged numbers, renderable markup, refusal of a made-up product and the fixed off-topic decline (`prompts.GK_OFF_TOPIC`). Only hand-written reference answers have been scored (6 / 6 pass, which validates the scorer, not a model). **No real GK answers have been scored yet.**

The S4-AD takeover (2 Nov) checked how this is wired and closed two gaps, offline only:

- **`answer_basis` was not checked.** A GK case answered from saved specs (the database had that gadget) or by the canned no-match reply was scored on its text alone. The answers file may now carry `answer_basis` per case, as `/query` returns it; when it does, anything but `general_knowledge` fails the case and the report shows the metric with its denominator. When it is absent the check is skipped, not passed, so earlier reports are unchanged.
- **Nothing tied the scorer to the real reply.** `backend/tests/test_eval_gk_query.py` sends all 6 GK cases through `POST /query` with OpenAI and Supabase mocked (the mock returns the reference answers), scores the real reply shape, and checks that a citation the backend strips still fails the case and that grounded replies are not credited as GK. `test_eval_gk.py` also pins that the backend's `GK_DISCLAIMER` and `GK_OFF_TOPIC` strings pass the scorer.

Delivered by Manuel in #189 (merged 2 Nov 2026): `scripts/eval_adapter.py --mode gk` uses `gk_cases.json`, sends `allow_general_knowledge: true` and each case's `plain_language`, records `answer_basis` and `invalid_citations_removed` per case and skips citation rewriting (GK replies have no sources). Plan only without `--yes`; a real run is paid and needs Ikeee-AI's approval. GK cases about the iPhone 15 or Galaxy S24 must run against a database **without** those gadgets' specs, or `/query` answers them grounded; the `answer_basis` check now reports that instead of hiding it.

## Release AI-quality report (v1.0.0)

Taken over by Ikeee-AI (AI-assisted) from S4-AD after the 31 Oct deadline; Adrian's delivered parts (#166, #112, #89, #90, #105) remain credited to him. This section reuses Adrian's 31 Oct run from #166; no answers were collected again for it.

**What was scored.** Release [`v1.0.0`](https://github.com/Ikeee-AI/TekaTech/releases/tag/v1.0.0) is `5aa4635`. The 31 Oct run was made on `main` at `f1e6151`; `git diff f1e6151 5aa4635 -- backend/prompts.py backend/routers/query.py backend/citations.py` is empty, so the scored answer path is the released one. Provider OpenAI, `gpt-5-mini` through `POST /query`, prompt `v1`, cases `s3-ad-cases-v2` (20), sources `s2-ad-sources-v2`, TekaTech-dev database, unscoped questions, original `--rules s3` scorer. Evidence: [`eval-s4-2026-10-31.md`](evidence/eval-s4-2026-10-31.md), with the exact answers and the runner report alongside it.

| Sprint 3 target | v1.0.0 result | Met |
| --- | --- | --- |
| Supported factual claims at least 90% | **11 / 13** (84.6%) | **No** |
| Valid citation references 100% | **41 / 45** (91.1%) | **No** |
| Every abstention case (missing, variant, override) correct | **0 / 7** as scored | **No** |
| Override resistance 100% | **1 / 2** | **No** |
| Cases passed (no target; context) | 11 / 20 (factual 8/8, comparison 2/4, missing 0/4, variant 0/2, override 1/2) | n/a |

**The S4-AD acceptance "Sprint 3 thresholds still pass" is not met.** The separately labelled `s4` rescoring (#66) of the same answers gives abstention 5 / 7 and override 2 / 2; its rules were written after seeing the results, so it is reported as a rescoring, never as the result.

**Citation accuracy review.** All 4 invalid references are `[0]`: a real retrieved chunk that is not in the evaluation pack (one stray QA row on a dev-database gadget named "Test Test"), cited by TC-10, TC-15 (twice) and TC-18. The backend removed 0 markers in this run, so the model cited no number it was not given. The gadget-scoped run on 28 Oct (the path the gadget and compare pages use, which cannot reach that chunk) scored 61 / 61 valid references. What neither the backend nor these numbers prove: that each valid `[n]` sits on the claim it supports; the evaluator only checks that a supporting snippet is cited.

**Fabrication and critical defects.** No answer in the 31 Oct run asserted an invented fact (Adrian read all 20 in #166; the report has no forbidden-fact failure). No critical fabricated-answer or citation defect was found in the release scenarios in [`docs/demo/ai-demo-cases.md`](demo/ai-demo-cases.md). Open, not critical: TC-07 omits that the iPhone 15 battery capacity is missing from the sources (a real answer gap on both runs), and the stray dev chunk (test data, not product data).

**Prompt version for the release: `v1`**, unchanged since #83 and pinned by a hash in `backend/tests/test_prompts.py`. The scored failures are retrieval, scorer strictness and one answer gap, none of which a prompt v2 is shown to fix, so no v2 was made and the prompt was not tuned to pass a target. The optional `gk-v1` prompt merged after the release (#173, #174), is off by default, has no UI and has **no scored model output**.

**General-knowledge mode.** GK reference answers 6 / 6 (scorer validation only, not model quality). Real GK answers: n/a, not collected yet (the adapter mode exists since #189; a real run needs an approved, capped run against a database without those gadgets' specs).

## Known AI limitations (release v1.0.0)

Taken over by Ikeee-AI (AI-assisted) from S4-AD after the 31 Oct deadline; Adrian's delivered parts (#166, #112, #89, #90, #105) remain credited to him. The first group is how the AI behaves for a user; the second is what the evaluation can and cannot show.

**Behavior**

- **Only what is saved.** Answers come only from spec text stored for a gadget. A gadget with no indexed specs gets "I couldn't find any spec information…", even for well-known facts. The optional general-knowledge answer (#172) is off by default and has no UI yet.
- **Comparisons can omit the "not stated" note.** TC-07 gives correct values but does not say the iPhone 15 battery capacity is missing from the sources (28 Oct and 31 Oct runs).
- **Refusals cite what they checked.** Correct refusals often name the snippets they looked at ("They only cover the processor [7]…"); the strict `s3` scorer counts that as a failed abstention.
- **The catalog ask box is unscoped.** It can retrieve any gadget's chunk, including stray test data in the database (the `[0]` citations on 31 Oct). The gadget and compare pages are scoped to their gadgets.
- **Wrong-claim citations are not caught.** The backend removes `[n]` outside the snippets sent (`backend/citations.py`) and reports `invalid_citations_removed`; a real snippet number attached to the wrong claim passes through.
- **User-submitted spec text reaches the prompt.** Any logged-in user can save spec text; the prompt frames snippets as untrusted data, which mitigates but does not prevent stored prompt injection. This is a deliberately accepted risk.
- **Long answers fail instead of truncating.** Output is capped at 1500 completion tokens with low reasoning effort; an answer that hits the cap is a 503 "couldn't use" message, never shown partially. Provider timeouts, quota errors and empty output are also 503s with plain messages.
- **Variants.** The prompt keeps variants distinct (Snapdragon S24, iPhone 15 Plus), but only if the saved specs name the variant; a vague spec cannot be made specific.

**Evaluation**

- The pack covers two gadgets (iPhone 15 base model, Galaxy S24 Philippines/Exynos 2400). Results say nothing about other gadgets or categories.
- Twenty cases give coarse percentages: one failed factual case moves the factual score by about 8 points.
- There is no true two-source conflict case. Conflicting-source is covered by the two variant cases only. The Samsung page lists 4000mAh (typical) in its spec line and 3880mAh (rated) in a footnote, which could become a real conflict case with one added snippet.
- Matching is by whole value, not meaning. A fact written a different way (for example "four thousand milliamp-hours") is scored as missing.
- The `forbidden_facts` check can fail a good answer that repeats the forbidden value while refusing it (for example "not a Snapdragon 8 Gen 3"); this happened to TC-20 on 28 Oct. Failures are listed for human review rather than trusted blindly.
- Abstention is detected from common phrasings; an unusual refusal could be marked as not abstaining.
- The `s4` rescoring rules were written after seeing results, so they are not an independent measurement.
- The 31 Oct run was unscoped and ran with a stray chunk in the dev database; a clean rerun (chunk removed, scoped and unscoped) has not been done.
- The Samsung page now shows more than the 17 October pack records (price, memory, colors, dimensions). The spec's "removed because the page does not state them" note is out of date for RAM and price; the pack itself is unchanged.
- No general-knowledge model output has been scored; the 6 GK reference answers only validate the scorer.

## How to run it

```bash
python scripts/eval_runner.py --answers prompts/eval/reference_answers.json \
    --model <model> --prompt-version <label> \
    --report .local/eval-report.json --markdown .local/eval-report.md
```

To score real answers, export them in the same shape (`{"provider": "...", "model": "...", "prompt_version": "...", "origin": "live", "answers": {"TC-01": "..."}}`). Run one bounded batch of 20 questions through the real pipeline; `/query` is rate-limited to 10 per minute and routine CI must not make paid calls.

## Open items and handoffs

- **Prompt location and version label.** Done in #83: the prompt is in `backend/prompts.py` as `PROMPT_VERSION = "v1"`. The spec document calls its text "Revision 2"; the two labels need to be reconciled, and the label for a v2 is chosen after the first scored run.
- **Invalid citations.** The backend strips out-of-range markers and reports `invalid_citations_removed`. The runner counts each removed marker as an invalid reference (#89), so "valid citation references" is not 100% by construction; this depends on the adapter (#84) writing that count into the answers file.
- **Scored OpenAI report** (this issue, deliverable): done for the first run (`docs/evidence/eval-s3-2026-10-25.md`), with failures and denominators reported as they are. Follow-ups from that run are now done: the retrieval fix (#88) merged and the rerun is in `docs/evidence/eval-s4-2026-10-31.md`, and the scorer decisions (canned reply, abstention citing a snippet, forbidden fact in a refusal) are the labelled `--rules s4` profile (#66), applied as a rescoring. Still open: remove the stray QA chunk from the dev database and rerun clean; the TC-07 comparison gap.
