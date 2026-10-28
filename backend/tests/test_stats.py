import pytest


def test_spec_coverage_none_covered(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": "g1"}, {"id": "g2"}])
    fake_supabase.set_response("spec_documents", "select", [])
    resp = client.get("/stats/spec-coverage")
    assert resp.status_code == 200
    assert resp.json() == {"covered": 0, "total": 2}


def test_spec_coverage_partial(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [{"id": "g1"}, {"id": "g2"}, {"id": "g3"}])
    # Two spec_documents rows both belong to g1, so only 1 distinct gadget is covered
    fake_supabase.set_response("spec_documents", "select", [{"gadget_id": "g1"}, {"gadget_id": "g1"}])
    resp = client.get("/stats/spec-coverage")
    assert resp.status_code == 200
    assert resp.json() == {"covered": 1, "total": 3}


def test_trending_questions_empty(client, fake_supabase):
    fake_supabase.set_response("query_history", "select", [])
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    assert resp.json() == []


def test_trending_questions_ranks_by_frequency(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [
            {"query_text": "Which has better battery?", "created_at": "2026-01-03T00:00:00"},
            {"query_text": "which has better battery?", "created_at": "2026-01-02T00:00:00"},
            {"query_text": "Compare cameras", "created_at": "2026-01-01T00:00:00"},
        ],
    )
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    data = resp.json()
    assert data[0] == {"question": "Which has better battery?", "count": 2}
    assert data[1] == {"question": "Compare cameras", "count": 1}


def test_trending_questions_respects_limit(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(10)],
    )
    resp = client.get("/stats/trending-questions?limit=3")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_trending_questions_default_is_five(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(12)],
    )
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    assert len(resp.json()) == 5


@pytest.mark.parametrize("limit", ["0", "-1", "11", "1000000", "abc"])
def test_trending_questions_limit_out_of_range_is_422(client, fake_supabase, limit):
    fake_supabase.set_response("query_history", "select", [])
    resp = client.get(f"/stats/trending-questions?limit={limit}")
    assert resp.status_code == 422


def test_trending_questions_limit_upper_bound_accepted(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(12)],
    )
    resp = client.get("/stats/trending-questions?limit=10")
    assert resp.status_code == 200
    assert len(resp.json()) == 10


def test_trending_questions_long_old_rows_are_shortened(client, fake_supabase):
    """Rows saved before /query's 150-character cap are cut to 150 for display."""
    long_question = "Which phone has the better battery life " + "really " * 40
    short_question = "Compare cameras"
    fake_supabase.set_response(
        "query_history",
        "select",
        [
            {"query_text": long_question, "created_at": "2026-01-02T00:00:00"},
            {"query_text": long_question, "created_at": "2026-01-01T00:00:00"},
            {"query_text": short_question, "created_at": "2026-01-01T00:00:00"},
        ],
    )
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    first, second = resp.json()
    assert len(first["question"]) <= 150
    assert first["question"].endswith("…")
    assert first["question"].startswith("Which phone has the better battery life")
    assert first["count"] == 2
    assert second == {"question": short_question, "count": 1}
