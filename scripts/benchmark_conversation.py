"""Benchmark the gadget chat's follow-ups: today's answers vs conversation memory + prompt v2.

The question it answers: when a shopper asks "Can the V50 run Genshin Impact?" and then "What about
on high settings?", does the second answer know what "it" and "that" mean, and does a suitability
question get a careful judgement from the specs instead of "not stated"? Real catalog data, read
only, built exactly as /query builds it (see scripts/benchmark_answer_settings_catalog.py):

    before      prompt v1, the follow-up sent alone (the chat as it was until 22 Nov 2026)
    after       prompt v2, the follow-up sent with the earlier turn (HistoryTurn, retrieval_text,
                build_user_message: the new /query path), settings from answer_settings()
    after-low   as "after" but with reasoning_effort "low" for the single phone, to see whether a
                suitability judgement needs the reasoning the fast setting skips

Each conversation is two turns on one phone. Every variant asks turn 1 itself and uses its OWN
turn-1 answer as the history of turn 2. Answers are printed side by side for a person to judge;
the automatic checks are the same as the catalog benchmark (cut off, citations removed, spec values
not in any snippet sent). Spends OpenAI credit (about US$0.001 per answer); plans unless --yes.

    cd backend
    uv run --frozen python ../scripts/benchmark_conversation.py --yes --repeats 2 \\
        --out ../.local/conversation-bench.json --markdown ../.local/conversation-bench.md
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

from benchmark_answer_settings import PRICE_INPUT, PRICE_OUTPUT  # noqa: E402
from benchmark_answer_settings_catalog import DEFAULT_API, cosine, get_json, unsupported_values  # noqa: E402

CONVERSATIONS = [
    ("V50 5G", ["Is it good for gaming?", "Can it run Genshin Impact smoothly?"]),
    ("V50 5G", ["Can the V50 5G run Genshin Impact smoothly?", "What about on high settings?"]),
    ("iPhone 16", ["How long does the battery last?", "Is that enough for a full day of gaming?"]),
    ("Reno14 5G", ["What chip does it use?", "Is it good for video editing?"]),
    ("Galaxy S25", ["Does it have a telephoto camera?", "How far can it zoom?"]),
]
VARIANTS = {
    "before": {"prompt": "v1", "history": False, "settings": None},
    "after": {"prompt": "v2", "history": True, "settings": None},
    "after-low": {"prompt": "v2", "history": True, "settings": {"reasoning_effort": "low"}},
}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", default=DEFAULT_API)
    parser.add_argument("--variants", default=",".join(VARIANTS))
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--out", type=Path, default=ROOT / ".local" / "conversation-bench.json")
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args(argv)
    variants = [v.strip() for v in args.variants.split(",") if v.strip()]
    if any(v not in VARIANTS for v in variants):
        parser.error(f"variants must be from: {', '.join(VARIANTS)}")
    calls = len(CONVERSATIONS) * 2 * len(variants) * args.repeats
    print(f"Plan: {len(CONVERSATIONS)} two-turn conversations x {len(variants)} variants x {args.repeats} repeat(s) = {calls} chat calls,")
    print(f"about US${calls * 0.0006:.2f}-{calls * 0.002:.2f}.")
    if not args.yes:
        print("Nothing sent. Re-run with --yes.")
        return 0

    from openai import OpenAI
    from citations import normalize_paren_citations, strip_invalid_citations
    from config import settings
    from prompts import build_system_prompt, build_user_message
    from routers.query import (ANSWER_MAX_COMPLETION_TOKENS, ANSWER_MODEL, EMBEDDING_MODEL, MATCH_COUNT,
                               HistoryTurn, answer_settings, retrieval_text)

    client = OpenAI(api_key=settings.openai_api_key.get_secret_value(), timeout=60, max_retries=1)
    catalog = {g["name"]: g for g in get_json(f"{args.api_base}/gadgets")}
    phones = sorted({p for p, _ in CONVERSATIONS})
    chunks = {}
    for p in phones:
        chunks[p] = [c for c in get_json(f"{args.api_base}/gadgets/{catalog[p]['id']}/specs") if c["indexing_status"] == "indexed"]
    flat = [c for p in phones for c in chunks[p]]
    vectors = {c["id"]: d.embedding for c, d in
               zip(flat, client.embeddings.create(model=EMBEDDING_MODEL, input=[c["content"] for c in flat]).data)}
    embed_cache = {}

    def embed(text):
        if text not in embed_cache:
            embed_cache[text] = client.embeddings.create(model=EMBEDDING_MODEL, input=[text]).data[0].embedding
        return embed_cache[text]

    def answer(variant, phone, question, history):
        cfg = VARIANTS[variant]
        q_vec = embed(retrieval_text(question, history))
        ranked = sorted(chunks[phone], key=lambda c: cosine(q_vec, vectors[c["id"]]), reverse=True)[:MATCH_COUNT]
        context = "\n\n".join(
            f"[{i}] ({phone}{', verified ' + str(c['verified_at'])[:10] if c.get('verified_at') else ''}) {c['content']}"
            for i, c in enumerate(ranked, start=1)
        )
        content = build_user_message(context, f"\n\nGadgets in this comparison: {phone}.", question, history)
        started = time.perf_counter()
        completion = client.chat.completions.create(
            model=ANSWER_MODEL,
            messages=[{"role": "system", "content": build_system_prompt(False, False, cfg["prompt"])},
                      {"role": "user", "content": content}],
            max_completion_tokens=ANSWER_MAX_COMPLETION_TOKENS,
            **(cfg["settings"] or answer_settings(1)),
        )
        seconds = time.perf_counter() - started
        text, _ = normalize_paren_citations(completion.choices[0].message.content or "", len(ranked))
        text, removed = strip_invalid_citations(text, len(ranked))
        return {
            "seconds": round(seconds, 3), "finish_reason": completion.choices[0].finish_reason,
            "prompt_tokens": completion.usage.prompt_tokens, "completion_tokens": completion.usage.completion_tokens,
            "citations_removed": removed,
            "unsupported_values": unsupported_values(text, "\n".join(c["content"] for c in ranked)),
            "retrieved": [c["content"][:60] for c in ranked[:3]], "answer": text,
        }

    rows = []
    for rep in range(1, args.repeats + 1):
        for ci, (phone, (q1, q2)) in enumerate(CONVERSATIONS, start=1):
            for variant in variants:
                try:
                    first = answer(variant, phone, q1, [])
                    history = [HistoryTurn(question=q1, answer=first["answer"])] if VARIANTS[variant]["history"] else []
                    second = answer(variant, phone, q2, history)
                except Exception as exc:
                    print(f"  C{ci} {variant}: failed ({type(exc).__name__})")
                    continue
                for turn, r in ((1, first), (2, second)):
                    rows.append({"conversation": ci, "phone": phone, "turn": turn, "question": q1 if turn == 1 else q2,
                                 "variant": variant, "repeat": rep, **r})
                print(f"  C{ci} {variant:<10} turn1 {first['seconds']:5.2f}s  turn2 {second['seconds']:5.2f}s")

    summary = []
    for v in variants:
        r = [x for x in rows if x["variant"] == v]
        cost = sum(x["prompt_tokens"] * PRICE_INPUT + x["completion_tokens"] * PRICE_OUTPUT for x in r) / 1e6
        summary.append({"variant": v, **VARIANTS[v], "answers": len(r),
                        "median_s": round(statistics.median(x["seconds"] for x in r), 2),
                        "max_s": round(max(x["seconds"] for x in r), 2),
                        "cut_off": sum(x["finish_reason"] == "length" for x in r),
                        "citations_removed": sum(x["citations_removed"] for x in r),
                        "answers_with_unsupported_values": sum(bool(x["unsupported_values"]) for x in r),
                        "est_cost_per_answer_usd": round(cost / len(r), 5)})
    meta = {"finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "model": ANSWER_MODEL,
            "conversations": len(CONVERSATIONS), "repeats": args.repeats}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"meta": meta, "summary": summary, "calls": rows}, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    md = ["# Gadget chat follow-ups: before vs after", "",
          f"Run {meta['finished_at']} · `{meta['model']}` · {meta['conversations']} two-turn conversations x {meta['repeats']} repeat(s). Chat call only.", "",
          "| Variant | Prompt | Earlier turn sent | Median | Slowest | Cut off | Citations removed | Answers with an unsupported value | Cost / answer |",
          "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for s in summary:
        md.append(f"| `{s['variant']}` | {s['prompt']} | {'yes' if s['history'] else 'no'} | {s['median_s']} s | {s['max_s']} s | "
                  f"{s['cut_off']} | {s['citations_removed']} | {s['answers_with_unsupported_values']} | ${s['est_cost_per_answer_usd']} |")
    for rep in range(1, args.repeats + 1):
        md += ["", f"## Answers, run {rep}", ""]
        for ci, (phone, (q1, q2)) in enumerate(CONVERSATIONS, start=1):
            md.append(f"### C{ci}. {phone}: \"{q1}\" → \"{q2}\"")
            for v in variants:
                for x in rows:
                    if x["conversation"] == ci and x["variant"] == v and x["repeat"] == rep:
                        flag = f" — unsupported: {', '.join(x['unsupported_values'])}" if x["unsupported_values"] else ""
                        md.append(f"- **`{v}` turn {x['turn']}** ({x['seconds']} s){flag}: " + x["answer"].replace("\n", " "))
            md.append("")
    if args.markdown:
        args.markdown.write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md[:6 + len(summary)]))
    print(f"\nFull results: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
