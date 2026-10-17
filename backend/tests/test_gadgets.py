from types import SimpleNamespace
from uuid import uuid4

from factories import sample_gadget


def test_list_gadgets_empty(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    resp = client.get("/gadgets")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_gadgets_returns_data(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [sample_gadget()])
    resp = client.get("/gadgets")
    assert resp.status_code == 200
    assert resp.json()[0]["name"] == "Galaxy S24"


def test_get_gadget_not_found(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    resp = client.get(f"/gadgets/{uuid4()}")
    assert resp.status_code == 404


def test_get_gadget_found(client, fake_supabase):
    gadget = sample_gadget()
    fake_supabase.set_response("gadgets", "select", [gadget])
    resp = client.get(f"/gadgets/{gadget['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == gadget["name"]


def test_create_gadget(client, fake_supabase):
    gadget = sample_gadget()
    fake_supabase.set_response("gadgets", "insert", [gadget])
    resp = client.post(
        "/gadgets", json={"name": "Galaxy S24", "brand": "Samsung", "category": "smartphone"}
    )
    assert resp.status_code == 201
    assert resp.json()["brand"] == "Samsung"


def test_update_gadget_not_found(client, fake_supabase):
    fake_supabase.set_response("gadgets", "update", [])
    resp = client.patch(f"/gadgets/{uuid4()}", json={"price_php": 100})
    assert resp.status_code == 404


def test_update_gadget_no_fields(client, fake_supabase):
    resp = client.patch(f"/gadgets/{uuid4()}", json={})
    assert resp.status_code == 400


def test_delete_gadget_not_found(client, fake_supabase):
    fake_supabase.set_response("gadgets", "delete", [])
    resp = client.delete(f"/gadgets/{uuid4()}")
    assert resp.status_code == 404


def test_delete_gadget_success(client, fake_supabase):
    gadget = sample_gadget()
    fake_supabase.set_response("gadgets", "delete", [gadget])
    resp = client.delete(f"/gadgets/{gadget['id']}")
    assert resp.status_code == 204


def test_delete_gadget_requires_admin(client, fake_supabase):
    from main import app
    from auth import get_current_user

    non_admin = SimpleNamespace(id="non-admin", email="user@example.com", app_metadata={})
    app.dependency_overrides[get_current_user] = lambda: non_admin
    try:
        resp = client.delete(f"/gadgets/{uuid4()}")
        assert resp.status_code == 403
    finally:
        # restore the admin override the `client` fixture originally set
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id="00000000-0000-0000-0000-000000000001", email="test@example.com", app_metadata={"is_admin": True}
        )

def test_get_gadget_malformed_id(client, fake_supabase):
    resp = client.get("/gadgets/not-a-uuid")
    assert resp.status_code == 422