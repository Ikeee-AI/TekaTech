"""POST /gadgets/{gadget_id}/image: admin photo upload to Supabase Storage (#202)."""
from types import SimpleNamespace
from uuid import uuid4

import pytest

import cache
from conftest import signed_in_as
from factories import sample_gadget
from image_upload import MAX_IMAGE_BYTES, MAX_REQUEST_BYTES, detect_image_type

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64
AVIF = b"\x00\x00\x00\x1cftypavif\x00\x00\x00\x00avifmif1miaf" + b"\x00" * 64
AVIF_COMPATIBLE_ONLY = b"\x00\x00\x00\x1cftypmif1\x00\x00\x00\x00mif1avifmiaf" + b"\x00" * 64
SVG = b'<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
GIF = b"GIF89a" + b"\x00" * 64


def _upload(client, gadget_id, data, filename="photo.png", content_type="image/png"):
    return client.post(f"/gadgets/{gadget_id}/image", files={"file": (filename, data, content_type)})


@pytest.fixture
def gadget(fake_supabase):
    row = sample_gadget()
    fake_supabase.set_response("gadgets", "select", [{"id": row["id"]}])
    return row


@pytest.mark.parametrize(
    "data,ext", [(PNG, "png"), (JPEG, "jpg"), (WEBP, "webp"), (AVIF, "avif"), (AVIF_COMPATIBLE_ONLY, "avif")]
)
def test_detect_image_type_reads_magic_bytes(data, ext):
    assert detect_image_type(data) == ext


def test_upload_stores_the_photo_and_sets_image_url(client, fake_supabase, gadget):
    updated = {**gadget}
    fake_supabase.set_response("gadgets", "update", [updated])
    # Whatever the browser calls it, the bytes decide: a PNG named .jpg is stored as .png.
    resp = _upload(client, gadget["id"], PNG, filename="photo.jpg", content_type="image/jpeg")

    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == gadget["id"]
    [(bucket, path, data, options)] = fake_supabase.uploads
    assert bucket == "gadget-images"
    assert path.startswith(f"gadgets/{gadget['id']}/") and path.endswith(".png")
    assert data == PNG
    assert options["content-type"] == "image/png"
    assert options["cache-control"] == "31536000"
    [write] = [w for w in fake_supabase.writes if w[1] == "update"]
    url = write[2]["image_url"]
    assert url == f"https://example.supabase.co/storage/v1/object/public/gadget-images/{path}"


def test_same_photo_gets_the_same_object_path(client, fake_supabase, gadget):
    fake_supabase.set_response("gadgets", "update", [gadget])
    _upload(client, gadget["id"], JPEG, filename="a.jpg", content_type="image/jpeg")
    _upload(client, gadget["id"], JPEG, filename="b.jpg", content_type="image/jpeg")
    first, second = (u[1] for u in fake_supabase.uploads)
    assert first == second and first.endswith(".jpg")


def test_upload_invalidates_the_gadget_caches(client, fake_supabase, gadget):
    fake_supabase.set_response("gadgets", "update", [gadget])
    cache.get_or_load("gadgets", ("one", gadget["id"]), 60, lambda: "stale")
    _upload(client, gadget["id"], PNG)
    _, hit = cache.get_or_load("gadgets", ("one", gadget["id"]), 60, lambda: "fresh")
    assert not hit


def test_too_large_is_413_and_nothing_is_stored(client, fake_supabase, gadget):
    resp = _upload(client, gadget["id"], PNG + b"\x00" * MAX_IMAGE_BYTES)
    assert resp.status_code == 413
    assert "2 MB" in resp.json()["detail"]
    assert fake_supabase.uploads == [] and fake_supabase.writes == []


def test_file_just_over_the_limit_inside_the_request_allowance_is_413(client, fake_supabase, gadget):
    data = PNG + b"\x00" * (MAX_IMAGE_BYTES + 1 - len(PNG))
    assert len(data) + 1000 < MAX_REQUEST_BYTES
    resp = _upload(client, gadget["id"], data)
    assert resp.status_code == 413
    assert fake_supabase.uploads == []


def test_declared_content_length_over_the_cap_is_refused_before_reading(client, fake_supabase, gadget):
    resp = client.post(
        f"/gadgets/{gadget['id']}/image",
        content=b"x",
        headers={"Content-Type": "multipart/form-data; boundary=b", "Content-Length": str(MAX_REQUEST_BYTES + 1)},
    )
    assert resp.status_code == 413


def test_streamed_body_without_length_is_cut_off_at_the_cap(client, fake_supabase, gadget):
    def body():
        boundary_head = b'--b\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\n\r\n' + PNG
        yield boundary_head
        for _ in range(40):  # 40 x 128 KB = 5 MB, far over the cap
            yield b"\x00" * (128 * 1024)

    resp = client.post(
        f"/gadgets/{gadget['id']}/image",
        content=body(),
        headers={"Content-Type": "multipart/form-data; boundary=b"},
    )
    assert resp.status_code == 413
    assert fake_supabase.uploads == []


@pytest.mark.parametrize("data", [GIF, b"%PDF-1.7 not an image", b"hello"])
def test_wrong_magic_bytes_are_415_even_with_an_image_name(client, fake_supabase, gadget, data):
    resp = _upload(client, gadget["id"], data, filename="photo.png", content_type="image/png")
    assert resp.status_code == 415
    assert "JPEG, PNG, WebP or AVIF" in resp.json()["detail"]
    assert fake_supabase.uploads == []


def test_svg_is_refused(client, fake_supabase, gadget):
    resp = _upload(client, gadget["id"], SVG, filename="logo.svg", content_type="image/svg+xml")
    assert resp.status_code == 415
    assert "SVG" in resp.json()["detail"]
    assert fake_supabase.uploads == []


def test_svg_disguised_as_png_is_refused(client, fake_supabase, gadget):
    resp = _upload(client, gadget["id"], SVG, filename="photo.png", content_type="image/png")
    assert resp.status_code == 415
    assert fake_supabase.uploads == []


def test_empty_file_is_422(client, fake_supabase, gadget):
    resp = _upload(client, gadget["id"], b"")
    assert resp.status_code == 422
    assert fake_supabase.uploads == []


@pytest.mark.parametrize(
    "kwargs",
    [
        {"json": {"image_url": "https://example.com/x.png"}},
        {"files": {"photo": ("x.png", PNG, "image/png")}},
        {"data": {"file": "not a file"}, "files": {"other": ("x.png", PNG, "image/png")}},
    ],
    ids=["json body", "wrong field name", "extra field"],
)
def test_missing_or_malformed_file_field_is_422(client, fake_supabase, gadget, kwargs):
    resp = client.post(f"/gadgets/{gadget['id']}/image", **kwargs)
    assert resp.status_code == 422
    assert fake_supabase.uploads == []


def test_unknown_gadget_is_404_and_nothing_is_stored(client, fake_supabase):
    fake_supabase.set_response("gadgets", "select", [])
    resp = _upload(client, uuid4(), PNG)
    assert resp.status_code == 404
    assert fake_supabase.uploads == [] and fake_supabase.writes == []


def test_storage_failure_is_503_and_the_gadget_is_unchanged(client, fake_supabase, gadget):
    fake_supabase.storage_error = RuntimeError("bucket not found")
    resp = _upload(client, gadget["id"], PNG)
    assert resp.status_code == 503
    assert "photo" in resp.json()["detail"] and "bucket" not in resp.json()["detail"]
    assert fake_supabase.writes == []


def test_non_admin_is_403_and_the_body_is_not_used(client, fake_supabase, gadget):
    user = SimpleNamespace(id="u-1", email="u@example.com", app_metadata={}, user_metadata={"is_admin": True})
    with signed_in_as(user):
        resp = _upload(client, gadget["id"], PNG)
    assert resp.status_code == 403
    assert fake_supabase.uploads == [] and fake_supabase.writes == []


def test_anonymous_is_401(client, fake_supabase, gadget):
    with signed_in_as(None):
        resp = _upload(client, gadget["id"], PNG)
    assert resp.status_code == 401
    assert fake_supabase.uploads == []


def test_upload_is_rate_limited(client, fake_supabase, gadget):
    fake_supabase.set_response("gadgets", "update", [gadget])
    codes = [_upload(client, gadget["id"], PNG).status_code for _ in range(21)]
    assert codes[:20] == [200] * 20
    assert codes[20] == 429


# --- Review follow-ups (PR #272) ---------------------------------------------------------------

OVERSIZED_PNG = PNG + b"\x00" * (MAX_IMAGE_BYTES + 1)
NON_ADMIN = SimpleNamespace(id="u-1", email="u@example.com", app_metadata={}, user_metadata={})


@pytest.mark.parametrize("data", [OVERSIZED_PNG, GIF, SVG], ids=["oversized", "gif", "svg"])
def test_non_admin_is_403_before_the_body_is_checked(client, fake_supabase, gadget, data):
    # If read_image_upload ran before the admin check, these would be 413/415 instead.
    with signed_in_as(NON_ADMIN):
        resp = _upload(client, gadget["id"], data)
    assert resp.status_code == 403
    assert fake_supabase.uploads == [] and fake_supabase.writes == []


@pytest.mark.parametrize("data", [OVERSIZED_PNG, GIF, SVG], ids=["oversized", "gif", "svg"])
def test_anonymous_is_401_before_the_body_is_checked(client, fake_supabase, gadget, data):
    with signed_in_as(None):
        resp = _upload(client, gadget["id"], data)
    assert resp.status_code == 401
    assert fake_supabase.uploads == []


@pytest.fixture
def spooled_files(monkeypatch):
    """Every temporary file the multipart parser opens, to check they are all closed afterwards."""
    import starlette.formparsers as formparsers

    opened = []
    real = formparsers.SpooledTemporaryFile

    def recording(*args, **kwargs):
        f = real(*args, **kwargs)
        opened.append(f)
        return f

    monkeypatch.setattr(formparsers, "SpooledTemporaryFile", recording)
    return opened


def _multipart_head(filename="x.png"):
    return f'--b\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n\r\n'.encode() + PNG


def _read_from_messages(messages):
    """Run read_image_upload on a raw ASGI request fed chunk by chunk (TestClient sends one chunk)."""
    import asyncio

    from fastapi import HTTPException
    from starlette.requests import Request

    from image_upload import read_image_upload

    async def receive():
        return messages.pop(0)

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/gadgets/x/image",
        "headers": [(b"content-type", b"multipart/form-data; boundary=b")],
    }
    with pytest.raises(HTTPException) as caught:
        asyncio.run(read_image_upload(Request(scope, receive)))
    return caught.value


def test_mid_stream_cut_off_is_413_and_closes_the_parser_temp_files(spooled_files):
    from image_upload import DETAIL_TOO_LARGE

    chunk = {"type": "http.request", "body": b"\x00" * (512 * 1024), "more_body": True}
    # The file part opens after the first chunk; 10 x 512 KB = 5 MB, far over the cap, and the
    # spool rolls over to a disk file on the way.
    messages = [{"type": "http.request", "body": _multipart_head(), "more_body": True}] + [dict(chunk) for _ in range(10)]
    error = _read_from_messages(messages)
    assert error.status_code == 413
    assert error.detail == DETAIL_TOO_LARGE
    assert len(spooled_files) == 1
    assert all(f.closed for f in spooled_files)


def test_client_disconnect_mid_upload_is_400_and_closes_temp_files(spooled_files):
    from image_upload import DETAIL_INTERRUPTED

    error = _read_from_messages(
        [
            {"type": "http.request", "body": _multipart_head(), "more_body": True},
            {"type": "http.disconnect"},
        ]
    )
    assert error.status_code == 400
    assert error.detail == DETAIL_INTERRUPTED
    assert len(spooled_files) == 1 and all(f.closed for f in spooled_files)


class _FailingQuery:
    """Wraps a FakeQuery and raises on execute() for one operation."""

    def __init__(self, inner, fail_on):
        self._inner = inner
        self._fail_on = fail_on

    def __getattr__(self, name):
        attr = getattr(self._inner, name)
        if not callable(attr):
            return attr

        def call(*a, **k):
            result = attr(*a, **k)
            return self if result is self._inner else result

        return call

    def execute(self):
        if self._inner._operation == self._fail_on:
            raise RuntimeError("database unavailable")
        return self._inner.execute()


def _fail_gadgets(fake_supabase, monkeypatch, operation):
    real_table = fake_supabase.table

    def table(name):
        query = real_table(name)
        return _FailingQuery(query, operation) if name == "gadgets" else query

    monkeypatch.setattr(fake_supabase, "table", table)


def test_gadget_lookup_failure_is_503_and_nothing_is_stored(client, fake_supabase, gadget, monkeypatch):
    _fail_gadgets(fake_supabase, monkeypatch, "select")
    resp = _upload(client, gadget["id"], PNG)
    assert resp.status_code == 503
    assert "database" not in resp.json()["detail"]
    assert fake_supabase.uploads == [] and fake_supabase.writes == []


def test_image_url_update_failure_after_upload_is_503(client, fake_supabase, gadget, monkeypatch):
    _fail_gadgets(fake_supabase, monkeypatch, "update")
    cache.get_or_load("gadgets", ("one", gadget["id"]), 60, lambda: "stale")
    resp = _upload(client, gadget["id"], PNG)
    assert resp.status_code == 503
    assert "database" not in resp.json()["detail"]
    # The photo was stored (uploading it again is harmless: same bytes, same name) ...
    assert len(fake_supabase.uploads) == 1
    # ... and the gadget cache is still dropped, since a failed call may have written.
    _, hit = cache.get_or_load("gadgets", ("one", gadget["id"]), 60, lambda: "fresh")
    assert not hit
