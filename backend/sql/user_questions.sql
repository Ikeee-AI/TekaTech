-- Per-gadget AI conversation for signed-in users (S5-IK, 3 Nov 2026).
--
-- When a signed-in user asks about ONE gadget (the gadget page's AI box), POST /query saves
-- the question and the full validated answer (answer text, numbered sources, flags) here,
-- so the gadget page can show that user's earlier questions and answers as a thread,
-- with working citations, on any device. Each answer is still generated on its own
-- (no earlier turns are sent to the model). Anonymous questions are never stored here.
--
-- query_history is unchanged: it stays anonymous and powers trending questions/telemetry.
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as
-- postgres, BEFORE deploying the backend that writes it (docs/database.md).
begin;
set local search_path = public, extensions;

create table if not exists public.user_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gadget_id uuid not null references public.gadgets(id) on delete cascade,
  question text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);
-- The gadget page reads one user's newest questions about one gadget.
create index if not exists user_questions_user_gadget_created_idx
  on public.user_questions(user_id, gadget_id, created_at desc);

-- Same access model as the other application tables: no browser access, backend only.
alter table public.user_questions enable row level security;
revoke all on public.user_questions from public, anon, authenticated;
grant all on public.user_questions to service_role;

notify pgrst, 'reload schema';
commit;
