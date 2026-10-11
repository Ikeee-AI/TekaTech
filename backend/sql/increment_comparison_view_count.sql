-- Atomic view-count increment for comparison_links.
--
-- The old code path did `select view_count` then `update view_count = n+1`
-- from application code, which loses updates under concurrent requests to
-- the same slug (two requests can both read the same count and both write
-- back the same +1). This function does the read-modify-write as a single
-- statement inside Postgres, so it can't race with itself.
--
-- Run this once in the Supabase SQL editor (Database > SQL Editor).

create or replace function public.increment_comparison_view_count(link_slug text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.comparison_links
  set view_count = view_count + 1
  where slug = link_slug;
$$;
