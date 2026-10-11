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
