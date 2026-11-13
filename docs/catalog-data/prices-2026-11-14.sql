-- Sourced official PH prices checked 14 Nov 2026 (docs/catalog-data/prices-2026-11-14.json).
-- REVIEW, then apply by hand in Supabase SQL Editor AFTER backend/sql/gadget_price_source.sql.
-- One UPDATE per gadget with a price found on the brand's official PH site, matched by id
-- (and name, so a renamed or re-created row is left alone). Gadgets without an official price
-- are not touched: an existing price keeps showing, labelled 'source not given'.
-- Safe to re-run: each statement sets the same values again. Not applied by CI or deploys.
begin;
-- ASUS ROG Phone 9 Pro: 16GB+512GB (AI2501C-3B048WW)
update public.gadgets set price_php = 62995, price_source_url = 'https://rog.asus.com/ph/phones/rog-phone-9-pro/',
  price_checked_at = date '2026-11-14', store_url = 'https://rog.asus.com/ph/phones/rog-phone-9-pro/'
  where id = 'ed185274-ffa3-4958-b74b-d4d3a01671e4' and name = 'ROG Phone 9 Pro';
-- vivo X200 FE: 12GB+512GB (only variant listed)
update public.gadgets set price_php = 44999, price_source_url = 'https://shop.vivo.com/ph/product/2138?skuId=8377',
  price_checked_at = date '2026-11-14', store_url = 'https://shop.vivo.com/ph/product/2138?skuId=8377'
  where id = '0fe1e3be-b756-4364-8717-44c447969d5d' and name = 'X200 FE';
-- OPPO Find X8: 16GB+512GB (the 12GB+256GB option is listed without a price)
update public.gadgets set price_php = 54999, price_source_url = 'https://www.oppo.com/ph/product/oppo-find-x8.P.P1100441',
  price_checked_at = date '2026-11-14', store_url = 'https://www.oppo.com/ph/product/oppo-find-x8.P.P1100441'
  where id = 'a192c0cd-1d7d-415e-b9ee-5de2a90b52c7' and name = 'Find X8';
-- OPPO Reno14 F 5G: 8GB+256GB
update public.gadgets set price_php = 21999, price_source_url = 'https://www.oppo.com/ph/product/oppo-reno14-f-5g.P.P1100406',
  price_checked_at = date '2026-11-14', store_url = 'https://www.oppo.com/ph/product/oppo-reno14-f-5g.P.P1100406'
  where id = 'dd735047-8c55-44da-8b15-6b73ea85e376' and name = 'Reno14 F 5G';
-- OPPO Reno14 5G: 12GB+256GB
update public.gadgets set price_php = 31999, price_source_url = 'https://www.oppo.com/ph/product/oppo-reno14-5g.P.P1100407',
  price_checked_at = date '2026-11-14', store_url = 'https://www.oppo.com/ph/product/oppo-reno14-5g.P.P1100407'
  where id = '7e9e481a-743b-4844-9af0-ea8424d0012a' and name = 'Reno14 5G';
-- Samsung Galaxy S25: 12GB+256GB
update public.gadgets set price_php = 45976.5, price_source_url = 'https://www.samsung.com/ph/smartphones/galaxy-s25/buy/',
  price_checked_at = date '2026-11-14', store_url = 'https://www.samsung.com/ph/smartphones/galaxy-s25/buy/'
  where id = '5e49de5a-87e7-4eb3-ad9e-3e4c828716bc' and name = 'Galaxy S25';
-- Apple iPhone 16: 128GB
update public.gadgets set price_php = 62990, price_source_url = 'https://www.apple.com/ph/shop/buy-iphone/iphone-16',
  price_checked_at = date '2026-11-14', store_url = 'https://www.apple.com/ph/shop/buy-iphone/iphone-16'
  where id = '3912d3e0-155c-473f-b0e9-1744a6134e82' and name = 'iPhone 16';
-- Infinix Infinix Note 50 Pro 5G+: 12GB+256GB
update public.gadgets set price_php = 17548, price_source_url = 'https://ph.infinixmobility.com/shop/1177',
  price_checked_at = date '2026-11-14', store_url = 'https://ph.infinixmobility.com/shop/1177'
  where id = 'b099dab9-4983-4e00-8a1c-4b516e17789c' and name = 'Infinix Note 50 Pro 5G+';
-- Asus Rog Ally: ROG Ally (2023) Ryzen Z1, RC71L-NH019W
update public.gadgets set price_php = 30995, price_source_url = 'https://rog.asus.com/ph/gaming-handhelds/rog-ally/rog-ally-2023/',
  price_checked_at = date '2026-11-14', store_url = 'https://rog.asus.com/ph/gaming-handhelds/rog-ally/rog-ally-2023/'
  where id = '88f75ae3-44b0-46d8-8760-4fa5fd892486' and name = 'Rog Ally';
-- Check: expect 9 rows.
select name, price_php, price_checked_at, price_source_url from public.gadgets where price_checked_at = date '2026-11-14' order by name;
commit;
