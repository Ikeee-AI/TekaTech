from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # SecretStr keeps both keys out of reprs, tracebacks and logs; read them with
    # .get_secret_value() only where a client is built (embeddings.py, routers/query.py,
    # supabase_client.py, scripts/sprint1_check.py).
    openai_api_key: SecretStr
    supabase_url: str
    supabase_key: SecretStr
    cors_origins: str = "http://localhost:5173"

    # Where rate-limit counters live. "memory://" keeps them per-process, which
    # is only correct for a single worker — behind multiple workers/replicas each
    # process would enforce its own separate quota. Point this at a shared store
    # (e.g. "redis://host:6379", "rediss://" for TLS) for any multi-process deploy.
    # The URI may embed a password; rate_limit.py only ever logs its scheme and host.
    rate_limit_storage_uri: str = "memory://"

    # AI questions (POST /query) each signed-in non-admin user may ask per UTC day (resets at
    # 08:00 Manila). Stored with the rate limits above. Env: AI_DAILY_QUESTION_LIMIT. See ai_quota.py.
    ai_daily_question_limit: int = Field(default=20, ge=1, le=10000)

    # Failure drill for POST /query (see README "Failure drill"). Off unless set to true, and even
    # then only a logged-in admin sending the X-Simulate-Failure header can trigger it. Never set
    # this on the production service: .railway/railway.ts (the API since 13 Nov 2026) and
    # render.yaml (frontend) deliberately leave it out (a test checks).
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
    # Keep all three out of .railway/railway.ts and render.yaml (a test checks). SecretStr
    # keeps the values out of reprs and logs.
    techspecs_enabled: bool = False
    techspecs_api_id: SecretStr | None = None
    techspecs_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins")
    @classmethod
    def no_wildcard_origin(cls, value: str) -> str:
        # A wildcard would let any website call the API from a visitor's browser. List the
        # real frontend origins instead (comma-separated).
        if any(origin.strip() == "*" for origin in value.split(",")):
            raise ValueError('cors_origins must list explicit origins; "*" is not allowed')
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()