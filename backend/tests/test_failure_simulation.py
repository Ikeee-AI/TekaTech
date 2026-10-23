from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from config import Settings, settings
from routers.query import (
    DETAIL_TIMEOUT,
    DETAIL_UNAVAILABLE,
    DETAIL_UNUSABLE,
    NO_MATCHES_ANSWER,
    SIMULATION_MODES,
)

HEADER = {"X-Simulate-Failure": "timeout", "Authorization": "Bearer admin-token"}
ADMIN = SimpleNamespace(id="admin-1", app_metadata={"is_admin": True})
MEMBER = SimpleNamespace(id="user-1", app_metadata={})


def _embedding():
    return SimpleNamespace(data=[SimpleNamespace(embedding=[0.0] * 1536)])


def _completion(content="Fine [1]."):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def _matching_spec(fake_supabase):
    gadget_id = "22222222-2222-2222-2222-222222222222"
    fake_supabase.set_response(
        "_rpc", None, [{"gadget_id": gadget_id, "content": "spec", "source_url": None, "similarity": 0.5}]
    )
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id, "name": "Gadget X", "brand": "Brand"}])


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "failure_simulation_enabled", True)


def _ask(client, headers, who=ADMIN):
    with patch("routers.query.client") as mock_client, patch("routers.query.get_optional_user", return_value=who):
        mock_client.embeddings.create.return_value = _embedding()
        mock_client.chat.completions.create.return_value = _completion()
        resp = client.post("/query", json={"question": "How many cores?"}, headers=headers)
    return resp, mock_client


# --- off by default / wrong caller: behaves exactly like a normal request ---

def test_disabled_by_default():
    assert Settings.model_fields["failure_simulation_enabled"].default is False
    assert settings.failure_simulation_enabled is False


def test_production_service_never_enables_it():
    render_yaml = (Path(__file__).resolve().parents[2] / "render.yaml").read_text(encoding="utf-8")
    assert "FAILURE_SIMULATION" not in render_yaml.upper()


def test_header_is_ignored_while_the_setting_is_off(client, fake_supabase):
    _matching_spec(fake_supabase)
    resp, mock_client = _ask(client, HEADER)
    assert resp.status_code == 200
    mock_client.chat.completions.create.assert_called_once()


def test_anonymous_caller_is_ignored_even_when_enabled(client, fake_supabase, enabled):
    _matching_spec(fake_supabase)
    resp, mock_client = _ask(client, {"X-Simulate-Failure": "timeout"}, who=None)
    assert resp.status_code == 200
    assert "X-Simulated-Failure" not in resp.headers
    mock_client.chat.completions.create.assert_called_once()


def test_non_admin_is_ignored_even_when_enabled(client, fake_supabase, enabled):
    _matching_spec(fake_supabase)
    resp, mock_client = _ask(client, HEADER, who=MEMBER)
    assert resp.status_code == 200
    mock_client.chat.completions.create.assert_called_once()


def test_unknown_mode_is_ignored_for_non_admins_and_while_disabled(client, fake_supabase, enabled, monkeypatch):
    _matching_spec(fake_supabase)
    resp, _ = _ask(client, {"X-Simulate-Failure": "nonsense"}, who=MEMBER)
    assert resp.status_code == 200  # a non-admin learns nothing about the feature
    monkeypatch.setattr(settings, "failure_simulation_enabled", False)
    resp, _ = _ask(client, {"X-Simulate-Failure": "nonsense"})
    assert resp.status_code == 200


def test_ordinary_requests_do_no_extra_auth_lookup(client, fake_supabase, enabled):
    _matching_spec(fake_supabase)
    with patch("routers.query.client") as mock_client, patch("routers.query.get_optional_user") as lookup:
        mock_client.embeddings.create.return_value = _embedding()
        mock_client.chat.completions.create.return_value = _completion()
        client.post("/query", json={"question": "How many cores?"}, headers={"Authorization": "Bearer x"})
    lookup.assert_not_called()


# --- enabled + admin: each mode returns the real contract and never calls OpenAI ---

@pytest.mark.parametrize(
    "mode, status, detail",
    [
        ("timeout", 503, DETAIL_TIMEOUT),
        ("quota", 503, DETAIL_UNAVAILABLE),
        ("bad_output", 503, DETAIL_UNUSABLE),
    ],
)
def test_admin_can_simulate_each_failure(client, fake_supabase, enabled, mode, status, detail):
    resp, mock_client = _ask(client, {"X-Simulate-Failure": mode})
    assert resp.status_code == status
    assert resp.json() == {"detail": detail}
    assert resp.headers["X-Simulated-Failure"] == mode
    mock_client.embeddings.create.assert_not_called()
    mock_client.chat.completions.create.assert_not_called()
    assert fake_supabase.writes == []


def test_admin_can_simulate_empty_retrieval(client, fake_supabase, enabled):
    resp, mock_client = _ask(client, {"X-Simulate-Failure": "empty"})
    assert resp.status_code == 200
    data = resp.json()
    assert (data["answer"], data["sources"], data["model_used"]) == (NO_MATCHES_ANSWER, [], "none")
    mock_client.embeddings.create.assert_not_called()


def test_mode_is_case_and_space_insensitive(client, fake_supabase, enabled):
    resp, _ = _ask(client, {"X-Simulate-Failure": "  TimeOut "})
    assert resp.status_code == 503
    assert resp.headers["X-Simulated-Failure"] == "timeout"


def test_admin_gets_a_helpful_error_for_an_unknown_mode(client, fake_supabase, enabled):
    resp, _ = _ask(client, {"X-Simulate-Failure": "explode"})
    assert resp.status_code == 422
    for mode in SIMULATION_MODES:
        assert mode in resp.json()["detail"]


def test_simulated_failures_still_count_against_the_rate_limit(client, fake_supabase, enabled):
    statuses = [_ask(client, {"X-Simulate-Failure": "timeout"})[0].status_code for _ in range(11)]
    assert statuses[:10] == [503] * 10
    assert statuses[10] == 429
