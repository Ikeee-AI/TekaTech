import httpx
import pytest

from supabase_client import RETRYABLE_METHODS, RetryOnDisconnectTransport, build_http_client


class FlakyTransport(httpx.BaseTransport):
    """Drops the connection on the first `failures` requests, then answers 200."""

    def __init__(self, failures):
        self.failures = failures
        self.calls = 0

    def handle_request(self, request):
        self.calls += 1
        if self.calls <= self.failures:
            raise httpx.RemoteProtocolError("Server disconnected", request=request)
        return httpx.Response(200, json={"ok": True}, request=request)


def _client(inner):
    return httpx.Client(transport=RetryOnDisconnectTransport(inner))


@pytest.mark.parametrize("method", sorted(RETRYABLE_METHODS))
def test_safe_request_is_retried_once_after_a_disconnect(method):
    inner = FlakyTransport(failures=1)
    resp = _client(inner).request(method, "https://example.supabase.co/rest/v1/gadgets")
    assert resp.status_code == 200
    assert inner.calls == 2


def test_safe_request_gives_up_after_one_retry():
    inner = FlakyTransport(failures=2)
    with pytest.raises(httpx.RemoteProtocolError):
        _client(inner).get("https://example.supabase.co/rest/v1/gadgets")
    assert inner.calls == 2


@pytest.mark.parametrize("method", ["POST", "PATCH"])
def test_unsafe_request_is_not_retried(method):
    # An insert or update may already have been applied before the drop.
    inner = FlakyTransport(failures=1)
    with pytest.raises(httpx.RemoteProtocolError):
        _client(inner).request(method, "https://example.supabase.co/rest/v1/gadgets", json={})
    assert inner.calls == 1


def test_no_retry_when_the_first_attempt_works():
    inner = FlakyTransport(failures=0)
    assert _client(inner).get("https://example.supabase.co/rest/v1/gadgets").status_code == 200
    assert inner.calls == 1


def test_other_errors_are_not_retried():
    class Timeout(httpx.BaseTransport):
        calls = 0

        def handle_request(self, request):
            Timeout.calls += 1
            raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(httpx.ReadTimeout):
        _client(Timeout()).get("https://example.supabase.co/rest/v1/gadgets")
    assert Timeout.calls == 1


def test_shared_client_uses_http1_and_the_retry_transport():
    client = build_http_client()
    try:
        assert isinstance(client._transport, RetryOnDisconnectTransport)
        assert client.follow_redirects is True
        inner_pool = client._transport._inner._pool
        assert inner_pool._http2 is False
    finally:
        client.close()
