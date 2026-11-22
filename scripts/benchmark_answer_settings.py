"""Benchmark the answer model's settings before changing them: speed, cost and evaluation score.

Compares chat settings for the grounded answer (routers/query.py `_generate_answer`) on the
evaluation set, so a faster setting is only adopted if it scores as well. Each case gets the
verified source pack (prompts/eval/sources.json) as its snippets, built the way /query builds
them: the scoped gadget's snippets (prompts/eval/scope.json; all snippets for an unscoped case),
numbered [1]..[N] with the gadget name, the "Gadgets in this comparison" note for scoped cases,
and the app's own system prompt (prompts.build_system_prompt, flag-off text). The answer is
cleaned like /query (paren citations, out-of-range markers), its markers are mapped back to pack
ids, and scripts/eval_runner.py scores it. Retrieval and embedding are left out on purpose: they
are the same for every setting, so only the chat call is timed.

Settings compared (--configs to choose; default all four):
    low            reasoning_effort="low"     (current production setting)
    low-terse      reasoning_effort="low",     verbosity="low"
    minimal        reasoning_effort="minimal"
    minimal-terse  reasoning_effort="minimal", verbosity="low"

It spends real OpenAI credit (roughly US$0.001-0.003 per call), so it only plans unless --yes.
Calls are interleaved (case by case, rotating which setting goes first) so a slow minute at the
provider does not land on one setting only. Run from backend/ so the backend .env is used:

    cd backend
    uv run --frozen python ../scripts/benchmark_answer_settings.py                 # plan only
    uv run --frozen python ../scripts/benchmark_answer_settings.py --yes --repeats 2 \\
        --out ../.local/answer-settings.json --markdown ../.local/answer-settings.md

The JSON keeps every answer, timing and token count, so the run can be re-scored or checked later.
It never prints the API key.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import statistics
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "prompts" / "eval"
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

CONFIGS = {
    "low": {"reasoning_effort": "low"},
    "low-terse": {"reasoning_effort": "low", "verbosity": "low"},
    "minimal": {"reasoning_effort": "minimal"},
    "minimal-terse": {"reasoning_effort": "minimal", "verbosity": "low"},
}
# gpt-5-mini list prices, US$ per 1M tokens (reasoning tokens bill as output). Estimates only.
PRICE_INPUT = 0.25
PRICE_OUTPUT = 2.00
MARKER = re.compile(r"\[(\d+)\]")


def build_case_prompt(case, sources, scope):
    """Return (user_content, pack_ids) for one case, numbered like /query numbers its matches."""
    names = scope.get("gadgets", {})
    slugs = scope.get("cases", {}).get(case["id"])
    snippets = [s for s in sources["snippets"] if not slugs or s["gadget"] in slugs]
    lines = [f"[{i}] ({names.get(s['gadget'], s['gadget'])}) {s['text']}" for i, s in enumerate(snippets, start=1)]
    note = ""
    if slugs:
        note = "\n\nGadgets in this comparison: " + ", ".join(names.get(g, g) for g in slugs) + "."
    content = "Spec snippets:\n" + "\n\n".join(lines) + note + "\n\nQuestion: " + case["query"]
    return content, [s["id"] for s in snippets]


def to_pack_ids(answer, pack_ids):
    """Rewrite [k] (position in this case's snippets) to [pack id], as eval_adapter does."""
    def swap(match):
        k = int(match.group(1))
        return f"[{pack_ids[k - 1]}]" if 1 <= k <= len(pack_ids) else "[0]"
    return MARKER.sub(swap, answer)


def ask(client, model, max_tokens, system_prompt, content, settings):
    from citations import normalize_paren_citations, strip_invalid_citations

    started = time.perf_counter()
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": content}],
        max_completion_tokens=max_tokens,
        **settings,
    )
    seconds = time.perf_counter() - started
    choice = completion.choices[0]
    usage = completion.usage
    details = getattr(usage, "completion_tokens_details", None)
    return {
        "seconds": round(seconds, 3),
        "finish_reason": choice.finish_reason,
        "raw": choice.message.content or "",
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "reasoning_tokens": getattr(details, "reasoning_tokens", None),
    }, normalize_paren_citations, strip_invalid_citations


def percentile(values, q):
    values = sorted(values)
    if not values:
        return None
    k = (len(values) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (k - lo)


def summarize(name, rows, report):
    secs = [r["seconds"] for r in rows]
    cost = sum(r["prompt_tokens"] * PRICE_INPUT + r["completion_tokens"] * PRICE_OUTPUT for r in rows) / 1e6
    m = report["metrics"]
    return {
        "config": name,
        "settings": CONFIGS[name],
        "calls": len(rows),
        "median_s": round(statistics.median(secs), 2),
        "p90_s": round(percentile(secs, 0.9), 2),
        "mean_s": round(statistics.mean(secs), 2),
        "median_completion_tokens": statistics.median(r["completion_tokens"] for r in rows),
        "median_reasoning_tokens": statistics.median((r["reasoning_tokens"] or 0) for r in rows),
        "cut_off": sum(r["finish_reason"] == "length" for r in rows),
        "est_cost_usd": round(cost, 4),
        "est_cost_per_answer_usd": round(cost / len(rows), 5),
        "factual_supported": m["factual_supported"],
        "citation_validity": m["citation_validity"],
        "abstention": m["abstention"],
        "override_resistance": m.get("override_resistance"),
        "targets_met": report["targets_met"],
        "failed_cases": [f["id"] for f in report["failures"]],
    }


def markdown(summary, meta):
    out = [
        "# Answer settings benchmark",
        "",
        f"Run {meta['finished_at']} · model `{meta['model']}` · prompt `{meta['prompt_version']}` · "
        f"{meta['cases']} cases x {meta['repeats']} repeat(s) · scoring rules `{meta['rules']}`. "
        "Only the chat call is timed (retrieval and embedding are the same for every setting). "
        "Costs are estimates from token counts and list prices.",
        "",
        "| Setting | Median | p90 | Reasoning tokens (median) | Output tokens (median) | Cut off | Est. cost / answer | Factual supported | Citation validity | Abstention | Override | Targets met | Failed cases |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for s in summary:
        out.append(
            f"| `{s['config']}` | {s['median_s']} s | {s['p90_s']} s | {s['median_reasoning_tokens']} | "
            f"{s['median_completion_tokens']} | {s['cut_off']} | ${s['est_cost_per_answer_usd']} | "
            f"{s['factual_supported']} | {s['citation_validity']} | {s['abstention']} | {s['override_resistance']} | "
            f"{'yes' if s['targets_met'] else 'no'} | {', '.join(s['failed_cases']) or 'none'} |"
        )
    return "\n".join(out) + "\n"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--configs", default=",".join(CONFIGS), help=f"Comma-separated, from: {', '.join(CONFIGS)}")
    parser.add_argument("--repeats", type=int, default=1, help="Ask every case this many times per setting")
    parser.add_argument("--limit", type=int, help="Use only the first N cases")
    parser.add_argument("--rules", default="s5", help="eval_runner scoring rules (s3, s4, s5)")
    parser.add_argument("--out", type=Path, default=ROOT / ".local" / "answer-settings.json")
    parser.add_argument("--markdown", type=Path)
    parser.add_argument("--yes", action="store_true", help="Actually call OpenAI (spends credit)")
    args = parser.parse_args(argv)

    names = [n.strip() for n in args.configs.split(",") if n.strip()]
    unknown = [n for n in names if n not in CONFIGS]
    if unknown:
        parser.error(f"unknown config(s): {', '.join(unknown)}")
    cases = json.loads((EVAL_DIR / "cases.json").read_text(encoding="utf-8"))
    sources = json.loads((EVAL_DIR / "sources.json").read_text(encoding="utf-8"))
    scope = json.loads((EVAL_DIR / "scope.json").read_text(encoding="utf-8"))
    case_list = cases["cases"][: args.limit] if args.limit else cases["cases"]
    calls = len(case_list) * len(names) * args.repeats
    print(f"Plan: {len(case_list)} cases x {len(names)} settings ({', '.join(names)}) x {args.repeats} repeat(s) = {calls} calls,")
    print(f"about US${calls * 0.001:.2f}-{calls * 0.003:.2f} of OpenAI credit.")
    if not args.yes:
        print("Nothing sent. Re-run with --yes to ask the questions.")
        return 0

    from openai import OpenAI
    from config import settings
    from prompts import PROMPT_VERSION, build_system_prompt
    from routers.query import ANSWER_MAX_COMPLETION_TOKENS, ANSWER_MODEL
    import eval_runner

    client = OpenAI(api_key=settings.openai_api_key.get_secret_value(), timeout=60, max_retries=1)
    system_prompt = build_system_prompt(False, False)
    rows = {n: [] for n in names}
    answers = {n: [{} for _ in range(args.repeats)] for n in names}
    removed = {n: [{} for _ in range(args.repeats)] for n in names}
    step = 0
    for rep in range(args.repeats):
        for case in case_list:
            content, pack_ids = build_case_prompt(case, sources, scope)
            order = names[step % len(names):] + names[: step % len(names)]
            step += 1
            for name in order:
                try:
                    result, normalize, strip = ask(
                        client, ANSWER_MODEL, ANSWER_MAX_COMPLETION_TOKENS, system_prompt, content, CONFIGS[name]
                    )
                except Exception as exc:  # recorded, never fatal: one failed call should not lose the run
                    print(f"  {case['id']} {name}: failed ({type(exc).__name__})")
                    continue
                text, _ = normalize(result["raw"], len(pack_ids))
                text, dropped = strip(text, len(pack_ids))
                result.update(case=case["id"], repeat=rep + 1, config=name, answer=to_pack_ids(text, pack_ids))
                rows[name].append(result)
                if result["finish_reason"] != "length":  # /query shows a cut-off answer as a 503
                    answers[name][rep][case["id"]] = result["answer"]
                    removed[name][rep][case["id"]] = dropped
                print(f"  {case['id']} {name:<14} {result['seconds']:6.2f} s  "
                      f"reasoning={result['reasoning_tokens']} out={result['completion_tokens']} {result['finish_reason']}")

    summary = []
    reports = {}
    for name in names:
        # Score each repeat separately and keep the worse one, so a lucky run cannot hide a miss.
        per_repeat = [
            eval_runner.evaluate(cases if not args.limit else {**cases, "cases": case_list}, sources,
                                 answers[name][r], removed[name][r], args.rules)
            for r in range(args.repeats)
        ]
        worst = min(per_repeat, key=lambda rep: (rep["targets_met"], rep["metrics"]["factual_supported"] or 0))
        reports[name] = worst
        summary.append(summarize(name, rows[name], worst))

    meta = {
        "finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": ANSWER_MODEL, "prompt_version": PROMPT_VERSION, "max_completion_tokens": ANSWER_MAX_COMPLETION_TOKENS,
        "cases": len(case_list), "repeats": args.repeats, "rules": args.rules,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"meta": meta, "summary": summary, "calls": rows,
                                    "failures": {n: reports[n]["failures"] for n in names}}, indent=2,
                                   ensure_ascii=False), encoding="utf-8")
    table = markdown(summary, meta)
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(table, encoding="utf-8")
    print()
    print(table)
    print(f"Full results: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
