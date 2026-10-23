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
- Exit code is still 1 when a target is missed.
