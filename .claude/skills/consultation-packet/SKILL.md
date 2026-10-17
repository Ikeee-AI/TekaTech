---
name: consultation-packet
description: Assemble the weekly 15-minute consultation packet (board status per owner, DevOps report, risks, next sprint) from real GitHub, CI and log data. Use before each Saturday consultation or when asked for sprint status.
---

Output: `docs/sprints/sprint-<N>/consultation.md` (create the folder if missing). Use only real data; mark gaps "missing" — never write standups, reviews or retros on anyone's behalf.

1. Sprint scope: the sprint's five task rows and gate in `docs/sprints-2-to-5.md`.
2. Board/work: `gh issue list` and `gh pr list --state all --search "updated:>=<sprint start>"` for `Ikeee-AI/TekaTech`. Group by owner (Adrian, Mika, Manuel, Jopher, Ikeee-AI) with status Done / Partial / Blocked using the Definition of Done (reviewed + checks + merged + deployed + verified).
3. DevOps report: run the `pipeline-metrics` skill; summarize pipeline changes, the metrics row, incidents (`docs/devops/incidents.md`) and optimizations (`docs/devops/optimizations.md`).
4. Live demo readiness: run the `verify-deploy` skill; list the demo journeys and their owner per the agenda (Jopher 4 min, Ikeee-AI board 3 + DevOps 3, risk 2, Q&A 3).
5. Risks: top risk with concrete mitigation, owner and date (e.g. OpenAI credit, branch protection, unverified teammate access).
6. Next sprint: the following sprint's commitments per owner.
7. End with a checklist of what the user must still collect from teammates (standup links, retro input, reviews).
