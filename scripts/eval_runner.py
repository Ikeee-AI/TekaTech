"""Score TekaTech answers against the S2-AD evaluation set.

Usage:
    python scripts/eval_runner.py --answers prompts/eval/reference_answers.json [--report out.json]

The answers file maps case ids to answer text ({"answers": {"TC-01": "..."}}), so it can
hold real model output exported from /query or the hand-written reference answers that
validate this scorer. Checks per case:
  * factual cases: every expected fact present, at least one supporting source cited,
    no citation outside the source pack; comparison cases with a missing spec must say so;
  * abstention cases: the answer declines (no invented fact) and cites nothing invalid.
Exit code 1 when a target is missed: >=90% factual cases supported, 100% valid citations,
all abstention cases correct (targets from docs/sprints-2-to-5.md, Sprint 3).
"""
import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "prompts" / "eval"
CITATION = re.compile(r"\[(\d+)\]")
# The app's prompt asks the model to "say so plainly" rather than use one fixed sentence,
# so accept the usual ways of declining.
ABSTAIN = re.compile(
    r"insufficient|not (stated|mentioned|listed|provided|available|included|specified|given)"
    r"|(don't|do not|doesn't|does not) (say|state|mention|list|include|specify|provide)"
    r"|no (information|data|details)|(can't|cannot|can not|unable to) (confirm|answer|tell)",
    re.IGNORECASE,
)
TARGETS = {"factual_supported": 0.9, "citation_validity": 1.0, "abstention": 1.0}


def has_fact(answer, fact):
    """Whole-value match: spacing may differ ("4000 mAh" == "4000mAh"), but the fact must
    not sit inside a longer value ("2000 nits" does not match "12000 nits")."""
    chars = [re.escape(c) for c in re.sub(r"\s+", "", fact.lower())]
    pattern = r"(?<![0-9a-z])" + r"\s*".join(chars) + r"(?![0-9a-z])"
    return re.search(pattern, answer.lower()) is not None


def score_case(case, answer, valid_ids):
    cited = [int(n) for n in CITATION.findall(answer)]
    invalid = sorted({n for n in cited if n not in valid_ids})
    abstained = bool(ABSTAIN.search(answer))
    problems = []
    if invalid:
        problems.append(f"invalid citation(s) {invalid}")
    if case.get("should_abstain"):
        if not abstained:
            problems.append("should have said the sources don't answer this")
        if cited:
            # No snippet answers an abstention case, so a citation means a claim was made.
            problems.append(f"abstention answer cites {sorted(set(cited))}")
    else:
        missing = [fact for fact in case["expected_facts"] if not has_fact(answer, fact)]
        if missing:
            problems.append(f"missing fact(s) {missing}")
        if not set(cited) & set(case["expected_sources"]):
            problems.append(f"no supporting citation from {case['expected_sources']}")
        if case.get("requires_missing_note") and not abstained:
            problems.append("must say which spec is missing from the sources")
    return {"id": case["id"], "passed": not problems, "problems": problems,
            "citations": cited, "abstained": abstained,
            "kind": "abstention" if case.get("should_abstain") else "factual"}


def evaluate(cases, sources, answers):
    valid_ids = {snippet["id"] for snippet in sources["snippets"]}
    results = []
    for case in cases["cases"]:
        answer = answers.get(case["id"])
        if answer is None:
            results.append({"id": case["id"], "passed": False, "problems": ["no answer"],
                            "citations": [], "abstained": False,
                            "kind": "abstention" if case.get("should_abstain") else "factual"})
        else:
            results.append(score_case(case, answer, valid_ids))

    def rate(rows):
        return round(sum(r["passed"] for r in rows) / len(rows), 3) if rows else None

    factual = [r for r in results if r["kind"] == "factual"]
    abstain = [r for r in results if r["kind"] == "abstention"]
    with_citations = [r for r in results if r["citations"]]
    citation_ok = [r for r in with_citations if not any("invalid citation" in p for p in r["problems"])]
    metrics = {
        "factual_supported": rate(factual),
        "factual_denominator": len(factual),
        "citation_validity": round(len(citation_ok) / len(with_citations), 3) if with_citations else None,
        "citation_denominator": len(with_citations),
        "abstention": rate(abstain),
        "abstention_denominator": len(abstain),
    }
    met = all(metrics[k] is not None and metrics[k] >= v for k, v in TARGETS.items())
    return {"cases_version": cases.get("version"), "sources_version": sources.get("version"),
            "metrics": metrics, "targets": TARGETS, "targets_met": met, "results": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--answers", type=Path, required=True)
    parser.add_argument("--cases", type=Path, default=EVAL_DIR / "cases.json")
    parser.add_argument("--sources", type=Path, default=EVAL_DIR / "sources.json")
    parser.add_argument("--report", type=Path, help="Write the full JSON report here")
    args = parser.parse_args()
    def load(path):
        return json.loads(path.read_text(encoding="utf-8"))

    answers_file = load(args.answers)
    report = evaluate(load(args.cases), load(args.sources), answers_file["answers"])
    report["provider"] = answers_file.get("provider", "unknown")

    print(f"=== TekaTech evaluation | answers: {report['provider']} | {report['cases_version']} ===")
    for r in report["results"]:
        detail = "; ".join(r["problems"]) or f"cited {r['citations'] or 'none'}"
        print(f"[{r['id']}] {'PASS' if r['passed'] else 'FAIL'} ({r['kind']}) {detail}")
    m = report["metrics"]
    print(f"Factual supported: {m['factual_supported']} of {m['factual_denominator']} cases | "
          f"Valid citations: {m['citation_validity']} of {m['citation_denominator']} answers | "
          f"Abstention: {m['abstention']} of {m['abstention_denominator']} cases")
    print("Targets met" if report["targets_met"] else "Targets NOT met")
    if args.report:
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    sys.exit(0 if report["targets_met"] else 1)


if __name__ == "__main__":
    main()
