"""Delete my account (routers/my_account.py, #213).

Who may call the route is covered by test_authorization_matrix.py (USER level). These tests pin
the behaviour: the caller only (no id parameter), rows first and the Auth user last, an
anonymised submitter on kept corrections, admins refused, plain 503s that leave a retry safe,
and a rate limit.
"""
from types import SimpleNamespace

from auth import get_current_user
from main import app
from routers.my_account import ANONYMOUS_SUBMITTER

USER_ID = "11111111-1111-1111-1111-111111111111"


def _as_ordinary_user(user_id=USER_ID, is_admin=False):
    """The conftest client is an admin; swap in an ordinary user for this test and return a restore function."""
    user = SimpleNamespace(id=user_id, email="user@example.com", app_metadata={"is_admin": True} if is_admin else {})
    previous = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user

    def restore():
        app.dependency_overrides[get_current_user] = previous

    return restore


def test_deletes_the_callers_rows_then_the_auth_user(client, fake_supabase):
    restore = _as_ordinary_user()
    try:
        resp = client.delete("/me/account")
    finally:
        restore()
    assert resp.status_code == 204 and resp.content == b""
    # Rows first, in this order; the Auth user is deleted last (checked below).
    assert [w[:2] for w in fake_supabase.writes] == [
        ("user_gadgets", "delete"),
        ("user_questions", "delete"),
        ("spec_corrections", "delete"),
        ("spec_corrections", "update"),
    ]
    assert fake_supabase.writes[-1][2] == {"submitted_by": ANONYMOUS_SUBMITTER}
    # Every filter is the session user's id; the pending-only filter protects resolved corrections.
    assert ("user_gadgets", "user_id", USER_ID) in fake_supabase.filters
    assert ("user_questions", "user_id", USER_ID) in fake_supabase.filters
    assert fake_supabase.filters.count(("spec_corrections", "submitted_by", USER_ID)) == 2
    assert ("spec_corrections", "status", "pending") in fake_supabase.filters
    assert fake_supabase.deleted_users == [USER_ID]


def test_the_route_takes_no_user_id(client):
    # Nobody can name another account: the path has no parameter and the body is ignored.
    operation = app.openapi()["paths"]["/me/account"]["delete"]
    # The only input is the Authorization header (the session); no path, query or body field names a user.
    assert [p["name"] for p in operation.get("parameters", [])] == ["authorization"]
    assert "requestBody" not in operation


def test_query_history_is_left_alone(client, fake_supabase):
    restore = _as_ordinary_user()
    try:
        client.delete("/me/account")
    finally:
        restore()
    assert not [w for w in fake_supabase.writes if w[0] in ("query_history", "gadgets", "spec_documents")]


def test_anonymous_gets_401_and_nothing_is_deleted(client, fake_supabase):
    # No override: the real auth dependency runs with no Authorization header.
    previous = app.dependency_overrides.pop(get_current_user)
    try:
        resp = client.delete("/me/account")
    finally:
        app.dependency_overrides[get_current_user] = previous
    assert resp.status_code == 401
    assert fake_supabase.writes == [] and fake_supabase.deleted_users == []


def test_admin_account_is_refused_and_untouched(client, fake_supabase):
    # The conftest client is already an admin.
    resp = client.delete("/me/account")
    assert resp.status_code == 409
    assert "Admin" in resp.json()["detail"]
    assert fake_supabase.writes == [] and fake_supabase.deleted_users == []


def test_a_database_failure_is_a_plain_503_and_the_auth_user_stays(client, fake_supabase, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("connection reset by peer 10.0.0.5")

    monkeypatch.setattr(fake_supabase, "table", boom)
    restore = _as_ordinary_user()
    try:
        resp = client.delete("/me/account")
    finally:
        restore()
    assert resp.status_code == 503
    assert "connection reset" not in resp.text and "10.0.0.5" not in resp.text
    assert fake_supabase.deleted_users == [], "the account must not be deleted when its rows could not be"


def test_an_auth_failure_is_a_plain_503_and_a_retry_finishes_the_job(client, fake_supabase):
    fake_supabase.delete_user_error = RuntimeError("auth service unavailable")
    restore = _as_ordinary_user()
    try:
        first = client.delete("/me/account")
        assert first.status_code == 503
        assert "unavailable" not in first.text
        assert fake_supabase.deleted_users == []
        # The rows were already removed; deleting them again is harmless and the retry succeeds.
        fake_supabase.delete_user_error = None
        second = client.delete("/me/account")
    finally:
        restore()
    assert second.status_code == 204
    assert fake_supabase.deleted_users == [USER_ID]


def test_rate_limit_is_five_per_hour(client, fake_supabase):
    restore = _as_ordinary_user()
    try:
        codes = [client.delete("/me/account").status_code for _ in range(6)]
    finally:
        restore()
    assert codes[:5] == [204] * 5
    assert codes[5] == 429
