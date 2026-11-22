-- Execute ONLY against the scratch CI database; all fixture writes roll back.
begin;
set local search_path = public, extensions;
do $$
declare
  gadget_a uuid; gadget_b uuid; spec_a uuid; spec_b uuid; pending_spec uuid;
  v vector(1536) := ('[' || '1,' || repeat('0,', 1534) || '0]')::vector;
  n integer;
begin
  select count(*) into n from pg_proc where pronamespace = 'public'::regnamespace and proname = 'match_spec_documents';
  if n != 1 then raise exception 'Exactly one retrieval RPC must exist; overloaded named arguments break PostgREST'; end if;
  insert into gadgets(name, brand, category) values ('CI A', 'CI', 'phone') returning id into gadget_a;
  insert into gadgets(name, brand, category) values ('CI B', 'CI', 'phone') returning id into gadget_b;
  insert into spec_documents(gadget_id, content, embedding, indexing_status)
    values (gadget_a, 'Battery A', v, 'indexed') returning id into spec_a;
  insert into spec_documents(gadget_id, content, embedding, indexing_status)
    values (gadget_b, 'Battery B', v, 'indexed') returning id into spec_b;
  insert into spec_documents(gadget_id, content)
    values (gadget_a, 'Pending battery') returning id into pending_spec;
  select count(*) into n from match_spec_documents(v, 6, 0.5);
  if n != 2 then raise exception 'Global retrieval must return indexed chunks only'; end if;
  select count(*) into n from match_spec_documents(v, 6, 0.5, array[gadget_a]);
  if n != 1 then raise exception 'Scoped retrieval must exclude other gadgets'; end if;
  select count(*) into n from match_spec_documents(v, 6, 0.5, array[]::uuid[]);
  if n != 0 then raise exception 'Empty scope must retrieve nothing'; end if;
  select count(*) into n from match_spec_documents(v, 0, 0.5);
  if n != 0 then raise exception 'Zero match count must retrieve nothing'; end if;
  -- Keyword fallback (#88): same scope rules as vector retrieval, plus unit patterns.
  select count(*) into n from pg_proc where pronamespace = 'public'::regnamespace and proname = 'keyword_match_spec_documents';
  if n != 1 then raise exception 'Exactly one keyword retrieval RPC must exist'; end if;
  select count(*) into n from keyword_match_spec_documents(v, 'battery');
  if n != 2 then raise exception 'Keyword retrieval must return indexed chunks only'; end if;
  select count(*) into n from keyword_match_spec_documents(v, 'chip or battery', '{}', 6, array[gadget_a]);
  if n != 1 then raise exception 'Scoped keyword retrieval must exclude other gadgets'; end if;
  select count(*) into n from keyword_match_spec_documents(v, 'capital or france');
  if n != 0 then raise exception 'Keyword retrieval must not return unrelated chunks'; end if;
  select count(*) into n from keyword_match_spec_documents(v, '');
  if n != 0 then raise exception 'An empty keyword query must retrieve nothing'; end if;
  select count(*) into n from keyword_match_spec_documents(v, 'battery', '{}', 0);
  if n != 0 then raise exception 'Zero keyword match count must retrieve nothing'; end if;
  insert into spec_documents(gadget_id, content, embedding, indexing_status)
    values (gadget_b, 'Big 4000mAh cell; 5G radio', v, 'indexed');
  select count(*) into n from keyword_match_spec_documents(v, '', array['[0-9]\s*mah\y']);
  if n != 1 then raise exception 'A unit pattern must match a number written with its unit'; end if;
  select count(*) into n from keyword_match_spec_documents(v, '', array['[0-9]{2,}\s*(g|grams?)\y']);
  if n != 0 then raise exception 'The weight pattern must not read 5G as grams'; end if;
  if (select similarity from keyword_match_spec_documents(v, 'battery', '{}', 1)) is distinct from 1 then
    raise exception 'Keyword results must report the real cosine similarity';
  end if;
  delete from spec_documents where content = 'Big 4000mAh cell; 5G radio';
  update spec_documents set content = 'Corrected battery A' where id = spec_a;
  if not exists (select 1 from spec_documents where id = spec_a and embedding is null and indexing_status = 'pending') then
    raise exception 'A correction must invalidate the previous vector';
  end if;
  insert into spec_corrections(spec_document_id, submitted_by, suggested_content)
    values (pending_spec, gen_random_uuid(), 'New battery');
  insert into comparison_links(slug, gadget_ids) values ('ci-test-link', array[gadget_a, gadget_b]);
  perform increment_comparison_view_count('ci-test-link');
  perform increment_comparison_view_count('ci-test-link');
  if (select view_count from comparison_links where slug = 'ci-test-link') != 2 then
    raise exception 'Atomic comparison views must increment';
  end if;
  insert into query_history(query_text, answer_text, model_used, embedding_tokens, prompt_tokens, completion_tokens)
    values ('CI question', 'CI answer', 'test', 4, 10, 5);
  if has_table_privilege('anon', 'public.gadgets', 'SELECT') or
     has_table_privilege('authenticated', 'public.spec_documents', 'INSERT') then
    raise exception 'Browser roles must not access application tables directly';
  end if;
  if has_function_privilege('anon', 'public.match_spec_documents(vector,integer,double precision,uuid[])', 'EXECUTE') or
     has_function_privilege('authenticated', 'public.increment_comparison_view_count(text)', 'EXECUTE') then
    raise exception 'Browser roles must not invoke backend RPCs';
  end if;
  if not has_function_privilege('service_role', 'public.match_spec_documents(vector,integer,double precision,uuid[])', 'EXECUTE') then
    raise exception 'Backend role requires retrieval access';
  end if;
  if has_function_privilege('anon', 'public.keyword_match_spec_documents(vector,text,text[],integer,uuid[])', 'EXECUTE') or
     has_function_privilege('authenticated', 'public.keyword_match_spec_documents(vector,text,text[],integer,uuid[])', 'EXECUTE') then
    raise exception 'Browser roles must not invoke the keyword retrieval RPC';
  end if;
  if not has_function_privilege('service_role', 'public.keyword_match_spec_documents(vector,text,text[],integer,uuid[])', 'EXECUTE') then
    raise exception 'Backend role requires keyword retrieval access';
  end if;
  select count(*) into n from pg_class where oid in (
    'public.gadgets'::regclass, 'public.spec_documents'::regclass,
    'public.spec_corrections'::regclass, 'public.comparison_links'::regclass, 'public.query_history'::regclass
  ) and relrowsecurity;
  if n != 5 then raise exception 'All application tables must enable RLS'; end if;
  -- My Gadgets: one row per (user, gadget), private to the backend, removed with the gadget.
  insert into user_gadgets(user_id, gadget_id) values ('00000000-0000-0000-0000-0000000000a1', gadget_a);
  begin
    insert into user_gadgets(user_id, gadget_id) values ('00000000-0000-0000-0000-0000000000a1', gadget_a);
    raise exception 'A gadget must appear at most once in a user''s list';
  exception when unique_violation then null;
  end;
  if has_table_privilege('anon', 'public.user_gadgets', 'SELECT') or
     has_table_privilege('authenticated', 'public.user_gadgets', 'INSERT') then
    raise exception 'Browser roles must not access user_gadgets directly';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_gadgets'::regclass) then
    raise exception 'user_gadgets must enable RLS';
  end if;
  -- Per-gadget AI threads: private to the backend, removed with the gadget.
  insert into user_questions(user_id, gadget_id, question, response)
    values ('00000000-0000-0000-0000-0000000000a1', gadget_a, 'What chip?', '{"answer": "A [1]", "sources": []}'::jsonb);
  if has_table_privilege('anon', 'public.user_questions', 'SELECT') or
     has_table_privilege('authenticated', 'public.user_questions', 'INSERT') then
    raise exception 'Browser roles must not access user_questions directly';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_questions'::regclass) then
    raise exception 'user_questions must enable RLS';
  end if;
  -- Per-comparison AI threads: private to the backend, removed when one of the gadgets goes.
  insert into user_comparison_questions(user_id, comparison_key, gadget_ids, question, response)
    values ('00000000-0000-0000-0000-0000000000a1', least(gadget_a, gadget_b)::text || ',' || greatest(gadget_a, gadget_b)::text,
            array[gadget_a, gadget_b], 'Which is faster?', '{"answer": "A [1]", "sources": []}'::jsonb);
  if has_table_privilege('anon', 'public.user_comparison_questions', 'SELECT') or
     has_table_privilege('authenticated', 'public.user_comparison_questions', 'INSERT') then
    raise exception 'Browser roles must not access user_comparison_questions directly';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_comparison_questions'::regclass) then
    raise exception 'user_comparison_questions must enable RLS';
  end if;
  begin
    insert into user_comparison_questions(user_id, comparison_key, gadget_ids, question, response)
      values ('00000000-0000-0000-0000-0000000000a1', gadget_a::text, array[gadget_a], 'One?', '{}'::jsonb);
    raise exception 'A saved comparison needs at least two gadgets';
  exception when check_violation then null;
  end;
  -- Sourced prices: http(s) links and a checked date are stored; other schemes are refused.
  update gadgets set price_php = 49990, price_source_url = 'https://www.samsung.com/ph/',
    price_checked_at = date '2026-11-14', store_url = 'https://www.samsung.com/ph/' where id = gadget_b;
  if (select price_checked_at from gadgets where id = gadget_b) is distinct from date '2026-11-14' then
    raise exception 'A gadget must keep its price check date';
  end if;
  begin
    update gadgets set price_source_url = 'javascript:alert(1)' where id = gadget_b;
    raise exception 'A non-http price source must be refused';
  exception when check_violation then null;
  end;
  begin
    update gadgets set store_url = 'ftp://example.com/x' where id = gadget_b;
    raise exception 'A non-http store link must be refused';
  exception when check_violation then null;
  end;
  delete from gadgets where id = gadget_a;
  if exists (select 1 from user_questions where gadget_id = gadget_a) then
    raise exception 'Deleting a gadget must delete its saved questions';
  end if;
  if exists (select 1 from user_comparison_questions where gadget_a = any(gadget_ids)) then
    raise exception 'Deleting a gadget must delete the saved comparison questions that include it';
  end if;
  if exists (select 1 from user_gadgets where gadget_id = gadget_a) then
    raise exception 'Deleting a gadget must remove it from every user''s list';
  end if;
  if exists (select 1 from spec_documents where gadget_id = gadget_a) or
     exists (select 1 from spec_corrections where spec_document_id = pending_spec) then
    raise exception 'Deleting a gadget must cascade to specs and corrections';
  end if;
end;
$$;
-- Exercise backend permissions and RLS bypass, rather than just checking ACLs.
set local role service_role;
select id from public.gadgets limit 1;
select user_id from public.user_gadgets limit 1;
select user_id from public.user_questions limit 1;
select user_id from public.user_comparison_questions limit 1;
select * from public.match_spec_documents(
  ('[' || '1,' || repeat('0,', 1534) || '0]')::vector, 0, 0.5
);
select * from public.keyword_match_spec_documents(
  ('[' || '1,' || repeat('0,', 1534) || '0]')::vector, 'battery', '{}', 0
);
reset role;

-- lock_browser_roles.sql: the browser roles hold no right on anything in public, including
-- objects no migration names, and objects created later get none by default.
do $$
declare r record; priv text;
begin
  for r in
    select c.oid, format('%I.%I', n.nspname, c.relname) as qname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  loop
    foreach priv in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege('anon', r.oid, priv) or has_table_privilege('authenticated', r.oid, priv) then
        raise exception 'Browser roles must have no % on %', priv, r.qname;
      end if;
    end loop;
  end loop;
  for r in
    select p.oid, p.oid::regprocedure::text as fn from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p') and p.proname <> 'rls_auto_enable'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    if has_function_privilege('anon', r.oid, 'EXECUTE') or has_function_privilege('authenticated', r.oid, 'EXECUTE') then
      raise exception 'Browser roles must not execute %', r.fn;
    end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public') then
    raise exception 'No RLS policies expected in public: the backend uses the service role';
  end if;
end;
$$;

-- A table and a function created after the migrations: the default privileges must not
-- hand them to the browser roles (Supabase grants them by default; ci_roles.sql copies that).
create table public.ci_default_privilege_probe (id int);
create function public.ci_default_privilege_probe_fn() returns int language sql as 'select 1';
do $$
begin
  if has_table_privilege('anon', 'public.ci_default_privilege_probe', 'SELECT') or
     has_table_privilege('authenticated', 'public.ci_default_privilege_probe', 'INSERT') then
    raise exception 'New tables must not be granted to browser roles by default';
  end if;
  if has_function_privilege('anon', 'public.ci_default_privilege_probe_fn()', 'EXECUTE') or
     has_function_privilege('authenticated', 'public.ci_default_privilege_probe_fn()', 'EXECUTE') then
    raise exception 'New functions must not be executable by browser roles by default';
  end if;
end;
$$;
rollback;
