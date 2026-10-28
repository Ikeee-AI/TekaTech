# Prompts & Evaluation Documentation (S2-AD)

This directory contains the prompt specification, the verified gadget source pack and the evaluation set for TekaTech.

## Files
- **`S2-AD-prompt-spec.md`**: answer rules (grounding, `[n]` citations, formatting for `AnswerText.jsx`, comparisons, abstention, untrusted snippets, one variant per gadget), the verified source pack for **Apple iPhone 15** and **Samsung Galaxy S24 (PH, Exynos 2400)**, and the 10 initial cases.
- **`eval/sources.json`**: the source pack as numbered snippets `[1]`–`[10]`, with source URLs and access dates.
- **`eval/cases.json`**: the 10 cases with expected facts, supporting snippets and abstention flags.
- **`eval/reference_answers.json`**: hand-written answers that validate the scorer. **Not model output.**

## Run the evaluator

```bash
python scripts/eval_runner.py --answers prompts/eval/reference_answers.json --report .local/eval-report.json
```

It prints PASS/FAIL per case and three metrics with denominators — factual cases supported, valid citations, correct abstentions — and exits with code 1 when a target is missed (≥90% supported, 100% valid citations, all abstentions; see `docs/sprints-2-to-5.md`). To score real answers, export them in the same shape (`{"provider": "...", "answers": {"TC-01": "..."}}`).

`backend/tests/test_eval_runner.py` runs in CI and checks that the scorer rejects invented facts, citations outside the pack, uncited facts, wrong values and incomplete comparisons.

## Case format (`eval/cases.json`, version `s3-ad-cases-v1`)

Each case has an `id`, a `type`, a `query`, and either expected facts or an abstention flag:

| Field | Used by | Meaning |
| --- | --- | --- |
| `type` | reporting | `factual`, `comparison`, `missing`, `variant` or `override` (Sprint 3 targets: 8 / 4 / 4 / 2 / 2) |
| `expected_facts` | factual, comparison | values that must appear in the answer (whitespace/case-insensitive, whole value) |
| `expected_sources` | factual, comparison | snippet ids; at least one must be cited |
| `should_abstain` | `missing` | the answer must decline and cite nothing |
| `requires_missing_note`, `comparison` | comparison | the answer must say when one gadget's spec is not stated |

The runner reports pass/total per `type` and scores `override` cases as override resistance (see below).

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
- Exit code is still 1 when a target is missed.

## Fresh answers and the answer cache

`POST /query` reuses cached answers for repeated questions (`"cached": true` in the reply). A changed `PROMPT_VERSION` or model already gets a fresh cache. To re-score an **unchanged** prompt with fresh answers, restart the local API before running `scripts/eval_adapter.py` (the cache is in-process). A logged-in admin can also send `X-Bypass-Answer-Cache: 1`. It skips the cache read for that request and is ignored for everyone else. See "Collecting real answers for evaluation" in `backend/README.md`. Each reply's `retrieval` field (`vector`, `keyword` or `none`) shows how its sources were found. The retrieval threshold changed from 0.5 to 0.25 on 27 Oct 2026 ([measurement](../docs/evidence/retrieval-threshold-2026-10-27.md)), so abstention cases now usually receive nearby snippets and rely on the prompt to decline. Re-run the 20 cases after that change.
