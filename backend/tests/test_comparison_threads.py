"""Saved compare-page conversations (user_comparison_questions.sql, 23 Nov 2026)."""
from unittest.mock import patch

from tests.test_query import _fake_completion_response, _fake_embedding_response, _set_matching_spec

A = "22222222-2222-2222-2222-222222222222"
B = "11111111-1111-1111-1111-111111111111"
USER = "00000000-0000-0000-0000-000000000001"
KEY = f"{B},{A}"  # sorted


def _ask(client, mock_client, ids, question="Which charges fastest?"):
    mock_client.embeddings.create.return_value = _fake_embedding_response()
    mock_client.chat.completions.create.return_value = _fake_completion_response()
    return client.post("/query", json={"question": question, "gadget_ids": ids})


def test_comparison_answer_is_saved_under_the_sorted_key(client, fake_supabase):
    _set_matching_spec(fake_supabase, A)
    with patch("routers.query.client") as mock_client:
        resp = _ask(client, mock_client, [A, B])
    assert resp.status_code == 200
    saved = [w for w in fake_supabase.writes if w[0] == "user_comparison_questions" and w[1] == "insert"]
    assert len(saved) == 1
    row = saved[0][2]
    assert row["user_id"] == USER and row["comparison_key"] == KEY and row["gadget_ids"] == [B, A]
    assert row["question"] == "Which charges fastest?" and row["response"]["answer"]
    # Not a per-gadget thread turn.
    assert not [w for w in fake_supabase.writes if w[0] == "user_questions"]


def test_one_gadget_and_catalog_questions_are_not_saved_as_comparisons(client, fake_supabase):
    _set_matching_spec(fake_supabase, A)
    with patch("routers.query.client") as mock_client:
        _ask(client, mock_client, [A])
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        client.post("/query", json={"question": "Best battery?"})
    assert not [w for w in fake_supabase.writes if w[0] == "user_comparison_questions"]


def test_a_failed_save_never_fails_the_answer(client, fake_supabase, monkeypatch):
    _set_matching_spec(fake_supabase, A)
    import routers.query as q

    real_table = fake_supabase.table

    def table(name):
        if name == "user_comparison_questions":
            raise RuntimeError("relation does not exist")
        return real_table(name)

    monkeypatch.setattr(q.supabase, "table", table)
    with patch("routers.query.client") as mock_client:
        resp = _ask(client, mock_client, [A, B])
    assert resp.status_code == 200 and resp.json()["answer"]


def test_list_returns_the_callers_thread_oldest_first_for_the_ids_in_any_order(client, fake_supabase):
    fake_supabase.set_response("user_comparison_questions", "select", [
        {"id": "2", "question": "Newer?", "response": {"answer": "B", "sources": []}, "created_at": "2026-11-23T02:00:00Z"},
        {"id": "1", "question": "Older?", "response": {"answer": "A", "sources": []}, "created_at": "2026-11-23T01:00:00Z"},
    ])
    resp = client.get(f"/me/comparisons/questions?ids={A},{B}")
    assert resp.status_code == 200
    assert [r["question"] for r in resp.json()] == ["Older?", "Newer?"]
    assert ("user_comparison_questions", "user_id", USER) in fake_supabase.filters
    assert ("user_comparison_questions", "comparison_key", KEY) in fake_supabase.filters


def test_clear_deletes_only_the_callers_thread(client, fake_supabase):
    assert client.delete(f"/me/comparisons/questions?ids={B},{A}").status_code == 204
    assert ("user_comparison_questions", "delete", None) in fake_supabase.writes
    assert ("user_comparison_questions", "user_id", USER) in fake_supabase.filters
    assert ("user_comparison_questions", "comparison_key", KEY) in fake_supabase.filters


def test_ids_must_be_two_to_five_gadget_ids(client):
    assert client.get(f"/me/comparisons/questions?ids={A}").status_code == 422
    assert client.get("/me/comparisons/questions?ids=not-a-uuid,also-not").status_code == 422
    assert client.get(f"/me/comparisons/questions?ids={A},{A}").status_code == 422  # one gadget after de-duplication
