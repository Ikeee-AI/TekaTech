"""The optional general-knowledge answer on POST /query (#172).

Only the no-match branch may use it, only when the request allows it, and it must stay out of
the answer cache's other scope, the citations, and query_history (which feeds the public
trending list).
"""
from types import SimpleNamespace
from unittest.mock import patch

import openai
import pytest

import answer_cache
from conftest import signed_in_as
from prompts import (
    GK_FALLBACK_VERSION,
    GK_PROMPT_VERSION,
    PROMPT_VERSION,
    build_general_knowledge_prompt,
    build_system_prompt,
)
from routers.query import (
    ANSWER_MAX_COMPLETION_TOKENS,
    ANSWER_MODEL,
    ANSWER_REASONING_EFFORT,
    DETAIL_LOOKUP_FAILED,
    DETAIL_UNAVAILABLE,
    DETAIL_UNUSABLE,
    EMBEDDING_MODEL,
    NO_MATCHES_ANSWER,
)

GADGET_A = "11111111-1111-1111-1111-111111111111"
GADGET_B = "22222222-2222-2222-2222-222222222222"
LABEL = "General knowledge, not from TekaTech's saved specs."
BASE = [1.0, 0.0, 0.0]
SIMILAR = [0.96, 0.28, 0.0]  # cosine 0.96: a reworded question the grounded cache would reuse


def _embedding(vector=BASE):
    return SimpleNamespace(data=[SimpleNamespace(embedding=vector)], usage=SimpleNamespace(total_tokens=7))


def _completion(content=f"{LABEL} It has about **8** cores.", finish_reason="stop"):
    choice = SimpleNamespace(message=SimpleNamespace(content=content), finish_reason=finish_reason)
    return SimpleNamespace(choices=[choice], usage=SimpleNamespace(prompt_tokens=200, completion_tokens=60))


@pytest.fixture
def openai_mock():
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _embedding()
        mock_client.chat.completions.create.return_value = _completion()
        yield mock_client


def _no_specs(fake_supabase):
    fake_supabase.set_response("_rpc", None, [])


def _with_specs(fake_supabase):
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": GADGET_A, "content": "8-core CPU", "source_url": None, "similarity": 0.8}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET_A, "name": "Gadget A", "brand": "B"}])


def _ask(client, question="Does the iPhone 15 have a headphone jack?", **body):
    return client.post("/query", json={"question": question, **body})


def _history(fake_supabase):
    return [row for table, op, row in fake_supabase.writes if table == "query_history" and op == "insert"]


def _chat_messages(openai_mock, call=-1):
    return openai_mock.chat.completions.create.call_args_list[call].kwargs["messages"]


def test_flag_off_keeps_the_no_match_answer(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    data = _ask(client).json()
    assert data["answer"] == NO_MATCHES_ANSWER
    assert data["answer_basis"] == "none"
    assert data["model_used"] == "none"
    openai_mock.chat.completions.create.assert_not_called()


def test_flag_on_and_no_match_gives_a_general_knowledge_answer(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    resp = _ask(client, allow_general_knowledge=True)
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer_basis"] == "general_knowledge"
    assert data["answer"].startswith(LABEL)
    assert data["sources"] == []
    assert data["retrieval"] == "none"
    assert data["model_used"] == f"openai:{ANSWER_MODEL}"
    assert data["invalid_citations_removed"] == 0
    assert data["cached"] is False

    openai_mock.chat.completions.create.assert_called_once()
    kwargs = openai_mock.chat.completions.create.call_args.kwargs
    assert kwargs["max_completion_tokens"] == ANSWER_MAX_COMPLETION_TOKENS
    assert kwargs["reasoning_effort"] == ANSWER_REASONING_EFFORT
    system, user = _chat_messages(openai_mock)
    assert system["content"] == build_general_knowledge_prompt(False) != build_system_prompt(False)
    # The question alone: no snippet block, nothing that could be read as a source.
    assert user["content"] == "Question: Does the iPhone 15 have a headphone jack?"


def test_plain_language_selects_the_plain_general_knowledge_prompt(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    _ask(client, allow_general_knowledge=True, plain_language=True)
    assert _chat_messages(openai_mock)[0]["content"] == build_general_knowledge_prompt(True)


def test_flag_on_with_matches_still_gives_the_grounded_answer(client, fake_supabase, openai_mock):
    _with_specs(fake_supabase)
    openai_mock.chat.completions.create.return_value = _completion("It has 8 cores [1].")
    data = _ask(client, "How many cores?", allow_general_knowledge=True).json()
    assert data["answer_basis"] == "specs"
    assert len(data["sources"]) == 1
    assert data["retrieval"] == "vector"
    system, user = _chat_messages(openai_mock)
    # With the flag the grounded prompt carries the NOT_IN_SPECS fallback rule (gkf-v1).
    assert system["content"] == build_system_prompt(False, allow_general_knowledge=True)
    assert user["content"].startswith("Spec snippets:")
    assert len(_history(fake_supabase)) == 1
    openai_mock.chat.completions.create.assert_called_once()


def test_grounded_answers_are_labelled_specs_with_and_without_the_flag(client, fake_supabase, openai_mock):
    _with_specs(fake_supabase)
    openai_mock.chat.completions.create.return_value = _completion("It has 8 cores [1].")
    assert _ask(client, "How many cores?").json()["answer_basis"] == "specs"


def test_citation_markers_in_a_general_knowledge_answer_are_removed_and_counted(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    openai_mock.chat.completions.create.return_value = _completion(f"{LABEL} It has no jack [1]. Per source [2].")
    data = _ask(client, allow_general_knowledge=True).json()
    assert "[1]" not in data["answer"] and "[2]" not in data["answer"]
    assert data["invalid_citations_removed"] == 2
    assert data["answer"].startswith(LABEL)


def test_general_knowledge_answers_are_not_written_to_query_history(client, fake_supabase, openai_mock):
    # query_history feeds the public /stats/trending-questions list.
    _no_specs(fake_supabase)
    _ask(client, allow_general_knowledge=True)
    _ask(client, allow_general_knowledge=True)  # an exact cache hit
    assert _history(fake_supabase) == []


@pytest.mark.parametrize(
    "content, finish_reason",
    [("A cut-off answer", "length"), ("", "stop"), ("   \n", "stop"), (None, "stop")],
)
def test_cut_off_or_empty_general_knowledge_output_is_a_503_and_not_cached(
    client, fake_supabase, openai_mock, content, finish_reason
):
    _no_specs(fake_supabase)
    openai_mock.chat.completions.create.return_value = _completion(content, finish_reason)
    resp = _ask(client, allow_general_knowledge=True)
    assert resp.status_code == 503
    assert resp.json()["detail"] == DETAIL_UNUSABLE
    openai_mock.chat.completions.create.return_value = _completion()
    assert _ask(client, allow_general_knowledge=True).json()["cached"] is False


def test_provider_failure_is_a_safe_503(client, fake_supabase, openai_mock):
    import httpx

    _no_specs(fake_supabase)
    response = httpx.Response(429, request=httpx.Request("POST", "https://api.openai.com/v1/x"))
    openai_mock.chat.completions.create.side_effect = openai.RateLimitError(
        "provider said: secret-detail sk-should-never-leak", response=response, body=None
    )
    resp = _ask(client, allow_general_knowledge=True)
    assert resp.status_code == 503
    assert resp.json()["detail"] == DETAIL_UNAVAILABLE
    assert "secret" not in resp.text and "sk-" not in resp.text


def test_exact_repeat_is_served_from_the_cache_with_its_basis(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    first = _ask(client, allow_general_knowledge=True).json()
    second = _ask(client, allow_general_knowledge=True).json()
    assert second["cached"] is True and second["cache_match"] == "exact"
    assert second["answer_basis"] == "general_knowledge"
    assert second["answer"] == first["answer"]
    assert openai_mock.chat.completions.create.call_count == 1


def test_general_knowledge_answer_is_never_served_without_the_flag(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    _ask(client, allow_general_knowledge=True)
    plain = _ask(client).json()
    assert plain["cached"] is False
    assert plain["answer"] == NO_MATCHES_ANSWER
    assert plain["answer_basis"] == "none"
    assert openai_mock.chat.completions.create.call_count == 1


def test_no_match_answer_is_never_served_with_the_flag(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    _ask(client)  # caches the "no relevant specs" reply for the flag-off scope
    flagged = _ask(client, allow_general_knowledge=True).json()
    assert flagged["cached"] is False
    assert flagged["answer_basis"] == "general_knowledge"


def test_scopes_differ_only_by_the_flag():
    off = answer_cache.scope_key(None, False, PROMPT_VERSION, EMBEDDING_MODEL, ANSWER_MODEL)
    on = answer_cache.scope_key(
        None, False, f"{PROMPT_VERSION}+{GK_FALLBACK_VERSION}+{GK_PROMPT_VERSION}", EMBEDDING_MODEL, ANSWER_MODEL
    )
    assert off != on


def test_a_reworded_question_does_not_reuse_a_general_knowledge_answer(client, fake_supabase, openai_mock):
    # Similarity reuse is for grounded answers only: retrieval for the reworded question is free
    # and may now find specs, so it runs again instead of replaying an unverified answer.
    _no_specs(fake_supabase)
    _ask(client, "Does the iPhone 15 have a headphone jack?", allow_general_knowledge=True)
    openai_mock.embeddings.create.return_value = _embedding(SIMILAR)
    second = _ask(client, "Is there a headphone jack on the iPhone 15?", allow_general_knowledge=True).json()
    assert second["cached"] is False
    assert openai_mock.chat.completions.create.call_count == 2


def test_adding_specs_for_the_gadget_clears_its_general_knowledge_answer(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    body = {"gadget_ids": [GADGET_A], "allow_general_knowledge": True}
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET_A, "name": "Gadget A"}])
    _ask(client, **body)
    answer_cache.invalidate_gadget(GADGET_A)
    assert _ask(client, **body).json()["cached"] is False


def test_comparison_mode_names_the_gadgets_but_sends_no_snippets(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    fake_supabase.set_response(
        "gadgets", "select", [{"id": GADGET_A, "name": "Gadget A"}, {"id": GADGET_B, "name": "Gadget B"}]
    )
    data = _ask(client, "Which has the better camera?", allow_general_knowledge=True,
                gadget_ids=[GADGET_A, GADGET_B]).json()
    assert data["answer_basis"] == "general_knowledge"
    user = _chat_messages(openai_mock)[1]["content"]
    assert user == "Question: Which has the better camera?\n\nGadgets being asked about: Gadget A, Gadget B."
    assert "Spec snippets" not in user


def test_gadget_name_lookup_failure_is_a_safe_503_before_the_chat_call(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)

    def broken_table(*a, **k):
        raise Exception("connection refused to db.internal:5432 password=hunter2")

    with patch.object(fake_supabase, "table", side_effect=broken_table):
        resp = _ask(client, allow_general_knowledge=True, gadget_ids=[GADGET_A])
    assert resp.status_code == 503
    assert resp.json()["detail"] == DETAIL_LOOKUP_FAILED
    assert "hunter2" not in resp.text
    openai_mock.chat.completions.create.assert_not_called()


def test_simulated_empty_answer_reports_no_basis(client, fake_supabase, openai_mock):
    from config import settings

    admin = SimpleNamespace(id="admin-1", app_metadata={"is_admin": True})
    with patch.object(settings, "failure_simulation_enabled", True), signed_in_as(admin):
        resp = client.post(
            "/query",
            json={"question": "Anything", "allow_general_knowledge": True},
            headers={"X-Simulate-Failure": "empty"},
        )
    assert resp.status_code == 200
    assert resp.json()["answer_basis"] == "none"
    openai_mock.chat.completions.create.assert_not_called()


def test_request_field_is_optional_and_must_be_a_boolean(client, fake_supabase, openai_mock):
    _no_specs(fake_supabase)
    assert _ask(client).status_code == 200
    assert _ask(client, allow_general_knowledge="not a bool").status_code == 422
