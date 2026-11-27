# TekaTech API image, for running the backend on any computer with Docker.
# Production still deploys with Railway's builder (.railway/railway.ts); this image is
# for judges, teammates and local testing. Build from backend/:
#   docker build -t tekatech-api backend
# Configuration comes only from environment variables at run time (see ../.env.example).
# No .env file, key or secret is ever copied into the image (.dockerignore).

FROM ghcr.io/astral-sh/uv:0.12.3 AS uv

FROM python:3.12-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    TIKTOKEN_CACHE_DIR=/app/.tiktoken \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Dependencies first, so code changes don't reinstall them. --frozen = exactly uv.lock.
COPY --from=uv /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project \
    && rm /usr/local/bin/uv

# tokens.py loads both tiktoken encodings at import; download them now so the
# container does not fetch them on first start.
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base'); tiktoken.get_encoding('o200k_base')"

COPY . .

# Run as a normal user, not root.
RUN useradd --create-home --uid 10001 tekatech && chown -R tekatech /app
USER tekatech

EXPOSE 8000

# Liveness only (no database call), the same path Railway checks.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# One worker: the rate limiter's memory:// store is per process (CLAUDE.md, "Rate limiting").
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
