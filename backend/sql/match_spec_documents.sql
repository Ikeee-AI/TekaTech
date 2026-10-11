-- Global retrieval and gadget-scoped comparison retrieval.
-- Existing installations: compare the current RPC signature before replacing it.
begin;
set local search_path = public, extensions;
create or replace function public.match_spec_documents(
  query_embedding vector(1536), match_count integer default 6,
  match_threshold double precision default 0.5, match_gadget_ids uuid[] default null
)
returns table (
  id uuid, gadget_id uuid, content text, source_url text,
  verified_at timestamptz, similarity double precision
)
language sql stable security invoker set search_path = public, extensions as $$
  select s.id, s.gadget_id, s.content, s.source_url, s.verified_at,
         (1 - (s.embedding <=> query_embedding))::double precision as similarity
  from public.spec_documents s
  where s.embedding is not null and s.indexing_status = 'indexed'
    and (match_gadget_ids is null or s.gadget_id = any(match_gadget_ids))
    and 1 - (s.embedding <=> query_embedding) > match_threshold
  order by s.embedding <=> query_embedding
  limit greatest(0, least(match_count, 50));
$$;
commit;
