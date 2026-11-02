from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str
    supabase_url: str
    supabase_key: str
    cors_origins: str = "http://localhost:5173"

    # Where rate-limit counters live. "memory://" keeps them per-process, which
    # is only correct for a single worker — behind multiple workers/replicas each
    # process would enforce its own separate quota. Point this at a shared store
    # (e.g. "redis://host:6379", "rediss://" for TLS) for any multi-process deploy.
    rate_limit_storage_uri: str = "memory://"

    # Failure drill for POST /query (see README "Failure drill"). Off unless set to true, and even
    # then only a logged-in admin sending the X-Simulate-Failure header can trigger it. Never set
    # this on the production service: render.yaml deliberately leaves it out (a test checks).
    failure_simulation_enabled: bool = False

    # Rate-limit key behind a reverse proxy (see rate_limit.client_ip_key). Off by default, so local
    # and test runs key on the socket peer exactly as before. Only turn it on where a proxy you trust
    # appends the connecting address to X-Forwarded-For; trusted_proxy_hops is how many such proxies
    # append an entry (1 = use the rightmost entry). Left-hand entries are client-supplied and ignored.
    trust_proxy_headers: bool = False
    trusted_proxy_hops: int = Field(default=1, ge=1, le=5)

    # TechSpecs import (backend/techspecs.py, routers/techspecs.py). OFF until TechSpecs gives
    # written authorization to store their data: their terms forbid downloading or caching it
    # without permission. While off, the admin routes answer 503 and make no outbound call.
    # Keep all three out of render.yaml (a test checks). SecretStr keeps the values out of
    # reprs and logs.
    techspecs_enabled: bool = False
    techspecs_api_id: SecretStr | None = None
    techspecs_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()