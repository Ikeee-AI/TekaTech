# TTK-01 proof: seed script and browser CRUD check

Run on 2026-10-17 against **TekaTech-dev** (`efdgguybkampozuvqjrz`) only. The live project (`lqswcmkzygqmnblaukco`) was not touched. The backend ran on `localhost:8000` and the frontend on `localhost:5173`, both reading the dev project from their local `.env` files. The signed-in account's email is covered in the screenshots.

## Seed script (`backend/scripts/seed_dev.py`)

Refuses any non-dev URL before any network call (each URL passed via a `SUPABASE_URL` override; `.env` not edited):

| `SUPABASE_URL` | Result |
|---|---|
| `https://wrongproject123456789.supabase.co` | refused, exit 1 |
| `https://lqswcmkzygqmnblaukco.supabase.co` | refused, exit 1, named as the LIVE project |
| `https://efdgguybkampozuvqjrz.supabase.co.evil.example` | refused, exit 1 |
| empty | refused, exit 1 |

Against dev:

```
Run 1: Seeded project efdgguybkampozuvqjrz: 7 inserted, 0 skipped.
Run 2: Seeded project efdgguybkampozuvqjrz: 0 inserted, 7 skipped.
```

## Browser CRUD walkthrough

| # | Step | What I did | What I saw | Screenshot |
|---|---|---|---|---|
| 1 | List | Opened the catalog | 10 gadgets in 6 categories (7 seeded + 3 already in dev) | [01](01-list-before.jpg) |
| 2 | Create | Signed in, filled Add Gadget: "CRUD Check Phone", TekaTech QA, Smartphone, 2026-10-17, ₱15,000 | Saved, then redirected to the new gadget's page | [02](02-create-form.jpg) |
| 3 | View | The detail page after create | Name, brand, category, release date and ₱15,000 all correct | [03](03-view-after-create.jpg) |
| 4 | List | Back to the catalog, searched "CRUD" | Count went from 10 to 11, and the new gadget appears | [04](04-list-after-create.jpg) |
| 5 | Edit | Changed the name to "CRUD Check Phone (edited)" and the price to ₱12,500 | "Changes saved" toast; the detail page shows the new values | [05](05-edit-form.jpg), [06](06-view-after-edit.jpg) |
| 6 | Refresh | Full page reload of the detail page | The edit persisted: "(edited)" and ₱12,500. `GET /gadgets/{id}` returns the same values, and `updated_at` moved forward | [07](07-after-refresh.jpg) |

## Notes and oddities

- **First load showed "Error: Failed to fetch".** On the very first page load after starting both servers, the browser reported a CORS error for `127.0.0.1:8000`. The backend's CORS headers were correct when checked with curl, and a reload fixed it. It didn't come back, so it looks like a startup timing issue, not an app bug.
- **Dev already had 3 rows** ("121", "Test", "Lenovo V15 Gen 4") from earlier manual testing.
- **The test gadget is still in dev.** "CRUD Check Phone (edited)" stays because deleting needs an admin account. An admin can remove it, or it can stay as a sample row.
