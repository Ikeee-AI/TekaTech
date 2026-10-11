# TTK-11: One real backend AI-provider connectivity test

Target: Sprint 1
Ownership area: Developer: AI. Named assignee: pending team declaration.

## Acceptance criteria

- [x] Make one successful real provider call from backend code: temporary Ollama `qwen3:8b`, using `scripts/sprint1_check.py --ai --ai-provider ollama`.
- [x] Validate the completed JSON response and record the model, generated tokens and safe output in `docs/evidence/local-llm-sprint-1.json`.
- [x] Keep normal PR tests mocked; no paid API or installed local model is required by CI.

Scope adjustment: use a real local provider to demonstrate Sprint 1 connectivity while OpenAI credit is exhausted. No API key is needed for this loopback provider. The application still uses OpenAI for RAG embeddings/chat; a successful OpenAI response and a deployed AI feature are not claimed. Local connectivity is not public deployment acceptance.

## Definition of Done

- [ ] Reviewed by at least one other teammate and merged to main through a PR.
- [ ] Required CI checks passed.
- [ ] Deployed and checked in the deployed environment.
- [ ] Link the issue, PR, CI run, commit and live verification evidence.

Hosted issue: https://github.com/Ikeee-AI/TekaTech/issues/12

Current status: open backlog item; deployment and the course Definition of Done still require evidence.
