# Scope-change log

Course checklist item 13. Only changes that actually happened are listed; the seven core requirements are unchanged. Instructor notification is recorded only where it is known.

| Date | Change | Why | Impact | Decided by | Instructor told |
| --- | --- | --- | --- | --- | --- |
| 16 Oct 2026 | Dropped the optional Ollama local-model mode; OpenAI is the only AI provider | Project owner decision; one provider keeps the deployed path and evaluation comparable | No local-model fallback. The Sprint 1 Ollama probe in `backend/scripts/sprint1_check.py` stays as historical TTK-11 evidence (CLAUDE.md) | Ikeee-AI (project owner) | Not recorded |
| 31 Oct 2026 (disclosed) | Staging/preview environment not built for the `v1.0.0` release; carried to Sprint 5 (#34) | Two more Render services, a separate key and CORS origin did not fit the Sprint 3–4 schedule | Changes are first seen in production; mitigations listed in [environments.md](devops/environments.md) (E2) | Ikeee-AI | Not recorded |
| 26 Oct 2026 (planned, post-release) | Spec import from an external data source chosen for after the course release | Faster catalog growth | Not part of `v1.0.0`; source terms of use not yet verified | Ikeee-AI | Not recorded |

To add a row: date, what changed, why, impact on requirements or users, who decided, and when the instructor was told (or "Not recorded").
