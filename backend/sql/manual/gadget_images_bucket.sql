-- Public Supabase Storage bucket for admin-uploaded gadget photos (#202, 15 Nov 2026).
--
-- MANUAL, Supabase-only. Deliberately NOT registered in backend/scripts/assemble_sql.py:
-- the `storage` schema exists only in Supabase, so CI's plain pgvector Postgres would fail on it.
-- Apply by hand in the Supabase SQL Editor as the project owner, on DEV first and then on the
-- live project (docs/database.md, "Adding gadget photo uploads"). Safe to re-run.
--
-- public = true: anyone can read an object through its public URL
-- (/storage/v1/object/public/gadget-images/...), which is how the catalog shows the photo.
-- No storage.objects policy is created, and none should be: the backend uploads with the
-- service-role key (POST /gadgets/{gadget_id}/image, admin-only), which bypasses RLS, so the
-- browser roles get no way to write, overwrite, delete or list objects.
--
-- The limits repeat the API's own checks (backend/image_upload.py) as a second line:
-- 2 MB = 2097152 bytes; JPEG, PNG, WebP, AVIF. SVG is never allowed (it can carry script).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gadget-images',
  'gadget-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Check: 1 row, public = true, 2097152, {image/jpeg,image/png,image/webp,image/avif}
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'gadget-images';
