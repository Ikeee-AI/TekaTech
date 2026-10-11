from datetime import datetime
from uuid import uuid4


def sample_gadget(**overrides):
    base = {
        "id": str(uuid4()),
        "name": "Galaxy S24",
        "brand": "Samsung",
        "category": "smartphone",
        "release_date": "2024-01-17",
        "price_php": 45990.0,
        "image_url": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    base.update(overrides)
    return base