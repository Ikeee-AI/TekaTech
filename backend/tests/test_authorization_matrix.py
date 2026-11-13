"""Authorization matrix: who may call which route (S4-MA, "no unauthorized protected operation succeeds").

The backend uses the service-role key, which bypasses Row Level Security, so these dependencies are the
only access control (CLAUDE.md, "Route code is the only access control"). Three layers, all driven by
the app's real route list:

1. Inventory: every route is classified below. A new route that is not listed fails here, so nobody can
   add an endpoint without deciding who may call it.
2. Wiring: the classification must match the dependency the route actually declares, so a dropped
   `Depends(get_current_admin_user)` is caught even if no one wrote a test for that route.
3. Behaviour: each route is called as anonymous, bad-token, ordinary-user, "claims admin in
   user_metadata" and admin callers through the real auth dependencies. A denied caller must get
   401/403 and change nothing; the guard also proves no OpenAI call was made.

The failure drill's own gate (admin + header + flag) is covered in test_failure_simulation.py.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute
from supabase_auth.errors import AuthApiError

PUBLIC, USER, ADMIN = "public", "user", "admin"

# (method, path) -> who may call it. Public routes are deliberately open (the rate limit is their only guard).
EXPECTED = {
    ("GET", "/health"): PUBLIC,
    ("GET", "/health/ready"): PUBLIC,
    ("GET", "/version"): PUBLIC,
    ("GET", "/gadgets"): PUBLIC,
    ("GET", "/gadgets/{gadget_id}"): PUBLIC,
    ("POST", "/gadgets"): ADMIN,
    ("PATCH", "/gadgets/{gadget_id}"): ADMIN,
    ("DELETE", "/gadgets/{gadget_id}"): ADMIN,
    ("GET", "/gadgets/{gadget_id}/specs"): PUBLIC,
    ("POST", "/gadgets/{gadget_id}/specs"): ADMIN,
    ("POST", "/gadgets/{gadget_id}/specs/{spec_id}/index"): ADMIN,
    ("DELETE", "/gadgets/{gadget_id}/specs/{spec_id}"): ADMIN,
    ("POST", "/specs/{spec_id}/corrections"): USER,
    ("GET", "/corrections/mine"): USER,
    ("GET", "/corrections/pending-count"): ADMIN,
    ("GET", "/corrections"): ADMIN,
    ("PATCH", "/corrections/{correction_id}"): ADMIN,
    ("POST", "/comparisons"): USER,
    ("GET", "/comparisons/{slug}"): USER,
    ("POST", "/query"): USER,
    ("GET", "/stats/spec-coverage"): PUBLIC,
    ("GET", "/stats/trending-questions"): USER,
    ("GET", "/techspecs/search"): ADMIN,
    ("POST", "/techspecs/import"): ADMIN,
    ("GET", "/me/gadgets"): USER,
    ("PUT", "/me/gadgets/{gadget_id}"): USER,
    ("DELETE", "/me/gadgets/{gadget_id}"): USER,
    ("GET", "/me/gadgets/{gadget_id}/questions"): USER,
    ("DELETE", "/me/gadgets/{gadget_id}/questions"): USER,
    ("GET", "/me/ai-usage"): USER,
}

# /health/ready reaches for the real database, which a unit test must not do.
NOT_CALLED = {("GET", "/health/ready")}

# caller name -> Authorization header (None = no header at all)
CALLERS = {
    "anonymous": None,
    "bad_token": "Bearer not-a-real-session",
    "user": "Bearer user-token",
    "user_claiming_admin": "Bearer claims-admin-token",
    "admin": "Bearer admin-token",
}


def _allowed(level, caller):
    if level == PUBLIC:
        return True
    if level == USER:
        return caller in ("user", "user_claiming_admin", "admin")
    return caller == "admin"  # user_metadata.is_admin is client-writable, so it must never count


def _app_routes():
    """Every APIRoute the app serves: its own, plus each included router's (prefixes are baked into the path)."""
    from main import app
    from routers import ai_usage, comparisons, corrections, gadgets, my_gadgets, query, specs, stats, techspecs

    routes = [r for r in app.routes if isinstance(r, APIRoute)]
    for module in (gadgets, specs, corrections, comparisons, query, stats, techspecs, my_gadgets, ai_usage):
        routes += [r for r in module.router.routes if isinstance(r, APIRoute)]
    return routes


def _wired_level(route):
    names = set()

    def walk(dependant):
        for sub in dependant.dependencies:
            names.add(getattr(sub.call, "__name__", ""))
            walk(sub)

    walk(route.dependant)
    if "get_current_admin_user" in names:
        return ADMIN
    if "get_current_user" in names:
        return USER
    return PUBLIC


def _served_operations():
    from main import app

    return {
        (method.upper(), path)
        for path, item in app.openapi()["paths"].items()
        for method in item
        if method in ("get", "post", "put", "patch", "delete")
    }


def test_every_route_is_classified():
    served = _served_operations()
    assert served - set(EXPECTED) == set(), "route(s) with no access decision; add them to EXPECTED"
    assert set(EXPECTED) - served == set(), "EXPECTED lists route(s) the app no longer serves"


def test_declared_access_matches_the_dependency_each_route_declares():
    wired = {}
    for route in _app_routes():
        for method in route.methods - {"HEAD", "OPTIONS"}:
            wired[(method, route.path)] = _wired_level(route)
    assert set(wired) == set(EXPECTED), "the route objects and the served operations disagree"
    mismatches = {key: (EXPECTED[key], wired[key]) for key in EXPECTED if EXPECTED[key] != wired[key]}
    assert mismatches == {}, "declared vs actually wired access (declared, wired)"


@pytest.fixture
def real_auth(client, monkeypatch):
    """Run the real auth dependencies against a fake Supabase session lookup instead of the admin override."""
    from auth import get_current_user
    from main import app

    sessions = {
        "user-token": SimpleNamespace(id="u-1", app_metadata={}, user_metadata={}),
        "claims-admin-token": SimpleNamespace(id="u-2", app_metadata={}, user_metadata={"is_admin": True}),
        "admin-token": SimpleNamespace(id="u-3", app_metadata={"is_admin": True}, user_metadata={}),
    }

    def get_user(token):
        if token not in sessions:
            raise AuthApiError("invalid session", 401, "bad_jwt")
        return SimpleNamespace(user=sessions[token])

    monkeypatch.setattr("auth.supabase", SimpleNamespace(auth=SimpleNamespace(get_user=get_user)))
    previous = app.dependency_overrides.pop(get_current_user)
    yield client
    app.dependency_overrides[get_current_user] = previous


def _concrete(path):
    for name in ("gadget_id", "spec_id", "correction_id"):
        path = path.replace("{" + name + "}", str(uuid4()))
    return path.replace("{slug}", "abc1234")


@pytest.mark.parametrize(
    "method,template", sorted(k for k in EXPECTED if k not in NOT_CALLED), ids=lambda v: str(v)
)
def test_each_caller_gets_exactly_the_access_the_matrix_says(real_auth, fake_supabase, method, template):
    level = EXPECTED[(method, template)]
    with patch("routers.query.client", MagicMock()) as chat, patch("routers.specs.embed_texts") as embed:
        for caller, header in CALLERS.items():
            fake_supabase.writes.clear()
            headers = {"Authorization": header} if header else {}
            # An empty body: for an allowed caller it fails validation (422) or finds nothing (404),
            # which is enough to show auth let it through, and nothing here can reach OpenAI.
            resp = real_auth.request(method, _concrete(template), headers=headers, json={} if method in ("POST", "PATCH", "PUT") else None)
            where = f"{caller} -> {method} {template} -> {resp.status_code}"
            if _allowed(level, caller):
                assert resp.status_code not in (401, 403), where
            else:
                expected = 403 if (level == ADMIN and caller in ("user", "user_claiming_admin")) else 401
                assert resp.status_code == expected, where
                assert fake_supabase.writes == [], f"a denied caller changed data: {where}"
        assert not chat.method_calls and not chat.called, "a request reached the chat model"
        embed.assert_not_called()
