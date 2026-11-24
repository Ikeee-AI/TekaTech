-- Game and chip benchmarks per gadget (S5-IK, 24 Nov 2026).
--
-- Each row is one published result with its source link, entered by an admin (the catalog is
-- admin-curated): a chip score (Geekbench, 3DMark, AnTuTu) or a game result (average fps in a
-- named game at named settings). TekaTech does not run benchmarks itself; every row cites where
-- the number was published. Deleting a gadget deletes its benchmarks.
--
-- kind:  'score' (higher is better, unit e.g. "points") or 'game' (unit "fps").
-- test:  benchmark or game name, e.g. 'Geekbench 6 multi-core', 'Genshin Impact'.
-- settings: optional, e.g. 'High, 60 fps target' for a game.
--
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as
-- postgres, BEFORE deploying the backend that uses it (docs/deploy-runbook.md).
begin;
set local search_path = public, extensions;

create table if not exists public.gadget_benchmarks (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid not null references public.gadgets(id) on delete cascade,
  kind text not null,
  test text not null,
  settings text,
  value numeric not null,
  unit text not null,
  source_url text not null,
  checked_at date not null default current_date,
  created_at timestamptz not null default now(),
  constraint gadget_benchmarks_kind_check check (kind in ('score', 'game')),
  constraint gadget_benchmarks_test_check check (char_length(btrim(test)) between 1 and 80),
  constraint gadget_benchmarks_settings_check check (settings is null or char_length(settings) <= 80),
  constraint gadget_benchmarks_unit_check check (char_length(btrim(unit)) between 1 and 20),
  constraint gadget_benchmarks_value_check check (value >= 0 and value < 100000000),
  constraint gadget_benchmarks_source_check check (source_url ~ '^https?://' and char_length(source_url) <= 2048)
);
-- The phone page and the compare page read one or a few gadgets' rows.
create index if not exists gadget_benchmarks_gadget_idx on public.gadget_benchmarks(gadget_id, kind, test);

-- Same access model as the other application tables: browser roles get nothing,
-- the backend's service role does all reads and writes (route code is the access control).
alter table public.gadget_benchmarks enable row level security;
revoke all on public.gadget_benchmarks from public, anon, authenticated;
grant all on public.gadget_benchmarks to service_role;

notify pgrst, 'reload schema';
commit;
