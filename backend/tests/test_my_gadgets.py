"""My Gadgets: a signed-in user's personal list of catalog gadgets (routers/my_gadgets.py).

Who may call these routes is covered by test_authorization_matrix.py (USER level).
These tests pin the behaviour: always scoped to the session user, idempotent add and
remove, a 404 for a gadget not in the catalog, the per-user cap, and plain 503s.
"""
from uuid import uuid4

from routers.my_gadgets import MAX_MY_GADGETS

SESSION_USER = "00000000-0000-0000-0000-000000000001"  # conftest's fake user


def _gadget(gid=None, name="Pixel 9"):
    return {"id": gid or str(uuid4()), "name": name, "brand": "Google", "category": "Smartphone"}


def test_list_is_empty_at_first(client, fake_supabase):
    fake_supabase.set_response("user_gadgets", "select", [])
    resp = client.get("/me/gadgets")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_returns_gadgets_newest_first_for_the_session_user_only(client, fake_supabase):
    g = _gadget()
    fake_supabase.set_response(
        "user_gadgets", "select", [{"gadget_id": g["id"], "created_at": "2026-11-03T04:00:00+00:00", "gadgets": g}]
    )
    resp = client.get("/me/gadgets")
    assert resp.status_code == 200
    assert resp.json() == [{"added_at": "2026-11-03T04:00:00+00:00", "gadget": g}]
    assert ("user_gadgets", "user_id", SESSION_USER) in fake_supabase.filters
    assert ("user_gadgets", "created_at", {"desc": True}) in fake_supabase.orders
    assert ("user_gadgets", MAX_MY_GADGETS) in fake_supabase.limits


def test_list_skips_a_row_whose_gadget_is_gone(client, fake_supabase):
    fake_supabase.set_response(
        "user_gadgets", "select", [{"gadget_id": str(uuid4()), "created_at": "2026-11-03T04:00:00+00:00", "gadgets": None}]
    )
    assert client.get("/me/gadgets").json() == []


def test_add_saves_a_row_for_the_session_user(client, fake_supabase):
    gid = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gid}])
    fake_supabase.set_response("user_gadgets", "select", [])
    resp = client.put(f"/me/gadgets/{gid}")
    assert resp.status_code == 204
    assert ("user_gadgets", "insert", {"user_id": SESSION_USER, "gadget_id": gid}) in fake_supabase.writes


def test_add_is_a_no_op_when_already_in_the_list(client, fake_supabase):
    gid = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gid}])
    fake_supabase.set_response("user_gadgets", "select", [{"gadget_id": gid}])
    resp = client.put(f"/me/gadgets/{gid}")
    assert resp.status_code == 204
    assert not [w for w in fake_supabase.writes if w[0] == "user_gadgets"]


def test_add_unknown_gadget_is_404_and_writes_nothing(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    resp = client.put(f"/me/gadgets/{uuid4()}")
    assert resp.status_code == 404
    assert fake_supabase.writes == []


def test_add_refuses_past_the_cap(client, fake_supabase):
    gid = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gid}])
    fake_supabase.set_response("user_gadgets", "select", [{"gadget_id": str(uuid4())} for _ in range(MAX_MY_GADGETS)])
    resp = client.put(f"/me/gadgets/{gid}")
    assert resp.status_code == 409
    assert str(MAX_MY_GADGETS) in resp.json()["detail"]
    assert fake_supabase.writes == []


def test_add_rejects_a_malformed_id(client, fake_supabase):
    assert client.put("/me/gadgets/not-a-uuid").status_code == 422


def test_remove_deletes_only_the_session_users_row(client, fake_supabase):
    gid = str(uuid4())
    resp = client.delete(f"/me/gadgets/{gid}")
    assert resp.status_code == 204
    assert ("user_gadgets", "delete", None) in fake_supabase.writes
    assert ("user_gadgets", "user_id", SESSION_USER) in fake_supabase.filters
    assert ("user_gadgets", "gadget_id", gid) in fake_supabase.filters
    # The catalog itself is never touched.
    assert not [w for w in fake_supabase.writes if w[0] == "gadgets"]


def test_database_failure_is_a_plain_503(client, fake_supabase, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("connection reset")

    monkeypatch.setattr(fake_supabase, "table", boom)
    resp = client.get("/me/gadgets")
    assert resp.status_code == 503
    assert "connection reset" not in resp.text
