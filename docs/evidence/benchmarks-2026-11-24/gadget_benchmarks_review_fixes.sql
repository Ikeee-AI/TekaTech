-- Benchmark review, 24 Nov 2026 (Ikeee-AI, before Manuel's review of PR #294).
-- The 11 rows flagged on the review page were checked against their sources. These 5 are
-- removed; the other 6 matched (iPhone 16 3DMark from Notebookcheck's table, Reno13 F 5G
-- 3DMark Wild Life from YugaTech, iPhone 16 Pro Diablo Immortal from Notebookcheck, and
-- iPhone 15's game results from tinhte.vn's frame-rate logs, checked by the owner).
--   Find X8 Genshin Impact 59.7 / PUBG 119.6: OPPO marketing figures ("testing conducted
--     in OPPO labs"), no settings or method.
--   V50 5G Mobile Legends 60: the reviewer's impression ("consistent 60 FPS"), not measured.
--   X200 Peace Elite 89.3: the source article has been removed.
--   13 Pro+ 5G BGMI 40: the highest frame rate the game offers at Ultra HDR on this phone
--     ("supported 40 FPS ... instead of 60"), not a measured average.
-- Run in the PROD Supabase SQL Editor after gadget_benchmarks_prod.sql. Safe to re-run:
-- a row that is already gone is simply not matched.
begin;
delete from public.gadget_benchmarks b
using (values
  ('a192c0cd-1d7d-415e-b9ee-5de2a90b52c7', 'Genshin Impact'),
  ('a192c0cd-1d7d-415e-b9ee-5de2a90b52c7', 'PUBG'),
  ('4fbc32c0-8418-4de7-9341-5d41a9eca8d5', 'Mobile Legends'),
  ('4a26ddb6-023c-41b5-b484-9a1bcf750d96', 'PUBG Mobile (China: Peace Elite)'),
  ('5916b9a5-7586-40b4-a5ae-ff8fb20f1e37', 'BGMI (PUBG Mobile India)')
) as v(gadget_id, test)
where b.gadget_id = v.gadget_id::uuid and b.test = v.test;
commit;
select count(*) as benchmark_rows from public.gadget_benchmarks;
