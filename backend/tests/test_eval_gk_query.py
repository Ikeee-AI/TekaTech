"""GK evaluation wired to the real POST /query reply shape (S4-AD takeover by Ikeee-AI).

Offline only: OpenAI and Supabase are mocked. The mocked model returns the hand-written
reference answers (prompts/eval/gk_reference_answers.json), so this checks the plumbing
(answer_basis, invalid_citations_removed, the label and the off-topic reply surviving the
backend) and the scorer together. It is not a measurement of model quality.
"""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("eval_runner", ROOT / "scripts/eval_runner.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

EVAL = ROOT / "prompts/eval"
ALL_GK_CASES = json.loads((EVAL / "gk_cases.json").read_text(encoding="utf-8"))
# The cases whose reply must be a general-knowledge answer. A stays_grounded case (GK-09, GK-11)
# needs stored specs and a grounded reply, so GK-09 is asked separately below; a reaches_web case
# (GK-10) needs web search, covered in test_query_web.py and test_query_stream.py.
GK_CASES = {**ALL_GK_CASES, "cases": [c for c in ALL_GK_CASES["cases"]
                                      if c["type"] not in ("stays_grounded", "reaches_web")]}
GK_REFERENCE = json.loads((EVAL / "gk_reference_answers.json").read_text(encoding="utf-8"))["answers"]
GADGET_A = "11111111-1111-1111-1111-111111111111"


def _completion(content):
    choice = SimpleNamespace(message=SimpleNamespace(content=content), finish_reason="stop")
    return SimpleNamespace(choices=[choice], usage=SimpleNamespace(prompt_tokens=200, completion_tokens=60))


@pytest.fixture
def openai_mock():
    with patch("routers.query.client") as mock_client:
        yield mock_client


def _collect(client, openai_mock, model_answers):
    """Ask every GK case the way an adapter would and keep what the scorer needs."""
    answers, removed, basis = {}, {}, {}
    for index, case in enumerate(GK_CASES["cases"]):
        # A distinct vector per question, so no reply can come from the similar-question cache.
        vector = [0.0] * len(GK_CASES["cases"])
        vector[index] = 1.0
        openai_mock.embeddings.create.return_value = SimpleNamespace(
            data=[SimpleNamespace(embedding=vector)], usage=SimpleNamespace(total_tokens=7))
        openai_mock.chat.completions.create.return_value = _completion(model_answers[case["id"]])
        resp = client.post("/query", json={"question": case["query"], "allow_general_knowledge": True,
                                           "plain_language": bool(case.get("plain_language"))})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        answers[case["id"]] = data["answer"]
        removed[case["id"]] = data["invalid_citations_removed"]
        basis[case["id"]] = data["answer_basis"]
    return answers, removed, basis


def test_reference_answers_through_query_meet_every_gk_target(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])  # no saved specs: the only path GK may take
    answers, removed, basis = _collect(client, openai_mock, GK_REFERENCE)
    report = runner.evaluate_gk(GK_CASES, answers, removed, basis)
    assert report["targets_met"], report["failures"]
    total = len(GK_CASES["cases"])
    assert report["metrics"]["basis_general_knowledge"] == {"passed": total, "total": total, "rate": 1.0}
    assert report["metrics"]["off_topic_declined"] == {"passed": 1, "total": 1, "rate": 1.0}
    assert report["metrics"]["unknown_refusal"] == {"passed": 1, "total": 1, "rate": 1.0}
    assert report["metrics"]["real_product_answered"] == {"passed": 2, "total": 2, "rate": 1.0}


def test_citation_the_backend_strips_still_fails_the_gk_case(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])
    baited = {**GK_REFERENCE, "GK-04": GK_REFERENCE["GK-04"] + " Source: [1]."}
    answers, removed, basis = _collect(client, openai_mock, baited)
    assert "[1]" not in answers["GK-04"] and removed["GK-04"] == 1
    report = runner.evaluate_gk(GK_CASES, answers, removed, basis)
    case = next(r for r in report["results"] if r["id"] == "GK-04")
    assert not case["passed"] and not case["checks"]["no_citations"]
    assert not report["targets_met"]


def _gk08_through_scoped_query(client, fake_supabase, openai_mock, *model_replies):
    """Ask GK-08 the way `eval_adapter.py --mode gk --scope prompts/eval/gk_scope.json` does:
    scoped to the Galaxy S24, which has specs, so retrieval returns its nearest chunks."""
    case = next(c for c in GK_CASES["cases"] if c["id"] == "GK-08")
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": GADGET_A, "content": "6.2-inch display.", "source_url": None, "similarity": 0.1}])
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET_A, "name": "Galaxy S24", "brand": "Samsung"}])
    openai_mock.embeddings.create.return_value = SimpleNamespace(
        data=[SimpleNamespace(embedding=[1.0, 0.0])], usage=SimpleNamespace(total_tokens=7))
    openai_mock.chat.completions.create.side_effect = [_completion(r) for r in model_replies]
    resp = client.post("/query", json={"question": case["query"], "allow_general_knowledge": True,
                                       "gadget_ids": [GADGET_A]})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    one_case = {**GK_CASES, "cases": [case]}
    return runner.evaluate_gk(one_case, {"GK-08": data["answer"]}, {"GK-08": data["invalid_citations_removed"]},
                              {"GK-08": data["answer_basis"]})


def test_gk_08_scoped_sentinel_reaches_the_general_knowledge_answer(client, fake_supabase, openai_mock):
    report = _gk08_through_scoped_query(client, fake_supabase, openai_mock, "NOT_IN_SPECS", GK_REFERENCE["GK-08"])
    assert report["targets_met"], report["failures"]
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 1, "total": 1, "rate": 1.0}


def test_gk_08_worded_decline_now_reaches_general_knowledge(client, fake_supabase, openai_mock):
    # The 15 Nov production reply shape: the model did not use the sentinel. Until 27 Nov 2026
    # this stayed a grounded decline (GK-08 failed); a fully declined answer now goes to GK too.
    report = _gk08_through_scoped_query(
        client, fake_supabase, openai_mock,
        "The provided spec snippets do not state whether the Galaxy S24 supports Samsung DeX [1].",
        GK_REFERENCE["GK-08"])
    assert report["targets_met"], report["failures"]
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 1, "total": 1, "rate": 1.0}


GADGET_B = "22222222-2222-2222-2222-222222222222"


def _gk09_through_scoped_query(client, fake_supabase, openai_mock, *model_replies):
    """Ask GK-09 scoped to the iPhone 15 and the Galaxy S24, as gk_scope.json does. The S24 chunk
    holds 4000mAh; the iPhone chunk has no battery capacity (as in sources.json)."""
    case = next(c for c in ALL_GK_CASES["cases"] if c["id"] == "GK-09")
    fake_supabase.set_response("_rpc", None, [
        {"gadget_id": GADGET_A, "content": "4000mAh battery; up to 29 hours video playback.",
         "source_url": None, "similarity": 0.4},
        {"gadget_id": GADGET_B, "content": "Video playback up to 20 hours.", "source_url": None, "similarity": 0.3},
    ])
    fake_supabase.set_response("gadgets", "select", [
        {"id": GADGET_A, "name": "Galaxy S24", "brand": "Samsung"},
        {"id": GADGET_B, "name": "iPhone 15", "brand": "Apple"}])
    openai_mock.embeddings.create.return_value = SimpleNamespace(
        data=[SimpleNamespace(embedding=[0.0, 1.0])], usage=SimpleNamespace(total_tokens=7))
    openai_mock.chat.completions.create.side_effect = [_completion(r) for r in model_replies]
    resp = client.post("/query", json={"question": case["query"], "allow_general_knowledge": True,
                                       "gadget_ids": [GADGET_B, GADGET_A]})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return runner.evaluate_gk({**ALL_GK_CASES, "cases": [case]}, {"GK-09": data["answer"]},
                              {"GK-09": data["invalid_citations_removed"]}, {"GK-09": data["answer_basis"]})


def test_gk_09_grounded_comparison_passes_through_query(client, fake_supabase, openai_mock):
    report = _gk09_through_scoped_query(client, fake_supabase, openai_mock, GK_REFERENCE["GK-09"])
    assert report["targets_met"], report["failures"]
    assert report["metrics"]["stayed_grounded"] == {"passed": 1, "total": 1, "rate": 1.0}


def test_gk_09_sentinel_then_estimates_fails(client, fake_supabase, openai_mock):
    # The gkf-v1 production reply: NOT_IN_SPECS, then a labelled answer with unverified estimates.
    estimate = LABEL_TEXT + "\n- Galaxy S24: about **3,900-4,000 mAh**\n- iPhone 15: about **3,300-3,400 mAh**"
    report = _gk09_through_scoped_query(client, fake_supabase, openai_mock, "NOT_IN_SPECS", estimate)
    assert not report["targets_met"]
    assert report["metrics"]["stayed_grounded"] == {"passed": 0, "total": 1, "rate": 0.0}


LABEL_TEXT = "General knowledge, not from TekaTech's saved specs."


def test_cases_answered_from_saved_specs_are_not_counted_as_gk(client, fake_supabase, openai_mock):
    # If the database holds specs for the gadget, /query answers grounded (answer_basis
    # "specs") and the GK prompt never runs; the scorer must not credit that as a GK pass.
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": GADGET_A, "content": "A16 Bionic chip.", "source_url": None, "similarity": 0.8}])
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET_A, "name": "Apple iPhone 15", "brand": "Apple"}])
    answers, removed, basis = _collect(client, openai_mock, GK_REFERENCE)
    assert set(basis.values()) == {"specs"}
    report = runner.evaluate_gk(GK_CASES, answers, removed, basis)
    assert report["metrics"]["basis_general_knowledge"] == {"passed": 0, "total": len(GK_CASES["cases"]), "rate": 0.0}
    assert report["metrics"]["cases_passed"]["passed"] == 0
    assert not report["targets_met"]
