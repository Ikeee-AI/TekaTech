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
GK_CASES = json.loads((EVAL / "gk_cases.json").read_text(encoding="utf-8"))
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
    assert report["metrics"]["real_product_answered"] == {"passed": 1, "total": 1, "rate": 1.0}


def test_citation_the_backend_strips_still_fails_the_gk_case(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])
    baited = {**GK_REFERENCE, "GK-04": GK_REFERENCE["GK-04"] + " Source: [1]."}
    answers, removed, basis = _collect(client, openai_mock, baited)
    assert "[1]" not in answers["GK-04"] and removed["GK-04"] == 1
    report = runner.evaluate_gk(GK_CASES, answers, removed, basis)
    case = next(r for r in report["results"] if r["id"] == "GK-04")
    assert not case["passed"] and not case["checks"]["no_citations"]
    assert not report["targets_met"]


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
