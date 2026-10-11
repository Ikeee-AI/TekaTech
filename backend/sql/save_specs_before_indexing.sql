-- Apply in Supabase SQL Editor before deploying this change.
-- Existing vectors stay indexed; NULL vectors cannot match vector similarity.
begin;
alter table public.spec_documents alter column embedding drop not null;
alter table public.spec_documents
  add column if not exists indexing_status text not null default 'pending';
update public.spec_documents
set indexing_status = case when embedding is null then 'pending' else 'indexed' end;

-- Corrections invalidate vectors. An in-flight index update compares content
-- before writing, so it cannot attach a vector for the old text.
create or replace function public.invalidate_changed_spec_embedding()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.content is distinct from old.content then
    new.embedding := null;
    new.indexing_status := 'pending';
  end if;
  return new;
end;
$$;
drop trigger if exists invalidate_changed_spec_embedding on public.spec_documents;
create trigger invalidate_changed_spec_embedding
before update of content on public.spec_documents
for each row execute function public.invalidate_changed_spec_embedding();
commit;
