-- Launch prices (S5-IK, 15 Nov 2026): mark a gadget's price as its launch SRP.
--
-- Owner rule of 14 Nov 2026: a phone that is no longer sold still shows a price, its launch price
-- (base variant, regular, not promo), sourced from the brand first and otherwise a named Philippine
-- outlet. Without a flag the price tag ("₱56,990 · site · checked 14 Nov") reads like a price on
-- sale today, so the UI shows "launch price" when this is true.
--
-- price_is_launch: true = price_php is the launch SRP; false (default) = a current price.
--
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as postgres,
-- BEFORE deploying the frontend/backend that write this column (docs/deploy-runbook.md).
begin;
set local search_path = public, extensions;

alter table public.gadgets add column if not exists price_is_launch boolean not null default false;

notify pgrst, 'reload schema';
commit;
