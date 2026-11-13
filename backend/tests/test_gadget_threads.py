"""Per-gadget AI conversation (user_questions.sql): saving turns in POST /query and the
/me/gadgets/{id}/questions read/clear routes.

/query stays public. A turn is saved only for a signed-in caller asking about exactly one
gadget, and saving can never fail the answer. Route access is covered by
test_authorization_matrix.py.
"""
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from routers.my_gadgets import THREAD_TURNS_SHOWN

GADGET = "22222222-2222-2222-2222-222222222222"
OTHER = "33333333-3333-3333-3333-333333333333"
SESSION_USER = SimpleNamespace(id="00000000-0000-0000-0000-0000000000aa", app_metadata={})


def _fake_embedding_response():
    return SimpleNamespace(data=[SimpleNamespace(embedding=[0.0] * 1536)])


def _fake_completion_response(content="It uses the X1 chip [1]."):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason="stop")])


def _ask(client, fake_supabase, *, gadget_ids, headers=None, user=SESSION_USER, extra=None):
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": GADGET, "content": "Chip: X1", "source_url": None, "similarity": 0.8}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "Phone X", "brand": "Brand"}])
    with patch("routers.query.client") as mock_client, patch("routers.query.get_optional_user", return_value=user):
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        mock_client.chat.completions.create.return_value = _fake_completion_response()
        body = {"question": "What chip does it use?"}
        if gadget_ids is not None:
            body["gadget_ids"] = gadget_ids
        body.update(extra or {})
        return client.post("/query", json=body, headers=headers or {})


def _saved(fake_supabase):
    return [payload for table, op, payload in fake_supabase.writes if table == "user_questions" and op == "insert"]


AUTH = {"Authorization": "Bearer user-token"}


def test_signed_in_single_gadget_question_is_saved_with_the_full_answer(client, fake_supabase):
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH)
    assert resp.status_code == 200
    [row] = _saved(fake_supabase)
    assert row["user_id"] == SESSION_USER.id
    assert row["gadget_id"] == GADGET
    assert row["question"] == "What chip does it use?"
    # The stored answer is exactly what the user saw, so the thread can re-render citations.
    assert row["response"]["answer"] == resp.json()["answer"]
    assert row["response"]["sources"] == resp.json()["sources"]


def test_anonymous_question_is_not_saved(client, fake_supabase):
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers={}, user=None)
    assert resp.status_code == 200
    assert _saved(fake_supabase) == []


def test_invalid_session_is_not_saved_and_still_answered(client, fake_supabase):
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH, user=None)
    assert resp.status_code == 200
    assert _saved(fake_supabase) == []


def test_comparison_and_catalog_questions_are_not_saved(client, fake_supabase):
    assert _ask(client, fake_supabase, gadget_ids=[GADGET, OTHER], headers=AUTH).status_code == 200
    assert _ask(client, fake_supabase, gadget_ids=None, headers=AUTH).status_code == 200
    assert _saved(fake_supabase) == []


def test_a_failed_save_never_fails_the_answer(client, fake_supabase, monkeypatch):
    original_table = fake_supabase.table

    def table(name):
        if name == "user_questions":
            raise RuntimeError("database down")
        return original_table(name)

    monkeypatch.setattr(fake_supabase, "table", table)
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["answer"] == "It uses the X1 chip [1]."


def test_list_returns_the_session_users_turns_oldest_first(client, fake_supabase):
    newest = {"id": "q2", "question": "Battery?", "response": {"answer": "B"}, "created_at": "2026-11-03T05:00:00+00:00"}
    older = {"id": "q1", "question": "Chip?", "response": {"answer": "A"}, "created_at": "2026-11-03T04:00:00+00:00"}
    fake_supabase.set_response("user_questions", "select", [newest, older])  # the query asks for newest first
    resp = client.get(f"/me/gadgets/{GADGET}/questions")
    assert resp.status_code == 200
    assert [t["id"] for t in resp.json()] == ["q1", "q2"]
    assert resp.json()[0] == {"id": "q1", "question": "Chip?", "asked_at": older["created_at"], "response": {"answer": "A"}}
    assert ("user_questions", "user_id", "00000000-0000-0000-0000-000000000001") in fake_supabase.filters
    assert ("user_questions", "gadget_id", GADGET) in fake_supabase.filters
    assert ("user_questions", THREAD_TURNS_SHOWN) in fake_supabase.limits


def test_clear_deletes_only_the_session_users_thread_for_that_gadget(client, fake_supabase):
    resp = client.delete(f"/me/gadgets/{GADGET}/questions")
    assert resp.status_code == 204
    assert ("user_questions", "delete", None) in fake_supabase.writes
    assert ("user_questions", "user_id", "00000000-0000-0000-0000-000000000001") in fake_supabase.filters
    assert ("user_questions", "gadget_id", GADGET) in fake_supabase.filters


def test_thread_read_failure_is_a_plain_503(client, fake_supabase, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("connection reset")

    monkeypatch.setattr(fake_supabase, "table", boom)
    resp = client.get(f"/me/gadgets/{GADGET}/questions")
    assert resp.status_code == 503
    assert "connection reset" not in resp.text


def test_regenerate_replaces_the_newest_saved_turn_for_that_question(client, fake_supabase):
    fake_supabase.set_response("user_questions", "select", [{"id": "old-turn"}])
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH, extra={"regenerate": True})
    assert resp.status_code == 200
    ops = [(t, op) for t, op, _ in fake_supabase.writes if t == "user_questions"]
    # The old turn goes first, then the new answer is saved in its place.
    assert ops == [("user_questions", "delete"), ("user_questions", "insert")]
    assert ("user_questions", "id", "old-turn") in fake_supabase.filters
    assert ("user_questions", "user_id", SESSION_USER.id) in fake_supabase.filters
    assert ("user_questions", "question", "What chip does it use?") in fake_supabase.filters


def test_regenerate_with_nothing_saved_just_saves(client, fake_supabase):
    fake_supabase.set_response("user_questions", "select", [])
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH, extra={"regenerate": True})
    assert resp.status_code == 200
    ops = [op for t, op, _ in fake_supabase.writes if t == "user_questions"]
    assert ops == ["insert"]


def test_a_normal_ask_never_deletes_earlier_turns(client, fake_supabase):
    _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH)
    assert ("user_questions", "delete", None) not in fake_supabase.writes


# --- Privacy: a saved (private) turn never puts its text into the public query_history ---

def _history_rows(fake_supabase):
    return [payload for table, op, payload in fake_supabase.writes if table == "query_history" and op == "insert"]


def test_saved_turn_is_recorded_in_query_history_as_a_placeholder_with_tokens(client, fake_supabase):
    from routers.query import PRIVATE_ANSWER_PLACEHOLDER, PRIVATE_QUESTION_PLACEHOLDER

    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH)
    assert resp.status_code == 200
    assert len(_saved(fake_supabase)) == 1
    rows = _history_rows(fake_supabase)
    assert rows, "token accounting row must still be written"
    for row in rows:
        assert row["query_text"] == PRIVATE_QUESTION_PLACEHOLDER
        assert row["answer_text"] == PRIVATE_ANSWER_PLACEHOLDER
        assert "What chip" not in str(row)
    assert "prompt_tokens" in rows[0]


def test_cached_saved_turn_is_also_private_in_query_history(client, fake_supabase):
    from routers.query import PRIVATE_QUESTION_PLACEHOLDER

    assert _ask(client, fake_supabase, gadget_ids=[GADGET]).status_code == 200  # anonymous: public, cached
    resp = _ask(client, fake_supabase, gadget_ids=[GADGET], headers=AUTH)
    assert resp.json()["cached"] is True
    assert _history_rows(fake_supabase)[-1]["query_text"] == PRIVATE_QUESTION_PLACEHOLDER


@pytest.mark.parametrize(
    "gadget_ids, headers, user",
    [([GADGET], {}, None), ([GADGET], AUTH, None), ([GADGET, OTHER], AUTH, SESSION_USER), (None, AUTH, SESSION_USER)],
)
def test_unsaved_questions_keep_their_text_in_query_history(client, fake_supabase, gadget_ids, headers, user):
    resp = _ask(client, fake_supabase, gadget_ids=gadget_ids, headers=headers, user=user)
    assert resp.status_code == 200
    assert _history_rows(fake_supabase)[0]["query_text"] == "What chip does it use?"
