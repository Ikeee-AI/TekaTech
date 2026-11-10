"""Guards the team-curated catalog data pack (docs/catalog-data/smartphones-2026-11-10.json).

The pack is entered by an admin through Add Specs, so every spec block must satisfy the same limits the
route enforces (20,000 characters, 6,000 tokens), use the `Label: value` layout the admin guide asks for,
and name a real source page. TechSpecs is excluded because its terms forbid copying (admin-catalog-guide.md).
"""
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import pytest

from tokens import count_embedding_tokens

PACK = Path(__file__).resolve().parents[2] / "docs" / "catalog-data" / "smartphones-2026-11-10.json"
DATA = json.loads(PACK.read_text(encoding="utf-8"))
LINE = re.compile(r"^[^:\n]{1,80}: \S.*$")
BLOCKED_HOSTS = ("techspecs.io",)
TEST_HOST_MARKERS = ("ph-ec-test",)


def _blocks():
    for gadget in DATA["gadgets"]:
        for number, block in enumerate(gadget["specs"], 1):
            yield pytest.param(gadget, block, id=f"{gadget['key']}-{number}")


def test_pack_is_not_empty_and_names_are_unique():
    keys = [g["key"] for g in DATA["gadgets"]]
    assert len(keys) == len(set(keys)) >= 10
    assert sum(1 for g in DATA["gadgets"] if g["action"] == "add") == 6


@pytest.mark.parametrize("gadget", DATA["gadgets"], ids=lambda g: g["key"])
def test_gadget_fields(gadget):
    assert gadget["name"] and gadget["brand"] and gadget["category"] == "Smartphone" or gadget["key"] == "rog-ally-2023"
    price = gadget["price_php"]
    assert price is None or (isinstance(price, int) and price > 0)
    if gadget["image_url"]:
        assert urlparse(gadget["image_url"]).scheme == "https"
        assert gadget["image_url"].lower().split("?")[0].endswith((".png", ".jpg", ".jpeg", ".webp"))
    assert gadget["gaps"], "every gadget lists what its sources did not state"


@pytest.mark.parametrize("gadget,block", list(_blocks()))
def test_spec_block_is_enterable_and_sourced(gadget, block):
    url = urlparse(block["source_url"])
    assert url.scheme == "https" and url.hostname
    assert not any(url.hostname.endswith(h) for h in BLOCKED_HOSTS)
    assert not any(marker in url.hostname for marker in TEST_HOST_MARKERS)
    text = block["text"]
    assert len(text) <= 20_000
    assert count_embedding_tokens(text) <= 6_000
    for line in (ln for ln in text.splitlines() if ln.strip()):
        assert LINE.match(line), f"not 'Label: value': {line!r}"
    assert block["extraction"], "say how the text was obtained"


def test_every_gadget_with_a_price_says_where_it_came_from():
    for gadget in DATA["gadgets"]:
        if gadget["price_php"]:
            assert "page" in gadget["price_note"].lower()
