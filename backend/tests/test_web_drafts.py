"""Admin "find on the web" drafts (routers/web_drafts.py)."""
import json
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import web_search
from config import settings

GADGET = str(uuid4())


def _response(payload):
    text = json.dumps(payload)
    message = SimpleNamespace(type="message", content=[SimpleNamespace(type="output_text", text=text, annotations=[])])
    return SimpleNamespace(status="completed", output=[SimpleNamespace(type="web_search_call"), message],
                           usage=SimpleNamespace(input_tokens=9000, output_tokens=500))


def _post(client, kind, web):
    with patch("web_search.client") as web_client:
        if isinstance(web, Exception):
            web_client.responses.create.side_effect = web
        else:
            web_client.responses.create.return_value = web
        return client.post(f"/gadgets/{GADGET}/web-drafts", json={"kind": kind}), web_client.responses.create


def test_spec_drafts_keep_only_linked_lines(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "Galaxy S24", "brand": "Samsung"}])
    resp, call = _post(client, "specs", _response({"specs": [
        {"text": "Battery: 4000 mAh", "source_url": "https://www.samsung.com/ph/s24/?utm_source=x"},
        {"text": "Chip: Exynos 2400", "source_url": "not a url"},
        {"text": "  ", "source_url": "https://e.com"},
    ]}))
    assert resp.status_code == 200
    assert resp.json()["specs"] == [{"text": "Battery: 4000 mAh", "source_url": "https://www.samsung.com/ph/s24/"}]
    kwargs = call.call_args.kwargs
    assert kwargs["input"] == "Phone: Samsung Galaxy S24"
    assert kwargs["text"]["format"]["type"] == "json_schema"
    # Nothing is saved by this route.
    assert fake_supabase.writes == []


def test_benchmark_drafts_validate_values(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "S24", "brand": "Samsung"}])
    resp, _ = _post(client, "benchmarks", _response({"benchmarks": [
        {"kind": "game", "test": "Genshin Impact", "settings": "High", "value": 52, "unit": "fps", "source_url": "https://r.com/a"},
        {"kind": "score", "test": "Geekbench 6", "settings": "", "value": 6500, "unit": "points", "source_url": "https://g.com"},
        {"kind": "rumour", "test": "X", "settings": "", "value": 1, "unit": "fps", "source_url": "https://r.com"},
        {"kind": "game", "test": "Y", "settings": "", "value": -5, "unit": "fps", "source_url": "https://r.com"},
        {"kind": "game", "test": "Z", "settings": "", "value": "60", "unit": "fps", "source_url": "https://r.com"},
    ]}))
    body = resp.json()
    assert [b["test"] for b in body["benchmarks"]] == ["Genshin Impact", "Geekbench 6"]
    assert body["benchmarks"][1]["settings"] is None


def test_malformed_json_gives_no_drafts(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "S24", "brand": "Samsung"}])
    message = SimpleNamespace(type="message", content=[SimpleNamespace(type="output_text", text="not json", annotations=[])])
    resp, _ = _post(client, "specs", SimpleNamespace(status="completed", output=[message], usage=None))
    assert resp.status_code == 200
    assert resp.json()["specs"] == []


def test_unknown_gadget_and_failures(client, fake_supabase, monkeypatch):
    fake_supabase.set_response("gadgets", "select", [])
    assert _post(client, "specs", _response({"specs": []}))[0].status_code == 404
    fake_supabase.set_response("gadgets", "select", [{"id": GADGET, "name": "S24", "brand": "Samsung"}])
    resp, _ = _post(client, "specs", web_search.WebSearchError("boom"))
    assert resp.status_code == 503
    monkeypatch.setattr(settings, "web_search_site_daily_limit", 0)
    resp, call = _post(client, "specs", _response({"specs": []}))
    assert resp.status_code == 429
    call.assert_not_called()


def test_bad_kind_is_422(client, fake_supabase):
    assert client.post(f"/gadgets/{GADGET}/web-drafts", json={"kind": "everything"}).status_code == 422
