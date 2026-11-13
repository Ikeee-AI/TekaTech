"""auth.get_current_user: a token Supabase refuses is a 401; Supabase being unreachable is a 503.

The frontend signs the user out on 401, so an outage must never be reported as one.
"""
import logging
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from supabase_auth.errors import (
    AuthApiError,
    AuthInvalidJwtError,
    AuthRetryableError,
    AuthSessionMissingError,
    AuthUnknownError,
)

import auth

TOKEN = "secret-session-token-value"


def _supabase_raising(monkeypatch, exc):
    def get_user(token):
        raise exc

    monkeypatch.setattr(auth, "supabase", SimpleNamespace(auth=SimpleNamespace(get_user=get_user)))


@pytest.mark.parametrize(
    "exc",
    [
        AuthApiError("invalid JWT", 401, "bad_jwt"),
        AuthApiError("user not found", 403, "user_not_found"),
        AuthApiError("bad request", 400, None),
        AuthInvalidJwtError("JWT has expired"),
        AuthSessionMissingError(),
    ],
    ids=lambda e: f"{type(e).__name__}-{getattr(e, 'status', '')}",
)
def test_rejected_token_is_401(monkeypatch, exc):
    _supabase_raising(monkeypatch, exc)
    with pytest.raises(HTTPException) as err:
        auth.get_current_user(f"Bearer {TOKEN}")
    assert err.value.status_code == 401
    assert err.value.detail == auth.DETAIL_SESSION_INVALID


@pytest.mark.parametrize(
    "exc",
    [
        AuthRetryableError("Cloudflare 521", 521),
        AuthRetryableError("connection refused", 0),
        AuthApiError("internal error", 500, None),
        AuthUnknownError("bad json", ValueError("x")),
        httpx.ConnectTimeout("timed out"),
        httpx.ConnectError("dns failure"),
        RuntimeError("anything else"),
    ],
    ids=lambda e: f"{type(e).__name__}-{getattr(e, 'status', '')}",
)
def test_outage_is_503_and_logs_only_the_exception_type(monkeypatch, caplog, exc):
    _supabase_raising(monkeypatch, exc)
    with caplog.at_level(logging.WARNING, logger="auth"):
        with pytest.raises(HTTPException) as err:
            auth.get_current_user(f"Bearer {TOKEN}")
    assert err.value.status_code == 503
    assert err.value.detail == "Sign-in check is temporarily unavailable. Please try again."
    assert type(exc).__name__ in caplog.text
    assert TOKEN not in caplog.text
    assert all(record.exc_info is None for record in caplog.records)


def test_missing_user_in_response_is_401(monkeypatch):
    monkeypatch.setattr(
        auth, "supabase", SimpleNamespace(auth=SimpleNamespace(get_user=lambda t: SimpleNamespace(user=None)))
    )
    with pytest.raises(HTTPException) as err:
        auth.get_current_user(f"Bearer {TOKEN}")
    assert err.value.status_code == 401


def test_missing_header_is_401():
    with pytest.raises(HTTPException) as err:
        auth.get_current_user(None)
    assert err.value.status_code == 401


def test_admin_comes_from_app_metadata_only():
    member_claims_admin = SimpleNamespace(id="u", app_metadata={}, user_metadata={"is_admin": True})
    with pytest.raises(HTTPException) as err:
        auth.get_current_admin_user(member_claims_admin)
    assert err.value.status_code == 403
    admin = SimpleNamespace(id="a", app_metadata={"is_admin": True}, user_metadata={})
    assert auth.get_current_admin_user(admin) is admin


def test_outage_reaches_the_client_as_a_503(client, monkeypatch):
    from main import app

    _supabase_raising(monkeypatch, AuthRetryableError("down", 503))
    previous = app.dependency_overrides.pop(auth.get_current_user)
    try:
        resp = client.get("/corrections/mine", headers={"Authorization": f"Bearer {TOKEN}"})
    finally:
        app.dependency_overrides[auth.get_current_user] = previous
    assert resp.status_code == 503
    assert TOKEN not in resp.text
