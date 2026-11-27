"""CI deploys the API with `railway up backend --path-as-root`, and Railway builds any file named
`Dockerfile` it finds there instead of the Railpack setup in .railway/railway.ts. On 27 Nov 2026 the
judge Docker setup (#300) added backend/Dockerfile, Railway built it, the container listened on a
fixed port 8000 instead of $PORT, and the deploy failed its health check (production kept the
previous version). The local Docker image lives in backend/api.Dockerfile instead."""
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent


def test_backend_has_no_file_railway_would_build_instead_of_railpack():
    found = [p.name for p in BACKEND.iterdir() if p.is_file() and p.name.lower() == "dockerfile"]
    assert not found, "Railway would build backend/Dockerfile; keep the local image in api.Dockerfile"


def test_compose_builds_the_renamed_api_image():
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert "dockerfile: api.Dockerfile" in compose
    assert (BACKEND / "api.Dockerfile").is_file()
