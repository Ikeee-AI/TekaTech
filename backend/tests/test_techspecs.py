"""TechSpecs import (backend/techspecs.py, routers/techspecs.py): shipped disabled.

No real TechSpecs or OpenAI call is made anywhere here. Outbound HTTP goes through
techspecs._make_client, which each test replaces with an httpx.MockTransport (or with a
function that fails the test if it is ever called).
"""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr

import techspecs
from config import settings

# Obvious placeholders: they must not look like real credentials to scripts/check_secrets.py.
PLACEHOLDER_ID = "placeholder-techspecs-id"
PLACEHOLDER_KEY = "placeholder-techspecs-key"

SEARCH_BODY = {
    "status": "success",
    "data": {
        "items": [
            {"Product": {"id": "abc123", "Brand": "Apple", "Model": "iPhone 15", "Category": "Smartphones"}},
            {"Product": {"Brand": "No id here"}},
            {"Product": {"id": "../etc/passwd", "Brand": "Bad id"}},
        ]
    },
}

DETAIL_BODY = {
    "data": {
        "items": [
            {
                "Product": {"id": "abc123", "Brand": "Apple", "Model": "iPhone 15", "Category": "Smartphones"},
                "Image": {"front": "https://example.com/front.png"},
                "Display": {"Diagonal": "6.1 in", "Refresh Rate": "60 Hz", "HDR": True},
                "Battery": {"Capacity": "3349 mAh", "Charging": {"Wireless": "15 W"}},
                "Connectivity": {"Bands": ["5G", "LTE"], "NFC": None},
            }
        ]
    }
}


def _transport(handler, calls):
    def wrapped(request):
        calls.append(request)
        return handler(request)

    return lambda: httpx.Client(base_url=techspecs.BASE_URL, transport=httpx.MockTransport(wrapped))


@pytest.fixture
def no_outbound(monkeypatch):
    def fail():
        raise AssertionError("TechSpecs must not be called")

    monkeypatch.setattr(techspecs, "_make_client", fail)


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "techspecs_enabled", True)
    monkeypatch.setattr(settings, "techspecs_api_id", SecretStr(PLACEHOLDER_ID))
    monkeypatch.setattr(settings, "techspecs_api_key", SecretStr(PLACEHOLDER_KEY))


@pytest.fixture
def provider(monkeypatch):
    """Set the mocked TechSpecs response: provider(handler) -> list of captured requests."""

    def install(handler):
        calls = []
        monkeypatch.setattr(techspecs, "_make_client", _transport(handler, calls))
        return calls

    return install


def _gadget(fake_supabase):
    gadget_id = str(uuid4())
    fake_supabase.set_response("gadgets", "select", [{"id": gadget_id}])
    fake_supabase.set_response("spec_documents", "insert", [{"id": str(uuid4())}])
    return gadget_id


# --- disabled by default -------------------------------------------------------------------


def test_feature_is_off_by_default():
    from config import Settings

    fields = Settings.model_fields
    assert fields["techspecs_enabled"].default is False
    assert fields["techspecs_api_id"].default is None
    assert fields["techspecs_api_key"].default is None


def test_disabled_search_refuses_without_an_outbound_call(client, no_outbound, monkeypatch):
    monkeypatch.setattr(settings, "techspecs_enabled", False)
    resp = client.get("/techspecs/search", params={"query": "iphone"})
    assert resp.status_code == 503
    assert "disabled pending written authorization" in resp.json()["detail"]


def test_disabled_import_refuses_without_an_outbound_call_or_write(client, fake_supabase, no_outbound, monkeypatch):
    monkeypatch.setattr(settings, "techspecs_enabled", False)
    gadget_id = _gadget(fake_supabase)
    resp = client.post("/techspecs/import", json={"gadget_id": gadget_id, "product_id": "abc123"})
    assert resp.status_code == 503
    assert "disabled pending written authorization" in resp.json()["detail"]
    assert fake_supabase.writes == []


def test_enabled_without_credentials_is_503_and_makes_no_call(client, no_outbound, monkeypatch):
    monkeypatch.setattr(settings, "techspecs_enabled", True)
    monkeypatch.setattr(settings, "techspecs_api_id", None)
    monkeypatch.setattr(settings, "techspecs_api_key", None)
    resp = client.get("/techspecs/search", params={"query": "iphone"})
    assert resp.status_code == 503
    assert "credentials are not set" in resp.json()["detail"]


def test_production_config_does_not_configure_techspecs():
    root = Path(__file__).resolve().parents[2]
    for config in (root / "render.yaml", root / ".railway" / "railway.ts"):
        assert "TECHSPECS" not in config.read_text(encoding="utf-8").upper(), config.name


# --- access control ------------------------------------------------------------------------


@pytest.mark.parametrize("caller", ["anonymous", "user", "user_claiming_admin"])
def test_non_admins_are_refused_even_when_enabled(client, fake_supabase, enabled, no_outbound, caller):
    from auth import get_current_user
    from main import app

    users = {
        "user": SimpleNamespace(id="u-1", app_metadata={}, user_metadata={}),
        "user_claiming_admin": SimpleNamespace(id="u-2", app_metadata={}, user_metadata={"is_admin": True}),
    }
    previous = app.dependency_overrides[get_current_user]
    if caller == "anonymous":
        app.dependency_overrides.pop(get_current_user)
    else:
        app.dependency_overrides[get_current_user] = lambda: users[caller]
    try:
        search = client.get("/techspecs/search", params={"query": "iphone"})
        imported = client.post("/techspecs/import", json={"gadget_id": str(uuid4()), "product_id": "abc123"})
    finally:
        app.dependency_overrides[get_current_user] = previous
    expected = 401 if caller == "anonymous" else 403
    assert search.status_code == expected
    assert imported.status_code == expected
    assert fake_supabase.writes == []


# --- search --------------------------------------------------------------------------------


def test_search_requests_at_least_ten_and_cuts_to_size(client, fake_supabase, enabled, provider):
    many = {"data": {"results": [
        {"Product": {"id": f"p{i}", "Brand": "Example", "Model": f"Phone {i}"}} for i in range(12)
    ]}}
    calls = provider(lambda request: httpx.Response(200, json=many))
    resp = client.get("/techspecs/search", params={"query": "phone", "size": 3})
    assert resp.status_code == 200
    assert [r["id"] for r in resp.json()["results"]] == ["p0", "p1", "p2"]
    assert calls[0].url.params["size"] == "10"
    resp = client.get("/techspecs/search", params={"query": "phone", "size": 15})
    assert calls[1].url.params["size"] == "15"
    assert len(resp.json()["results"]) == 12


def test_search_maps_results_and_sends_credentials_as_headers(client, fake_supabase, enabled, provider):
    calls = provider(lambda request: httpx.Response(200, json=SEARCH_BODY))
    resp = client.get("/techspecs/search", params={"query": " iphone ", "page": 1, "size": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body["query"] == "iphone"
    # The id-less item and the item with an unsafe id are dropped.
    assert body["results"] == [
        {"id": "abc123", "name": "Apple iPhone 15", "brand": "Apple", "model": "iPhone 15", "category": "Smartphones"}
    ]
    (request,) = calls
    assert request.method == "GET"
    assert request.url.path == "/v5/products/search"
    # TechSpecs rejects size < 10 (HTTP 400), so 10 is requested and the list cut to 5 here.
    assert dict(request.url.params) == {"query": "iphone", "page": "1", "size": "10"}
    assert request.headers["x-api-id"] == PLACEHOLDER_ID
    assert request.headers["x-api-key"] == PLACEHOLDER_KEY
    assert PLACEHOLDER_KEY not in str(request.url)
    assert fake_supabase.writes == []  # preview only


@pytest.mark.parametrize(
    "params",
    [{}, {"query": "a"}, {"query": "x" * 101}, {"query": "ok", "size": 21}, {"query": "ok", "page": -1}],
)
def test_search_rejects_bad_input_without_a_call(client, enabled, no_outbound, params):
    assert client.get("/techspecs/search", params=params).status_code == 422


def test_search_with_unexpected_shape_returns_no_results(client, enabled, provider):
    provider(lambda request: httpx.Response(200, json={"unexpected": "shape"}))
    resp = client.get("/techspecs/search", params={"query": "iphone"})
    assert resp.status_code == 200
    assert resp.json()["results"] == []


# --- import --------------------------------------------------------------------------------


def test_import_saves_through_the_spec_path_with_attribution(client, fake_supabase, enabled, provider, monkeypatch):
    import routers.techspecs as techspecs_router

    monkeypatch.setattr(techspecs_router, "_today", lambda: "2026-11-02")
    calls = provider(lambda request: httpx.Response(200, json=DETAIL_BODY))
    gadget_id = _gadget(fake_supabase)
    with patch("routers.specs.embed_texts", side_effect=AssertionError("Saving must not call OpenAI")) as embed:
        resp = client.post("/techspecs/import", json={"gadget_id": gadget_id, "product_id": "abc123"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["indexing_status"] == "pending"
    assert body["product_id"] == "abc123"
    assert body["source"] == "TechSpecs"
    embed.assert_not_called()

    (request,) = calls
    assert request.url.path == "/v5/products/abc123"
    assert dict(request.url.params) == {"lang": "en"}

    table, operation, rows = fake_supabase.writes[-1]
    assert (table, operation) == ("spec_documents", "insert")
    assert all(row["embedding"] is None and row["indexing_status"] == "pending" for row in rows)
    assert all(row["gadget_id"] == gadget_id and row["source_url"] == "https://techspecs.io/" for row in rows)
    text = "\n".join(row["content"] for row in rows)
    assert text.startswith("Source: TechSpecs (techspecs.io), product abc123, retrieved 2026-11-02 (UTC)")
    assert "Product: Apple iPhone 15" in text
    assert "Display / Diagonal: 6.1 in" in text
    assert "Display / HDR: Yes" in text
    assert "Battery / Charging / Wireless: 15 W" in text
    assert "Connectivity / Bands: 5G, LTE" in text
    assert "front.png" not in text  # image sections are skipped
    assert "NFC" not in text  # empty values are skipped


def test_import_into_missing_gadget_is_404_without_a_call(client, fake_supabase, enabled, no_outbound):
    fake_supabase.set_response("gadgets", "select", [])
    resp = client.post("/techspecs/import", json={"gadget_id": str(uuid4()), "product_id": "abc123"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Gadget not found"
    assert fake_supabase.writes == []


@pytest.mark.parametrize(
    "payload",
    [
        {"product_id": "abc123"},
        {"gadget_id": "not-a-uuid", "product_id": "abc123"},
        {"gadget_id": str(uuid4()), "product_id": ""},
        {"gadget_id": str(uuid4()), "product_id": "../../admin"},
        {"gadget_id": str(uuid4()), "product_id": "x" * 65},
    ],
)
def test_import_rejects_bad_input_without_a_call(client, fake_supabase, enabled, no_outbound, payload):
    assert client.post("/techspecs/import", json=payload).status_code == 422
    assert fake_supabase.writes == []


def test_import_of_oversized_product_is_422_and_saves_nothing(client, fake_supabase, enabled, provider, monkeypatch):
    monkeypatch.setattr(techspecs, "MAX_LINES", 5000)
    huge = {"data": {"Product": {"Brand": "Big"}, "Specs": {f"Field {i}": "v" * 200 for i in range(200)}}}
    provider(lambda request: httpx.Response(200, json=huge))
    gadget_id = _gadget(fake_supabase)
    resp = client.post("/techspecs/import", json={"gadget_id": gadget_id, "product_id": "abc123"})
    assert resp.status_code == 422
    assert fake_supabase.writes == []


# --- provider failures ---------------------------------------------------------------------


def _raise(exc):
    def handler(request):
        raise exc

    return handler


@pytest.mark.parametrize(
    "handler,status,detail",
    [
        (lambda r: httpx.Response(401, json={"error": f"bad key {PLACEHOLDER_KEY}"}), 502, "rejected the request"),
        (lambda r: httpx.Response(403, text="forbidden"), 502, "rejected the request"),
        (lambda r: httpx.Response(429, text="slow down"), 503, "request limit reached"),
        (lambda r: httpx.Response(500, text="boom"), 503, "unavailable"),
        (lambda r: httpx.Response(404, text="nope"), 404, "product not found"),
        (_raise(httpx.ReadTimeout("timed out")), 503, "took too long"),
        (_raise(httpx.ConnectError("refused")), 503, "unavailable"),
        (lambda r: httpx.Response(200, text="<html>not json</html>"), 502, "couldn't use"),
        (lambda r: httpx.Response(200, json={"data": []}), 502, "couldn't use"),
        (lambda r: httpx.Response(200, json={"data": {"items": [{"Product": {}}]}}), 502, "couldn't use"),
        (lambda r: httpx.Response(200, json=["not", "an", "object"]), 502, "couldn't use"),
    ],
    ids=["401", "403", "429", "500", "404", "timeout", "connect", "not-json", "empty", "no-fields", "list"],
)
def test_import_provider_failures_are_safe_and_save_nothing(
    client, fake_supabase, enabled, provider, caplog, handler, status, detail
):
    provider(handler)
    gadget_id = _gadget(fake_supabase)
    resp = client.post("/techspecs/import", json={"gadget_id": gadget_id, "product_id": "abc123"})
    assert resp.status_code == status
    assert detail in resp.json()["detail"]
    assert PLACEHOLDER_KEY not in resp.text and PLACEHOLDER_ID not in resp.text
    assert PLACEHOLDER_KEY not in caplog.text and PLACEHOLDER_ID not in caplog.text
    assert fake_supabase.writes == []


@pytest.mark.parametrize("status,expected", [(401, 502), (429, 503)])
def test_search_provider_failures_are_safe(client, enabled, provider, status, expected):
    provider(lambda r: httpx.Response(status, text=PLACEHOLDER_KEY))
    resp = client.get("/techspecs/search", params={"query": "iphone"})
    assert resp.status_code == expected
    assert PLACEHOLDER_KEY not in resp.text


def test_settings_repr_never_shows_the_key(enabled):
    assert PLACEHOLDER_KEY not in repr(settings)
    assert PLACEHOLDER_ID not in repr(settings)


# --- shape of a real v5 response (trial probe, 2 Nov 2026) ---------------------------------
# Keys and nesting copied from the probe's shape output; every value is made up. No TechSpecs
# data is stored in the repo.

V5_SEARCH = {
    "status": "success", "total_results": 2, "total_results_per_page": 10, "total_pages": 1, "page": 0,
    "data": [
        {"Product": {"id": "aaaaaaaaaaaaaaaaaaaaaaa1", "Brand": "Example", "Category": "Smartphones",
                     "Model": "Example Phone 9", "Version": "X100", "Thumbnail": "https://example.invalid/t.png"},
         "Release Date": "2030-01-01", "Image": "https://example.invalid/i.png"},
        {"Product": {"id": "aaaaaaaaaaaaaaaaaaaaaaa2", "Brand": "Example", "Category": "Smartphones",
                     "Model": "Phone 9 Pro", "Version": "X200", "Thumbnail": "https://example.invalid/t.png"},
         "Release Date": "2030-01-01", "Image": "https://example.invalid/i.png"},
    ],
}

V5_DETAIL = {
    "status": "success",
    "data": {
        "_id": "aaaaaaaaaaaaaaaaaaaaaaa1",
        "Product": {"Manufacturer": "Example Corp", "OEM ID": "X100", "Brand": "Example", "Category": "Smartphones",
                    "Model": "Example Phone 9", "Version": "X100", "english_id": "zzz", "Is Translated": True},
        "Design": {"Body": {"Height": "150 mm (5.9 in)", "Height_mm": 150.0, "Height_in": 5.9,
                            "Weight": "170 g (6.0 oz)", "Weight_g": 170, "Weight_oz": 6.0}},
        "Inside": {"Battery": {"Capacity": "4000 mAh", "Capacity_mAh": 4000, "Charging Power": "20 W",
                               "Charging Power_W": 20},
                   "Processor": {"CPU": "Example Chip", "CPU Clock Speed_MHz": 3000}},
        "Display": {"Diagonal": "6.1 in", "Diagonal_mm": 155.0, "Screen to Body Ratio_%": 86.0},
        "Camera": {"Back Camera": {"Resolution": "48 MP", "Resolution_MP": 48, "Aperture (W)_f/": 1.6}},
        "Key Aspects": {"Wireless &amp; Cellular": "5G, Wi-Fi 6", "MSRP": None},
        "english_id": "zzz", "added_on": "2030-01-01T00:00:00Z", "updated_at": "2030-01-02T00:00:00Z",
    },
}


def test_v5_search_shape_and_name_without_repeated_brand(monkeypatch):
    monkeypatch.setattr(techspecs, "_get", lambda path, params: V5_SEARCH)
    results = techspecs.search("phone 9", size=10)
    assert [r["id"] for r in results] == ["aaaaaaaaaaaaaaaaaaaaaaa1", "aaaaaaaaaaaaaaaaaaaaaaa2"]
    assert results[0]["name"] == "Example Phone 9 X100"  # model already starts with the brand
    assert results[1]["name"] == "Example Phone 9 Pro X200"  # model without the brand gets it prefixed
    assert results[0]["category"] == "Smartphones"


def test_v5_detail_drops_bookkeeping_and_unit_duplicates(monkeypatch):
    monkeypatch.setattr(techspecs, "_get", lambda path, params: V5_DETAIL)
    product = techspecs.get_product("aaaaaaaaaaaaaaaaaaaaaaa1")
    lines = product["lines"]
    assert product["name"] == "Example Phone 9 X100"
    assert "Design / Body / Height: 150 mm (5.9 in)" in lines
    assert "Inside / Battery / Capacity: 4000 mAh" in lines
    assert "Key Aspects / Wireless & Cellular: 5G, Wi-Fi 6" in lines  # HTML entity decoded
    text = "\n".join(lines)
    for dropped in ("_mm", "_in:", "_g:", "_oz", "_mAh", "_W:", "_MHz", "_%", "_f/", "_MP",
                    "english_id", "added_on", "updated_at", "OEM ID", "Is Translated", "&amp;"):
        assert dropped not in text, dropped
    assert "Product / Manufacturer: Example Corp" in lines
