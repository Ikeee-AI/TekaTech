-- Scratch CI database only. Supabase supplies these roles in real projects.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

-- Like a real Supabase project: objects the setup role creates in public are granted to the
-- browser roles by default. Without this, a migration that forgot its revoke would still pass
-- CI's grant checks. lock_browser_roles.sql must undo it.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
