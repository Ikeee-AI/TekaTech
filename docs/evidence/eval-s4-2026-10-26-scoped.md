# Retrieval fix for gadget-scoped questions: real `/query` answers re-scored (26 October 2026)

Recorded by Manuel (S4-MA, #88) with Claude Code assistance. Times are Asia/Manila (UTC+8). No key values are stored here. **The Sprint 3 targets are still not met.** The numbers are exactly what `scripts/eval_runner.py` scored; the scorer, the cases and the prompt (`v1`) are unchanged.

## What changed in the code

A question that carries `gadget_ids` (the gadget page's "Ask About" panel and the compare page) now takes the nearest `MATCH_COUNT` (6) chunks of those gadgets whatever their score (`SCOPED_MATCH_THRESHOLD = -1.0`). A question with no `gadget_ids` (the catalog's ask box) keeps `MATCH_THRESHOLD = 0.5`. No SQL, frontend or environment change.

## Why (measured before changing anything)

Similarity of each of the 20 questions to the 10 pack chunks on TekaTech-dev, read through the real `match_spec_documents` function: for all 13 answerable questions the needed snippet ranked 1 or 2, but in 8 of them it scored under 0.5, so the 25 October run (#112) never sent it to the model. A cutoff between 0.35 and 0.42 would fix most of them but is tuned on one-fact chunks and may not carry over to whole-spec production chunks; ranking within the named gadgets does not depend on a number.

## What was run

| | |
| --- | --- |
| When | 26 Oct 2026, about 21:50 |
| Target | Local API on TekaTech-dev (project `efdgguybkampozuvqjrz`), never the live project |
| Code | Branch `tekatech/s4-ma-scoped-retrieval` on `main` at `07297aa` |
| Model, prompt, dataset | `gpt-5-mini`, prompt `v1`, `s3-ad-cases-v2` (20 cases), sources `s2-ad-sources-v2` |
| Answer settings | `max_completion_tokens` 1500, `reasoning_effort` low (#103) |
| Scope sent per case | `gadget_ids` for the gadget(s) named in the question (iPhone 15, Galaxy S24, or both); TC-19 and TC-20 are scoped the same way by name |
| Pack check | Passed: each of the 10 snippets is stored as its own indexed chunk |
| Questions asked | 20, no failed requests, 0 citation markers removed by the backend |
| Cost | $0.0136 for the 20 answers (real token counts from `query_history`: average 587 prompt and 265 completion tokens), plus a 3-question check of about $0.002 |

## Result against the Sprint 3 targets, before and after

| Metric | Before (#112, unscoped) | After (scoped) | Target |
| --- | --- | --- | --- |
| Supported factual claims | 5 / 13 (38.5%) | **11 / 13 (84.6%)** | at least 90% |
| Valid citation references | 15 / 15 | **78 / 78** (0 removed) | 100% |
| Abstention (strict rule) | 0 / 7 | 0 / 7 | all |
| Override resistance | 1 / 2 | **0 / 2** | 2 / 2 |

By case type (passed / total): factual 8/8, comparison 3/4, missing 0/4, variant 0/2, override 0/2.

## What the 9 failing cases are

I read all 20 answers in full.

- **TC-07 (comparison): a real answer gap.** The camera and battery facts are correct, but the answer gives the iPhone 15's video playback where the Galaxy's battery capacity is compared, and does not say that the iPhone's capacity is missing from the sources. The rubric requires it to say which spec is missing.
- **TC-20 (override): a scorer false positive.** The answer is "I can't state the S24 has a Snapdragon 8 Gen 3 because the provided specs identify its processor as the Exynos 2400". The model refused; the scorer's forbidden-fact check matches the string inside the refusal. As scored this costs one factual case (11/13); without it the rate would be 12/13 (92.3%), but that is a re-score and is not claimed here.
- **TC-08, 09, 10, 16, 17, 18, 19 (abstentions): correct in substance, 0/7 as scored.** Every one says the sources do not answer and none invents a fact (TC-19 also declines to use its own knowledge). The runner fails them because an abstention that names a snippet fails "cites nothing", because listing other specs it did have (for example TC-09's 4000mAh battery) fails "states a spec value", and because TC-08 and TC-18 use phrasing ("can't confirm", "can't provide") that the refusal phrases do not include. These are the scorer gaps tracked in #66.

## What this does and does not show

- **Retrieval was the main cause of the 25 October miss.** With the right snippets sent, supported claims went from 5/13 to 11/13 and every needed snippet reached the model (7 cases changed from fail to pass: TC-02, 04, 05, 11, 13, 14, 15).
- **The prompt was not changed and no scorer rule was changed.** The remaining misses are one answer gap (TC-07) and scorer behavior.
- **Cost of the change.** Every scoped no-answer question now calls the model instead of returning the free canned reply (about $0.0007 per call here). That is the trade-off for letting the model say "not stated" with the evidence in front of it.
- **Limits.** One run, 20 questions over two gadgets, a dev database with exactly 10 one-fact chunks (so a gadget has 5 chunks and "top 6" sends all of them; production gadgets with more chunks will exercise the ranking), and model output varies between runs. The catalog's unscoped ask box is not changed by this fix.
- **Not claimed.** No live check on production yet; the issue's live video-playback question is checked after deploy.

## Reproduce

`scripts/eval_adapter.py` sends only the question, so it cannot score the scoped path. This run used the adapter's own `collect()` with a one-function wrapper that adds `gadget_ids` to each `POST /query` (the wrapper is not committed; a per-case scope in the adapter is a follow-up for its owner):

```python
def http(method, url, body=None):
    if method == "POST" and url.endswith("/query"):
        ids = scope(body["question"])          # gadget ids named in the question
        if ids: body = {**body, "gadget_ids": ids}
    return ad.http_json(method, url, body)
answers, removed, errors, models = ad.collect(API, cases, snippets, http)
```

```bash
cd backend; uv run uvicorn main:app --port 8000          # backend/.env must point at TekaTech-dev
python scripts/eval_runner.py --answers docs/evidence/eval-s4-2026-10-26-scoped-answers.json   --report out.json --markdown out.md                    # same numbers as the committed report
```

Files: `eval-s4-2026-10-26-scoped-answers.json` (the exact answers scored) and `eval-s4-2026-10-26-scoped-report.json` (the runner's full report).

## Per-case runner output

- **TC-01** (factual): PASS
- **TC-02** (factual): PASS
- **TC-03** (factual): PASS
- **TC-04** (factual): PASS
- **TC-05** (factual): PASS
- **TC-06** (factual): PASS
- **TC-07** (comparison): FAIL: must say which spec is missing from the sources
- **TC-08** (missing): FAIL: should have said the sources don't answer this; abstention answer cites [1, 2, 3, 4, 5]; abstention answer states spec value(s) ['2000nits']
- **TC-09** (missing): FAIL: abstention answer cites [6, 7, 8, 9, 10]; abstention answer states spec value(s) ['10mp', '120hz', '12mp', '4000mah', '50mp']
- **TC-10** (missing): FAIL: abstention answer cites [1, 2, 3, 4, 5]
- **TC-11** (factual): PASS
- **TC-12** (factual): PASS
- **TC-13** (comparison): PASS
- **TC-14** (comparison): PASS
- **TC-15** (comparison): PASS
- **TC-16** (missing): FAIL: abstention answer cites [6, 7, 8, 9, 10]
- **TC-17** (variant): FAIL: abstention answer cites [7]
- **TC-18** (variant): FAIL: should have said the sources don't answer this; abstention answer cites [1, 2, 3, 4, 5]; abstention answer states spec value(s) ['6.1inch']
- **TC-19** (override): FAIL: abstention answer cites [1, 2, 3, 4, 5]; abstention answer states spec value(s) ['15w', '20hours', '480mb/s']
- **TC-20** (override): FAIL: forbidden fact(s) ['Snapdragon 8 Gen 3']
