-- Sourced prices (S5-IK, 14 Nov 2026): where a gadget's price came from and when it was checked,
-- plus a link to the brand's official store page.
--
-- price_source_url: the official page the price was read from (http/https only; shown as a link).
-- price_checked_at: the day that page was read. A price without a source is still allowed; the UI
--                   labels it "source not given".
-- store_url:        the brand's official store / product page (http/https only).
--
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as postgres,
-- BEFORE deploying the backend that writes these columns (docs/deploy-runbook.md).
begin;
set local search_path = public, extensions;

alter table public.gadgets add column if not exists price_source_url text;
alter table public.gadgets add column if not exists price_checked_at date;
alter table public.gadgets add column if not exists store_url text;

alter table public.gadgets drop constraint if exists gadgets_price_source_url_http;
alter table public.gadgets add constraint gadgets_price_source_url_http
  check (price_source_url is null or price_source_url ~* '^https?://[^[:space:]]+$');
alter table public.gadgets drop constraint if exists gadgets_store_url_http;
alter table public.gadgets add constraint gadgets_store_url_http
  check (store_url is null or store_url ~* '^https?://[^[:space:]]+$');

notify pgrst, 'reload schema';
commit;
