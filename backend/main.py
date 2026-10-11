import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from config import settings
from rate_limit import limiter, verify_storage_reachable
from routers import gadgets, specs, corrections, comparisons, query, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail at boot rather than mid-request if a shared rate-limit store is
    # configured but unreachable â€” a silently broken limiter looks fine until
    # it's being relied on.
    verify_storage_reachable()
    yield


app = FastAPI(title="TekaTech API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gadgets.router)
app.include_router(specs.router)
app.include_router(corrections.router)
app.include_router(comparisons.router)
app.include_router(query.router)
app.include_router(stats.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/version")
def deployed_version():
    # Render provides the repository SHA; no credentials or environment dump.
    return {"commit": os.environ.get("RENDER_GIT_COMMIT", "local")}
