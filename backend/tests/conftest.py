import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Router fixtures import settings before the client fixture runs. Those imports
# must work without an ignored .env and must not use real service credentials.
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-dummy-key")
os.environ.setdefault("RATE_LIMIT_STORAGE_URI", "memory://")


class FakeQuery:
    """Mimics the Supabase fluent query builder: .select().eq().order().execute() etc.
    Tracks which operation (select/insert/update/delete) started the chain, and looks up
    a pre-configured response for that (table, operation) pair."""

    def __init__(self, fake_client, table_name):
        self._client = fake_client
        self._table = table_name
        self._operation = None
        self._count = None

    def select(self, *a, **k):
        self._operation = self._operation or "select"
        # select(..., count="exact") asks PostgREST for a row count; the fake
        # answers it with the length of the configured response.
        self._count = k.get("count")
        return self

    def insert(self, *a, **k):
        self._operation = "insert"
        self._client.writes.append((self._table, "insert", a[0]))
        return self

    def update(self, *a, **k):
        self._operation = "update"
        self._client.writes.append((self._table, "update", a[0]))
        return self

    def delete(self, *a, **k):
        self._operation = "delete"
        self._client.writes.append((self._table, "delete", None))
        return self

    def eq(self, *a, **k):
        self._client.filters.append((self._table, *a))
        return self

    def in_(self, *a, **k):
        return self

    def order(self, *a, **k):
        self._client.orders.append((self._table, *a, k))
        return self

    def limit(self, *a, **k):
        self._client.limits.append((self._table, *a))
        return self

    def execute(self):
        data = self._client.responses.get((self._table, self._operation), [])
        count = len(data) if self._count else None
        return SimpleNamespace(data=data, count=count)


class FakeSupabase:
    def __init__(self):
        self.responses = {}
        self.writes = []
        self.filters = []
        self.orders = []
        self.limits = []
        self.rpc_calls = []

    def set_response(self, table, operation, data):
        """Configure what .execute() should return for a given table + operation.
        e.g. fake.set_response("gadgets", "select", [{...}])"""
        self.responses[(table, operation)] = data

    def table(self, name):
        return FakeQuery(self, name)

    def rpc(self, name=None, params=None, *a, **k):
        """Every RPC answers from "_rpc" unless "_rpc:<function name>" was configured for it.
        Calls are recorded in rpc_calls as (name, params)."""
        self.rpc_calls.append((name, params))
        specific = f"_rpc:{name}"
        return FakeQuery(self, specific if (specific, None) in self.responses else "_rpc")


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """The rate limiter is a module-level singleton with in-memory storage,
    so without resetting it, hits from one test would count against the
    next test's quota (all tests share the same TestClient "IP")."""
    from rate_limit import limiter

    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture(autouse=True)
def reset_response_cache():
    """cache.py is module-level too: without clearing it, a GET in one test
    would be served to the next test instead of that test's fake response.
    answer_cache.py likewise, or one test's /query answer would answer the next."""
    import answer_cache
    import cache

    cache.clear()
    answer_cache.clear()
    yield
    cache.clear()
    answer_cache.clear()


@pytest.fixture
def fake_supabase(monkeypatch):
    fake = FakeSupabase()
    import routers.gadgets as gadgets_module
    import routers.specs as specs_module
    import routers.corrections as corrections_module
    import routers.comparisons as comparisons_module
    import routers.query as query_module
    import routers.stats as stats_module

    monkeypatch.setattr(gadgets_module, "supabase", fake)
    monkeypatch.setattr(specs_module, "supabase", fake)
    monkeypatch.setattr(corrections_module, "supabase", fake)
    monkeypatch.setattr(comparisons_module, "supabase", fake)
    monkeypatch.setattr(query_module, "supabase", fake)
    monkeypatch.setattr(stats_module, "supabase", fake)
    return fake


@pytest.fixture
def client(fake_supabase, monkeypatch):
    # Dummy values so config.py's Settings() doesn't fail even without a real .env in CI
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-dummy-key")
    from main import app
    from auth import get_current_user

    # Tests exercise endpoint logic assuming an authenticated *admin* caller
    # (they don't set an Authorization header themselves), so stand in a fake
    # admin user here rather than making every test do it. get_current_admin_user
    # depends on get_current_user internally, so overriding get_current_user
    # with an app_metadata.is_admin=True user satisfies both. A test that
    # specifically needs to check the unauthenticated/non-admin case should
    # override this again itself with `app.dependency_overrides[get_current_user] = ...`.
    fake_user = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        email="test@example.com",
        app_metadata={"is_admin": True},
    )
    app.dependency_overrides[get_current_user] = lambda: fake_user

    yield TestClient(app)

    app.dependency_overrides.pop(get_current_user, None)