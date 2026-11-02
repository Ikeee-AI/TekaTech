# Speaker notes: three-minute AI deep dive (S4-AD)

Taken over by Ikeee-AI (AI-assisted) from S4-AD after the 31 Oct deadline; Adrian's delivered parts (#166, #112, #89, #90, #105) remain credited to him.

About 380 spoken words in three parts (about 190, 90 and 95 words), so roughly 3 minutes at a steady pace; the general-knowledge answer is only for questions. Whoever presents must be able to explain each claim from the linked evidence; read the evidence, not only these notes. Show the screens named in brackets; show evidence, not only successful answers.

## 1. Evaluation (about 85 s)

[Show `docs/ai-feature-writeup.md`, "Release AI-quality report (v1.0.0)".]

"We don't judge the AI by reading a few nice answers. We have 20 fixed cases over a verified source pack: Apple's and Samsung's official spec pages for the iPhone 15 and the Philippine Galaxy S24, each fact with its URL and access date. The cases cover facts, comparisons, missing information, wrong variants and override attempts. The evaluator scores structure, grounding and valid citations, not wording, and every result says which model, prompt and dataset produced it.

On the release, scored on 31 October with `gpt-5-mini` and prompt v1: 11 of 13 factual claims supported, 41 of 45 citation references valid, 0 of 7 abstentions and 1 of 2 overrides as scored. **We missed our Sprint 3 targets**, and we report them as missed. No answer invented a fact. The invalid citations all point at one stray test chunk in the dev database. Most abstentions fail because correct refusals cite the snippets they checked, which our strict rule forbids. A rescoring with looser rules exists, but it was written after seeing the results, so we label it and don't use it as the score. We didn't tune the prompt to pass."

Evidence: [`eval-s4-2026-10-31.md`](../evidence/eval-s4-2026-10-31.md) (#166), [`eval-s3-2026-10-25.md`](../evidence/eval-s3-2026-10-25.md) (#112), `scripts/eval_runner.py`.

## 2. Backend output processing (about 45 s)

[Show one demo case from [`ai-demo-cases.md`](ai-demo-cases.md), then `backend/citations.py`.]

"The backend doesn't pass the model's answer straight through. Retrieved snippets are numbered and the prompt treats them as untrusted data, not instructions. After the answer comes back, `citations.py` removes any citation number we never sent, and the API returns how many it removed. The evaluator counts those as invalid, so a cleaned answer can't hide a bad one. The frontend only renders what the prompt allows: numbered citations, bold and bullets. Output is capped at 1500 tokens; an answer cut off by the cap becomes a 503, never half an answer."

Evidence: `backend/citations.py`, `ANSWER_MAX_COMPLETION_TOKENS` in `backend/routers/query.py`, `test_answer_cut_off_by_the_cap_returns_503_not_the_partial_text` in `backend/tests/test_query.py`, #89.

## 3. Failure behavior (about 45 s)

[Show Manuel's drill table in [`malformed-request-demo.md`](malformed-request-demo.md), section 2; run section 1 live if time allows.]

"Failures are safe and plain. Manuel's script sends 16 malformed or unauthorized requests; on production all 16 were refused with the right status, a plain message, and no stack trace or key. For model failures we use an admin-only simulator: timeout, quota and unusable output each give a 503 with a sentence the user understands, with no OpenAI call. We ran it on dev and, in a supervised 15-minute window, on production; an anonymous caller sending the same header got a normal answer. Saved specs survive an AI outage because saving and indexing are separate."

Evidence: failure drill [dev](../evidence/failure-drill-dev-2026-10-28.md) (#151) and [production](../evidence/failure-drill-prod-2026-10-28.md) (#153); malformed-request demo #162, production rehearsal #175.

## If asked about general knowledge

"An instructor-approved optional mode answers from the model's own knowledge when no specs exist. It is off by default, labelled, uncited, and has no UI yet. It has its own six-case evaluation; only hand-written reference answers have been scored, so we make no quality claim about it."
