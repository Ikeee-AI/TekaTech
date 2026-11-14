"""Sourced prices (14 Nov 2026): price_source_url, price_checked_at and store_url on gadgets."""
from datetime import date, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from factories import sample_gadget

VALID = {"name": "Galaxy S25", "brand": "Samsung", "category": "Smartphone"}
SOURCE = "https://www.samsung.com/ph/smartphones/galaxy-s25/buy/"


def test_create_saves_the_three_fields(client, fake_supabase):
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={
        **VALID, "price_php": 49990, "price_source_url": f"  {SOURCE} ",
        "price_checked_at": "2026-11-14", "store_url": "https://www.samsung.com/ph/",
    })
    assert resp.status_code == 201
    saved = fake_supabase.writes[-1][2]
    assert saved["price_source_url"] == SOURCE
    assert saved["price_checked_at"] == "2026-11-14"
    assert saved["store_url"] == "https://www.samsung.com/ph/"


def test_create_without_source_leaves_the_columns_out(client, fake_supabase):
    """A price with no source is still allowed; the columns are not sent at all, so a database
    that has not applied gadget_price_source.sql yet keeps accepting plain gadgets."""
    fake_supabase.set_response("gadgets", "insert", [sample_gadget()])
    resp = client.post("/gadgets", json={**VALID, "price_php": 49990, "price_source_url": " ", "store_url": ""})
    assert resp.status_code == 201
    saved = fake_supabase.writes[-1][2]
    assert not {"price_source_url", "price_checked_at", "store_url"} & saved.keys()


@pytest.mark.parametrize("field", ["price_source_url", "store_url"])
@pytest.mark.parametrize("url", ["javascript:alert(1)", "ftp://x.com/a", "samsung.com/ph", "https://a b.com"])
def test_bad_links_are_refused(client, fake_supabase, field, url):
    assert client.post("/gadgets", json={**VALID, field: url}).status_code == 422
    assert client.patch(f"/gadgets/{uuid4()}", json={field: url}).status_code == 422
    assert fake_supabase.writes == []


@pytest.mark.parametrize("checked", [
    "1969-12-31", "not-a-date", (date.today() + timedelta(days=5)).isoformat(),
])
def test_bad_checked_dates_are_refused(client, fake_supabase, checked):
    resp = client.post("/gadgets", json={**VALID, "price_checked_at": checked})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


@pytest.mark.parametrize("field", ["price_source_url", "price_checked_at", "store_url"])
def test_patch_null_clears_a_field(client, fake_supabase, field):
    fake_supabase.set_response("gadgets", "update", [sample_gadget()])
    resp = client.patch(f"/gadgets/{uuid4()}", json={field: None})
    assert resp.status_code == 200
    assert fake_supabase.writes[-1] == ("gadgets", "update", {field: None})


def test_list_and_detail_return_the_fields(client, fake_supabase):
    gadget = sample_gadget(price_source_url=SOURCE, price_checked_at="2026-11-14",
                           store_url="https://www.samsung.com/ph/")
    fake_supabase.set_response("gadgets", "select", [gadget])
    row = client.get("/gadgets").json()[0]
    assert row["price_source_url"] == SOURCE
    assert row["price_checked_at"] == "2026-11-14"
    assert row["store_url"] == "https://www.samsung.com/ph/"
    assert client.get(f"/gadgets/{gadget['id']}").json()["store_url"] == "https://www.samsung.com/ph/"


def test_rows_without_the_columns_still_load(client, fake_supabase):
    """Before the SQL file is applied the rows have no such keys; responses give null."""
    fake_supabase.set_response("gadgets", "select", [sample_gadget()])
    row = client.get("/gadgets").json()[0]
    assert row["price_source_url"] is None and row["price_checked_at"] is None and row["store_url"] is None


def test_non_admin_cannot_write_a_price_source(client, fake_supabase):
    from auth import get_current_user
    from main import app

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="u1", email="u@example.com", app_metadata={})
    try:
        resp = client.patch(f"/gadgets/{uuid4()}", json={"price_source_url": SOURCE})
        assert resp.status_code == 403
    finally:
        if original is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = original
    assert fake_supabase.writes == []
