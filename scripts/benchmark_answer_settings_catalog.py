"""Benchmark answer settings on the REAL catalog: real spec chunks, real retrieval, the real prompt.

Companion to scripts/benchmark_answer_settings.py (which uses the short evaluation pack and scores
it). This one answers the questions shoppers actually ask on phone and compare pages, so the
prompt has the size it has in production, and reports speed, cost and simple grounding checks
next to every answer for a person to read.

How each question is built, mirroring routers/query.py without touching any database:
  * the phones' spec chunks come from the public, read-only GET /gadgets/{id}/specs of --api-base;
    only chunks with indexing_status "indexed" take part, like match_spec_documents;
  * chunks and question are embedded with the app's EMBEDDING_MODEL, and the MATCH_COUNT chunks
    with the highest cosine similarity within the asked phones are kept (scoped questions use no
    threshold, SCOPED_MATCH_THRESHOLD), ordered as the SQL function orders them;
  * the context lines, the "Gadgets in this comparison" note and the system prompt
    (prompts.build_system_prompt, general knowledge off) are the ones /query sends.
Only the chat call is timed and compared; embeddings are made once and shared by every setting.

Checks per answer (automatic, not a score): cut off by the token cap, citation markers removed by
/query's cleaner, and spec values (numbers with units) that appear in no snippet sent.

Spends OpenAI credit (about US$0.001 per answer), so it only plans unless --yes:

    cd backend
    uv run --frozen python ../scripts/benchmark_answer_settings_catalog.py                   # plan
    uv run --frozen python ../scripts/benchmark_answer_settings_catalog.py --yes \\
        --out ../.local/catalog-bench.json --markdown ../.local/catalog-bench.md
"""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import statistics
import sys
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from benchmark_answer_settings import CONFIGS, PRICE_INPUT, PRICE_OUTPUT, percentile  # noqa: E402

DEFAULT_API = "https://tekatech-api-production-549b48c9.up.railway.app"
# (phones by name, question). The first nine are the phone page's three suggestion chips on three
# phones; the last three are comparison-page questions.
QUESTIONS = [
    (["iPhone 16"], "What chip does it use?"),
    (["iPhone 16"], "How long does the battery last?"),
    (["iPhone 16"], "Is it water resistant?"),
    (["V50 5G"], "What chip does it use?"),
    (["V50 5G"], "How long does the battery last?"),
    (["V50 5G"], "Is it water resistant?"),
    (["Reno14 5G"], "What chip does it use?"),
    (["Reno14 5G"], "How long does the battery last?"),
    (["Reno14 5G"], "Is it water resistant?"),
    (["iPhone 16", "Galaxy S25"], "Which offers the better camera?"),
    (["Reno14 5G", "V50 5G", "13 Pro+ 5G"], "Which one charges the fastest?"),
    (["iPhone 16 Pro", "Galaxy S24", "Find X8"], "Compare these gadgets and highlight the key trade-offs someone should know before buying."),
]
VALUE = re.compile(r"\d+(?:[.,]\d+)?\s?(?:mah|w|gb|tb|mp|hz|nits|mm|g|inch|inches|\"|fps|k)\b", re.I)


def get_json(url):
    with urlopen(Request(url, headers={"User-Agent": "tekatech-benchmark"}), timeout=30) as r:
        return json.load(r)


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def norm_value(text):
    return re.sub(r"[\s,]", "", text.lower())


def unsupported_values(answer, snippets_text):
    """Spec values in the answer that no snippet contains (a hint of an invented number)."""
    haystack = norm_value(snippets_text)
    return sorted({v for v in VALUE.findall(answer) if norm_value(v) not in haystack})


def build_prompt(names, question, q_embedding, chunks_by_name, chunk_embeddings, match_count):
    pool = [c for n in names for c in chunks_by_name[n]]
    ranked = sorted(pool, key=lambda c: cosine(q_embedding, chunk_embeddings[c["id"]]), reverse=True)[:match_count]
    lines = []
    for i, c in enumerate(ranked, start=1):
        stamp = f", verified {str(c['verified_at'])[:10]}" if c.get("verified_at") else ""
        lines.append(f"[{i}] ({c['_name']}{stamp}) {c['content']}")
    note = "\n\nGadgets in this comparison: " + ", ".join(names) + "."
    missing = [n for n in names if n not in {c["_name"] for c in ranked}]
    if missing:
        note += " No spec snippets were found for " + ", ".join(missing) + " — state that explicitly instead of leaving them out."
    context = "\n\n".join(lines)
    return f"Spec snippets:\n{context}{note}\n\nQuestion: {question}", ranked


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", default=DEFAULT_API, help="API to read the public catalog from (read-only)")
    parser.add_argument("--configs", default="low,minimal-terse",
                        help=f"Comma-separated, from: app, {', '.join(CONFIGS)} (app = routers.query.answer_settings, as /query picks)")
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--out", type=Path, default=ROOT / ".local" / "catalog-bench.json")
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--yes", action="store_true", help="Actually call OpenAI (spends credit)")
    args = parser.parse_args(argv)
    names_cfg = [n.strip() for n in args.configs.split(",") if n.strip()]
    if any(n not in CONFIGS and n != "app" for n in names_cfg):
        parser.error(f"configs must be from: app, {', '.join(CONFIGS)}")
    calls = len(QUESTIONS) * len(names_cfg) * args.repeats
    print(f"Plan: {len(QUESTIONS)} questions x {len(names_cfg)} settings ({', '.join(names_cfg)}) x {args.repeats} repeat(s) = {calls} chat calls")
    print(f"plus one-off embeddings; about US${calls * 0.0006:.2f}-{calls * 0.002:.2f} of OpenAI credit.")
    if not args.yes:
        print("Nothing sent. Re-run with --yes.")
        return 0

    from openai import OpenAI
    from citations import normalize_paren_citations, strip_invalid_citations
    from config import settings
    from prompts import PROMPT_VERSION, build_system_prompt
    from routers.query import ANSWER_MAX_COMPLETION_TOKENS, ANSWER_MODEL, EMBEDDING_MODEL, MATCH_COUNT, answer_settings

    client = OpenAI(api_key=settings.openai_api_key.get_secret_value(), timeout=60, max_retries=1)
    catalog = {g["name"]: g for g in get_json(f"{args.api_base}/gadgets")}
    wanted = sorted({n for names, _ in QUESTIONS for n in names})
    missing = [n for n in wanted if n not in catalog]
    if missing:
        print(f"Not in the catalog: {', '.join(missing)}")
        return 1
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
    rows = []
    step = 0
    for rep in range(1, args.repeats + 1):
        for qi, ((names, question), (content, ranked)) in enumerate(zip(QUESTIONS, prompts)):
            order = names_cfg[step % len(names_cfg):] + names_cfg[: step % len(names_cfg)]
            step += 1
            for cfg in order:
                started = time.perf_counter()
                try:
                    completion = client.chat.completions.create(
                        model=ANSWER_MODEL,
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": content}],
                        max_completion_tokens=ANSWER_MAX_COMPLETION_TOKENS,
                        **(answer_settings(len(names)) if cfg == "app" else CONFIGS[cfg]),
                    )
                except Exception as exc:
                    print(f"  Q{qi + 1} {cfg}: failed ({type(exc).__name__})")
                    continue
                seconds = time.perf_counter() - started
                choice, usage = completion.choices[0], completion.usage
                details = getattr(usage, "completion_tokens_details", None)
                text, _ = normalize_paren_citations(choice.message.content or "", len(ranked))
                text, removed = strip_invalid_citations(text, len(ranked))
                rows.append({
                    "q": qi + 1, "phones": names, "question": question, "repeat": rep, "config": cfg,
                    "seconds": round(seconds, 3), "finish_reason": choice.finish_reason,
                    "prompt_tokens": usage.prompt_tokens, "completion_tokens": usage.completion_tokens,
                    "reasoning_tokens": getattr(details, "reasoning_tokens", None),
                    "citations_removed": removed,
                    "unsupported_values": unsupported_values(text, "\n".join(c["content"] for c in ranked)),
                    "answer": text,
                })
                print(f"  Q{qi + 1:<2} {cfg:<14} {seconds:6.2f} s  prompt={usage.prompt_tokens} "
                      f"reasoning={rows[-1]['reasoning_tokens']} out={usage.completion_tokens} {choice.finish_reason}")

    summary = []
    for cfg in names_cfg:
        r = [x for x in rows if x["config"] == cfg]
        secs = [x["seconds"] for x in r]
        cost = sum(x["prompt_tokens"] * PRICE_INPUT + x["completion_tokens"] * PRICE_OUTPUT for x in r) / 1e6
        summary.append({
            "config": cfg, "calls": len(r), "median_s": round(statistics.median(secs), 2),
            "p90_s": round(percentile(secs, 0.9), 2), "max_s": round(max(secs), 2),
            "median_prompt_tokens": statistics.median(x["prompt_tokens"] for x in r),
            "median_reasoning_tokens": statistics.median((x["reasoning_tokens"] or 0) for x in r),
            "median_completion_tokens": statistics.median(x["completion_tokens"] for x in r),
            "median_words": statistics.median(len(x["answer"].split()) for x in r),
            "cut_off": sum(x["finish_reason"] == "length" for x in r),
            "citations_removed": sum(x["citations_removed"] for x in r),
            "answers_with_unsupported_values": sum(bool(x["unsupported_values"]) for x in r),
            "est_cost_per_answer_usd": round(cost / len(r), 5),
        })
    meta = {"finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "model": ANSWER_MODEL,
            "prompt_version": PROMPT_VERSION, "match_count": MATCH_COUNT, "questions": len(QUESTIONS),
            "repeats": args.repeats, "catalog": args.api_base}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"meta": meta, "summary": summary, "calls": rows}, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    md = ["# Answer settings on the real catalog", "",
          f"Run {meta['finished_at']} · `{meta['model']}` · prompt `{meta['prompt_version']}` · {meta['questions']} questions "
          f"x {meta['repeats']} repeat(s) · top {meta['match_count']} real chunks per question. Chat call only; costs are estimates.", "",
          "| Setting | Median | p90 | Slowest | Prompt tokens | Reasoning tokens | Output tokens | Words | Cut off | Citations removed | Answers with an unsupported value | Cost / answer |",
          "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for s in summary:
        md.append(f"| `{s['config']}` | {s['median_s']} s | {s['p90_s']} s | {s['max_s']} s | {s['median_prompt_tokens']} | "
                  f"{s['median_reasoning_tokens']} | {s['median_completion_tokens']} | {s['median_words']} | {s['cut_off']} | "
                  f"{s['citations_removed']} | {s['answers_with_unsupported_values']} | ${s['est_cost_per_answer_usd']} |")
    md += ["", "## Answers (repeat 1)", ""]
    for qi, (names, question) in enumerate(QUESTIONS, start=1):
        md.append(f"### Q{qi}. {' vs '.join(names)}: {question}")
        for cfg in names_cfg:
            for x in rows:
                if x["q"] == qi and x["config"] == cfg and x["repeat"] == 1:
                    flag = f" — unsupported values: {', '.join(x['unsupported_values'])}" if x["unsupported_values"] else ""
                    md.append(f"- **`{cfg}`** ({x['seconds']} s){flag}: " + x["answer"].replace("\n", " "))
        md.append("")
    text = "\n".join(md) + "\n"
    if args.markdown:
        args.markdown.write_text(text, encoding="utf-8")
    print("\n".join(md[:8 + len(summary)]))
    print(f"\nFull results: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
