-- Lock the browser roles (anon, authenticated) out of the public schema. Apply LAST.
--
-- Why: the browser holds the publishable key and uses Supabase for sign-in only; every data
-- request goes through the FastAPI backend, which uses the service role (bypasses RLS). So the
-- browser roles need no table, sequence or function rights in `public` at all. The other files
-- revoke rights table by table; this file is the safety net for anything they don't name
-- (on 14 Nov 2026 production had three such leftover tables -- profiles, image_lookups,
-- ingestion_queue -- with full anon rights, TRUNCATE included, which RLS does not cover), and it
-- stops Supabase's default grants from exposing tables or functions created later.
--
-- Replay-safe: every statement can run any number of times. Objects owned by extensions
-- (pgvector) are skipped. Trigger and event-trigger functions keep working: triggers run
-- regardless of EXECUTE rights. service_role keeps full rights.
begin;
set local search_path = public, extensions;

do $$
declare r record;
begin
  -- Tables, views, materialized views, foreign tables: RLS on, no browser rights.
  for r in
    select c.oid, c.relkind, format('%I.%I', n.nspname, c.relname) as qname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  loop
    if r.relkind in ('r', 'p') then
      execute format('alter table %s enable row level security', r.qname);
    end if;
    execute format('revoke all on table %s from public, anon, authenticated', r.qname);
    execute format('grant all on table %s to service_role', r.qname);
  end loop;

  -- Sequences.
  for r in
    select format('%I.%I', n.nspname, c.relname) as qname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
      and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('revoke all on sequence %s from public, anon, authenticated', r.qname);
    execute format('grant usage, select, update on sequence %s to service_role', r.qname);
  end loop;

  -- Functions: no browser EXECUTE; pin a search_path where none is set (Supabase advisor 0011).
  -- rls_auto_enable() is Supabase's own automatic-RLS helper and is left exactly as it is.
  for r in
    select p.oid::regprocedure as fn, p.proconfig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
      and p.proname <> 'rls_auto_enable'
      and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    if not exists (select 1 from unnest(coalesce(r.proconfig, '{}'::text[])) cfg
                   where cfg like 'search_path=%') then
      execute format('alter routine %s set search_path = public, pg_temp', r.fn);
    end if;
    execute format('revoke all on routine %s from public, anon, authenticated', r.fn);
    execute format('grant execute on routine %s to service_role', r.fn);
  end loop;
end;
$$;

-- Policies left over from before the backend took over data access. With no browser rights on
-- these tables they already do nothing; dropping them keeps the live database equal to this repo.
drop policy if exists "public read comparison_links" on public.comparison_links;
drop policy if exists "public read gadgets" on public.gadgets;
drop policy if exists "users read own query_history" on public.query_history;
drop policy if exists "users submit corrections" on public.spec_corrections;
drop policy if exists "public read spec_documents" on public.spec_documents;

-- Objects created later by the SQL editor's role get no browser rights by default.
-- (Supabase also keeps defaults for supabase_admin, which only Supabase can change; the
-- loops above cover those objects whenever this file is re-applied.)
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
-- PostgreSQL's built-in default lets PUBLIC execute every new function, and a per-schema rule
-- cannot remove a built-in default, so this one is global (all schemas, functions created by
-- postgres). A function the browser really needs must then be granted explicitly -- which is
-- what we want.
alter default privileges for role postgres revoke execute on functions from public;

grant usage on schema public to service_role;
notify pgrst, 'reload schema';
commit;
