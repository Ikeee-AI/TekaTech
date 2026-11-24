"""Optional web-search answer (web_search.py, routers/query.py; 24 Nov 2026)."""
from types import SimpleNamespace
from unittest.mock import patch

import pytest

import web_search
from config import settings
from prompts import WEB_DISCLAIMER
from tests.test_query import _fake_completion_response, _fake_embedding_response, _set_matching_spec

GADGET = "22222222-2222-2222-2222-222222222222"
TEXT = f"{WEB_DISCLAIMER} The Galaxy S24 uses the **Exynos 2400** ([samsung.com](https://www.samsung.com/ph/s24?utm_source=x))."


def _web_response(text=TEXT, url="https://www.samsung.com/ph/s24?utm_source=x", status="completed"):
    start = text.index("([")
    annotation = SimpleNamespace(type="url_citation", url=url, title="Galaxy S24 specs", start_index=start, end_index=len(text) - 1)
    message = SimpleNamespace(type="message", content=[SimpleNamespace(type="output_text", text=text, annotations=[annotation])])
    return SimpleNamespace(
        status=status,
        incomplete_details=SimpleNamespace(reason="max_output_tokens"),
        output=[SimpleNamespace(type="web_search_call"), message],
        usage=SimpleNamespace(input_tokens=9000, output_tokens=300),
    )


def _ask(client, body, completion_text="NOT_IN_SPECS", web=None):
    with patch("routers.query.client") as mock_client, patch("web_search.client") as web_client:
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        mock_client.chat.completions.create.return_value = _fake_completion_response(completion_text)
        if isinstance(web, Exception):
            web_client.responses.create.side_effect = web
        else:
            web_client.responses.create.return_value = web or _web_response()
        resp = client.post("/query", json=body)
        return resp, web_client.responses.create, mock_client.chat.completions.create


def test_specs_without_the_answer_get_a_cited_web_answer(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer_basis"] == "web"
    assert body["answer"].startswith(WEB_DISCLAIMER)
    assert "[1]" in body["answer"] and "](" not in body["answer"]
    assert body["sources"] == [{
        "gadget_id": None, "gadget_name": "samsung.com", "content": "Galaxy S24 specs",
        "source_url": "https://www.samsung.com/ph/s24", "similarity": 0.0, "kind": "web",
    }]
    kwargs = web_call.call_args.kwargs
    assert kwargs["tools"][0]["type"] == "web_search"
    assert "Gadgets being asked about: Gadget X." in kwargs["input"]


def test_a_grounded_answer_never_searches(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(
        client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True},
        completion_text="It uses the Exynos 2400 [1].",
    )
    assert resp.json()["answer_basis"] == "specs"
    web_call.assert_not_called()


def test_without_the_flag_there_is_no_web_search(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(client, {"question": "What chip?", "gadget_ids": [GADGET]})
    assert resp.json()["answer_basis"] == "none"
    web_call.assert_not_called()


def test_no_retrieval_matches_also_reaches_the_web(client, fake_supabase):
    fake_supabase.set_response("_rpc", None, [])
    resp, web_call, _ = _ask(client, {"question": "Best phone for PUBG?", "allow_web_search": True})
    assert resp.json()["answer_basis"] == "web"
    web_call.assert_called_once()


def test_failed_search_falls_back_to_general_knowledge_when_allowed(client, fake_supabase):
    from prompts import GK_DISCLAIMER

    _set_matching_spec(fake_supabase, GADGET)
    with patch("routers.query.client") as mock_client, patch("web_search.client") as web_client:
        mock_client.embeddings.create.return_value = _fake_embedding_response()
        mock_client.chat.completions.create.side_effect = [
            _fake_completion_response("NOT_IN_SPECS"),
            _fake_completion_response(f"{GK_DISCLAIMER} It likely uses an Exynos chip."),
        ]
        web_client.responses.create.side_effect = web_search.WebSearchError("boom")
        resp = client.post("/query", json={
            "question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True, "allow_general_knowledge": True,
        })
    assert resp.status_code == 200
    assert resp.json()["answer_basis"] == "general_knowledge"


def test_failed_search_without_general_knowledge_is_a_safe_error(client, fake_supabase):
    import openai

    _set_matching_spec(fake_supabase, GADGET)
    resp, _, _ = _ask(
        client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True},
        web=openai.APIConnectionError(request=__import__("httpx").Request("POST", "https://api.openai.com")),
    )
    assert resp.status_code == 503
    assert "sk-" not in resp.text


def test_incomplete_response_is_not_shown(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, _, _ = _ask(
        client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True},
        web=_web_response(status="incomplete"),
    )
    assert resp.status_code in (502, 503)


def test_daily_web_cap_gives_a_plain_reply(client, fake_supabase, monkeypatch):
    from routers.query import WEB_LIMIT_ANSWER

    monkeypatch.setattr(settings, "web_search_site_daily_limit", 0)
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True})
    assert resp.json()["answer"] == WEB_LIMIT_ANSWER
    web_call.assert_not_called()


@pytest.fixture
def non_admin():
    return SimpleNamespace(id="u-1", app_metadata={})


def test_per_user_cap_then_site_cap(monkeypatch, non_admin):
    import ai_quota

    monkeypatch.setattr(settings, "ai_daily_web_search_limit", 2)
    monkeypatch.setattr(settings, "web_search_site_daily_limit", 3)
    assert ai_quota.consume_web_search(non_admin) is True
    assert ai_quota.consume_web_search(non_admin) is True
    assert ai_quota.consume_web_search(non_admin) is False  # user cap
    other = SimpleNamespace(id="u-2", app_metadata={})
    assert ai_quota.consume_web_search(other) is True  # site: 3 of 3
    admin = SimpleNamespace(id="a-1", app_metadata={"is_admin": True})
    assert ai_quota.consume_web_search(admin) is False  # site cap applies to admins too


def test_citations_to_markers_numbers_pages_and_drops_raw_links():
    text = "A ([x](https://a.com/1)) and B ([y](https://b.com/2)) and A again ([x](https://a.com/1))."
    anns = []
    for url, needle in (("https://a.com/1", "([x](https://a.com/1))"), ("https://b.com/2", "([y](https://b.com/2))")):
        start = 0
        while (i := text.find(needle, start)) != -1:
            anns.append(SimpleNamespace(type="url_citation", url=url, title="", start_index=i, end_index=i + len(needle)))
            start = i + 1
    out, cites = web_search.citations_to_markers(text, anns)
    assert out == "A [1] and B [2] and A again [1]."
    assert [c.url for c in cites] == ["https://a.com/1", "https://b.com/2"]


def test_an_uncited_decline_goes_to_the_web(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(
        client, {"question": "Does it support DeX?", "gadget_ids": [GADGET], "allow_web_search": True},
        completion_text="The snippets do not state whether the Galaxy S24 supports Samsung DeX.",
    )
    assert resp.json()["answer_basis"] == "web"
    web_call.assert_called_once()


def test_an_uncited_decline_without_the_web_flag_stays_as_it_was(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, chat = _ask(
        client, {"question": "Does it support DeX?", "gadget_ids": [GADGET], "allow_general_knowledge": True},
        completion_text="The snippets do not state whether the Galaxy S24 supports Samsung DeX.",
    )
    assert resp.json()["answer_basis"] == "specs"
    web_call.assert_not_called()
    assert chat.call_count == 1


def test_the_limit_reply_is_marked_and_never_cached(client, fake_supabase, monkeypatch):
    """The cache is shared by every user; one user's used-up cap must not answer for others."""
    import answer_cache

    monkeypatch.setattr(settings, "web_search_site_daily_limit", 0)
    _set_matching_spec(fake_supabase, GADGET)
    with patch.object(answer_cache, "store") as store:
        resp, _, _ = _ask(client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True})
    assert resp.json()["answer_basis"] == "web_limit"
    store.assert_not_called()


def test_a_real_web_answer_is_cached(client, fake_supabase):
    import answer_cache

    _set_matching_spec(fake_supabase, GADGET)
    with patch.object(answer_cache, "store") as store:
        resp, _, _ = _ask(client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True})
    assert resp.json()["answer_basis"] == "web"
    store.assert_called_once()


def test_an_uncited_answer_that_is_not_a_decline_stays(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(
        client, {"question": "What chip?", "gadget_ids": [GADGET], "allow_web_search": True},
        completion_text="It uses the Exynos 2400 chip.",
    )
    assert resp.json()["answer_basis"] == "specs"
    web_call.assert_not_called()


def test_a_decline_citing_only_a_snippet_that_does_not_exist_goes_to_the_web(client, fake_supabase):
    """Pre-review #294: "[9]" with one snippet is not a citation (it is stripped later)."""
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(
        client, {"question": "Does it support DeX?", "gadget_ids": [GADGET], "allow_web_search": True},
        completion_text="The snippets do not state whether it supports Samsung DeX [9].",
    )
    assert resp.json()["answer_basis"] == "web"
    web_call.assert_called_once()


def test_a_cited_partial_answer_with_a_decline_phrase_stays_grounded(client, fake_supabase):
    _set_matching_spec(fake_supabase, GADGET)
    resp, web_call, _ = _ask(
        client, {"question": "Chip and charger?", "gadget_ids": [GADGET], "allow_web_search": True},
        completion_text="It uses the Exynos 2400 [1]; the snippets do not mention a charger in the box.",
    )
    assert resp.json()["answer_basis"] == "specs"
    web_call.assert_not_called()


def test_cites_a_snippet_counts_only_markers_in_range():
    from routers.query import _cites_a_snippet

    assert _cites_a_snippet("Yes [1].", 1)
    assert _cites_a_snippet("Yes (2).", 3)
    assert not _cites_a_snippet("Yes [4].", 3)
    assert not _cites_a_snippet("Yes [0].", 3)
    assert not _cites_a_snippet("No markers at all.", 3)


def test_tracking_code_variants_of_one_page_share_a_number():
    text = "A ([a](https://e.com/p?utm_source=x)) B ([b](https://e.com/p))."
    anns = [
        SimpleNamespace(type="url_citation", url="https://e.com/p?utm_source=x", title="P", start_index=2, end_index=37),
        SimpleNamespace(type="url_citation", url="https://e.com/p", title="P", start_index=text.index("B ") + 2, end_index=len(text) - 1),
    ]
    answer, citations = web_search.citations_to_markers(text, anns)
    assert len(citations) == 1
