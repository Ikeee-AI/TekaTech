"""Benchmark streaming before building it: how soon would the first words appear?

Same 12 real-catalog questions, retrieval and prompt as scripts/benchmark_answer_settings_catalog.py
(9 one-phone questions, 3 comparisons), with the settings /query uses today (answer_settings()).
Each question is asked twice per repeat, in alternating order:

    whole      today: one call, the answer appears when it is complete
    streamed   stream=True: time to the first text, and time to the last

It also counts what streaming would have to handle on screen: answers whose finished text still
needed the citation clean-up (an invalid [n] that would have flashed up mid-stream) and answers cut
off by the length cap. Spends OpenAI credit (about US$0.001 per call); plans unless --yes.

    cd backend
    uv run --frozen python ../scripts/benchmark_streaming.py --yes --repeats 2 \\
        --out ../.local/streaming-bench.json --markdown ../.local/streaming-bench.md
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import statistics
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from benchmark_answer_settings import PRICE_INPUT, PRICE_OUTPUT, percentile  # noqa: E402
from benchmark_answer_settings_catalog import DEFAULT_API, QUESTIONS, build_prompt, get_json  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", default=DEFAULT_API)
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--out", type=Path, default=ROOT / ".local" / "streaming-bench.json")
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args(argv)
    calls = len(QUESTIONS) * 2 * args.repeats
    print(f"Plan: {len(QUESTIONS)} questions x 2 ways (whole, streamed) x {args.repeats} repeat(s) = {calls} chat calls,")
    print(f"about US${calls * 0.0006:.2f}-{calls * 0.002:.2f}.")
    if not args.yes:
        print("Nothing sent. Re-run with --yes.")
        return 0

    from openai import OpenAI
    from citations import normalize_paren_citations, strip_invalid_citations
    from config import settings
    from prompts import build_system_prompt
    from routers.query import ANSWER_MAX_COMPLETION_TOKENS, ANSWER_MODEL, EMBEDDING_MODEL, MATCH_COUNT, answer_settings

    client = OpenAI(api_key=settings.openai_api_key.get_secret_value(), timeout=60, max_retries=1)
    catalog = {g["name"]: g for g in get_json(f"{args.api_base}/gadgets")}
    wanted = sorted({n for names, _ in QUESTIONS for n in names})
    chunks_by_name = {}
    for n in wanted:
        chunks = [c for c in get_json(f"{args.api_base}/gadgets/{catalog[n]['id']}/specs") if c["indexing_status"] == "indexed"]
        for c in chunks:
            c["_name"] = n
        chunks_by_name[n] = chunks
    all_chunks = [c for n in wanted for c in chunks_by_name[n]]
    emb = client.embeddings.create(model=EMBEDDING_MODEL, input=[c["content"] for c in all_chunks])
    chunk_embeddings = {c["id"]: d.embedding for c, d in zip(all_chunks, emb.data)}
    q_emb = client.embeddings.create(model=EMBEDDING_MODEL, input=[q for _, q in QUESTIONS]).data
    system_prompt = build_system_prompt(False, False)
    prompts = [build_prompt(names, q, q_emb[i].embedding, chunks_by_name, chunk_embeddings, MATCH_COUNT)
               for i, (names, q) in enumerate(QUESTIONS)]

    def finish(text, n_snippets):
        text, _ = normalize_paren_citations(text, n_snippets)
        return strip_invalid_citations(text, n_snippets)

    def whole(names, content, n):
        started = time.perf_counter()
        c = client.chat.completions.create(
            model=ANSWER_MODEL, max_completion_tokens=ANSWER_MAX_COMPLETION_TOKENS,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": content}],
            **answer_settings(len(names)),
        )
        total = time.perf_counter() - started
        _, removed = finish(c.choices[0].message.content or "", n)
        return {"first_text_s": round(total, 3), "total_s": round(total, 3), "finish_reason": c.choices[0].finish_reason,
                "prompt_tokens": c.usage.prompt_tokens, "completion_tokens": c.usage.completion_tokens,
                "citations_removed": removed, "chunks": 1}

    def streamed(names, content, n):
        started = time.perf_counter()
        stream = client.chat.completions.create(
            model=ANSWER_MODEL, max_completion_tokens=ANSWER_MAX_COMPLETION_TOKENS, stream=True,
            stream_options={"include_usage": True},
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": content}],
            **answer_settings(len(names)),
        )
        first, parts, finish_reason, usage, chunks = None, [], None, None, 0
        for event in stream:
            if event.usage:
                usage = event.usage
            for choice in event.choices:
                if choice.delta and choice.delta.content:
                    if first is None:
                        first = time.perf_counter() - started
                    parts.append(choice.delta.content)
                    chunks += 1
                if choice.finish_reason:
                    finish_reason = choice.finish_reason
        total = time.perf_counter() - started
        _, removed = finish("".join(parts), n)
        return {"first_text_s": round(first if first is not None else total, 3), "total_s": round(total, 3),
                "finish_reason": finish_reason, "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0, "citations_removed": removed,
                "chunks": chunks}

    ways = {"whole": whole, "streamed": streamed}
    rows, step = [], 0
    for rep in range(1, args.repeats + 1):
        for qi, ((names, q), (content, ranked)) in enumerate(zip(QUESTIONS, prompts), start=1):
            order = ["whole", "streamed"] if step % 2 == 0 else ["streamed", "whole"]
            step += 1
            for way in order:
                try:
                    r = ways[way](names, content, len(ranked))
                except Exception as exc:
                    print(f"  Q{qi} {way}: failed ({type(exc).__name__})")
                    continue
                rows.append({"q": qi, "question": q, "phones": len(names), "way": way, "repeat": rep, **r})
            print(f"  run {rep} Q{qi:>2} done")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"calls": rows}, indent=2, ensure_ascii=False), encoding="utf-8")  # raw first, never lost

    summary = []
    for way in ways:
        for label, pick in (("one phone", lambda x: x["phones"] == 1), ("comparison", lambda x: x["phones"] > 1)):
            r = [x for x in rows if x["way"] == way and pick(x)]
            if not r:
                continue
            first, total = [x["first_text_s"] for x in r], [x["total_s"] for x in r]
            cost = sum(x["prompt_tokens"] * PRICE_INPUT + x["completion_tokens"] * PRICE_OUTPUT for x in r) / 1e6
            summary.append({"way": way, "questions": label, "answers": len(r),
                            "first_text_median_s": round(statistics.median(first), 2),
                            "first_text_p90_s": round(percentile(first, 0.9), 2),
                            "total_median_s": round(statistics.median(total), 2),
                            "total_p90_s": round(percentile(total, 0.9), 2),
                            "cut_off": sum(x["finish_reason"] == "length" for x in r),
                            "answers_needing_citation_cleanup": sum(x["citations_removed"] > 0 for x in r),
                            "est_cost_per_answer_usd": round(cost / len(r), 5)})
    meta = {"finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "model": ANSWER_MODEL,
            "questions": len(QUESTIONS), "repeats": args.repeats}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"meta": meta, "summary": summary, "calls": rows}, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    md = ["# Streaming benchmark: first words vs whole answer", "",
          f"Run {meta['finished_at']} · `{meta['model']}` · {meta['questions']} real-catalog questions x {meta['repeats']} repeat(s). Chat call only, settings from `answer_settings()`.", "",
          "| Way | Questions | Answers | First text (median) | First text (p90) | Finished (median) | Finished (p90) | Cut off | Needed citation clean-up | Cost / answer |",
          "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for s in summary:
        md.append(f"| `{s['way']}` | {s['questions']} | {s['answers']} | {s['first_text_median_s']} s | {s['first_text_p90_s']} s | "
                  f"{s['total_median_s']} s | {s['total_p90_s']} s | {s['cut_off']} | {s['answers_needing_citation_cleanup']} | ${s['est_cost_per_answer_usd']} |")
    if args.markdown:
        args.markdown.write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md))
    return 0


if __name__ == "__main__":
    sys.exit(main())
