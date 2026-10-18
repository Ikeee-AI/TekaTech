"""Seed a few gadgets into the TekaTech-dev Supabase project. Never targets any other project.

Usage, from backend/:
    uv run python scripts/seed_dev.py

The Supabase URL comes from backend/.env (or a SUPABASE_URL env override). Its host must be
exactly DEV_PROJECT_REF.supabase.co, or the script exits with status 1 before any network call.
There is no override flag. Safe to rerun: a gadget whose name and brand already exist is skipped.
"""
from pathlib import Path
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # reads .env only; no network

# TekaTech-dev, confirmed in the Supabase dashboard on 2026-10-17.
DEV_PROJECT_REF = "efdgguybkampozuvqjrz"
# Documented live project (docs/sprint-1.md, docs/evidence/supabase-sprint-1.json).
LIVE_PROJECT_REF = "lqswcmkzygqmnblaukco"

GADGETS = (
    {"name": "Galaxy S25 Ultra", "brand": "Samsung", "category": "Smartphone",
     "release_date": "2025-02-07", "price_php": 84990},
    {"name": "iPhone 16 Pro", "brand": "Apple", "category": "Smartphone",
     "release_date": "2024-09-20", "price_php": 70990},
    {"name": "Pixel 9", "brand": "Google", "category": "Smartphone",
     "release_date": "2024-08-22", "price_php": 46990},
    {"name": "MacBook Air 13 M3", "brand": "Apple", "category": "Laptop",
     "release_date": "2024-03-08", "price_php": 69990},
    {"name": "Zenbook 14 OLED", "brand": "ASUS", "category": "Laptop",
     "release_date": "2024-01-25", "price_php": 64995},
    {"name": "Steam Deck OLED", "brand": "Valve", "category": "Handheld",
     "release_date": "2023-11-16", "price_php": 37990},
    {"name": "WH-1000XM5", "brand": "Sony", "category": "Headphones",
     "release_date": "2022-05-20", "price_php": 19999},
)


def check_target(url: str) -> str:
    """Return the project ref if url is exactly the dev project; otherwise exit(1)."""
    host = urlparse(url).hostname or ""
    expected = f"{DEV_PROJECT_REF}.supabase.co"
    if host == expected:
        return DEV_PROJECT_REF
    reason = " (this is the LIVE project)" if host.startswith(f"{LIVE_PROJECT_REF}.") else ""
    print(f"REFUSING TO SEED: supabase_url host is {host!r}{reason}, expected {expected!r}.",
          file=sys.stderr)
    print("No network or database call was made.", file=sys.stderr)
    sys.exit(1)


def seed(supabase) -> tuple[list[str], list[str]]:
    inserted, skipped = [], []
    for gadget in GADGETS:
        label = f"{gadget['brand']} {gadget['name']}"
        existing = (supabase.table("gadgets").select("id")
                    .eq("name", gadget["name"]).eq("brand", gadget["brand"]).execute())
        if existing.data:
            skipped.append(label)
            continue
        supabase.table("gadgets").insert(gadget).execute()
        inserted.append(label)
    return inserted, skipped


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ref = check_target(settings.supabase_url)
    from supabase_client import supabase  # imported only after the target check passes

    inserted, skipped = seed(supabase)
    print(f"Seeded project {ref}: {len(inserted)} inserted, {len(skipped)} skipped.")
    for label in inserted:
        print(f"  + {label}")
    for label in skipped:
        print(f"  = {label} (already present)")
