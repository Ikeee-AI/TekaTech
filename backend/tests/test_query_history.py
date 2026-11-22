"""Conversation memory for the gadget chat (22 Nov 2026): earlier turns reach the model."""
from unittest.mock import patch

from prompts import CONVERSATION_HEADER, GK_CONVERSATION_HEADER
from tests.test_query import _fake_completion_response, _fake_embedding_response, _set_matching_spec

GADGET = "22222222-2222-2222-2222-222222222222"
HISTORY = [{"question": "Can the V50 run Genshin Impact?", "answer": "It has a Snapdragon 7 Gen3 [1]."}]


def _ask(client, mock_client, question, history=None, **extra):
    mock_client.embeddings.create.return_value = _fake_embedding_response()
    mock_client.chat.completions.create.return_value = _fake_completion_response()
    body = {"question": question, "gadget_ids": [GADGET], **extra}
    if history is not None:
        body["history"] = history
    return client.post("/query", json=body)


def test_follow_up_carries_earlier_turns_in_the_user_message_without_old_citations(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        resp = _ask(client, mock_client, "Can it run smoothly?", HISTORY)
    assert resp.status_code == 200
    user = mock_client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert user.startswith("Spec snippets:\n[1] (Gadget X) spec chunk")
    assert (
        f"{CONVERSATION_HEADER}\nUser: Can the V50 run Genshin Impact?\nAssistant: It has a Snapdragon 7 Gen3.\n\n"
        "Question: Can it run smoothly?"
    ) in user
    # Retrieval embeds the previous question too, so the follow-up finds its subject's chunks.
    assert mock_client.embeddings.create.call_args.kwargs["input"] == [
        "Can the V50 run Genshin Impact?\nCan it run smoothly?"
    ]


def test_question_without_history_is_unchanged(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        _ask(client, mock_client, "What chip does it use?")
    user = mock_client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert "Earlier in this conversation" not in user
    assert user.endswith("\n\nQuestion: What chip does it use?")
    assert mock_client.embeddings.create.call_args.kwargs["input"] == ["What chip does it use?"]


def test_same_follow_up_after_a_different_conversation_is_not_served_from_cache(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    other = [{"question": "Is it good for photos?", "answer": "50 MP main camera."}]
    with patch("routers.query.client") as mock_client:
        first = _ask(client, mock_client, "Can it run smoothly?", HISTORY)
        again = _ask(client, mock_client, "Can it run smoothly?", HISTORY)
        different = _ask(client, mock_client, "Can it run smoothly?", other)
    assert first.json()["cached"] is False
    assert again.json()["cached"] is True
    assert different.json()["cached"] is False


def test_history_is_capped_and_long_answers_are_cut(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        too_many = _ask(client, mock_client, "And?", HISTORY * 4)
        long_answer = _ask(client, mock_client, "And?", [{"question": "Battery?", "answer": "x" * 5000}])
    assert too_many.status_code == 422
    assert long_answer.status_code == 200
    user = mock_client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert "x" * 1200 in user and "x" * 1201 not in user


def test_general_knowledge_answer_also_gets_the_earlier_turns(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "V50 5G"}])
    with patch("routers.query.client") as mock_client:
        resp = _ask(client, mock_client, "Can it run smoothly?", HISTORY, allow_general_knowledge=True)
    assert resp.status_code == 200
    user = mock_client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert user.startswith(f"{GK_CONVERSATION_HEADER}\nUser: Can the V50 run Genshin Impact?")
    assert user.endswith("Question: Can it run smoothly?\n\nGadgets being asked about: V50 5G.")
