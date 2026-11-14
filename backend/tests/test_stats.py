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
    # "Compare cameras" was asked once, so it stays off the public list (privacy).
    assert data == [{"question": "Which has better battery?", "count": 2}]


def test_trending_questions_hides_one_off_questions(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Is it safe for my son Juan, age {i}?", "created_at": "2026-01-01T00:00:00"} for i in range(5)],
    )
    resp = client.get("/stats/trending-questions")
    assert resp.status_code == 200
    assert resp.json() == []


def test_trending_questions_never_shows_the_private_placeholder(client, fake_supabase):
    from routers.query import PRIVATE_QUESTION_PLACEHOLDER

    rows = [{"query_text": PRIVATE_QUESTION_PLACEHOLDER, "created_at": "2026-01-01T00:00:00"}] * 6
    rows += [{"query_text": "Battery life?", "created_at": "2026-01-01T00:00:00"}] * 2
    fake_supabase.set_response("query_history", "select", rows)
    resp = client.get("/stats/trending-questions")
    assert resp.json() == [{"question": "Battery life?", "count": 2}]


def test_trending_questions_respects_limit(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(10)] * 2,
    )
    resp = client.get("/stats/trending-questions?limit=3")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_trending_questions_default_is_five(client, fake_supabase):
    fake_supabase.set_response(
        "query_history",
        "select",
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(12)] * 2,
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
        [{"query_text": f"Question {i}", "created_at": "2026-01-01T00:00:00"} for i in range(12)] * 2,
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
    assert second == {"question": short_question, "count": 2}
