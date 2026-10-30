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

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "demo_malformed_requests.py"


@pytest.fixture(scope="module")
def demo():
    spec = importlib.util.spec_from_file_location("demo_malformed_requests", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def real_auth(client, monkeypatch):
    """The real auth dependencies against a Supabase that rejects every token, not the admin override."""
    from auth import get_current_user
    from main import app

    def reject(token):
        raise Exception("invalid session")

    monkeypatch.setattr("auth.supabase", SimpleNamespace(auth=SimpleNamespace(get_user=reject)))
    previous = app.dependency_overrides.pop(get_current_user)
    yield client
    app.dependency_overrides[get_current_user] = previous


def _through(client):
    def send(method, path, body, headers):
        response = client.request(method, path, content=body, headers=headers)
        return response.status_code, dict(response.headers.items()), response.text

    return send


def test_every_demo_case_is_refused_safely_with_no_write_and_no_ai_call(demo, real_auth, fake_supabase):
    with patch("routers.query.client", MagicMock()) as chat, patch("routers.specs.embed_texts") as embed:
        problems = demo.run(_through(real_auth), out=lambda *_: None)
    assert problems == []
    assert fake_supabase.writes == []
    assert not chat.called and not chat.method_calls
    embed.assert_not_called()


def test_the_demo_covers_input_auth_and_not_found(demo):
    groups = {case[0] for case in demo.cases()}
    assert groups == {"Malformed input", "Not allowed", "Not found"}
    assert len(demo.cases()) >= 15


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
