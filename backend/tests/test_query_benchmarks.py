"""Performance questions about named phones also cite their published benchmarks (24 Nov 2026)."""
from unittest.mock import patch

from tests.test_query import _fake_completion_response, _fake_embedding_response, _set_matching_spec

GADGET = "22222222-2222-2222-2222-222222222222"
OTHER = "33333333-3333-3333-3333-333333333333"
BENCH = {
    "gadget_id": GADGET, "kind": "game", "test": "Genshin Impact", "settings": "High",
    "value": 52.0, "unit": "fps", "source_url": "https://example.com/review", "checked_at": "2026-11-20",
}


def _ask(client, question, gadget_ids=(GADGET,), history=None):
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        mock_client.chat.completions.create.return_value = _fake_completion_response()
        body = {"question": question, "gadget_ids": list(gadget_ids)}
        if history:
            body["history"] = history
        resp = client.post("/query", json=body)
        calls = mock_client.chat.completions.create.call_args_list
    user_message = calls[-1].kwargs["messages"][1]["content"] if calls else ""
    return resp, user_message


def test_gaming_question_adds_benchmarks_as_numbered_cited_sources(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    fake_supabase.set_response("gadget_benchmarks", "select", [BENCH])
    resp, user = _ask(client, "Can it run Genshin Impact smoothly?")
    assert resp.status_code == 200
    assert "[2] (Gadget X, verified 2026-11-20) Game benchmark: Genshin Impact (High): 52 fps (published result)" in user
    sources = resp.json()["sources"]
    assert len(sources) == 2
    assert sources[1]["source_url"] == "https://example.com/review"


def test_non_performance_question_does_not_add_benchmarks(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    fake_supabase.set_response("gadget_benchmarks", "select", [BENCH])
    resp, user = _ask(client, "What colours does it come in?")
    assert resp.status_code == 200
    assert "Genshin" not in user
    assert len(resp.json()["sources"]) == 1


def test_follow_up_keeps_the_performance_subject(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    fake_supabase.set_response("gadget_benchmarks", "select", [BENCH])
    history = [{"question": "Is it good for gaming?", "answer": "It has a fast chip."}]
    resp, user = _ask(client, "And on high settings?", history=history)
    assert "Genshin Impact" in user


def test_unscoped_question_never_adds_benchmarks(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    fake_supabase.set_response("gadget_benchmarks", "select", [BENCH])
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        mock_client.chat.completions.create.return_value = _fake_completion_response()
        resp = client.post("/query", json={"question": "Which phone is best for gaming?"})
    assert resp.status_code == 200
    assert len(resp.json()["sources"]) == 1


def test_benchmarks_alone_still_answer_when_no_spec_text_matches(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "Gadget X", "brand": "B"}])
    fake_supabase.set_response("gadget_benchmarks", "select", [BENCH])
    resp, user = _ask(client, "How many fps in Genshin?")
    assert resp.status_code == 200
    assert resp.json()["retrieval"] == "benchmarks"
    assert resp.json()["answer_basis"] == "specs"
    assert "[1] (Gadget X" in user


def test_comparison_spreads_the_cap_across_phones(client, fake_supabase):
    from routers.query import MAX_BENCHMARK_SNIPPETS

    rows = [{**BENCH, "test": f"Game {i:02d}"} for i in range(20)]
    rows += [{**BENCH, "gadget_id": OTHER, "test": "Other game"}]
    _set_matching_spec(fake_supabase, GADGET)
    fake_supabase.set_response("gadgets", "select", [
        {"id": GADGET, "name": "Gadget X", "brand": "B"}, {"id": OTHER, "name": "Gadget Y", "brand": "B"},
    ])
    fake_supabase.set_response("gadget_benchmarks", "select", rows)
    resp, user = _ask(client, "Which is better for gaming?", gadget_ids=(GADGET, OTHER))
    assert resp.status_code == 200
    assert len(resp.json()["sources"]) == 1 + MAX_BENCHMARK_SNIPPETS
    assert "Other game" in user


def test_benchmark_lookup_failure_never_fails_the_answer(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    real_table = fake_supabase.table

    def table(name):
        if name == "gadget_benchmarks":
            raise RuntimeError("benchmarks table missing")
        return real_table(name)

    with patch.object(fake_supabase, "table", side_effect=table):
        resp, _ = _ask(client, "Is it good for gaming?")
    assert resp.status_code == 200
    assert len(resp.json()["sources"]) == 1
