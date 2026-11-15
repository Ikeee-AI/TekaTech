"""Harmless test added live in the final video (Part 7): proves CI runs on a new change."""


def test_health_endpoint_responds(client):
    response = client.get("/health")
    assert response.status_code == 200
