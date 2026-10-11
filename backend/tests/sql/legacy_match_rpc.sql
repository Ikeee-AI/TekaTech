-- Scratch CI only: reproduce the restored project's old RPC overload.
set search_path = public, extensions;
create function public.match_spec_documents(
  query_embedding vector(1536), match_gadget_ids uuid[] default null,
  match_count integer default 5, match_threshold double precision default 0.75
)
returns table(id uuid, gadget_id uuid, content text, source_url text, similarity double precision)
language sql stable as $$
  select s.id, s.gadget_id, s.content, s.source_url,
         (1 - (s.embedding <=> query_embedding))::double precision
  from public.spec_documents s
  where match_gadget_ids is null or s.gadget_id = any(match_gadget_ids)
  order by s.embedding <=> query_embedding limit match_count;
$$;
