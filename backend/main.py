import asyncio
import logging
import math
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from config import settings
from rate_limit import limiter, verify_storage_reachable
from request_id import REQUEST_ID_HEADER, RequestIdMiddleware
from routers import gadgets, specs, corrections, comparisons, query, stats, techspecs, my_gadgets
from supabase_client import supabase

logger = logging.getLogger(__name__)

# /health/ready gives up on the database after this long and reports "error".
# The shared Supabase client keeps its own 120 s timeout; the abandoned call
# finishes in a worker thread without holding up the response.
READINESS_TIMEOUT_SECONDS = 5.0


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail at boot rather than mid-request if a shared rate-limit store is
    # configured but unreachable â€” a silently broken limiter looks fine until
    # it's being relied on.
    verify_storage_reachable()
    yield


app = FastAPI(title="TekaTech API", lifespan=lifespan)

def _json_safe(value):
    """Replace NaN / Infinity floats with their string form, recursively."""
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Same 422 body as FastAPI's default handler, made JSON-safe. Python's JSON
    # parser accepts the bare tokens NaN and Infinity, each error echoes its
    # `input`, and the response encoder refuses non-finite floats, so the default
    # handler turns a body like {"price_php": NaN} into a 500 instead of a 422.
    return JSONResponse(status_code=422, content={"detail": _json_safe(jsonable_encoder(exc.errors()))})


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
# Added after SlowAPI so it wraps it (429s get an id and a log line too), and
# before CORS so CORS wraps it: a JSON 500 it produces still carries CORS
# headers, letting the browser read the request id.
app.add_middleware(RequestIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER],
)

app.include_router(gadgets.router)
app.include_router(specs.router)
app.include_router(corrections.router)
app.include_router(comparisons.router)
app.include_router(query.router)
app.include_router(stats.router)
app.include_router(techspecs.router)
app.include_router(my_gadgets.router)

@app.get("/health")
def health_check():
    # Liveness only, and Render's healthCheckPath: no database or provider call,
    # so a database blip cannot make Render restart a healthy process.
    return {"status": "ok"}


def _database_round_trip() -> None:
    supabase.table("gadgets").select("id").limit(1).execute()


@app.get("/health/ready")
@limiter.limit("30/minute")
async def readiness_check(request: Request, response: Response):
    """Readiness: liveness plus one cheap database read. 200 when the database
    answered, 503 when it failed or timed out. The body never carries error text."""
    response.headers["Cache-Control"] = "no-store"
    started = time.perf_counter()
    try:
        await asyncio.wait_for(asyncio.to_thread(_database_round_trip), timeout=READINESS_TIMEOUT_SECONDS)
        database = "ok"
    except Exception as exc:  # noqa: BLE001 - any failure means "not ready"
        logger.warning("readiness: database check failed (%s)", type(exc).__name__)
        database = "error"
    latency_ms = round((time.perf_counter() - started) * 1000, 1)
    if database != "ok":
        response.status_code = 503
    return {"status": "ok" if database == "ok" else "error", "database": database, "latency_ms": latency_ms}

@app.get("/version")
def deployed_version():
    # APP_COMMIT is set by the CI Railway deploy (CLI deploys get no Git SHA);
    # Render provides RENDER_GIT_COMMIT. No credentials or environment dump.
    commit = os.environ.get("APP_COMMIT") or os.environ.get("RENDER_GIT_COMMIT") or "local"
    return {"commit": commit}
