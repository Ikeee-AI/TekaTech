-- Sprint 1 baseline for a NEW Supabase project. Apply as postgres in SQL Editor.
-- Existing projects: inspect their schema first; IF NOT EXISTS is not a schema diff.
begin;
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
set local search_path = public, extensions;

create table if not exists public.gadgets (
  id uuid primary key default gen_random_uuid(),
  name text not null, brand text not null, category text not null,
  release_date date, price_php numeric(12, 2), image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.spec_documents (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid not null references public.gadgets(id) on delete cascade,
  content text not null, embedding vector(1536),
  indexing_status text not null default 'pending',
  source_url text, chunk_index integer not null default 0,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.spec_corrections (
  id uuid primary key default gen_random_uuid(),
  spec_document_id uuid not null references public.spec_documents(id) on delete cascade,
  submitted_by uuid not null, suggested_content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.comparison_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, gadget_ids uuid[] not null,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.query_history (
  id uuid primary key default gen_random_uuid(),
  query_text text not null, answer_text text not null,
  gadget_ids_ref uuid[] not null default '{}', model_used text not null,
  embedding_tokens integer, prompt_tokens integer, completion_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists spec_documents_gadget_id_idx on public.spec_documents(gadget_id);
create index if not exists spec_corrections_status_idx on public.spec_corrections(status);
create index if not exists query_history_created_at_idx on public.query_history(created_at desc);

create or replace function public.set_gadget_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists set_gadget_updated_at on public.gadgets;
create trigger set_gadget_updated_at before update on public.gadgets
for each row execute function public.set_gadget_updated_at();

-- Browser Supabase access is auth-only. No direct table policies are granted.
alter table public.gadgets enable row level security;
alter table public.spec_documents enable row level security;
alter table public.spec_corrections enable row level security;
alter table public.comparison_links enable row level security;
alter table public.query_history enable row level security;
commit;
