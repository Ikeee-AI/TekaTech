---
name: security-scan
description: Run TekaTech's secret and dependency checks — tracked-file secret guard, optional full-history Gitleaks scan, pip-audit and npm audit — and produce a redacted report. Use before releases, for the Sprint 4 history-scan evidence, or when asked about leaked secrets/vulnerable deps.
---

Never print a matched secret value; report file, commit and rule only.

1. `python scripts/check_secrets.py` (tracked files).
2. Full history, if `gitleaks` is installed (`Get-Command gitleaks`): `gitleaks git --redact --report-format json --report-path .local/gitleaks.json .`. If not installed, say so and suggest a pinned release from https://github.com/gitleaks/gitleaks/releases — do not install without approval.
3. Python deps (from `backend/`): `uv export --frozen --no-hashes > ../.local/requirements-audit.txt` then `uvx pip-audit -r ../.local/requirements-audit.txt`.
4. Frontend deps (from `frontend/`): `npm audit --omit=dev`.
5. Summarize findings by severity with a proposed owner. Don't run `npm audit fix --force` or bump versions automatically; fixes go through reviewed PRs.
6. A secret found in history is a real incident: tell the user to rotate it first, then use the `incident` skill.
