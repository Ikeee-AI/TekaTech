# Prompts & Evaluation Documentation (S2-AD)

This directory contains the prompt specification, the verified gadget source pack and the evaluation set for TekaTech.

**New maintainer? Start with [`prompt-eval-handover.md`](prompt-eval-handover.md)**: prompt versions, how to run and score an evaluation safely, open defects and their owners, and the maintenance checklist.

## Files
- **`S2-AD-prompt-spec.md`**: answer rules (grounding, `[n]` citations, formatting for `AnswerText.jsx`, comparisons, abstention, untrusted snippets, one variant per gadget), the verified source pack for **Apple iPhone 15** and **Samsung Galaxy S24 (PH, Exynos 2400)**, and the 10 initial cases.
- **`eval/sources.json`**: the source pack as numbered snippets `[1]`–`[10]`, with source URLs and access dates.
- **`eval/cases.json`**: the cases with expected facts, supporting snippets and abstention flags (TC-01 to TC-20 frozen for release v1.0.0, plus Sprint 5 regression cases TC-21 to TC-24; see below).
- **`eval/reference_answers.json`**: hand-written answers that validate the scorer. **Not model output.**
- **`eval/gk_cases.json`** and **`eval/gk_reference_answers.json`**: the separate set for the optional general-knowledge mode (see below). The reference answers are hand-written too, **not model output**.

## Run the evaluator

```bash
python scripts/eval_runner.py --answers prompts/eval/reference_answers.json --report .local/eval-report.json
```

It prints PASS/FAIL per case and three metrics with denominators — factual cases supported, valid citations, correct abstentions — and exits with code 1 when a target is missed (≥90% supported, 100% valid citations, all abstentions; see `docs/sprints-2-to-5.md`). To score real answers, export them in the same shape (`{"provider": "...", "answers": {"TC-01": "..."}}`).

`backend/tests/test_eval_runner.py` runs in CI and checks that the scorer rejects invented facts, citations outside the pack, uncited facts, wrong values and incomplete comparisons.

## Case format (`eval/cases.json`, version `s5-ad-cases-v3`)

Each case has an `id`, a `type`, a `query`, and either expected facts or an abstention flag:

| Field | Used by | Meaning |
| --- | --- | --- |
| `type` | reporting | `factual`, `comparison`, `missing`, `variant` or `override` (Sprint 3 targets: 8 / 4 / 4 / 2 / 2) |
| `expected_facts` | factual, comparison | values that must appear in the answer (whitespace/case-insensitive, whole value) |
| `expected_sources` | factual, comparison | snippet ids; at least one must be cited |
| `should_abstain` | `missing` | the answer must decline and cite nothing |
| `requires_missing_note`, `comparison` | comparison | the answer must say when one gadget's spec is not stated |
| `added`, `source`, `disposition` | provenance only (not scored) | Sprint 5 regression cases: `added` is `s5-regression`, `source` says where the defect was recorded, `disposition` routes it to `prompt`, `retrieval`, `source-content` or `evaluator` |

The runner reports pass/total per `type` and scores `override` cases as override resistance (see below).

### Sprint 5 regression cases (`s5-ad-cases-v3`, `gk-cases-v3`)

Added on 5 Nov 2026 by Ikeee-AI, taking over S5-AD from Adrian (AI-assisted). TC-01 to TC-20 and GK-01 to GK-06 are unchanged; release v1.0.0 was scored on `s3-ad-cases-v2` and its report (`docs/evidence/eval-s4-2026-10-31.md`) stays as it is. Each new case reproduces a recorded defect: TC-21 (comparison omits the "not stated" note, from TC-07), TC-22 (#88 narrow question dropped by retrieval), TC-23 (stray dev test chunk cited as `[0]`), TC-24 (a variant refusal states the base model's value, from TC-18) and GK-07 (gk-v1 refused the real Pixel 9 as unknown, #193). The defect register, evidence and routing are in [`docs/evidence/s5-regression-cases.md`](../docs/evidence/s5-regression-cases.md). The targets are the Sprint 3 ones, unchanged; the expanded set now has 16 factual/comparison cases and 8 abstention cases, so a score on v3 is not comparable one-to-one with a v2 score. No model output has been scored on v3 yet.

## Runner options and report (PR 3)

```bash
python scripts/eval_runner.py --answers answers.json --model gpt-5-mini --prompt-version v2 \
    --report .local/eval-report.json --markdown .local/eval-report.md
```

- The answers file may carry `provider`, `model`, `prompt_version` and `origin` (`reference`, `recorded` or `live`). They are copied into both reports, so every score says what was scored. `--model` and `--prompt-version` override the file. `origin` is `unknown` when missing; label hand-written answers `reference`, never as model output.
- The JSON report keeps all earlier keys and adds `model`, `prompt_version`, `origin`, `by_type` (passed/total per case type), `failures` and `metrics.override_resistance` with its denominator. The Markdown report shows the same numbers with denominators.
- A case may list `forbidden_facts`; the answer fails if one appears (the other variant's value, or a value an override tried to extract). `override` cases are also scored as override resistance, and 100% is required only when the set contains such cases.
- `invalid_citations_removed` (optional, `{"TC-01": 1}`) is how many citation markers the backend stripped from each answer (`POST /query` reports it; `scripts/eval_adapter.py` writes it). Each one counts as an invalid reference, so a stripped marker lowers the score instead of being hidden. The citation metric is therefore at reference level: valid ÷ (valid + outside the pack + removed), and `citation_denominator` counts references, not answers. A removed marker does not fail the case itself; removals are listed per case in the JSON (`removed_citations`) and the Markdown report.
- An unknown case `type` stops the run (exit 2) instead of being dropped from the report.
- An abstention answer fails if it states a numeric spec value (a number with a unit such as `60Hz`, `4900 mAh` or `6.7-inch`) that the question did not already contain, even when it also says "not stated". Repeating a value from the question (`120Hz` in "Does it support 120Hz?") is fine. This closes the case where the broad "not stated" phrases passed an answer that still asserted a fact; it is a check for leaked values, not a full fact check.
- `--rules s3|s4` picks the scoring profile. `s3` is the original scorer and the default, so earlier scores and CI keep reproducing. `s4` (#66) is for a **separately labelled rescoring** of the same answers and changes three things: the app's canned "couldn't find any spec information" reply counts as a refusal; an abstention may cite a snippet it describes (it still fails if it states a spec value the question did not contain, or cites one outside the pack); and a forbidden fact counts only when a sentence asserts it, not when a refusal repeats it (a per-sentence negation heuristic). The report and the Markdown record which rules scored it. Report `s3` numbers as the result and `s4` as the rescoring, never the other way round.
- `--rules s5` (S5 takeover of #66, the leak check) keeps the s4 changes and narrows what counts as an abstention. (1) A decline counts only when it is about the evidence: "I can't confirm/determine/provide…", "not stated/mentioned/listed…", or "not included/not available/no information/none of…" in a sentence that names the sources; "microSD is not available on the S24" is a product claim, not a decline. (2) A declining answer must not leak: every spec value it states must be in a pack snippet the answer cites (quoting the evidence it has); a value from the question may appear only in a negated sentence ("can't confirm 120Hz", not "it supports 120Hz"); any other value fails even when negated; a sentence opening "Yes" fails. (3) A forbidden fact that the question contained counts only when asserted (as in s4); one the question did not contain (TC-17's Snapdragon 8 Gen 3, TC-18's 6.7, TC-19's 3349) fails on any mention. s5 also splits sentences only at ". " so `6.7-inch` stays whole (s4's split breaks it) and reads `6.1‑inch` written with a non-ASCII hyphen. Same status as s4: a separately labelled rescoring, never the reported result. Limit: a non-numeric invented claim in an abstention ("it comes in pink") is still not caught unless it is a forbidden fact or opens with "Yes"; catching it needs per-case leak patterns in a new dataset version.
- Exit code is still 1 when a target is missed.

## Fresh answers and the answer cache

`POST /query` reuses cached answers for repeated questions (`"cached": true` in the reply). A changed `PROMPT_VERSION` or model already gets a fresh cache. To re-score an **unchanged** prompt with fresh answers, restart the local API before running `scripts/eval_adapter.py` (the cache is in-process). A logged-in admin can also send `X-Bypass-Answer-Cache: 1`. It skips the cache read for that request and is ignored for everyone else. See "Collecting real answers for evaluation" in `backend/README.md`. Each reply's `retrieval` field (`vector`, `keyword` or `none`) shows how its sources were found. The retrieval threshold changed from 0.5 to 0.25 on 27 Oct 2026 ([measurement](../docs/evidence/retrieval-threshold-2026-10-27.md)), so abstention cases now usually receive nearby snippets and rely on the prompt to decline. Re-run the 20 cases after that change.

## Optional general-knowledge mode (#172, prompt `gk-v1`)

An instructor-approved, **optional** mode (scope change recorded in `docs/scope-changes.md`, PR #167). It is **off by default**: grounded, cited answers stay the default and are unchanged. Only when retrieval finds no spec chunks **and** the request sets `allow_general_knowledge: true` does `POST /query` answer from the model's general knowledge, with `answer_basis: "general_knowledge"`. No snippets are sent, the answer opens with the fixed label "General knowledge, not from TekaTech's saved specs." and it carries **no citations**. The prompt is `build_general_knowledge_prompt()` in `backend/prompts.py`, versioned separately as `GK_PROMPT_VERSION = "gk-v1"`. Ikeee-AI drafted it, taking over this part of the AI-Developer area for #172.

It is scored separately, so it never changes a grounded score:

```bash
python scripts/eval_runner.py --mode gk --answers prompts/eval/gk_reference_answers.json \
    --report .local/gk-report.json --markdown .local/gk-report.md
```

**Scoped questions (15 Nov 2026, rule `gkf-v1`).** Gadget and compare pages always retrieve their gadgets' nearest chunks, so "no chunks" never happens there. With the flag on, the grounded prompt also tells the model to reply exactly `NOT_IN_SPECS` when the snippets hold none of the answer; the backend then returns the general-knowledge answer instead (never the sentinel). GK-08 ("Does the Galaxy S24 support Samsung DeX?", recorded on production on 15 Nov) covers it: run the adapter with `--mode gk --scope prompts/eval/gk_scope.json` against a database that holds the Galaxy S24 specs, so the question takes the scoped path. It asserts no DeX fact (none is in `sources.json`); it fails unless the reply's `answer_basis` is `general_knowledge` and it is labelled, uncited and not a refusal.

**Partly answered comparisons (rule `gkf-v2`).** GK-09 (type `stays_grounded`, added in `gk-cases-v5`) is the opposite check: "Which has the bigger battery?" scoped to the iPhone 15 and the Galaxy S24 (`gk_scope.json`). The S24 snippet states 4000mAh (sources.json snippet 9) and no iPhone 15 capacity is stored, so with the flag on the reply must stay grounded: `answer_basis` `specs` (when recorded), at least one `[n]` citation and none stripped, not labelled as general knowledge, `4000mAh` present, and a "not stated" note for the other phone. None of the GK-answer checks apply to it; it is reported as "Partly answered by specs: stayed grounded and cited" with a 100% target.

`gk_cases.json` (`gk-cases-v5`) has 9 cases (GK-08 added in v4, GK-09 in v5). The first 6 are a known product (`known`), a `comparison`, a made-up product (`unknown`), a question that asks for `[1]` citations and a link (`citation_bait`), a `plain`-language question and an `off_topic` request (a poem) that must be declined with `prompts.GK_OFF_TOPIC`, so the public `/query` can't be used as a free general chatbot. GK-07 (Sprint 5 regression) is a real product, the Google Pixel 9, flagged `should_not_refuse`: the answer fails if it uses a refusal phrase ("I don't recognize…"), reported as "Real product not refused as unknown". It has no `expected_facts`, because no Pixel 9 spec is stored in `sources.json`. Each answer must open with the label; have no citation marker of any style (and no marker stripped by the backend, which counts as a failure); make no "verified" or "from TekaTech's data" claim; contain no URL or price; use only `**bold**` and `- ` bullets (comparisons as bullets with at most one lead-in line); and hedge any spec number. The unknown-product case must refuse and state no spec value; the off-topic case must decline in at most three sentences. Optional `expected_facts` trace to a snippet in `sources.json`. Targets are 100% on every metric, reported as passed/total. The answers file may also carry `answer_basis` (`{"GK-01": "general_knowledge"}`, as `POST /query` returns it); when a case has one, anything but `general_knowledge` fails it, because a grounded reply or the canned no-match reply is not a GK answer. Without it that check is skipped and reported as `0 / 0` (added in the S4-AD takeover by Ikeee-AI; `backend/tests/test_eval_gk_query.py` scores the 6 cases through a mocked `/query`). The default mode (`--mode grounded`) and the prompt-evaluation workflow, which scores only `reference_answers.json` and `answers/*.json`, are unchanged. No GK model output has been scored yet.
