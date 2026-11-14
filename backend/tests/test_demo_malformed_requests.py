"""The live malformed-request demo (scripts/demo_malformed_requests.py) must keep working.

The demo is shown to a panel, so it is run here on every change: every case still gets its expected
refusal, none of them writes data or reaches OpenAI, and the script's own checks (expected status, no
stack trace or key in the body, a request id) really fail when an answer is bad.
"""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from supabase_auth.errors import AuthApiError

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "demo_malformed_requests.py"


@pytest.fixture(scope="module")
def demo():
    spec = importlib.util.spec_from_file_location("demo_malformed_requests", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


DEMO_TOKEN = "demo-user-token"


@pytest.fixture
def real_auth(client, monkeypatch):
    """The real auth dependencies, not the admin override: Supabase accepts only DEMO_TOKEN (an
    ordinary, non-admin user) and rejects every other token."""
    from auth import get_current_user
    from main import app

    def get_user(token):
        if token == DEMO_TOKEN:
            return SimpleNamespace(user=SimpleNamespace(id="demo-user", app_metadata={}, user_metadata={}))
        raise AuthApiError("invalid session", 401, "bad_jwt")

    monkeypatch.setattr("auth.supabase", SimpleNamespace(auth=SimpleNamespace(get_user=get_user)))
    previous = app.dependency_overrides.pop(get_current_user)
    yield client
    app.dependency_overrides[get_current_user] = previous


def _through(client):
    def send(method, path, body, headers):
        response = client.request(method, path, content=body, headers=headers)
        return response.status_code, dict(response.headers.items()), response.text

    return send


@pytest.mark.parametrize("token", [DEMO_TOKEN, None], ids=["signed-in", "no-token"])
def test_every_demo_case_is_refused_safely_with_no_write_and_no_ai_call(demo, real_auth, fake_supabase, token):
    lines = []
    with patch("routers.query.client", MagicMock()) as chat, patch("routers.specs.embed_texts") as embed:
        problems = demo.run(_through(real_auth), out=lines.append, token=token)
    assert problems == []
    skipped = [line for line in lines if "skipped" in line]
    assert len(skipped) == (0 if token else sum(demo.needs_session(c[5]) for c in demo.cases()))
    assert fake_supabase.writes == []
    assert not chat.called and not chat.method_calls
    embed.assert_not_called()


def test_the_demo_covers_input_auth_and_not_found(demo):
    groups = {case[0] for case in demo.cases()}
    assert groups == {"Malformed input", "Not allowed", "Not found"}
    assert len(demo.cases()) >= 15
    # Without a token the demo still shows at least ten refusals, including each login-required route.
    anonymous = [c for c in demo.cases() if not demo.needs_session(c[5])]
    assert len(anonymous) >= 10
    refused_without_login = {(c[2], c[3].split("?")[0]) for c in anonymous if c[6] == 401}
    assert {("POST", "/query"), ("POST", "/comparisons"), ("GET", "/stats/trending-questions"), ("GET", "/me/ai-usage")} <= refused_without_login


def test_the_token_is_sent_only_as_a_bearer_header_and_never_printed(demo):
    sent, lines = [], []

    def send(method, path, body, headers):
        sent.append(headers)
        return 422, {"X-Request-ID": "a"}, '{"detail": "x"}'

    demo.run(send, out=lines.append, token="secret-token-value")
    assert any(h.get("Authorization") == "Bearer secret-token-value" for h in sent)
    assert all(h.get("Authorization") != demo.SESSION for h in sent)
    assert not any("secret-token-value" in line for line in lines)


def test_the_checks_fail_on_a_server_error_a_leak_or_a_missing_request_id(demo):
    leaky = 'Traceback (most recent call last): File "/app/routers/query.py", line 1 sk-abcdefghijklmnop'
    problems = demo.run(lambda *args: (500, {}, leaky), out=lambda *_: None)
    assert any("expected" in p for p in problems)
    assert any("must not be shown" in p for p in problems)
    assert any("X-Request-ID" in p for p in problems)


def test_a_wrong_message_is_reported(demo):
    refusing = lambda method, path, body, headers: (422, {"X-Request-ID": "a"}, '{"detail": [{"msg": "something else"}]}')
    problems = demo.run(refusing, out=lambda *_: None)
    assert any("message should mention" in p for p in problems)
