"""General-knowledge evaluation (#172, prompt gk-v1): scripts/eval_runner.py --mode gk."""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("eval_runner", ROOT / "scripts/eval_runner.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

EVAL = ROOT / "prompts/eval"
GK_CASES = json.loads((EVAL / "gk_cases.json").read_text(encoding="utf-8"))
SOURCES = json.loads((EVAL / "sources.json").read_text(encoding="utf-8"))
GK_REFERENCE = json.loads((EVAL / "gk_reference_answers.json").read_text(encoding="utf-8"))["answers"]
LABEL = "General knowledge, not from TekaTech's saved specs."


def gk_with(removed=None, **overrides):
    return runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, **overrides}, removed)


def result(report, case_id):
    return next(r for r in report["results"] if r["id"] == case_id)


def test_reference_answers_pass_every_gk_case():
    report = gk_with()
    assert report["targets_met"], report["failures"]
    total = len(GK_CASES["cases"])
    assert report["metrics"]["cases_passed"] == {"passed": total, "total": total, "rate": 1.0}
    assert report["metrics"]["off_topic_declined"] == {"passed": 1, "total": 1, "rate": 1.0}
    assert report["metrics"]["unknown_refusal"]["total"] == 1
    # GK-07 (Pixel 9) and GK-08 (scoped DeX question, gk-cases-v4).
    assert report["metrics"]["real_product_answered"] == {"passed": 2, "total": 2, "rate": 1.0}


def test_gk_set_covers_every_case_kind():
    kinds = {case["type"] for case in GK_CASES["cases"]}
    assert kinds == set(runner.GK_CASE_TYPES)
    assert all(case["id"] in GK_REFERENCE for case in GK_CASES["cases"])
    frozen = [case["id"] for case in GK_CASES["cases"] if "added" not in case]
    assert frozen == [f"GK-0{n}" for n in range(1, 7)]


def test_every_expected_gk_fact_traces_to_a_stored_source():
    snippets = {s["id"]: s for s in SOURCES["snippets"]}
    for case in GK_CASES["cases"]:
        if case.get("should_refuse") or case.get("should_decline"):
            assert "expected_facts" not in case
            continue
        if (case.get("should_not_refuse") or case["type"] == "reaches_web") and "expected_facts" not in case:
            # A regression case with no stored spec for its product: nothing to trace, and
            # nothing may be asserted (GK-07, Pixel 9). A web answer's facts come from pages
            # found at query time, not sources.json (GK-10).
            assert "trace" not in case
            continue
        assert case["trace"], case["id"]
        for trace in case["trace"]:
            assert trace["gadget"] in SOURCES["gadgets"]
            assert snippets[trace["snippet"]]["gadget"] == trace["gadget"]
        for fact in case["expected_facts"]:
            assert any(runner.has_fact(snippets[t["snippet"]]["text"], fact)
                       for t in case["trace"]), (case["id"], fact)


def test_answer_with_a_citation_marker_fails():
    report = gk_with(**{"GK-01": GK_REFERENCE["GK-01"] + " [1]"})
    case = result(report, "GK-01")
    assert not case["passed"] and not case["checks"]["no_citations"]
    assert not report["targets_met"]


@pytest.mark.parametrize("marker", ["[1,2]", "[2][3]", "(1)", "[^1]", "¹"])
def test_other_citation_styles_fail_too(marker):
    report = gk_with(**{"GK-04": GK_REFERENCE["GK-04"] + f" Source {marker}"})
    assert not result(report, "GK-04")["checks"]["no_citations"]


def test_marker_removed_by_the_backend_still_fails():
    case = result(gk_with(removed={"GK-04": 1}), "GK-04")
    assert not case["passed"] and not case["checks"]["no_citations"]
    assert "1 citation marker(s) removed by the backend" in case["problems"]


def test_missing_label_fails():
    unlabelled = GK_REFERENCE["GK-01"].replace(LABEL + " ", "")
    case = result(gk_with(**{"GK-01": unlabelled}), "GK-01")
    assert not case["passed"] and not case["checks"]["labelled"]


def test_label_must_open_the_answer():
    late = GK_REFERENCE["GK-01"].replace(LABEL + " ", "") + " This is general knowledge."
    assert not result(gk_with(**{"GK-01": late}), "GK-01")["checks"]["labelled"]


def test_bold_label_still_counts():
    bold = GK_REFERENCE["GK-01"].replace("General knowledge", "**General knowledge**", 1)
    assert result(gk_with(**{"GK-01": bold}), "GK-01")["passed"]


def test_invented_specs_for_the_fictional_product_fail():
    invented = LABEL + " The Nordvale Q7 Fold has a **5000mAh** battery."
    report = gk_with(**{"GK-03": invented})
    case = result(report, "GK-03")
    assert not case["passed"] and not case["checks"]["unknown_refusal"]
    assert not report["targets_met"]


def test_refusal_that_still_guesses_a_spec_fails():
    guess = LABEL + " I don't know this product, but foldables usually have about 4400 mAh."
    case = result(gk_with(**{"GK-03": guess}), "GK-03")
    assert not case["checks"]["unknown_refusal"]
    assert any("for an unknown product" in p for p in case["problems"])


def test_verified_claim_fails_but_the_negated_label_does_not():
    claim = GK_REFERENCE["GK-01"] + " This is verified."
    assert not result(gk_with(**{"GK-01": claim}), "GK-01")["checks"]["no_verified_claims"]
    data = GK_REFERENCE["GK-05"] + " That comes from TekaTech's saved specs."
    assert not result(gk_with(**{"GK-05": data}), "GK-05")["checks"]["no_verified_claims"]
    assert result(gk_with(), "GK-01")["checks"]["no_verified_claims"]


def test_unhedged_spec_number_fails():
    flat = LABEL + " The base iPhone 15 display is **6.1 inches**."
    case = result(gk_with(**{"GK-04": flat}), "GK-04")
    assert any("without hedging" in p for p in case["problems"])


@pytest.mark.parametrize("problem, case_id, answer", [
    ("contains a URL", "GK-04", GK_REFERENCE["GK-04"] + " See support.apple.com for details."),
    ("states a price", "GK-01", GK_REFERENCE["GK-01"] + " It may cost about $799."),
    ("uses markup", "GK-01", LABEL + "\n# Chip\nThe base iPhone 15 uses the **A16 Bionic**; models may differ."),
])
def test_urls_prices_and_unrendered_markup_fail(problem, case_id, answer):
    problems = result(gk_with(**{case_id: answer}), case_id)["problems"]
    assert any(p.startswith(problem) for p in problems), problems


def test_comparison_needs_bullets_with_at_most_one_lead_in_line():
    prose = LABEL + " The iPhone 15 uses the A16 and the Philippine Galaxy S24 the Exynos 2400; it may vary."
    assert any("bullets" in p for p in result(gk_with(**{"GK-02": prose}), "GK-02")["problems"])
    two_lines = GK_REFERENCE["GK-02"].replace(LABEL, LABEL + "\nProcessors:")
    assert any("lines before the bullets" in p
               for p in result(gk_with(**{"GK-02": two_lines}), "GK-02")["problems"])


def test_missing_answer_is_reported_with_its_denominator():
    answers = dict(GK_REFERENCE)
    del answers["GK-03"]
    report = runner.evaluate_gk(GK_CASES, answers)
    assert result(report, "GK-03")["problems"] == ["no answer"]
    assert report["metrics"]["unknown_refusal"] == {"passed": 0, "total": 1, "rate": 0.0}
    assert not report["targets_met"]


def test_unknown_gk_case_type_is_refused():
    bad = {"cases": [{"id": "GK-X", "type": "trivia", "query": "?"}]}
    with pytest.raises(ValueError, match="unknown GK type"):
        runner.evaluate_gk(bad, {"GK-X": LABEL})


def test_markdown_gk_report_states_versions_and_denominators():
    report = gk_with(**{"GK-01": LABEL + " The iPhone 15 uses the A16 [1]."})
    report.update(provider="reference", model="none", prompt_version="gk-v1", origin="reference")
    md = runner.markdown_gk_report(report)
    assert "| Prompt version | gk-v1 |" in md and "| Cases version | gk-cases-v6 |" in md
    assert "| Partly answered by specs: stayed grounded and cited | 1.0 | 2 / 2 | 1.0 |" in md
    assert "| Not in the specs, web search on: cited web answer | 1.0 | 1 / 1 | 1.0 |" in md
    assert "| No citation markers | 0.875 | 7 / 8 | 1.0 |" in md
    assert "| Real product not refused as unknown | 1.0 | 2 / 2 | 1.0 |" in md
    assert "**GK-01** (known)" in md


def run_cli(*args):
    return subprocess.run([sys.executable, str(ROOT / "scripts/eval_runner.py"), *args],
                          capture_output=True, text=True, cwd=ROOT)


def test_cli_gk_mode_scores_the_reference_answers(tmp_path):
    out = tmp_path / "gk.json"
    proc = run_cli("--mode", "gk", "--answers", str(EVAL / "gk_reference_answers.json"),
                   "--report", str(out))
    assert proc.returncode == 0, proc.stdout + proc.stderr
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["mode"] == "gk" and report["prompt_version"] == "gk-v1"
    assert report["origin"] == "reference"


def test_cli_gk_mode_exits_1_on_a_failure_and_2_on_grounded_rules(tmp_path):
    answers = tmp_path / "answers.json"
    answers.write_text(json.dumps({"answers": {**GK_REFERENCE, "GK-01": "A16 [1]"}}), encoding="utf-8")
    assert run_cli("--mode", "gk", "--answers", str(answers)).returncode == 1
    assert run_cli("--mode", "gk", "--rules", "s4", "--answers", str(answers)).returncode == 2


def test_default_mode_is_still_the_grounded_scorer():
    proc = run_cli("--answers", str(EVAL / "reference_answers.json"))
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert proc.stdout.startswith("=== TekaTech evaluation |")
    assert "s5-ad-cases-v3" in proc.stdout


def test_off_topic_answer_that_complies_fails():
    poem = LABEL + " The ocean rolls in silver light,\nits waves keep time all through the night."
    case = result(gk_with(**{"GK-06": poem}), "GK-06")
    assert not case["passed"] and not case["checks"]["off_topic_declined"]
    assert any("should decline" in p for p in case["problems"])


def test_off_topic_decline_that_still_answers_fails():
    answer = (LABEL + " I can only help with questions about gadgets and their specs. "
              "But here is a poem anyway. The sea is wide. The sky is blue. The waves are new.")
    case = result(gk_with(**{"GK-06": answer}), "GK-06")
    assert not case["checks"]["off_topic_declined"]
    assert any("still answers" in p for p in case["problems"])


# --- answer_basis and the backend's own strings (S4-AD takeover, Ikeee-AI) -----------------
# POST /query labels every reply with answer_basis. A GK case scored on a grounded reply (the
# database had specs for the gadget) or on the canned no-match reply is not a GK result.

def test_recorded_basis_other_than_general_knowledge_fails_the_case():
    report = runner.evaluate_gk(GK_CASES, GK_REFERENCE, basis={"GK-01": "specs", "GK-03": "none"})
    for case_id, basis in (("GK-01", "specs"), ("GK-03", "none")):
        case = result(report, case_id)
        assert not case["passed"] and not case["checks"]["basis_general_knowledge"]
        assert any(f"answer_basis is '{basis}'" in p for p in case["problems"])
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 0, "total": 2, "rate": 0.0}
    assert not report["targets_met"]


def test_recorded_general_knowledge_basis_passes_and_is_counted():
    expected = {"stays_grounded": "specs", "reaches_web": "web"}
    basis = {case["id"]: expected.get(case["type"], "general_knowledge") for case in GK_CASES["cases"]}
    report = runner.evaluate_gk(GK_CASES, GK_REFERENCE, basis=basis)
    assert report["targets_met"], report["failures"]
    total = sum(case["type"] not in expected for case in GK_CASES["cases"])
    assert report["metrics"]["basis_general_knowledge"] == {"passed": total, "total": total, "rate": 1.0}


def test_basis_not_recorded_is_not_checked_and_has_no_target():
    report = gk_with()
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 0, "total": 0, "rate": None}
    assert "basis_general_knowledge" not in report["targets"]
    report.update(provider="reference", model="none", prompt_version="gk-v1", origin="reference")
    md = runner.markdown_gk_report(report)
    assert "| Reply answer_basis is general_knowledge (when recorded) | n/a | 0 / 0 | n/a |" in md


def test_missing_answer_with_a_recorded_basis_counts_against_it():
    answers = {k: v for k, v in GK_REFERENCE.items() if k != "GK-02"}
    report = runner.evaluate_gk(GK_CASES, answers, basis={"GK-02": "general_knowledge"})
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 0, "total": 1, "rate": 0.0}


def test_cli_reads_answer_basis_from_the_answers_file(tmp_path):
    answers = tmp_path / "answers.json"
    answers.write_text(json.dumps({"answers": GK_REFERENCE, "answer_basis": {"GK-05": "specs"}}),
                       encoding="utf-8")
    out = tmp_path / "gk.json"
    proc = run_cli("--mode", "gk", "--answers", str(answers), "--report", str(out))
    assert proc.returncode == 1, proc.stdout + proc.stderr
    assert "answer_basis is 'specs'" in proc.stdout
    assert json.loads(out.read_text(encoding="utf-8"))["metrics"]["basis_general_knowledge"]["total"] == 1
    answers.write_text(json.dumps({"answers": GK_REFERENCE, "answer_basis": ["specs"]}), encoding="utf-8")
    assert run_cli("--mode", "gk", "--answers", str(answers)).returncode == 2


def test_real_product_refused_as_unknown_fails():
    # Recorded on #193 (2 Nov, dev): the Pixel 9 question once got this refusal.
    refusal = LABEL + " I don't recognize the Pixel 9 as a confirmed model, so I can't say which processor it uses."
    report = gk_with(**{"GK-07": refusal})
    case = result(report, "GK-07")
    assert not case["passed"] and not case["checks"]["real_product_answered"]
    assert "refuses a real product as unknown" in case["problems"]
    assert report["metrics"]["real_product_answered"] == {"passed": 1, "total": 2, "rate": 0.5}
    assert not report["targets_met"]


def test_scoped_dex_question_answered_from_specs_fails_gk_08():
    # Recorded on production, 15 Nov 2026 (Galaxy S24 page, toggle on): the scoped question got
    # a grounded "not stated" reply with citations instead of a general-knowledge answer.
    grounded = ("The provided spec snippets do not state whether the Galaxy S24 supports Samsung DeX. "
                "They cover the display [1] and battery [2].")
    report = runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-08": grounded}, basis={"GK-08": "specs"})
    case = result(report, "GK-08")
    assert not case["passed"]
    assert not case["checks"]["basis_general_knowledge"]
    assert not case["checks"]["labelled"] and not case["checks"]["no_citations"]
    assert not report["targets_met"]


def test_gk_08_is_scoped_to_the_galaxy_s24_and_asserts_no_dex_fact():
    import importlib.util as util
    spec_ = util.spec_from_file_location("eval_adapter", ROOT / "scripts/eval_adapter.py")
    adapter = util.module_from_spec(spec_)
    spec_.loader.exec_module(adapter)
    names, cases = adapter.load_scope(EVAL / "gk_scope.json")
    assert set(cases) <= {c["id"] for c in GK_CASES["cases"]}
    assert cases["GK-08"] == ["galaxy-s24-ph"]
    # The scope key is the pack's gadget key, and the catalog name is part of the pack's label.
    assert names["galaxy-s24-ph"] in SOURCES["gadgets"]["galaxy-s24-ph"]["label"]
    gk08 = next(c for c in GK_CASES["cases"] if c["id"] == "GK-08")
    assert gk08["should_not_refuse"] and "expected_facts" not in gk08 and "trace" not in gk08
    # No DeX spec is in the verified pack, so nothing about DeX may be expected.
    assert not any("dex" in s["text"].lower() for s in SOURCES["snippets"])


def test_gk_09_battery_comparison_replaced_by_general_knowledge_fails():
    # Production retest, 15 Nov (gkf-v1): the comparison fell through to unverified estimates.
    estimate = (LABEL + "\n- Galaxy S24: about **3,900-4,000 mAh**\n"
                "- iPhone 15: about **3,300-3,400 mAh**, so the S24 typically has the bigger battery")
    report = runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-09": estimate}, basis={"GK-09": "general_knowledge"})
    case = result(report, "GK-09")
    assert not case["passed"] and not case["checks"]["stayed_grounded"]
    assert any("answer_basis is 'general_knowledge'" in p for p in case["problems"])
    assert "labelled as general knowledge although the specs answer part of it" in case["problems"]
    assert "cites no snippet" in case["problems"]
    # GK-11 (the other stays_grounded case) still passes with its reference answer.
    assert report["metrics"]["stayed_grounded"] == {"passed": 1, "total": 2, "rate": 0.5}
    assert not report["targets_met"]


def test_gk_09_grounded_answer_must_state_the_value_and_the_gap():
    no_gap = "The Galaxy S24's battery is **4000mAh** [1], so it has the bigger battery."
    case = result(runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-09": no_gap}, basis={"GK-09": "specs"}), "GK-09")
    assert case["checks"]["stayed_grounded"] and not case["passed"]
    assert "must say which gadget's spec is not stated in the sources" in case["problems"]
    no_value = "The iPhone 15's battery capacity is not stated [2]."
    case = result(runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-09": no_value}), "GK-09")
    assert not case["checks"]["known_facts"]


def test_gk_09_is_scoped_to_both_phones_and_traces_its_fact():
    import importlib.util as util
    spec_ = util.spec_from_file_location("eval_adapter", ROOT / "scripts/eval_adapter.py")
    adapter = util.module_from_spec(spec_)
    spec_.loader.exec_module(adapter)
    _, cases = adapter.load_scope(EVAL / "gk_scope.json")
    assert cases["GK-09"] == ["iphone-15", "galaxy-s24-ph"]
    gk09 = result({"results": GK_CASES["cases"]}, "GK-09")
    assert gk09["type"] == "stays_grounded" and gk09["requires_missing_note"]
    # No iPhone 15 battery capacity is in the pack, which is why the note is required.
    assert not any("mah" in s["text"].lower() for s in SOURCES["snippets"] if s["gadget"] == "iphone-15")


def test_real_product_check_only_applies_to_flagged_cases():
    report = gk_with()
    assert "real_product_answered" not in result(report, "GK-03")["checks"]
    assert result(report, "GK-03")["checks"]["unknown_refusal"]


def test_the_backend_label_and_off_topic_reply_satisfy_the_scorer():
    # The scorer and gk-v1 must agree on the exact strings the prompt asks for; if either
    # constant in backend/prompts.py changes, this fails instead of every real answer failing.
    from prompts import GK_DISCLAIMER, GK_OFF_TOPIC
    assert GK_DISCLAIMER == LABEL
    case = result(gk_with(**{"GK-06": f"{GK_DISCLAIMER} {GK_OFF_TOPIC}"}), "GK-06")
    assert case["passed"], case["problems"]
    assert case["checks"]["off_topic_declined"] and case["checks"]["labelled"]


# --- GK-10 / GK-11: "Search the Web" routing (web-v1, pre-review of PR #294; web-v2 since 27 Nov) -------------------

def test_web_cases_are_scoped_and_ask_with_web_search_on():
    scope = json.loads((EVAL / "gk_scope.json").read_text(encoding="utf-8"))["cases"]
    for case_id, kind in (("GK-10", "reaches_web"), ("GK-11", "stays_grounded")):
        case = result({"results": GK_CASES["cases"]}, case_id)
        assert case["type"] == kind and case["allow_web_search"] is True
        assert scope[case_id] == ["galaxy-s24-ph"]


def test_the_backend_web_label_satisfies_the_scorer():
    from prompts import WEB_DISCLAIMER

    case = result(gk_with(**{"GK-10": f"{WEB_DISCLAIMER} It supports Samsung DeX [1]."}), "GK-10")
    assert case["passed"], case["problems"]


def test_reaches_web_fails_a_grounded_decline_or_a_general_knowledge_answer():
    decline = "The snippets do not state whether the Galaxy S24 supports Samsung DeX."
    case = result(runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-10": decline}, basis={"GK-10": "specs"}), "GK-10")
    assert not case["passed"] and not case["checks"]["reached_web"]
    assert any("answer_basis is 'specs'" in p for p in case["problems"])
    assert "does not open with the web label" in case["problems"] and "cites no web page" in case["problems"]
    gk = result(gk_with(**{"GK-10": f"{LABEL} It probably supports DeX."}), "GK-10")
    assert not gk["passed"]


def test_reaches_web_fails_raw_links_and_a_missing_answer():
    linked = "From the web, not from TekaTech's saved specs. Yes ([samsung.com](https://www.samsung.com/ph/s24))."
    case = result(gk_with(**{"GK-10": linked}), "GK-10")
    assert "contains a raw link instead of [n] citations" in case["problems"]
    missing = {k: v for k, v in GK_REFERENCE.items() if k != "GK-10"}
    report = runner.evaluate_gk(GK_CASES, missing)
    assert result(report, "GK-10")["problems"] == ["no answer"]
    assert report["metrics"]["reached_web"]["passed"] == 0 and not report["targets_met"]


def test_gk11_web_answer_replacing_a_cited_one_fails():
    web = "From the web, not from TekaTech's saved specs. It uses the Exynos 2400 and ships without a charger [1]."
    case = result(runner.evaluate_gk(GK_CASES, {**GK_REFERENCE, "GK-11": web}, basis={"GK-11": "web"}), "GK-11")
    assert not case["passed"] and not case["checks"]["stayed_grounded"]
