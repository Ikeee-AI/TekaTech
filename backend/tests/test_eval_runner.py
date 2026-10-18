import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("eval_runner", ROOT / "scripts/eval_runner.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

CASES = json.loads((ROOT / "prompts/eval/cases.json").read_text(encoding="utf-8"))
SOURCES = json.loads((ROOT / "prompts/eval/sources.json").read_text(encoding="utf-8"))
REFERENCE = json.loads((ROOT / "prompts/eval/reference_answers.json").read_text(encoding="utf-8"))["answers"]


def evaluate_with(**overrides):
    return runner.evaluate(CASES, SOURCES, {**REFERENCE, **overrides})


def result(report, case_id):
    return next(r for r in report["results"] if r["id"] == case_id)


def test_reference_answers_meet_all_targets():
    report = evaluate_with()
    assert report["targets_met"]
    assert report["metrics"]["factual_denominator"] == 7
    assert report["metrics"]["abstention_denominator"] == 3


def test_invented_fact_on_abstention_case_fails():
    report = evaluate_with(**{"TC-09": "The Galaxy S24 supports microSD cards up to 1TB [10]."})
    assert not result(report, "TC-09")["passed"]
    assert not report["targets_met"]


def test_citation_outside_source_pack_fails():
    report = evaluate_with(**{"TC-03": "The iPhone 15 uses the A16 Bionic chip [12]."})
    case = result(report, "TC-03")
    assert not case["passed"]
    assert "invalid citation(s) [12]" in case["problems"]
    assert report["metrics"]["citation_validity"] < 1.0


def test_correct_fact_without_supporting_citation_fails():
    report = evaluate_with(**{"TC-04": "The Galaxy S24 has a 4000mAh battery."})
    assert "no supporting citation from [9]" in result(report, "TC-04")["problems"]


def test_wrong_fact_fails_even_with_citation():
    report = evaluate_with(**{"TC-01": "The iPhone 15 reaches 1600 nits outdoors [1]."})
    assert "missing fact(s) ['2000 nits']" in result(report, "TC-01")["problems"]


def test_fact_inside_a_longer_value_does_not_count():
    report = evaluate_with(**{"TC-01": "The iPhone 15 reaches 12000 nits outdoors [1]."})
    assert "missing fact(s) ['2000 nits']" in result(report, "TC-01")["problems"]


def test_spacing_differences_still_match():
    report = evaluate_with(**{"TC-04": "The Galaxy S24 has a 4000 mAh battery [9]."})
    assert result(report, "TC-04")["passed"]


def test_abstention_that_cites_a_snippet_fails():
    answer = "The sources don't mention colors, but it is IP68 rated [5]."
    report = evaluate_with(**{"TC-10": answer})
    assert "abstention answer cites [5]" in result(report, "TC-10")["problems"]


def test_comparison_must_mention_missing_iphone_battery_capacity():
    answer = "- iPhone 15 **48MP** [3] vs Galaxy S24 **50MP** [8]\n- Galaxy S24 battery **4000mAh** [9]"
    report = evaluate_with(**{"TC-07": answer})
    assert "must say which spec is missing from the sources" in result(report, "TC-07")["problems"]


def test_adjacent_citations_are_parsed():
    case = next(c for c in CASES["cases"] if c["id"] == "TC-07")
    scored = runner.score_case(case, "48MP and 50MP [3][8]; S24 4000mAh [9]; iPhone capacity not stated.", {1, 2, 3, 4, 5, 6, 7, 8, 9, 10})
    assert scored["citations"] == [3, 8, 9]
    assert scored["passed"]


def test_missing_answer_counts_as_failure():
    answers = {k: v for k, v in REFERENCE.items() if k != "TC-02"}
    report = runner.evaluate(CASES, SOURCES, answers)
    assert result(report, "TC-02")["problems"] == ["no answer"]
