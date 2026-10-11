-- Apply LAST, after creating tables and RPCs. Supabase provides these roles.
begin;
set local search_path = public, extensions;
revoke all on public.gadgets, public.spec_documents, public.spec_corrections,
  public.comparison_links, public.query_history from public, anon, authenticated;
grant usage on schema public, extensions to service_role;
grant all on public.gadgets, public.spec_documents, public.spec_corrections,
  public.comparison_links, public.query_history to service_role;
revoke all on function public.match_spec_documents(vector, integer, double precision, uuid[])
  from public, anon, authenticated;
revoke all on function public.increment_comparison_view_count(text)
  from public, anon, authenticated;
grant execute on function public.match_spec_documents(vector, integer, double precision, uuid[])
  to service_role;
grant execute on function public.increment_comparison_view_count(text) to service_role;
notify pgrst, 'reload schema';
commit;
