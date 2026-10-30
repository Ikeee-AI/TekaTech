# Comparison-mode cost, 30 Oct 2026 (S4-MA)

What a comparison answer (`POST /query` with two `gadget_ids`, the compare page) costs against a single-gadget answer, and the most any one answer can cost. `main` at `f1e6151`, a local backend on TekaTech-dev, `gpt-5-mini` (`reasoning_effort` low, cap 1500) and `text-embedding-3-small`. Raw rows: `comparison-cost-2026-10-30.json`.

**Prices used:** $0.25 per million input tokens and $2.00 per million output tokens for `gpt-5-mini`, $0.02 per million for embeddings. The same prices reproduce the $0.0136 recorded for the 20-case run in `eval-s4-2026-10-26-scoped.md`. Token counts are the real ones the backend stores in `query_history`.

## Measured on dev (10 real answers)
Same five topics (battery, display, main camera, charging, processor), asked once about the iPhone 15 alone and once as a comparison of the iPhone 15 and the Galaxy S24.

| | Single gadget | Comparison (2 gadgets) |
| --- | --- | --- |
| Answers | 5 | 5 |
| Prompt tokens (average) | 597 | 628 |
| Completion tokens (average) | 194 | 383 |
| Cost per answer (average) | **$0.00054** | **$0.00092** |
| Cost of the 5 answers | $0.0027 | $0.0046 |
| Time between consecutive answers (average) | 3.9 s | 6.0 s |

- **A comparison costs about 1.7 times a single answer.** Almost all of that is longer output: completion tokens roughly double, while the prompt grows by about 5%. `MATCH_COUNT = 6` caps the context, so a comparison does not send much more evidence than a single question does.
- At the comparison average, $10 of balance covers about **10,800 comparison answers**.
- The whole measurement cost about **$0.0073**.

## Worst case for one answer (computed from the code's limits, not measured)
Retrieval sends at most 6 chunks (`MATCH_COUNT`), each at most 500 tokens (`embeddings.MAX_TOKENS`), plus the system prompt (343 tokens), about 20 tokens of label per chunk, a scope note for up to 5 gadgets (`MAX_COMPARISON_GADGETS`) and a question of at most 160 tokens: about **3,700 prompt tokens**. The answer is capped at 1,500 completion tokens (#103).

| Part | Tokens | Cost |
| --- | --- | --- |
| Prompt, worst case | 3,703 | $0.00093 |
| Completion at the cap | 1,500 | $0.00300 |
| Question embedding | 160 | about $0.000003 |
| **One answer, worst case** | | **about $0.0039** |

That is about **2,500 answers per $10** even if every answer were as large as the limits allow. The cap, not the number of gadgets, bounds the cost: a 5-gadget comparison uses the same 6-chunk context.

## What this does not show
- **Dev data is small.** Only the iPhone 15 and the Galaxy S24 have indexed specs on dev: 5 chunks each, about 50 to 80 characters a chunk. Production gadgets with longer chunks will send more input than 628 tokens; the worst case above is the bound for that.
- **No 3-gadget run.** Dev has no third gadget with indexed specs, so a 3-gadget comparison could not be measured. The context cap is the same, and the worst case covers it.
- **Timing is rough.** The measuring script crashed after the answers were billed, so latency was not recorded directly. The times above are the gaps between consecutive answers in `query_history` (the calls ran one after another), which slightly overstate each answer's time. The first answer of each group has no gap. Treat them as an order of magnitude, not a benchmark.
- **The 5 single and 5 comparison answers are one run each**, and model output length varies between runs.
- **Cached answers were not measured.** An exact repeat of a question is served from `answer_cache` without calling OpenAI (`backend/answer_cache.py`).

## Reading it
No defect and no change needed: the cost of comparison mode is bounded and small. If cost ever matters more, the lever is the completion side (a tighter cap or a shorter answer style), not retrieval.
