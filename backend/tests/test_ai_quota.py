"""Per-user daily limit on AI questions (ai_quota.py) and GET /me/ai-usage, owner decision 14 Nov 2026."""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest

import ai_quota
from config import Settings, settings
from conftest import signed_in_as

ALICE = SimpleNamespace(id="00000000-0000-0000-0000-0000000000a1", app_metadata={})
BOB = SimpleNamespace(id="00000000-0000-0000-0000-0000000000b2", app_metadata={})
ADMIN = SimpleNamespace(id="00000000-0000-0000-0000-0000000000ad", app_metadata={"is_admin": True})
# user_metadata is client-writable, so it must never exempt anyone.
CLAIMS_ADMIN = SimpleNamespace(id="00000000-0000-0000-0000-0000000000c3", app_metadata={}, user_metadata={"is_admin": True})


@pytest.fixture
def openai_mock(fake_supabase):
    gadget_id = "22222222-2222-2222-2222-222222222222"
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": gadget_id, "content": "Cores: 8", "source_url": None, "similarity": 0.8}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id, "name": "Phone X", "brand": "Brand"}])
    with patch("routers.query.client") as mock_client:
        mock_client.embeddings.create.return_value = SimpleNamespace(data=[SimpleNamespace(embedding=[0.0] * 1536)])
        mock_client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="Fine [1]."), finish_reason="stop")]
        )
        yield mock_client


@pytest.fixture
def no_minute_limit():
    """The 10/minute limit would stop a 21-question loop first; it is tested in test_query.py."""
    from rate_limit import limiter

    limiter.enabled = False
    # The daily counter uses limiter.limiter directly, so it keeps counting with slowapi switched off.
    yield
    limiter.enabled = True


def _ask(client, question="How many cores?", **body):
    return client.post("/query", json={"question": question, **body})


def test_the_default_is_20_and_it_is_a_setting():
    assert Settings.model_fields["ai_daily_question_limit"].default == 20


def test_a_user_gets_20_questions_then_a_plain_429(client, fake_supabase, openai_mock, no_minute_limit):
    with signed_in_as(ALICE):
        statuses = [_ask(client, f"Question {i}?") for i in range(21)]
    assert [r.status_code for r in statuses[:20]] == [200] * 20
    assert statuses[0].headers[ai_quota.LIMIT_HEADER] == "20"
    assert statuses[0].headers[ai_quota.REMAINING_HEADER] == "19"
    assert statuses[19].headers[ai_quota.REMAINING_HEADER] == "0"
    over = statuses[20]
    assert over.status_code == 429
    assert over.json() == {"detail": "You've used today's 20 AI questions. They reset at 8:00 AM (Manila time)."}
    assert over.headers[ai_quota.REMAINING_HEADER] == "0"
    assert int(over.headers["Retry-After"]) > 0
    # The refused question reached neither model.
    assert openai_mock.embeddings.create.call_count == 20


def test_the_limit_and_message_follow_the_setting(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 2)
    with signed_in_as(ALICE):
        statuses = [_ask(client, f"Q{i}?").status_code for i in range(3)]
        over = _ask(client)
    assert statuses == [200, 200, 429]
    assert "today's 2 AI questions" in over.json()["detail"]


def test_cached_answers_still_count(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 2)
    with signed_in_as(ALICE):
        first, second, third = (_ask(client, "Same question?") for _ in range(3))
    assert first.status_code == second.status_code == 200
    assert second.json()["cached"] is True
    assert third.status_code == 429


def test_a_question_that_fails_validation_is_not_counted(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 1)
    with signed_in_as(ALICE):
        assert client.post("/query", json={"question": ""}).status_code == 422
        assert client.post("/query", json={"question": "a" * 151}).status_code == 422
        assert _ask(client).status_code == 200


def test_admins_are_never_limited(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 1)
    with signed_in_as(ADMIN):
        responses = [_ask(client, f"Q{i}?") for i in range(3)]
    assert [r.status_code for r in responses] == [200, 200, 200]
    assert ai_quota.LIMIT_HEADER not in responses[0].headers


def test_user_metadata_is_admin_does_not_exempt(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 1)
    with signed_in_as(CLAIMS_ADMIN):
        assert [_ask(client, f"Q{i}?").status_code for i in range(2)] == [200, 429]


def test_each_user_has_their_own_counter(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 1)
    with signed_in_as(ALICE):
        assert _ask(client, "A1?").status_code == 200
        assert _ask(client, "A2?").status_code == 429
    with signed_in_as(BOB):
        assert _ask(client, "B1?").status_code == 200


def test_the_count_starts_again_on_the_next_utc_day(client, fake_supabase, openai_mock, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_question_limit", 1)
    day1 = datetime(2026, 11, 14, 15, 59, tzinfo=timezone.utc)  # 23:59 Manila
    day2 = datetime(2026, 11, 15, 0, 0, 30, tzinfo=timezone.utc)  # 08:00 Manila
    with signed_in_as(ALICE):
        monkeypatch.setattr(ai_quota, "_now", lambda: day1)
        assert [_ask(client, f"Q{i}?").status_code for i in range(2)] == [200, 429]
        monkeypatch.setattr(ai_quota, "_now", lambda: day2)
        assert _ask(client, "Q3?").status_code == 200


def test_resets_at_is_the_next_utc_midnight_which_is_8_am_manila():
    now = datetime(2026, 11, 14, 23, 30, tzinfo=timezone.utc)
    assert ai_quota.resets_at(now) == datetime(2026, 11, 15, tzinfo=timezone.utc)


def test_anonymous_question_is_refused_and_not_counted(client, fake_supabase, openai_mock):
    with signed_in_as(None):
        resp = _ask(client)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Login required"}
    openai_mock.embeddings.create.assert_not_called()


# --- GET /me/ai-usage ---

def test_usage_for_a_user_counts_down(client, fake_supabase, openai_mock, monkeypatch):
    now = datetime(2026, 11, 14, 3, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(ai_quota, "_now", lambda: now)
    with signed_in_as(ALICE):
        before = client.get("/me/ai-usage")
        _ask(client)
        after = client.get("/me/ai-usage")
    assert before.status_code == 200
    assert before.json() == {"limit": 20, "remaining": 20, "resets_at": "2026-11-15T00:00:00+00:00"}
    assert after.json()["remaining"] == 19
    assert "no-store" in after.headers["Cache-Control"]


def test_usage_is_per_user(client, fake_supabase, openai_mock):
    with signed_in_as(ALICE):
        _ask(client)
    with signed_in_as(BOB):
        assert client.get("/me/ai-usage").json()["remaining"] == 20


def test_usage_for_an_admin_is_unlimited(client, fake_supabase):
    with signed_in_as(ADMIN):
        resp = client.get("/me/ai-usage")
    assert resp.json() == {"limit": None, "remaining": None, "resets_at": None}


def test_usage_needs_a_session(client, fake_supabase):
    with signed_in_as(None):
        resp = client.get("/me/ai-usage")
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Login required"}


def test_the_browser_may_read_the_counter_headers():
    from main import app
    from starlette.middleware.cors import CORSMiddleware

    [cors] = [m for m in app.user_middleware if m.cls is CORSMiddleware]
    exposed = cors.kwargs["expose_headers"]
    assert ai_quota.LIMIT_HEADER in exposed and ai_quota.REMAINING_HEADER in exposed
