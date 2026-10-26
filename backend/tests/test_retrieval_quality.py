"""Issue #88 retrieval threshold, the keyword fallback and the admin-only answer-cache bypass."""
import logging
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from keyword_search import MAX_TERMS, STOPWORDS, build_keyword_query
from routers import query as query_module
from routers.query import KEYWORD_MATCH_COUNT, MATCH_COUNT, MATCH_THRESHOLD, NO_MATCHES_ANSWER

GADGET = "22222222-2222-2222-2222-222222222222"
ADMIN = SimpleNamespace(id="admin-1", app_metadata={"is_admin": True})
MEMBER = SimpleNamespace(id="user-1", app_metadata={})
KEYWORD_CHUNK = {
    "id": "c1", "gadget_id": GADGET, "content": "Exynos 2400 processor.", "source_url": None,
    "verified_at": None, "similarity": 0.2187, "keyword_rank": 0.06,
}
VECTOR_CHUNK = {"gadget_id": GADGET, "content": "4000mAh battery", "source_url": None, "similarity": 0.47}


def _embedding():
    return SimpleNamespace(data=[SimpleNamespace(embedding=[0.1] * 1536)])


def _completion(content="It uses the Exynos 2400 [1]."):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason="stop")])


@pytest.fixture(autouse=True)
def reset_keyword_log_flag(monkeypatch):
    monkeypatch.setattr(query_module, "_keyword_rpc_failure_logged", False)


def _ask(client, question="What chip does it use?", headers=None, **body):
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _embedding()
        mock_client.chat.completions.create.return_value = _completion()
        resp = client.post("/query", json={"question": question, **body}, headers=headers or {})
    return resp, mock_client


def _rpc_names(fake_supabase):
    return [name for name, _ in fake_supabase.rpc_calls]


def _gadget(fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "Galaxy S24", "brand": "Samsung"}])


# --- B1: the measured threshold is what the RPC receives ---

def test_threshold_is_the_measured_value_and_is_sent_to_the_rpc(client, fake_supabase):
    assert MATCH_THRESHOLD == 0.25  # docs/evidence/retrieval-threshold-2026-10-27.md
    fake_supabase.set_response("_rpc", None, [])
    _ask(client)
    name, params = fake_supabase.rpc_calls[0]
    assert name == "match_spec_documents"
    assert params["match_threshold"] == MATCH_THRESHOLD
    assert params["match_count"] == MATCH_COUNT


def test_threshold_is_below_the_lowest_measured_relevant_score():
    # Measured on the eval pack: lowest relevant pair 0.2608, highest off-topic question 0.2187.
    assert 0.2187 < MATCH_THRESHOLD < 0.2608


# --- B2: keyword fallback only when the vector search found nothing ---

def test_vector_hit_never_runs_the_keyword_fallback(client, fake_supabase):
    fake_supabase.set_response("_rpc:match_spec_documents", None, [VECTOR_CHUNK])
    fake_supabase.set_response("_rpc:keyword_match_spec_documents", None, [KEYWORD_CHUNK])
    _gadget(fake_supabase)
    resp, _ = _ask(client)
    assert resp.status_code == 200
    assert resp.json()["retrieval"] == "vector"
    assert _rpc_names(fake_supabase) == ["match_spec_documents"]


def test_keyword_fallback_supplies_numbered_snippets_when_vector_finds_nothing(client, fake_supabase):
    fake_supabase.set_response("_rpc:match_spec_documents", None, [])
    fake_supabase.set_response("_rpc:keyword_match_spec_documents", None, [KEYWORD_CHUNK])
    _gadget(fake_supabase)
    resp, mock_client = _ask(client, gadget_ids=[GADGET])

    assert resp.status_code == 200
    data = resp.json()
    assert data["retrieval"] == "keyword"
    assert data["answer"] == "It uses the Exynos 2400 [1]."  # citation [1] stays valid
    assert data["invalid_citations_removed"] == 0
    assert data["sources"][0]["content"] == "Exynos 2400 processor."
    assert data["sources"][0]["similarity"] == 0.219  # the real cosine, not the keyword rank
    user_msg = mock_client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert "[1] (Galaxy S24) Exynos 2400 processor." in user_msg

    assert _rpc_names(fake_supabase) == ["match_spec_documents", "keyword_match_spec_documents"]
    params = fake_supabase.rpc_calls[1][1]
    assert params["match_gadget_ids"] == [GADGET]  # same scope as the vector search
    assert params["match_count"] == KEYWORD_MATCH_COUNT
    assert "processor" in params["search_query"].split(" or ")
    assert len(params["query_embedding"]) == 1536


def test_global_question_sends_no_gadget_scope_to_the_fallback(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    _ask(client)
    assert "match_gadget_ids" not in fake_supabase.rpc_calls[1][1]


def test_neither_search_finds_anything_is_the_no_evidence_answer(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    resp, mock_client = _ask(client)
    data = resp.json()
    assert (data["answer"], data["sources"], data["model_used"], data["retrieval"]) == (
        NO_MATCHES_ANSWER, [], "none", "none")
    mock_client.chat.completions.create.assert_not_called()


def test_question_without_searchable_words_skips_the_keyword_rpc(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    resp, _ = _ask(client, question="What is it?")
    assert resp.json()["retrieval"] == "none"
    assert _rpc_names(fake_supabase) == ["match_spec_documents"]


def test_missing_keyword_rpc_degrades_to_no_evidence_and_logs_once(client, fake_supabase, caplog):
    original_rpc = fake_supabase.rpc

    def rpc(name, params=None):
        if name == "keyword_match_spec_documents":
            fake_supabase.rpc_calls.append((name, params))
            raise Exception("PGRST202 Could not find the function public.keyword_match_spec_documents")
        return original_rpc(name, params)

    fake_supabase.set_response("_rpc", None, [])
    with patch.object(fake_supabase, "rpc", side_effect=rpc), caplog.at_level(logging.WARNING, "routers.query"):
        first, _ = _ask(client, question="What chip does it use?")
        second, _ = _ask(client, question="How big is the battery?")

    for resp in (first, second):
        assert resp.status_code == 200
        assert resp.json()["answer"] == NO_MATCHES_ANSWER
        assert resp.json()["retrieval"] == "none"
    assert _rpc_names(fake_supabase).count("keyword_match_spec_documents") == 2
    warnings = [r for r in caplog.records if "Keyword fallback unavailable" in r.getMessage()]
    assert len(warnings) == 1
    assert "PGRST202" not in first.text


def test_keyword_answers_are_cached_like_vector_answers(client, fake_supabase):
    fake_supabase.set_response("_rpc:match_spec_documents", None, [])
    fake_supabase.set_response("_rpc:keyword_match_spec_documents", None, [KEYWORD_CHUNK])
    _gadget(fake_supabase)
    _ask(client)
    resp, mock_client = _ask(client)
    data = resp.json()
    assert data["cached"] is True and data["cache_match"] == "exact"
    assert data["retrieval"] == "keyword"
    mock_client.embeddings.create.assert_not_called()


# --- B2: building the keyword query ---

@pytest.mark.parametrize(
    "question, expected_terms",
    [
        ("What chip does it use?", {"chip", "processor", "soc", "cpu", "chipset"}),
        ("battery?", {"battery", "mah"}),
        ("How big is the screen?", {"big", "screen", "display"}),
        ("camera", {"camera", "mp", "megapixel"}),
        ("How much storage?", {"storage", "gb", "tb"}),
        ("How heavy is it?", {"heavy", "weight", "grams"}),
        ("Fast charging?", {"fast", "charging", "watt"}),
    ],
)
def test_synonyms_expand_common_gadget_terms(question, expected_terms):
    terms = set(build_keyword_query(question).search_query.split(" or "))
    assert expected_terms <= terms


@pytest.mark.parametrize(
    "question, pattern_fragment",
    [("battery", "mah"), ("camera", "mp"), ("storage", "gb"), ("weight", "grams"), ("charging", "w\\y"),
     ("Is it 4000mAh?", "mah"), ("Does it charge at 25W?", "w\\y"), ("Is it 167g?", "grams")],
)
def test_unit_words_and_numbers_with_units_add_a_fixed_pattern(question, pattern_fragment):
    patterns = build_keyword_query(question).unit_patterns
    assert any(pattern_fragment in p for p in patterns)


def test_5g_is_not_read_as_a_weight():
    keywords = build_keyword_query("Does it support 5G?")
    assert keywords.search_query == "5g"
    assert keywords.unit_patterns == []


def test_stopwords_numbers_and_operators_are_dropped():
    keywords = build_keyword_query("What is the iPhone 15 or not and specs?")
    assert keywords.search_query == "iphone"
    assert not build_keyword_query("What is it?")
    assert {"or", "and", "not"} <= STOPWORDS


def test_question_text_cannot_inject_query_syntax_or_patterns():
    keywords = build_keyword_query('chip" | !battery & -(display) <-> \'x\':* \\y [0-9]')
    for term in keywords.search_query.split(" or "):
        assert term.isalnum() or "_" in term
    # Patterns come only from the fixed synonym table.
    assert keywords.unit_patterns == [r"[0-9]\s*mah\y"]


def test_expanded_query_is_bounded():
    question = " ".join(f"word{i}" for i in range(40))
    assert len(build_keyword_query(question).search_query.split(" or ")) == MAX_TERMS


# --- B3: X-Bypass-Answer-Cache is honored for admins only ---

def _ask_as(client, who, headers):
    with patch("routers.query.get_optional_user", return_value=who) as lookup:
        resp, mock_client = _ask(client, question="How big is the battery?", headers=headers)
    return resp, mock_client, lookup


BYPASS = {"X-Bypass-Answer-Cache": "1", "Authorization": "Bearer token"}


def _prime_cache(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [VECTOR_CHUNK])
    _gadget(fake_supabase)
    first, _ = _ask(client, question="How big is the battery?")
    assert first.json()["cached"] is False


def test_admin_bypass_skips_the_cache_read_but_still_stores(client, fake_supabase):
    _prime_cache(client, fake_supabase)
    resp, mock_client, _ = _ask_as(client, ADMIN, BYPASS)
    assert resp.json()["cached"] is False
    mock_client.embeddings.create.assert_called_once()
    mock_client.chat.completions.create.assert_called_once()

    # The fresh answer was stored: the next ordinary request is a cache hit.
    resp, mock_client = _ask(client, question="How big is the battery?")
    assert resp.json()["cached"] is True
    mock_client.chat.completions.create.assert_not_called()


@pytest.mark.parametrize("who", [None, MEMBER])
def test_bypass_header_is_ignored_for_anonymous_and_non_admin_callers(client, fake_supabase, who):
    _prime_cache(client, fake_supabase)
    resp, mock_client, _ = _ask_as(client, who, BYPASS)
    assert resp.json()["cached"] is True
    mock_client.chat.completions.create.assert_not_called()


def test_other_header_values_do_not_bypass_or_look_up_the_caller(client, fake_supabase):
    _prime_cache(client, fake_supabase)
    resp, _, lookup = _ask_as(client, ADMIN, {"X-Bypass-Answer-Cache": "0", "Authorization": "Bearer t"})
    assert resp.json()["cached"] is True
    lookup.assert_not_called()


def test_ordinary_requests_do_no_auth_lookup_for_the_bypass(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    with patch("routers.query.get_optional_user") as lookup:
        _ask(client, headers={"Authorization": "Bearer x"})
    lookup.assert_not_called()
