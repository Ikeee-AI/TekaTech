# Catalog data

Team-curated data for the admin-curated catalog. Nothing here reaches the database by itself: an admin enters it through the app, or the owner reviews and applies the SQL by hand.

- `smartphones-2026-11-10.json` / `.md`: the 24-phone spec pack (see that `.md` for its method).
- `prices-2026-11-14.json` / `.sql`: sourced official Philippine prices (below).

## Sourced prices, 14 Nov 2026

Owner decision, 14 Nov 2026 (critique item #5): a price in the catalog names where it came from and when it was checked. The columns are `price_source_url`, `price_checked_at` and `store_url` on `gadgets` (`backend/sql/gadget_price_source.sql`). The UI shows "₱X" and a small "samsung.com/ph · checked 14 Nov" link. A price with no source still shows, labelled "source not given".

**Method.** For each of the 24 gadgets returned by the public `GET /gadgets` on 14 Nov 2026:

1. Open the brand's **official Philippine** store or product page only: apple.com/ph, samsung.com/ph, oppo.com/ph (online store), shop.vivo.com/ph and vivo.com/ph, realme.com/ph, mi.com/ph, rog.asus.com/ph, ph.infinixmobility.com. Pages were loaded in a headless browser so prices drawn by JavaScript were visible. Retailers, Lazada/Shopee, news sites, search-result snippets and memory were **not** used.
2. Record the price the official store **charges today** for the standard (lowest-storage) variant. When that is a sale price, the list price goes in `note`. If the lowest-storage option has no price, the priced variant is used and `variant`/`note` say so (Find X8).
3. Record the exact page in `price_source_url` and, when the page sells the phone, the same page in `store_url`. Out-of-stock status is noted, not treated as "no price".
4. If the official PH site shows no price, does not sell the model, or redirects away, record `price_php: null` with the reason. Never fill a gap from elsewhere.

**Result.** 9 of 24 have an official price (iPhone 16, Galaxy S25, Find X8, Reno14 5G, Reno14 F 5G, vivo X200 FE, ROG Phone 9 Pro, Infinix Note 50 Pro 5G+, ROG Ally). The other 15 are null: Apple no longer sells iPhone 16e, 16 Pro or 15 on apple.com/ph; Samsung marks the A36 and A56 "Not for sale" and shows no current S24 price; OPPO has no store listing for Reno13 or Reno13 F; vivo's PH e-store does not carry the X200, X200 Pro or V50; realme.com/ph shows no price for 13 Pro+, 14 Pro or 14 Pro+; mi.com/ph has buying disabled for the POCO X7 Pro.

**Applying.** `prices-2026-11-14.sql` holds one `UPDATE` per found price, matched by `id` and `name`. Apply `backend/sql/gadget_price_source.sql` first, then review and run the price file in the Supabase SQL Editor. Gadgets without an official price are left unchanged. The S24, V50 and POCO X7 Pro already have unsourced prices that keep showing as "source not given"; clearing or keeping them is the owner's call. Prices change: re-check and write a new dated file rather than editing this one.
