"""Admin gadget photo upload (#202): read one image from a multipart body, safely.

Used by POST /gadgets/{gadget_id}/image (routers/gadgets.py). The route declares the admin
dependency before read_image_upload, so the body is only read for an admin.

Why a hand-rolled reader instead of FastAPI's `UploadFile = File(...)`: Starlette spools every
uploaded file to a temporary file with no size limit before the endpoint runs, so a 2 GB body
would be written to disk and only then rejected. Here the request stream goes through a byte
counter into the multipart parser and the request is refused with 413 the moment it passes the
cap (or straight away when Content-Length already says it is too big).

The file type is decided by the first bytes of the file (magic bytes), never by its name or the
Content-Type the browser sent: both are client-chosen. SVG is refused outright, because an SVG
is a document that can carry script.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

from fastapi import HTTPException, Request
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from starlette.requests import ClientDisconnect

MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB, the same number as the bucket's file_size_limit
# Room for the multipart boundary and part headers around the file itself.
MULTIPART_OVERHEAD_BYTES = 64 * 1024
MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES
FORM_FIELD = "file"

# extension -> content type; also the bucket's allowed_mime_types (sql/manual/gadget_images_bucket.sql)
IMAGE_TYPES = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "avif": "image/avif",
}

DETAIL_TOO_LARGE = "The photo is larger than 2 MB. Choose a smaller file."
DETAIL_WRONG_TYPE = "Upload a JPEG, PNG, WebP or AVIF photo."
DETAIL_SVG = "SVG images aren't accepted (they can contain scripts). Upload a JPEG, PNG, WebP or AVIF photo."
DETAIL_NO_FILE = f"Send one image file as multipart/form-data in the field '{FORM_FIELD}'."
DETAIL_EMPTY = "The file is empty."
DETAIL_INTERRUPTED = "The upload was interrupted. Try again."


@dataclass(frozen=True)
class ImageUpload:
    data: bytes
    extension: str
    content_type: str

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.data).hexdigest()


def _is_avif(head: bytes) -> bool:
    # ISO-BMFF: [size:4]["ftyp"][major brand:4][minor version:4][compatible brands:4 each...]
    if len(head) < 12 or head[4:8] != b"ftyp":
        return False
    box_size = int.from_bytes(head[0:4], "big")
    end = min(max(box_size, 16), len(head))
    brands = [head[8:12]] + [head[i : i + 4] for i in range(16, end - 3, 4)]
    return any(brand in (b"avif", b"avis") for brand in brands)


def _looks_like_svg(head: bytes) -> bool:
    text = head.lstrip(b"\xef\xbb\xbf \t\r\n").lower()
    return text.startswith(b"<") and b"<svg" in text


def detect_image_type(data: bytes) -> str:
    """The file's extension from its magic bytes, or an HTTPException(415)."""
    head = data[:64]
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[0:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if _is_avif(head):
        return "avif"
    if _looks_like_svg(data[:1024]):
        raise HTTPException(status_code=415, detail=DETAIL_SVG)
    raise HTTPException(status_code=415, detail=DETAIL_WRONG_TYPE)


def validate_image(data: bytes) -> ImageUpload:
    if not data:
        raise HTTPException(status_code=422, detail=DETAIL_EMPTY)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=DETAIL_TOO_LARGE)
    extension = detect_image_type(data)
    return ImageUpload(data=data, extension=extension, content_type=IMAGE_TYPES[extension])


class _TooLarge(MultiPartException):
    """The body passed MAX_REQUEST_BYTES while streaming in."""


class _Interrupted(MultiPartException):
    """The client went away before the body was complete."""


async def _bounded_stream(request: Request):
    # Both stops are MultiPartException subclasses on purpose: MultiPartParser.parse() closes the
    # temporary files it already opened only for MultiPartException (or OSError). An HTTPException
    # or ClientDisconnect raised here would skip that cleanup.
    received = 0
    try:
        async for chunk in request.stream():
            received += len(chunk)
            if received > MAX_REQUEST_BYTES:
                raise _TooLarge(DETAIL_TOO_LARGE)
            yield chunk
    except ClientDisconnect:
        raise _Interrupted(DETAIL_INTERRUPTED) from None


async def read_image_upload(request: Request) -> ImageUpload:
    """FastAPI dependency: the one image in the `file` field, validated (400 / 413 / 415 / 422)."""
    content_type = request.headers.get("content-type", "")
    if not content_type.lower().startswith("multipart/form-data"):
        raise HTTPException(status_code=422, detail=DETAIL_NO_FILE)

    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            too_big = int(declared) > MAX_REQUEST_BYTES
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.") from None
        if too_big:
            raise HTTPException(status_code=413, detail=DETAIL_TOO_LARGE)

    # One file and no other fields; the counter in _bounded_stream caps the total.
    parser = MultiPartParser(request.headers, _bounded_stream(request), max_files=1, max_fields=0)
    try:
        form = await parser.parse()
    except _TooLarge:
        raise HTTPException(status_code=413, detail=DETAIL_TOO_LARGE) from None
    except _Interrupted:
        raise HTTPException(status_code=400, detail=DETAIL_INTERRUPTED) from None
    except ClientDisconnect:  # belt and braces: should already arrive as _Interrupted
        raise HTTPException(status_code=400, detail=DETAIL_INTERRUPTED) from None
    except MultiPartException:
        raise HTTPException(status_code=422, detail=DETAIL_NO_FILE) from None

    try:
        upload = form.get(FORM_FIELD)
        if not isinstance(upload, UploadFile):
            raise HTTPException(status_code=422, detail=DETAIL_NO_FILE)
        # Bounded: the whole request was at most MAX_REQUEST_BYTES.
        data = await upload.read()
    finally:
        await form.close()
    return validate_image(data)
