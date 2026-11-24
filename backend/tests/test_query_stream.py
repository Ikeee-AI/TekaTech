"""POST /query/stream (23 Nov 2026): the /query pipeline, with the answer text streamed."""
import json
from types import SimpleNamespace
from unittest.mock import patch

from tests.test_query import _fake_completion_response, _fake_embedding_response, _set_matching_spec

GADGET = "22222222-2222-2222-2222-222222222222"


def _chunks(*pieces, finish="stop"):
    events = [SimpleNamespace(usage=None, choices=[SimpleNamespace(delta=SimpleNamespace(content=p), finish_reason=None)])
              for p in pieces]
    events.append(SimpleNamespace(usage=None, choices=[SimpleNamespace(delta=SimpleNamespace(content=None), finish_reason=finish)]))
    events.append(SimpleNamespace(usage=SimpleNamespace(prompt_tokens=100, completion_tokens=20), choices=[]))
    return iter(events)


def _events(resp):
    out = []
    for block in resp.text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        out.append((lines["event"], json.loads(lines["data"])))
    return out


def _stream(client, mock_client, pieces, finish="stop", **body):
    mock_client.embeddings.create.return_value = _fake_embedding_response()
    mock_client.chat.completions.create.side_effect = (
        lambda **kw: _chunks(*pieces, finish=finish) if kw.get("stream") else _fake_completion_response("GK answer.")
    )
    return client.post("/query/stream", json={"question": "How fast does it charge?", "gadget_ids": [GADGET], **body})


def test_streams_sources_then_text_then_the_validated_answer(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        resp = _stream(client, mock_client, ["It charges ", "at 90W [1]", " and [7]."])
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    events = _events(resp)
    kinds = [k for k, _ in events]
    assert kinds[0] == "sources" and kinds[-1] == "done" and "delta" in kinds
    assert events[0][1][0]["gadget_name"] == "Gadget X"
    assert "".join(d for k, d in events if k == "delta") == "It charges at 90W [1] and [7]."
    done = events[-1][1]
    assert done["answer"] == "It charges at 90W [1] and."  # the out-of-range [7] removed
    assert done["invalid_citations_removed"] == 1
    assert done["server_timing"].startswith("embed;dur=")
    assert mock_client.chat.completions.create.call_args.kwargs["stream_options"] == {"include_usage": True}


def test_cut_off_answer_is_an_error_event_not_a_partial_answer(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        resp = _stream(client, mock_client, ["A long answer that never ends"], finish="length")
    kind, data = _events(resp)[-1]
    assert kind == "error" and data["status"] == 503
    assert "done" not in [k for k, _ in _events(resp)]


def test_sentinel_is_never_streamed_and_general_knowledge_answers(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        resp = _stream(client, mock_client, ['"NOT_', "IN_SPECS", '"'], allow_general_knowledge=True)
    events = _events(resp)
    assert [k for k, _ in events if k == "delta"] == []
    assert events[-1][0] == "done" and events[-1][1]["answer_basis"] == "general_knowledge"


def test_uncited_decline_with_web_search_ends_in_the_web_answer(client, fake_supabase):
    """Pre-review #294: with "Search the Web" on, a decline streamed in words is replaced by the
    cited web answer in `done` (the streamed text and spec sources are not the final answer)."""
    from tests.test_query_web import _web_response

    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client, patch("web_search.client") as web_client:
        web_client.responses.create.return_value = _web_response()
        resp = _stream(
            client, mock_client, ["The snippets do not state ", "whether it supports DeX."], allow_web_search=True
        )
    events = _events(resp)
    assert events[0][0] == "sources" and events[0][1][0]["gadget_name"] == "Gadget X"
    kind, done = events[-1]
    assert kind == "done"
    assert done["answer_basis"] == "web"
    assert "[1]" in done["answer"] and "do not state" not in done["answer"]
    assert [s["kind"] for s in done["sources"]] == ["web"]
    web_client.responses.create.assert_called_once()


def test_cached_answer_arrives_as_done_only(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client:
        _stream(client, mock_client, ["Charges at 90W [1]."])
        again = _stream(client, mock_client, ["unused"])
    events = _events(again)
    assert [k for k, _ in events] == ["done"]
    assert events[0][1]["cached"] is True


def test_validation_and_login_errors_are_plain_json_before_streaming(client, fake_supabase):
    assert client.post("/query/stream", json={"question": ""}).status_code == 422
