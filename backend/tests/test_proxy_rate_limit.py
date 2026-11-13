"""Rate-limit bucket key behind Render's proxy (rate_limit.client_ip_key)."""
from pathlib import Path

import pytest
from starlette.requests import Request

import main
from config import settings
from rate_limit import client_ip_key


def _request(peer="10.0.0.1", xff=None):
    values = [xff] if isinstance(xff, str) else (xff or [])
    headers = [(b"x-forwarded-for", value.encode("latin-1")) for value in values]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers, "client": (peer, 1234)})


@pytest.fixture
def trust_proxy(monkeypatch):
    monkeypatch.setattr(settings, "trust_proxy_headers", True)
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)


def test_flag_defaults_off():
    assert type(settings).model_fields["trust_proxy_headers"].default is False


def test_flag_off_keys_on_socket_peer_even_with_forwarded_header(monkeypatch):
    monkeypatch.setattr(settings, "trust_proxy_headers", False)
    assert client_ip_key(_request("10.0.0.1", "198.51.100.7")) == "10.0.0.1"


def test_rightmost_entry_is_used(trust_proxy):
    assert client_ip_key(_request("10.0.0.1", "198.51.100.7")) == "198.51.100.7"


def test_spoofed_left_entries_are_ignored(trust_proxy):
    # The client sent "1.2.3.4, 5.6.7.8"; the proxy appended the real address.
    assert client_ip_key(_request("10.0.0.1", "1.2.3.4, 5.6.7.8, 198.51.100.7")) == "198.51.100.7"
    # Changing the spoofed part does not change the bucket.
    assert client_ip_key(_request("10.0.0.1", "9.9.9.9, 198.51.100.7")) == "198.51.100.7"


def test_repeated_headers_are_read_in_order(trust_proxy):
    assert client_ip_key(_request("10.0.0.1", ["1.2.3.4", "198.51.100.7"])) == "198.51.100.7"


@pytest.mark.parametrize("xff", [None, "", "not-an-ip", "1.2.3.4, garbage", "198.51.100.7:443", " , "])
def test_missing_or_garbage_falls_back_to_socket_peer(trust_proxy, xff):
    # Never walks left to a "valid" entry: that is where spoofed values live.
    assert client_ip_key(_request("10.0.0.1", xff)) == "10.0.0.1"


def test_two_hops_uses_second_from_right(trust_proxy, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy_hops", 2)
    assert client_ip_key(_request("10.0.0.1", "1.2.3.4, 198.51.100.7, 172.16.0.9")) == "198.51.100.7"
    assert client_ip_key(_request("10.0.0.1", "172.16.0.9")) == "10.0.0.1"


def test_ipv6_clients_share_their_64(trust_proxy):
    a = client_ip_key(_request("10.0.0.1", "2001:db8:1:2::a"))
    b = client_ip_key(_request("10.0.0.1", "2001:db8:1:2:ffff::b"))
    assert a == b == "2001:db8:1:2::/64"
    assert client_ip_key(_request("10.0.0.1", "::ffff:198.51.100.7")) == "198.51.100.7"


def test_repo_config_never_turns_proxy_trust_on():
    # The API's Render block (which pinned TRUST_PROXY_HEADERS='false') was retired on
    # 13 Nov 2026. On Railway the proxy-trust variables live in the dashboard, so the
    # repo config must stay variable-free; the dashboard values are checked by hand
    # (docs/deploy-runbook.md, "Rate-limit buckets behind the proxy").
    root = Path(__file__).resolve().parents[2]
    railway_ts = (root / ".railway" / "railway.ts").read_text(encoding="utf-8")
    assert "variables: { managed: false }" in railway_ts
    assert "TRUST" not in railway_ts
    assert "TRUST" not in (root / "render.yaml").read_text(encoding="utf-8")


def test_separate_clients_get_separate_buckets_end_to_end(client, fake_supabase, monkeypatch, trust_proxy):
    monkeypatch.setattr(main, "supabase", fake_supabase)
    for _ in range(30):
        assert client.get("/health/ready", headers={"X-Forwarded-For": "198.51.100.7"}).status_code == 200
    assert client.get("/health/ready", headers={"X-Forwarded-For": "198.51.100.7"}).status_code == 429
    # Spoofing a different left-hand address does not escape the bucket...
    assert client.get("/health/ready", headers={"X-Forwarded-For": "1.1.1.1, 198.51.100.7"}).status_code == 429
    # ...but a genuinely different client has its own.
    assert client.get("/health/ready", headers={"X-Forwarded-For": "203.0.113.9"}).status_code == 200
