"""The browser failure checks (#119) fake POST /query's 503 replies from a shared
fixture. This keeps that fixture identical to what the backend really sends, so a
passing browser check can't hide a changed backend sentence."""

import json
from pathlib import Path

from routers import query

FIXTURE = Path(__file__).resolve().parents[2] / "frontend" / "e2e" / "fixtures" / "query-failures.json"


def test_browser_check_fixture_matches_backend_503_sentences():
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["timeout"] == query.DETAIL_TIMEOUT
    assert fixture["unavailable"] == query.DETAIL_UNAVAILABLE
    assert fixture["unusable"] == query.DETAIL_UNUSABLE
