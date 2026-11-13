"""The /query answer cache (answer_cache.py): what hits, what misses, what invalidates it."""
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import httpx
import openai
import pytest

import answer_cache
from config import settings
from conftest import signed_in_as
from factories import sample_gadget
from prompts import PROMPT_VERSION
from routers.query import (
    ANSWER_MODEL,
    DETAIL_UNAVAILABLE,
    DETAIL_UNUSABLE,
    EMBEDDING_MODEL,
    NO_MATCHES_ANSWER,
)

GADGET_A = "11111111-1111-1111-1111-111111111111"
GADGET_B = "22222222-2222-2222-2222-222222222222"

# Unit vectors; cosine similarity with BASE is the first component.
BASE = [1.0, 0.0, 0.0]
SIMILAR = [0.96, 0.28, 0.0]  # cosine 0.96, at or above the 0.95 threshold
DIFFERENT = [0.9, 0.43588989, 0.0]  # cosine 0.90, below it


def _embedding(vector=BASE, tokens=7):
    return SimpleNamespace(data=[SimpleNamespace(embedding=vector)], usage=SimpleNamespace(total_tokens=tokens))


def _completion(content="It has 8 cores [1].", finish_reason="stop"):
    choice = SimpleNamespace(message=SimpleNamespace(content=content), finish_reason=finish_reason)
    return SimpleNamespace(choices=[choice], usage=SimpleNamespace(prompt_tokens=300, completion_tokens=90))


def _set_specs(fake_supabase, gadget_id=GADGET_A):
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": gadget_id, "content": "8-core CPU", "source_url": None, "similarity": 0.8}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id, "name": "Gadget A", "brand": "B"}])


@pytest.fixture
def openai_mock():
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _embedding()
        mock_client.chat.completions.create.return_value = _completion()
        yield mock_client


def _ask(client, question="How many cores does it have?", **body):
    return client.post("/query", json={"question": question, **body})


def _history(fake_supabase):
    return [row for table, op, row in fake_supabase.writes if table == "query_history" and op == "insert"]


# --- exact and similar hits ---

def test_first_answer_is_not_cached(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    data = _ask(client).json()
    assert (data["cached"], data["cache_match"]) == (False, None)


def test_exact_repeat_skips_both_openai_calls(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    first = _ask(client, "How many cores does it have?").json()
    # Normalization: case, extra whitespace and trailing punctuation don't matter.
    second = _ask(client, "  how MANY   cores does it have??! ").json()

    assert openai_mock.embeddings.create.call_count == 1
    assert openai_mock.chat.completions.create.call_count == 1
    assert (second["cached"], second["cache_match"]) == (True, "exact")
    # Every existing field is identical, so the frontend renders it the same way.
    for field in ("answer", "sources", "model_used", "invalid_citations_removed"):
        assert second[field] == first[field]


def test_similar_question_skips_only_the_chat_call(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, "How many cores does it have?")
    openai_mock.embeddings.create.return_value = _embedding(SIMILAR)
    data = _ask(client, "How many CPU cores are in it?").json()

    assert openai_mock.embeddings.create.call_count == 2
    assert openai_mock.chat.completions.create.call_count == 1
    assert (data["cached"], data["cache_match"]) == (True, "similar")
    assert data["answer"] == "It has 8 cores [1]."


def test_question_below_the_similarity_threshold_is_answered_fresh(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, "How many cores does it have?")
    openai_mock.embeddings.create.return_value = _embedding(DIFFERENT)
    data = _ask(client, "How much does it weigh?").json()

    assert openai_mock.chat.completions.create.call_count == 2
    assert data["cached"] is False


# --- scope: gadgets, plain-language flag, prompt version ---

def test_different_gadget_scope_misses(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    assert _ask(client, gadget_ids=[GADGET_B]).json()["cached"] is False
    assert _ask(client).json()["cached"] is False  # global search is its own scope
    assert _ask(client, gadget_ids=[GADGET_A, GADGET_B]).json()["cached"] is False
    assert openai_mock.chat.completions.create.call_count == 4


def test_gadget_order_does_not_matter(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A, GADGET_B])
    data = _ask(client, gadget_ids=[GADGET_B, GADGET_A]).json()
    assert data["cache_match"] == "exact"


def test_plain_language_flag_misses(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, plain_language=False)
    assert _ask(client, plain_language=True).json()["cached"] is False
    # Similar matching respects the scope too.
    openai_mock.embeddings.create.return_value = _embedding(SIMILAR)
    assert _ask(client, "How many CPU cores?", plain_language=True).json()["cache_match"] == "similar"
    assert openai_mock.chat.completions.create.call_count == 2


def test_prompt_version_change_misses(client, fake_supabase, openai_mock, monkeypatch):
    _set_specs(fake_supabase)
    _ask(client)
    monkeypatch.setattr("routers.query.PROMPT_VERSION", "v-next")
    assert _ask(client).json()["cached"] is False


# --- invalidation by spec and gadget writes ---

def test_spec_ingest_invalidates_answers_about_that_gadget(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    _ask(client)  # global
    # (The gadgets select set by _set_specs also satisfies the ingest route's existence check.)
    fake_supabase.set_response("spec_documents", "insert", [{"id": str(uuid4())}])
    assert client.post(f"/gadgets/{GADGET_A}/specs", json={"raw_text": "Battery: 5000 mAh"}).status_code == 201

    assert _ask(client, gadget_ids=[GADGET_A]).json()["cached"] is False
    assert _ask(client).json()["cached"] is False


def test_spec_change_for_another_gadget_keeps_scoped_answers_but_clears_global(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    _ask(client)  # global search could have used any gadget's specs
    fake_supabase.set_response("spec_documents", "insert", [{"id": str(uuid4())}])
    assert client.post(f"/gadgets/{GADGET_B}/specs", json={"raw_text": "Battery: 5000 mAh"}).status_code == 201

    assert _ask(client, gadget_ids=[GADGET_A]).json()["cache_match"] == "exact"
    assert _ask(client).json()["cached"] is False


def test_spec_indexing_invalidates(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    spec_id = str(uuid4())
    fake_supabase.set_response(
        "spec_documents", "select", [{"id": spec_id, "content": "Battery: 5000 mAh", "indexing_status": "pending"}]
    )
    fake_supabase.set_response("spec_documents", "update", [{"id": spec_id}])
    with patch("routers.specs.embed_texts", return_value=[[0.1, 0.2]]):
        assert client.post(f"/gadgets/{GADGET_A}/specs/{spec_id}/index").status_code == 200

    assert _ask(client, gadget_ids=[GADGET_A]).json()["cached"] is False


def test_spec_delete_invalidates_answers_about_that_gadget(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    spec_id = str(uuid4())
    fake_supabase.set_response("spec_documents", "delete", [{"id": spec_id, "gadget_id": GADGET_A}])
    assert client.delete(f"/gadgets/{GADGET_A}/specs/{spec_id}").status_code == 204

    assert _ask(client, gadget_ids=[GADGET_A]).json()["cached"] is False


def test_approved_correction_invalidates_everything(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    row = {"id": str(uuid4()), "spec_document_id": str(uuid4()), "suggested_content": "Battery: 4500 mAh",
           "status": "pending"}
    fake_supabase.set_response("spec_corrections", "select", [row])
    # The conditional update (... where status = 'pending') matched the row.
    fake_supabase.set_response("spec_corrections", "update", [{**row, "status": "approved"}])
    assert client.patch(f"/corrections/{uuid4()}", json={"action": "approve"}).status_code == 200
    assert _ask(client, gadget_ids=[GADGET_A]).json()["cached"] is False


def test_rejected_correction_keeps_the_cache(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    row = {"id": str(uuid4()), "spec_document_id": str(uuid4()), "suggested_content": "x", "status": "pending"}
    fake_supabase.set_response("spec_corrections", "select", [row])
    fake_supabase.set_response("spec_corrections", "update", [{**row, "status": "rejected"}])
    assert client.patch(f"/corrections/{uuid4()}", json={"action": "reject"}).status_code == 200
    assert _ask(client, gadget_ids=[GADGET_A]).json()["cache_match"] == "exact"


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_gadget_edit_or_delete_invalidates(client, fake_supabase, openai_mock, method):
    _set_specs(fake_supabase)
    _ask(client, gadget_ids=[GADGET_A])
    gadget = sample_gadget(id=GADGET_A, name="Renamed")
    fake_supabase.set_response("gadgets", "update", [gadget])
    fake_supabase.set_response("gadgets", "delete", [gadget])
    if method == "patch":
        assert client.patch(f"/gadgets/{GADGET_A}", json={"name": "Renamed"}).status_code == 200
    else:
        assert client.delete(f"/gadgets/{GADGET_A}").status_code == 204
    assert _ask(client, gadget_ids=[GADGET_A]).json()["cached"] is False


# --- what is never cached ---

def test_provider_error_is_not_cached(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    request = httpx.Request("POST", "https://api.openai.com/v1/test")
    openai_mock.chat.completions.create.side_effect = openai.APIConnectionError(request=request)
    assert _ask(client).json() == {"detail": DETAIL_UNAVAILABLE}

    openai_mock.chat.completions.create.side_effect = None
    data = _ask(client).json()
    assert data["cached"] is False
    assert data["answer"] == "It has 8 cores [1]."


@pytest.mark.parametrize("content, finish_reason", [("Cut off mid-sent", "length"), ("", "stop")])
def test_unusable_answer_is_not_cached(client, fake_supabase, openai_mock, content, finish_reason):
    _set_specs(fake_supabase)
    openai_mock.chat.completions.create.return_value = _completion(content, finish_reason)
    assert _ask(client).json() == {"detail": DETAIL_UNUSABLE}

    openai_mock.chat.completions.create.return_value = _completion()
    assert _ask(client).json()["cached"] is False


def test_write_during_answer_prevents_storing_it(client, fake_supabase, openai_mock):
    # Specs changed while the model was answering: the answer used the old specs.
    _set_specs(fake_supabase)

    def answer_while_specs_change(**kwargs):
        answer_cache.invalidate_gadget(GADGET_A)
        return _completion()

    openai_mock.chat.completions.create.side_effect = answer_while_specs_change
    _ask(client)
    openai_mock.chat.completions.create.side_effect = None
    assert _ask(client).json()["cached"] is False


# --- the "no relevant specs" answer ---

def test_no_evidence_answer_is_cached_for_exact_repeats(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])
    _ask(client)
    data = _ask(client).json()
    assert (data["answer"], data["model_used"], data["cache_match"]) == (NO_MATCHES_ANSWER, "none", "exact")
    assert openai_mock.embeddings.create.call_count == 1
    assert _history(fake_supabase) == []  # not recorded, same as when it is generated


def test_no_evidence_answer_is_not_reused_for_similar_questions(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])
    _ask(client)
    openai_mock.embeddings.create.return_value = _embedding(SIMILAR)
    _set_specs(fake_supabase)  # retrieval now finds something
    data = _ask(client, "How many CPU cores are in it?").json()
    assert data["cached"] is False
    assert data["answer"] == "It has 8 cores [1]."


def test_no_evidence_answer_is_invalidated_when_specs_are_added(client, fake_supabase, openai_mock):
    fake_supabase.set_response("_rpc", None, [])
    _ask(client)
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET_A}])
    fake_supabase.set_response("spec_documents", "insert", [{"id": str(uuid4())}])
    assert client.post(f"/gadgets/{GADGET_A}/specs", json={"raw_text": "8-core CPU"}).status_code == 201
    _set_specs(fake_supabase)
    data = _ask(client).json()
    assert data["cached"] is False
    assert data["answer"] == "It has 8 cores [1]."


# --- query_history ---

def test_cache_hits_are_recorded_with_zero_tokens_for_skipped_calls(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client, "How many cores does it have?")
    _ask(client, "how many cores does it have")
    openai_mock.embeddings.create.return_value = _embedding(SIMILAR, tokens=6)
    _ask(client, "How many CPU cores are in it?")

    fresh, exact, similar = _history(fake_supabase)
    assert (fresh["embedding_tokens"], fresh["prompt_tokens"], fresh["completion_tokens"]) == (7, 300, 90)
    assert (exact["embedding_tokens"], exact["prompt_tokens"], exact["completion_tokens"]) == (0, 0, 0)
    assert (similar["embedding_tokens"], similar["prompt_tokens"], similar["completion_tokens"]) == (6, 0, 0)
    # Trending questions count what was asked, so the row keeps this request's wording.
    assert similar["query_text"] == "How many CPU cores are in it?"
    assert similar["answer_text"] == fresh["answer_text"]
    assert similar["gadget_ids_ref"] == [GADGET_A]


def test_cache_hit_survives_history_failure(client, fake_supabase, openai_mock):
    _set_specs(fake_supabase)
    _ask(client)
    original_table = fake_supabase.table

    def failing(name):
        builder = original_table(name)
        if name == "query_history":
            def boom(*a, **k):
                raise Exception("query_history is unreachable")
            builder.insert = boom
        return builder

    with patch.object(fake_supabase, "table", side_effect=failing):
        resp = _ask(client)
    assert resp.status_code == 200
    assert resp.json()["cache_match"] == "exact"


# --- failure simulator bypasses the cache ---

def test_simulated_failure_is_served_even_when_an_answer_is_cached(client, fake_supabase, openai_mock, monkeypatch):
    _set_specs(fake_supabase)
    _ask(client)  # cached now
    monkeypatch.setattr(settings, "failure_simulation_enabled", True)
    admin = SimpleNamespace(id="admin-1", app_metadata={"is_admin": True})
    with signed_in_as(admin):
        resp = client.post(
            "/query", json={"question": "How many cores does it have?"}, headers={"X-Simulate-Failure": "timeout"}
        )
        assert resp.status_code == 503
        # A simulated empty retrieval leaves nothing behind either.
        client.post("/query", json={"question": "Unseen question"}, headers={"X-Simulate-Failure": "empty"})
    scope = answer_cache.scope_key(None, False, PROMPT_VERSION, EMBEDDING_MODEL, ANSWER_MODEL)
    assert answer_cache.lookup_exact(scope, "Unseen question") is None


# --- answer_cache.py on its own ---

def test_normalize_question():
    assert answer_cache.normalize_question("  How MANY\tcores?! ") == "how many cores"
    assert answer_cache.normalize_question("Battery life。") == "battery life"  # ideographic full stop
    assert answer_cache.normalize_question("Is it 5G-ready?") == "is it 5g-ready"


def _answer():
    return answer_cache.CachedAnswer(response={"answer": "a", "sources": []}, grounded=True)


def test_entry_count_is_capped_and_oldest_go_first(monkeypatch):
    monkeypatch.setattr(answer_cache, "MAX_ENTRIES", 3)
    scope = answer_cache.scope_key(None, False, "v1", "e", "m")
    generation = answer_cache.current_generation()
    for i in range(5):
        answer_cache.store(scope, f"question {i}", BASE, _answer(), generation)
    assert len(answer_cache._entries) == 3
    assert answer_cache.lookup_exact(scope, "question 0") is None
    assert answer_cache.lookup_exact(scope, "question 4") is not None


def test_expired_entries_do_not_hit(monkeypatch):
    monkeypatch.setattr(answer_cache, "TTL_SECONDS", 0)
    scope = answer_cache.scope_key(None, False, "v1", "e", "m")
    answer_cache.store(scope, "q", BASE, _answer(), answer_cache.current_generation())
    assert answer_cache.lookup_exact(scope, "q") is None
    assert answer_cache.lookup_similar(scope, BASE) is None


def test_store_after_an_invalidation_is_dropped():
    scope = answer_cache.scope_key([GADGET_B], False, "v1", "e", "m")
    generation = answer_cache.current_generation()
    answer_cache.invalidate_gadget(GADGET_A)  # any invalidation, even an unrelated gadget
    answer_cache.store(scope, "q", BASE, _answer(), generation)
    assert answer_cache.lookup_exact(scope, "q") is None


@pytest.mark.parametrize("bad", [None, ["x", "y"], 3])
def test_malformed_embedding_never_raises(bad):
    scope = answer_cache.scope_key(None, False, "v1", "e", "m")
    answer_cache.store(scope, "q", bad, _answer(), answer_cache.current_generation())
    assert answer_cache.lookup_exact(scope, "q") is not None  # exact match still works
    assert answer_cache.lookup_similar(scope, bad) is None


def test_zero_vector_never_matches_similar():
    scope = answer_cache.scope_key(None, False, "v1", "e", "m")
    answer_cache.store(scope, "q", [0.0, 0.0, 0.0], _answer(), answer_cache.current_generation())
    assert answer_cache.lookup_similar(scope, [0.0, 0.0, 0.0]) is None
    assert answer_cache.lookup_similar(scope, BASE) is None
