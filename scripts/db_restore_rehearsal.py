"""Database restore rehearsal: logical export of the five app tables, restore into a disposable copy.

1. Export every row of the five application tables through the Supabase REST API (read-only GETs
   with the backend's service-role key, read from an env file and never printed or stored).
2. Start a throwaway local PostgreSQL 16 + pgvector (the `pgserver` package), create the
   Supabase roles CI uses, and apply `backend/scripts/assemble_sql.py` output: the tracked schema.
3. Insert the exported rows in foreign-key order, then verify: per-table row counts match,
   every spec chunk joins to its gadget, every correction joins to its chunk, and the stored
   embeddings answer a nearest-neighbour query through `match_spec_documents`.
4. Report timings and counts only (no row contents), then delete the copy and the export
   unless --keep is given.

Point it at a development project only. It never writes to the source database, but a
production export would put real user data on this machine.

  uv run --no-project --python 3.12 --with pgserver==0.1.4 --with "psycopg[binary]==3.2.3" \
      python scripts/db_restore_rehearsal.py --env-file backend/.env --report .local/db-restore.json
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
# Foreign-key order: spec_documents -> gadgets, spec_corrections -> spec_documents.
TABLES = ["gadgets", "spec_documents", "spec_corrections", "comparison_links", "query_history"]
PRODUCTION_PROJECT_REF = "lqswcmkzygqmnblaukco"  # docs/devops/environments.md
PAGE_SIZE = 500
TIMEOUT_SECONDS = 30


def read_env(path):
    values = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip().upper()] = value.strip().strip('"').strip("'")
    return values


def export_table(base_url, key, table):
    rows, offset = [], 0
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}
    while True:
        url = f"{base_url}/rest/v1/{table}?select=*&order=id&offset={offset}&limit={PAGE_SIZE}"
        with urlopen(Request(url, headers=headers), timeout=TIMEOUT_SECONDS) as response:
            page = json.loads(response.read().decode("utf-8"))
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--env-file", required=True, help="backend env file of a DEVELOPMENT project")
    parser.add_argument("--report", required=True)
    parser.add_argument("--keep", action="store_true", help="keep the export and the disposable copy")
    args = parser.parse_args()

    import pgserver  # imported late so --help works without the optional packages
    import psycopg

    env = read_env(args.env_file)
    base_url, key = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_KEY"]
    if PRODUCTION_PROJECT_REF in base_url:
        sys.exit("Refusing to export the production project; use a TekaTech-dev env file.")
    report = {"started_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "source_project_host": base_url.split("//")[-1].split(".")[0][:6] + "…",
              "tables": {}, "checks": {}}
    work = Path(tempfile.mkdtemp(prefix="tekatech-restore-"))
    t0 = time.perf_counter()

    # 1. Export
    export = {table: export_table(base_url, key, table) for table in TABLES}
    (work / "export.json").write_text(json.dumps(export), encoding="utf-8")
    t_export = time.perf_counter()

    # 2. Disposable database with the tracked schema
    server = pgserver.get_server(str(work / "pgdata"), cleanup_mode="stop")
    schema_sql = subprocess.run([sys.executable, str(ROOT / "backend/scripts/assemble_sql.py")],
                                check=True, capture_output=True, text=True).stdout
    roles_sql = (ROOT / "backend/tests/sql/ci_roles.sql").read_text(encoding="utf-8")
    with psycopg.connect(server.get_uri(), autocommit=True) as conn:
        conn.execute("create extension if not exists vector")
        conn.execute(roles_sql)
        conn.execute(schema_sql)
    t_schema = time.perf_counter()

    # 3. Restore rows, then verify
    with psycopg.connect(server.get_uri()) as conn:
        for table in TABLES:
            rows = export[table]
            restored_columns = {r[0] for r in conn.execute(
                "select column_name from information_schema.columns "
                "where table_schema = 'public' and table_name = %s", (table,))}
            exported_columns = set(rows[0]) if rows else set()
            if rows:
                # json_populate_recordset casts each JSON value to the column's type (uuid,
                # timestamptz, vector from its "[...]" text form); unknown keys are ignored.
                conn.execute(f"insert into public.{table} select * from "
                             f"json_populate_recordset(null::public.{table}, %s::json)",
                             (json.dumps(rows),))
            restored = conn.execute(f"select count(*) from public.{table}").fetchone()[0]
            report["tables"][table] = {
                "exported_rows": len(rows), "restored_rows": restored,
                "columns_not_in_tracked_schema": sorted(exported_columns - restored_columns)}
        conn.commit()
        t_restore = time.perf_counter()

        checks = report["checks"]
        checks["row_counts_match"] = all(t["exported_rows"] == t["restored_rows"]
                                         for t in report["tables"].values())
        checks["spec_chunks_without_gadget"] = conn.execute(
            "select count(*) from public.spec_documents s left join public.gadgets g "
            "on g.id = s.gadget_id where g.id is null").fetchone()[0]
        checks["corrections_without_chunk"] = conn.execute(
            "select count(*) from public.spec_corrections c left join public.spec_documents s "
            "on s.id = c.spec_document_id where s.id is null").fetchone()[0]
        checks["embedded_chunks"] = conn.execute(
            "select count(*) from public.spec_documents where embedding is not null").fetchone()[0]
        probe = conn.execute("select embedding from public.spec_documents "
                             "where embedding is not null limit 1").fetchone()
        if probe:
            top = conn.execute("select count(*) from match_spec_documents(%s::vector, 3, 0.0)",
                               (probe[0],)).fetchone()[0]
            checks["vector_search_returns_rows"] = top > 0
        else:
            checks["vector_search_returns_rows"] = None
    t_verify = time.perf_counter()

    server.cleanup()
    report["timings_seconds"] = {
        "export": round(t_export - t0, 2), "schema": round(t_schema - t_export, 2),
        "restore_rows": round(t_restore - t_schema, 2), "verify": round(t_verify - t_restore, 2),
        "total": round(t_verify - t0, 2)}
    report["passed"] = (checks["row_counts_match"] and checks["spec_chunks_without_gadget"] == 0
                        and checks["corrections_without_chunk"] == 0
                        and checks["vector_search_returns_rows"] is not False)
    report["finished_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    report["kept_copy"] = str(work) if args.keep else None
    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
