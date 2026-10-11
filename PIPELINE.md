# TekaTech delivery pipeline

Owner: project owner (you), the team's one DevOps Engineer and an additional full-stack contributor. Configuration: [.github/workflows/ci.yml](.github/workflows/ci.yml) and [render.yaml](render.yaml).

## Triggers and stages

Every pull request runs all three independent quality jobs. Pushes to main run the same jobs and then deploy; manual workflow dispatch runs checks without deploying. PR jobs have read-only repository permissions, dummy configuration and no live AI calls or deployment credentials.

| Job | Stages | Purpose |
| --- | --- | --- |
| Backend tests | uv dependency install from lock; source compile; pytest; app import check | Verify API logic, authorization, input limits and AI behavior using fakes/mocks |
| Frontend lint and build | cached Node/npm install; ESLint; Vite production build; short-lived build artifact | Reject invalid code and prove the UI compiles |
| Database migrations | scratch pgvector/Postgres; roles; apply SQL twice; transactional acceptance checks | Prove reproducible setup, replay safety, retrieval, relationships and access grants without touching production |
| Deploy main after checks | gated on all three jobs; POST both secret Render hooks for the tested SHA; poll public deployment smoke checks | Deploy only checked main commits; production secrets are injected by the host |

```mermaid
flowchart TD
  A[Issue and feature branch] --> B[Pull request]
  B --> C[Backend tests with mocked AI]
  B --> D[Frontend lint and build]
  B --> E[Scratch database migration tests]
  C --> F[Other teammate review and required checks]
  D --> F
  E --> F
  F --> G[Merge to main]
  G --> H[Run checks for merged commit]
  H --> I[Render deploy hooks for exact commit]
  I --> J[Confirm both commits, database path and CORS]
  J --> K[Record consultation evidence and metrics]
```

Deployment does not migrate the real Supabase database automatically. Apply compatible tracked SQL first as described in the runbook. A liveness health check does not prove database readiness. A successful hook request only proves a deploy was requested; confirm deploy completion and browser/API behavior before Done.

## Configuration and quality gates

Create GitHub's `production` environment, limited to main, with `RENDER_BACKEND_DEPLOY_HOOK` and `RENDER_FRONTEND_DEPLOY_HOOK`. Also set public variables `PRODUCTION_API_URL` and `PRODUCTION_FRONTEND_URL` in that environment. Missing hooks or URL variables fail the deployment job explicitly. The smoke stage waits for both exact commits, database-backed `/gadgets`, the frontend shell and allowed CORS, then uploads its result as evidence. No paid AI calls occur in deployment smoke tests. PRs have no access to these secrets. Keep automatic hosting deploys off so the Actions pipeline is the deploy trigger. Set production API/frontend variables in Render, never in code.

Protect main: one other teammate review, dismiss stale approvals, required `Backend tests`, `Frontend lint and build`, `Database migrations` statuses, no force pushes, no routine direct commits. The team must configure these remote controls after connecting the repository. They are not enforced by a Markdown policy alone.

Dependency caching and parallel jobs are enabled. Older PR runs on the same ref are cancelled for fast feedback. Main runs are serialized and not cancelled in progress; if several merges queue up, GitHub concurrency keeps the latest pending run. This coalesces superseded pending commits while ensuring the latest main state reaches production. Record that behavior when measuring throughput. Use separate staging credentials before adding preview deployments; never point previews at writable production data by accident.

## Measurement and evidence

Update [metrics](docs/devops/metrics.md), [optimizations](docs/devops/optimizations.md) and [incidents](docs/devops/incidents.md) before each consultation. Keep real run links, commit SHAs and timestamps. No hosted measurements exist yet; local command time must not be reported as CI pipeline time.

Official configuration references: [GitHub Postgres service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [Render Blueprint specification](https://render.com/docs/blueprint-spec), and [Render deploy hooks](https://render.com/docs/deploy-hooks).
