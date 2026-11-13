// Railway configuration for the TekaTech API (replaces backend/railway.json,
// whose config-as-code format Railway stops reading on 2026-12-01).
// Preview with `railway config plan`; apply with `railway config apply`.
// Variables stay unmanaged: secrets are set in the Railway dashboard, never here.
// CI still deploys code with `railway up backend --path-as-root` (ci.yml, rollback.yml).
import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const tekatechApi = service("tekatech-api", {
    build: { buildEnvironment: "V3", builder: "RAILPACK" },
    replicas: { "asia-southeast1-eqsg3a": 1 },
    deploy: {
      // One worker: the in-memory rate limiter (memory://) is per process.
      startCommand: "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1",
      healthcheckPath: "/health",
      healthcheckTimeout: 120,
      // Restart policy ON_FAILURE is Railway's default (stored as null), so it is
      // not set here; setting it explicitly leaves a permanent diff in `plan`.
      restartPolicyMaxRetries: 3,
      limitOverride: { containers: { cpu: 2, memoryBytes: 2000000000 } },
    },
  });

  return project("tekatech", {
    variables: { managed: false },
    resources: [tekatechApi],
  });
});
