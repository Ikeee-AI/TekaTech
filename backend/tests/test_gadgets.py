from types import SimpleNamespace
from uuid import uuid4

import pytest

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


@pytest.mark.parametrize("param, cap", [("category", 60), ("brand", 80)])
def test_list_filters_are_capped_at_the_saved_field_length(client, fake_supabase, param, cap):
    fake_supabase.set_response("gadgets", "select", [])
    assert client.get("/gadgets", params={param: "x" * cap}).status_code == 200
    resp = client.get("/gadgets", params={param: "x" * (cap + 1)})
    assert resp.status_code == 422
    assert len(fake_supabase.filters) == 1  # only the in-range request reached the database


# --- Server-side input validation (mirrors frontend/src/utils/gadgetValidation.js) ---

VALID = {"name": "Galaxy S24", "brand": "Samsung", "category": "Smartphone"}


def _messages(resp):
    return [d["msg"] for d in resp.json()["detail"]]


@pytest.mark.parametrize(
    "field, value, message",
    [
        ("name", "", "Enter the gadget name."),
        ("name", "   ", "Enter the gadget name."),
        ("name", "x" * 121, "Keep the name under 120 characters."),
        ("brand", "\t", "Enter the brand."),
        ("brand", "b" * 81, "Keep the brand under 80 characters."),
        ("category", " ", "Enter a category, like Smartphone or Laptop."),
        ("category", "c" * 61, "Keep the category under 60 characters."),
    ],
)
def test_create_gadget_rejects_bad_text(client, fake_supabase, field, value, message):
    resp = client.post("/gadgets", json={**VALID, field: value})
    assert resp.status_code == 422
    assert message in _messages(resp)
    assert fake_supabase.writes == []


def test_create_gadget_accepts_text_at_the_limits_and_strips_it(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post(
        "/gadgets", json={"name": "  " + "n" * 120 + "  ", "brand": "b" * 80, "category": "c" * 60}
    )
    assert resp.status_code == 201
    saved = fake_supabase.writes[-1][2]
    assert saved["name"] == "n" * 120
    assert saved["brand"] == "b" * 80
    assert saved["category"] == "C" + "c" * 59


@pytest.mark.parametrize("price", [-1, -0.01, 10_000_000.01, 1e20, "NaN", "Infinity", "abc"])
def test_create_gadget_rejects_bad_price(client, fake_supabase, price):
    resp = client.post("/gadgets", json={**VALID, "price_php": price})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


def test_create_gadget_rejects_nan_literal_price(client, fake_supabase):
    # Python's JSON parser accepts the bare NaN / Infinity tokens, so send them raw.
    for literal in ("NaN", "Infinity", "-Infinity"):
        body = '{"name": "P", "brand": "B", "category": "C", "price_php": %s}' % literal
        resp = client.post("/gadgets", content=body, headers={"Content-Type": "application/json"})
        assert resp.status_code == 422, literal
    assert fake_supabase.writes == []


@pytest.mark.parametrize("price", [0, 24999, 24999.5, 10_000_000])
def test_create_gadget_accepts_price_in_range(client, fake_supabase, price):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={**VALID, "price_php": price})
    assert resp.status_code == 201
    assert fake_supabase.writes[-1][2]["price_php"] == price


@pytest.mark.parametrize("release_date", ["1969-12-31", "2101-01-01", "0001-01-01", "2024-02-30", "not-a-date"])
def test_create_gadget_rejects_bad_release_date(client, fake_supabase, release_date):
    resp = client.post("/gadgets", json={**VALID, "release_date": release_date})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


@pytest.mark.parametrize("release_date", ["1970-01-01", "2024-01-17", "2100-12-31"])
def test_create_gadget_accepts_release_date_in_range(client, fake_supabase, release_date):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={**VALID, "release_date": release_date})
    assert resp.status_code == 201


@pytest.mark.parametrize(
    "image_url",
    [
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "ftp://example.com/a.png",
        "//example.com/a.png",
        "example.com/a.png",
        "https://exa mple.com/a.png",
        "https://example.com/" + "a" * 2000,
    ],
)
def test_create_gadget_rejects_bad_image_url(client, fake_supabase, image_url):
    resp = client.post("/gadgets", json={**VALID, "image_url": image_url})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


def test_create_gadget_bad_image_url_message_matches_form(client, fake_supabase):
    resp = client.post("/gadgets", json={**VALID, "image_url": "javascript:alert(1)"})
    assert _messages(resp) == ["Enter a full link starting with http:// or https://."]


def test_create_gadget_accepts_and_strips_image_url(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={**VALID, "image_url": "  https://cdn.example.com/s24.png "})
    assert resp.status_code == 201
    assert fake_supabase.writes[-1][2]["image_url"] == "https://cdn.example.com/s24.png"


def test_create_gadget_blank_image_url_is_left_out(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={**VALID, "image_url": "  "})
    assert resp.status_code == 201
    assert "image_url" not in fake_supabase.writes[-1][2]


def test_update_gadget_applies_the_same_rules(client, fake_supabase):
    fake_supabase.set_response("gadgets", "update", [sample_gadget()])
    for body in (
        {"name": "   "},
        {"brand": "b" * 81},
        {"price_php": -5},
        {"release_date": "1900-01-01"},
        {"image_url": "javascript:alert(1)"},
    ):
        resp = client.patch(f"/gadgets/{uuid4()}", json=body)
        assert resp.status_code == 422, body
    assert fake_supabase.writes == []


def test_reading_old_rows_is_not_blocked_by_input_limits(client, fake_supabase):
    """Limits apply to writes only: a row saved before them must still load."""
    old = sample_gadget(name="x" * 300, image_url="not a link", price_php=99_999_999.0)
    fake_supabase.set_response("gadgets", "select", [old])
    assert client.get(f"/gadgets/{old['id']}").status_code == 200
    assert client.get("/gadgets").status_code == 200


# --- PATCH: explicit null clears an optional field, omitted fields stay ---


@pytest.mark.parametrize("field", ["price_php", "release_date", "image_url"])
def test_update_gadget_explicit_null_clears_optional_field(client, fake_supabase, field):
    fake_supabase.set_response("gadgets", "update", [sample_gadget(**{field: None})])
    resp = client.patch(f"/gadgets/{uuid4()}", json={field: None})
    assert resp.status_code == 200
    assert fake_supabase.writes[-1] == ("gadgets", "update", {field: None})


def test_update_gadget_omitted_fields_are_not_written(client, fake_supabase):
    fake_supabase.set_response("gadgets", "update", [sample_gadget()])
    resp = client.patch(f"/gadgets/{uuid4()}", json={"name": "  Galaxy S24 Ultra ", "price_php": None})
    assert resp.status_code == 200
    # Only what was sent: brand, category, release_date and image_url are untouched.
    assert fake_supabase.writes[-1] == ("gadgets", "update", {"name": "Galaxy S24 Ultra", "price_php": None})


@pytest.mark.parametrize(
    "field, message",
    [
        ("name", "Enter the gadget name."),
        ("brand", "Enter the brand."),
        ("category", "Enter a category, like Smartphone or Laptop."),
    ],
)
def test_update_gadget_rejects_null_required_field(client, fake_supabase, field, message):
    resp = client.patch(f"/gadgets/{uuid4()}", json={field: None})
    assert resp.status_code == 422
    assert _messages(resp) == [message]
    assert fake_supabase.writes == []


def test_update_gadget_still_invalidates_answer_cache(client, fake_supabase, monkeypatch):
    import answer_cache

    gadget_id = str(uuid4())
    calls = []
    monkeypatch.setattr(answer_cache, "invalidate_gadget", lambda g: calls.append(str(g)))
    fake_supabase.set_response("gadgets", "update", [sample_gadget(id=gadget_id)])
    assert client.patch(f"/gadgets/{gadget_id}", json={"image_url": None}).status_code == 200
    assert calls == [gadget_id]


# --- Database failures on write are a clear 503, not a bare 500 ---


def _break_gadget_writes(fake_supabase, monkeypatch):
    import conftest

    real_execute = conftest.FakeQuery.execute

    def execute(self):
        if self._table == "gadgets" and self._operation in ("insert", "update"):
            raise RuntimeError("connection to server at db.example failed")
        return real_execute(self)

    monkeypatch.setattr(conftest.FakeQuery, "execute", execute)


def test_create_gadget_database_error_is_503(client, fake_supabase, monkeypatch):
    _break_gadget_writes(fake_supabase, monkeypatch)
    resp = client.post("/gadgets", json=VALID)
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Couldn't save the gadget right now. Try again in a moment."


def test_create_gadget_empty_insert_result_is_503(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [])
    resp = client.post("/gadgets", json=VALID)
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Couldn't save the gadget right now. Try again in a moment."


def test_update_gadget_database_error_is_503_and_still_invalidates(client, fake_supabase, monkeypatch):
    import answer_cache

    _break_gadget_writes(fake_supabase, monkeypatch)
    calls = []
    monkeypatch.setattr(answer_cache, "invalidate_gadget", lambda g: calls.append(str(g)))
    gadget_id = str(uuid4())
    resp = client.patch(f"/gadgets/{gadget_id}", json={"name": "Renamed"})
    assert resp.status_code == 503
    assert "db.example" not in resp.text
    assert calls == [gadget_id]
