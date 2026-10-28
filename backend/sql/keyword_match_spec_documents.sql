-- Keyword fallback for POST /query (#88): runs only when match_spec_documents found no chunk
-- above the similarity threshold. Same scope rules as vector retrieval: indexed chunks only,
-- optional gadget scope, bounded count. Apply AFTER match_spec_documents.sql. Safe to re-run.
-- Until this is applied, /query logs one warning and answers "no relevant specs" as before.
--
-- search_query: words joined with " or ", parsed by websearch_to_tsquery (never a syntax error).
-- unit_patterns: fixed regexes from backend/keyword_search.py (e.g. '[0-9]\s*mah\y'), because
--   full-text search keeps "4000mAh" as one token. Never built from user text.
-- similarity: the real cosine similarity (below the vector threshold), so the UI's relevance
--   figure stays honest; keyword_rank orders the results.
-- No full-text index: the regex alternative needs a scan anyway, and spec_documents is small.
begin;
set local search_path = public, extensions;

create or replace function public.keyword_match_spec_documents(
  query_embedding vector(1536), search_query text, unit_patterns text[] default '{}',
  match_count integer default 6, match_gadget_ids uuid[] default null
)
returns table (
  id uuid, gadget_id uuid, content text, source_url text,
  verified_at timestamptz, similarity double precision, keyword_rank real
)
language sql stable security invoker set search_path = public, extensions as $$
  select r.id, r.gadget_id, r.content, r.source_url, r.verified_at, r.similarity, r.keyword_rank
  from (
    select h.id, h.gadget_id, h.content, h.source_url, h.verified_at,
           (1 - (h.embedding <=> query_embedding))::double precision as similarity,
           ((case when h.word_hit then ts_rank(h.doc, h.tsq) else 0::real end)
             + (case when h.unit_hit then 0.1::real else 0::real end))::real as keyword_rank
    from (
      select s.id, s.gadget_id, s.content, s.source_url, s.verified_at, s.embedding,
             to_tsvector('english'::regconfig, s.content) as doc, q.tsq,
             to_tsvector('english'::regconfig, s.content) @@ q.tsq as word_hit,
             s.content ~* any(q.patterns) as unit_hit
      from public.spec_documents s
      cross join (
        select websearch_to_tsquery('english'::regconfig, coalesce(search_query, '')) as tsq,
               coalesce(unit_patterns, '{}'::text[]) as patterns
      ) q
      where s.embedding is not null and s.indexing_status = 'indexed'
        and (match_gadget_ids is null or s.gadget_id = any(match_gadget_ids))
    ) h
    where h.word_hit or h.unit_hit
  ) r
  order by r.keyword_rank desc, r.similarity desc
  limit greatest(0, least(match_count, 50));
$$;

-- Same access as the vector RPC: backend (service_role) only, never the browser roles.
revoke all on function public.keyword_match_spec_documents(vector, text, text[], integer, uuid[])
  from public, anon, authenticated;
grant execute on function public.keyword_match_spec_documents(vector, text, text[], integer, uuid[])
  to service_role;
notify pgrst, 'reload schema';
commit;
