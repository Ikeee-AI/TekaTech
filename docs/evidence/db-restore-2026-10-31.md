# Database restore rehearsal: 31 October 2026

Owner: Ikeee-AI (DevOps, AI-assisted: yes). Work package S4-IK ("database restoration is rehearsed on a disposable copy, with recovery time recorded; no destructive live restore"). Raw report: [db-restore-2026-10-31.json](db-restore-2026-10-31.json). Script: [`scripts/db_restore_rehearsal.py`](../../scripts/db_restore_rehearsal.py).

**Source:** TekaTech-dev (`efdgguybkampozuvqjrz`), read-only REST export with the backend key from the local env file. Production was not touched; the script refuses the production project ref.
**Target:** a disposable local PostgreSQL 16.2 + pgvector 0.6.2 (`pgserver==0.1.4`), built with `backend/tests/sql/ci_roles.sql` and `backend/scripts/assemble_sql.py` output (the same inputs as the CI database job; CI also applies the SQL twice and runs the legacy-overload and acceptance steps, and uses pgvector 0.8.7, where this copy had 0.6.2 with the `vector` extension created in `public` first). Deleted after the run, together with the export.

| Table | Exported | Restored | Columns outside tracked schema |
| --- | --- | --- | --- |
| gadgets | 13 | 13 | none |
| spec_documents | 12 | 12 | none |
| spec_corrections | 10 | 10 | none |
| comparison_links | 10 | 10 | none |
| query_history | 135 | 135 | none |

**Checks:** row counts match; 0 spec chunks without a gadget; 0 corrections without a chunk; 11 embedded chunks kept their vectors and `match_spec_documents` returned rows from the restored copy.

**Timings (recovery time):** export 4.6 s, schema 9.3 s, row restore 0.1 s, total **14.0 s** (06:38:07 → 06:38:22 UTC).

**Limits:** dev data volume (180 rows), not production volume. Supabase Auth users are not exported; restored rows keep their user ids as plain values. The free plan has no point-in-time recovery, so this logical export is the team's backup method; it has not been run against production because that would copy real user data to a laptop.
