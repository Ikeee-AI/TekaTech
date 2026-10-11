-- Scratch CI database only. Supabase supplies these roles in real projects.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
