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


def test_create_gadget_without_name_returns_422(client, fake_supabase):
    resp = client.post("/gadgets", json={"brand": "Samsung", "category": "smartphone"})
    assert resp.status_code == 422


def test_delete_gadget_without_login_returns_401(client, fake_supabase):
    from main import app
    from auth import get_current_user

    previous = app.dependency_overrides.pop(get_current_user)
    try:
        resp = client.delete(f"/gadgets/{uuid4()}")
        assert resp.status_code == 401
        assert fake_supabase.writes == []
    finally:
        app.dependency_overrides[get_current_user] = previous


def test_create_gadget_requires_login(client, fake_supabase):
    from main import app
    from auth import get_current_user

    previous = app.dependency_overrides.pop(get_current_user)
    try:
        resp = client.post(
            "/gadgets", json={"name": "Phone", "brand": "Brand", "category": "smartphone"}
        )
        assert resp.status_code == 401
    finally:
        app.dependency_overrides[get_current_user] = previous


def test_update_gadget_requires_login(client, fake_supabase):
    from main import app
    from auth import get_current_user

    previous = app.dependency_overrides.pop(get_current_user)
    try:
        resp = client.patch(f"/gadgets/{uuid4()}", json={"price_php": 100})
        assert resp.status_code == 401
    finally:
        app.dependency_overrides[get_current_user] = previous


def test_create_gadget_rejects_missing_brand(client, fake_supabase):
    resp = client.post(
        "/gadgets", json={"name": "Phone", "category": "smartphone"}
    )
    assert resp.status_code == 422


def test_create_gadget_rejects_missing_category(client, fake_supabase):
    resp = client.post("/gadgets", json={"name": "Phone", "brand": "Samsung"})
    assert resp.status_code == 422


# --- #78: one spelling per category ---

def test_create_gadget_saves_one_category_spelling(client, fake_supabase):
    """"smartphone" and " Smartphone " must be saved as the same category."""
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    for typed in ["smartphone", "  Smartphone  "]:
        resp = client.post("/gadgets", json={"name": "Phone", "brand": "Brand", "category": typed})
        assert resp.status_code == 201

    saved = [payload["category"] for table, op, payload in fake_supabase.writes if op == "insert"]
    assert saved == ["Smartphone", "Smartphone"]


def test_update_gadget_saves_normalized_category(client, fake_supabase):
    fake_supabase.set_response("gadgets", "update", [sample_gadget()])
    resp = client.patch(f"/gadgets/{uuid4()}", json={"category": "  smart   watch "})
    assert resp.status_code == 200
    assert fake_supabase.writes[-1] == ("gadgets", "update", {"category": "Smart watch"})


def test_category_keeps_the_rest_as_typed(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    client.post("/gadgets", json={"name": "Quest 3", "brand": "Meta", "category": "VR headset"})
    assert fake_supabase.writes[-1][2]["category"] == "VR headset"


def test_list_shows_old_lowercase_rows_as_one_category(client, fake_supabase):
    """Rows saved before #78 come back with the same spelling as new ones."""
    old, new = sample_gadget(), sample_gadget()
    old["category"], new["category"] = "smartphone", "Smartphone"
    fake_supabase.set_response("gadgets", "select", [old, new])
    resp = client.get("/gadgets")
    assert resp.status_code == 200
    assert {g["category"] for g in resp.json()} == {"Smartphone"}


def test_list_category_filter_uses_same_spelling(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    client.get("/gadgets?category=smartphone")
    assert ("gadgets", "category", "Smartphone") in fake_supabase.filters
