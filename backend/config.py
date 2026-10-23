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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()