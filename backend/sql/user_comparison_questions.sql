-- Per-comparison AI conversation for signed-in users (S5-IK, 23 Nov 2026).
--
-- When a signed-in user asks about TWO OR MORE gadgets (the compare page's AI panel), POST /query
-- and POST /query/stream save the question and the full validated answer here, keyed by the
-- sorted set of gadget ids, so the compare page can show that user's earlier questions about the
-- same phones as a thread, with working citations, on any device. The single-gadget chat keeps
-- user_questions.sql. Anonymous questions are never stored.
--
-- gadget_ids is an array (a comparison has 2-4 gadgets), so a foreign key can't cascade; the
-- trigger below deletes a user's saved comparison turns when one of their gadgets is deleted.
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as postgres,
-- BEFORE deploying the backend that writes it (docs/database.md). Until it is applied, saving a
-- comparison turn fails quietly (logged) and answers still work.
begin;
set local search_path = public, extensions;

create table if not exists public.user_comparison_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  -- Sorted, comma-joined gadget ids: the same phones in any order are one conversation.
  comparison_key text not null,
  gadget_ids uuid[] not null check (cardinality(gadget_ids) >= 2),
  question text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);
-- The compare page reads one user's newest questions about one set of phones.
create index if not exists user_comparison_questions_user_key_created_idx
  on public.user_comparison_questions(user_id, comparison_key, created_at desc);
-- The delete trigger finds rows by gadget.
create index if not exists user_comparison_questions_gadget_ids_idx
  on public.user_comparison_questions using gin (gadget_ids);

create or replace function public.delete_comparison_questions_for_gadget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_comparison_questions where old.id = any(gadget_ids);
  return old;
end;
$$;
revoke all on function public.delete_comparison_questions_for_gadget() from public, anon, authenticated;

drop trigger if exists gadgets_delete_comparison_questions on public.gadgets;
create trigger gadgets_delete_comparison_questions
  after delete on public.gadgets
  for each row execute function public.delete_comparison_questions_for_gadget();

-- Same access model as the other application tables: no browser access, backend only.
alter table public.user_comparison_questions enable row level security;
revoke all on public.user_comparison_questions from public, anon, authenticated;
grant all on public.user_comparison_questions to service_role;

notify pgrst, 'reload schema';
commit;
