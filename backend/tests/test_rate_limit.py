from unittest.mock import patch

import pytest

from rate_limit import limiter, verify_storage_reachable


def test_storage_check_passes_with_default_memory_storage():
    # The default "memory://" store is always reachable; this should be a no-op.
    verify_storage_reachable()


def test_unhealthy_storage_raises():
    """A configured store that reports itself unhealthy must fail loudly.

    Silently continuing would leave each process enforcing its own quota while
    appearing to be correctly rate limited.
    """
    with patch.object(limiter.limiter.storage, "check", return_value=False):
        with pytest.raises(RuntimeError, match="unhealthy"):
            verify_storage_reachable()


def test_unreachable_storage_raises_with_context():
    """Connection errors are re-raised as RuntimeError naming the configured URI,
    so a typo'd or down store is diagnosable from the boot log alone."""
    with patch.object(limiter.limiter.storage, "check", side_effect=ConnectionError("refused")):
        with pytest.raises(RuntimeError, match="could not be reached"):
            verify_storage_reachable()


def test_startup_error_names_only_scheme_and_host(monkeypatch):
    """A redis URI can carry a password; the boot error must not repeat it or the driver's text."""
    from config import settings

    monkeypatch.setattr(settings, "rate_limit_storage_uri", "rediss://default:hunter2-pw@cache.internal:6380/0?ssl=true")
    boom = ConnectionError("cannot connect to rediss://default:hunter2-pw@cache.internal:6380/0")
    with patch.object(limiter.limiter.storage, "check", side_effect=boom):
        with pytest.raises(RuntimeError) as err:
            verify_storage_reachable()
    message = str(err.value)
    assert "rediss://cache.internal:6380" in message
    assert "ConnectionError" in message
    assert "hunter2" not in message and "default" not in message
    # Not chained either, so a startup traceback does not print the driver's message.
    assert err.value.__cause__ is None and err.value.__suppress_context__


def test_unhealthy_message_also_hides_credentials(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "rate_limit_storage_uri", "redis://:hunter2-pw@cache.internal:6379")
    with patch.object(limiter.limiter.storage, "check", return_value=False):
        with pytest.raises(RuntimeError) as err:
            verify_storage_reachable()
    assert "hunter2" not in str(err.value)
    assert "redis://cache.internal:6379" in str(err.value)


@pytest.mark.parametrize(
    "uri, shown",
    [("memory://", "memory://"), ("redis://localhost:6379", "redis://localhost:6379"), ("redis://u:p@h", "redis://h")],
)
def test_describe_storage_uri(uri, shown):
    from rate_limit import describe_storage_uri

    assert describe_storage_uri(uri) == shown
