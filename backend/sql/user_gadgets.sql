-- My Gadgets (S5-IK, 3 Nov 2026): each signed-in user's personal list of catalog gadgets.
--
-- A user picks gadgets from the admin-curated catalog; nothing here creates gadgets.
-- Rows belong to a Supabase auth user (user_id = auth.users.id, the same id the backend
-- reads from the session). Deleting a gadget removes it from every user's list.
--
-- Replay-safe: CI applies the whole setup twice. Apply once in Supabase SQL Editor as
-- postgres, BEFORE deploying the backend that uses it (docs/deploy-runbook.md).
begin;
set local search_path = public, extensions;

create table if not exists public.user_gadgets (
  user_id uuid not null,
  gadget_id uuid not null references public.gadgets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gadget_id)
);
-- The dashboard lists one user's rows newest first.
create index if not exists user_gadgets_user_created_idx
  on public.user_gadgets(user_id, created_at desc);

-- Same access model as the other application tables: browser roles get nothing,
-- the backend's service role does all reads and writes (route code is the access control).
alter table public.user_gadgets enable row level security;
revoke all on public.user_gadgets from public, anon, authenticated;
grant all on public.user_gadgets to service_role;

notify pgrst, 'reload schema';
commit;
