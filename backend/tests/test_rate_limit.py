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
