"""Print an ordered, pasteable SQL setup. Does not connect to a database."""
from pathlib import Path
import sys

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"
MIGRATIONS = (
    "001_baseline.sql", "save_specs_before_indexing.sql",
    "add_query_history_token_columns.sql", "match_spec_documents.sql",
    "keyword_match_spec_documents.sql",
    "increment_comparison_view_count.sql", "user_gadgets.sql", "user_questions.sql",
    "gadget_price_source.sql", "api_access.sql",
)


def assemble() -> str:
    return "\n\n".join(
        f"-- BEGIN {name}\n{(SQL_DIR / name).read_text(encoding='utf-8')}"
        for name in MIGRATIONS
    )


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(assemble())
