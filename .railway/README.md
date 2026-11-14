# Railway configuration (infrastructure as code)

`railway.ts` holds the Railway settings for the API service `tekatech-api` (project `tekatech`, environment `production`): builder, region and replicas, resource limit, start command, health check and restart retries. It replaced `backend/railway.json` on 13 Nov 2026, because Railway stops reading that "config as code" format on 2026-12-01.

- **Variables are unmanaged.** Secrets and other environment variables are set in the Railway dashboard (names in `docs/devops/environments.md`). Never put them in this folder.
- **Code deploys don't use this file.** CI deploys the exact tested commit with `railway up backend --path-as-root` (`ci.yml`, `rollback.yml`). This file changes service *settings* only, and only when someone applies it.
- `package.json` pins the `railway` TypeScript SDK, which the CLI needs to read `railway.ts`. Its `node_modules/` is ignored by Git.

## Change a setting

From the repository root, with the Railway CLI logged in and linked to `tekatech` / `production`:

```bash
npm ci --prefix .railway --ignore-scripts
railway config plan     # read-only preview; review it
railway config apply    # asks before applying; Railway then redeploys the current code
```

Then run `scripts/deployed_smoke.py` against production, as after any deploy.

Railway stores its defaults as empty, so leave out settings that only repeat a default (for example `restartPolicyType: "ON_FAILURE"`). Otherwise `plan` keeps showing a change that never goes away.

**Windows:** if the CLI was installed with npm, `plan` fails with "This version of railway/iac requires Railway CLI 5.42.1 or newer" even on a newer CLI. The SDK runs `railway --version` without a shell, and Node can't start npm's `railway.cmd` shim that way. In PowerShell, point the SDK at the real binary first:

```powershell
$env:_ = "$env:APPDATA\npm\node_modules\@railway\cli\bin\railway.exe"
& $env:_ config plan
```

Railway's own reference for this folder: `railway config --help` and https://docs.railway.com/infrastructure-as-code .
