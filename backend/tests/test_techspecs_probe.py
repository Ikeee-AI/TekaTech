"""scripts/techspecs_probe.py: no call without --yes, at most 3 calls, prints shape not secrets."""
import importlib.util
from pathlib import Path

import pytest

import techspecs

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "techspecs_probe.py"


@pytest.fixture
def probe():
    spec = importlib.util.spec_from_file_location("techspecs_probe", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SEARCH = {"data": {"items": [
    {"Product": {"id": "abc123", "Brand": "Example", "Model": "Phone One", "Category": "Smartphones"}},
    {"Product": {"id": "def456", "Brand": "Example", "Model": "Phone Two", "Category": "Smartphones"}},
    {"Product": {"id": "ghi789", "Brand": "Example", "Model": "Phone Three", "Category": "Smartphones"}},
]}}
DETAIL = {"data": {"items": [{"Product": {"id": "abc123", "Brand": "Example", "Model": "Phone One"},
                              "Display": {"Size": "6.1 in", "Type": "OLED"},
                              "Battery": {"Capacity": "3349 mAh"}}]}}


def fake_get(calls):
    def _get(path, params):
        calls.append(path)
        return SEARCH if path == "/products/search" else DETAIL
    return _get


def test_plan_only_makes_no_call(probe, monkeypatch, capsys):
    def boom(path, params):
        raise AssertionError("no call expected without --yes")
    monkeypatch.setattr(techspecs, "_get", boom)
    assert probe.main([]) == 0
    assert "No calls made" in capsys.readouterr().out


def test_yes_caps_calls_and_hides_values(probe, monkeypatch, capsys):
    calls = []
    original = fake_get(calls)
    monkeypatch.setattr(techspecs, "_get", original)
    assert probe.main(["--yes", "--products", "9"]) == 0  # clamped to 2 lookups
    out = capsys.readouterr().out
    assert calls == ["/products/search", "/products/abc123", "/products/def456"]
    assert "Calls made: 3 of at most 3" in out
    assert "Display: 2" in out and "Battery: 1" in out
    assert "6.1 in" not in out and "3349 mAh" not in out  # values only with --show-values
    assert techspecs._get is original  # the wrapper is removed afterwards


def test_show_values_prints_lines(probe, monkeypatch, capsys):
    monkeypatch.setattr(techspecs, "_get", fake_get([]))
    assert probe.main(["--yes", "--products", "1", "--show-values"]) == 0
    assert "Display / Size: 6.1 in" in capsys.readouterr().out


def test_search_error_reports_kind(probe, monkeypatch, capsys):
    def denied(path, params):
        raise techspecs.TechSpecsError("auth", 401)
    monkeypatch.setattr(techspecs, "_get", denied)
    assert probe.main(["--yes"]) == 1
    out = capsys.readouterr().out
    assert "FAILED: auth (HTTP 401)" in out and "Calls made: 1" in out


def test_shape_never_includes_values(probe):
    text = "\n".join(probe.shape(DETAIL))
    assert "Display" in text and "str" in text
    assert "OLED" not in text and "abc123" not in text


def test_error_message_shown_with_credentials_masked(probe, monkeypatch, capsys):
    import httpx

    monkeypatch.setattr(techspecs, "_credentials", lambda: ("placeholder-id", "placeholder-key"))
    capture = probe.ErrorCapture()
    request = httpx.Request("GET", "https://api.techspecs.io/v5/products/search")
    capture(httpx.Response(400, text='{"error":"category is required","key":"placeholder-key"}', request=request))
    capture(httpx.Response(200, text='{"data":{"results":[]}}', request=request))  # success bodies are not kept
    probe.print_error(techspecs.TechSpecsError("unavailable", 400), capture)
    out = capsys.readouterr().out
    assert "category is required" in out
    assert "placeholder-key" not in out and "***" in out
    assert "results" not in out
