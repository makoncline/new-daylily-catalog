# Development

Use the Node version in `.nvmrc` and the pnpm version in `package.json`.
Run commands from the repository root.

## Local providers

```sh
pnpm setup:local
pnpm dev:local
# Or select a free port:
pnpm dev:local --port 3460
```

This starts the real app with local service providers. It uses synthetic data.
Open `/dashboard/listings` to use the Integration Seller fixture.
Each start creates a new SQLite database. Stop the command with Ctrl+C.
Shutdown removes its database and stops its children.

This path needs no 1Password account or private env file. It rejects production
mode and replaces inherited service credentials. Server requests must use
loopback addresses. Use the integration browser fixtures to block external
browser requests during tests. This mode does not remove the cloud task's
access to a token stored in the cloud environment.

## Connected Development

Install stable 1Password CLI 2.41.0 or newer. The tested version is recorded in
`scripts/1password-development.json`. On the Mac, enable CLI integration in
1Password Settings → Developer. Use desktop authentication.

The project configuration selects **Daylily — Development** by its fixed ID.
Add concealed Clerk and Stripe test keys to that Environment:

- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET`, when those flows are used.

Keep the matching public Clerk test key in `.env.development`.
Keep ordinary machine settings in ignored `.env.development.local`.
Do not put `DATABASE_URL`, public keys, ports, or bootstrap tokens in the
1Password Environment. Add other service credentials only when needed.

```sh
pnpm secrets:dev -- pnpm db:seed:prepare
pnpm dev
pnpm dev -- --disposable --port 3460 --hostname localhost
pnpm secrets:dev -- pnpm test:e2e
pnpm secrets:dev -- pnpm build
```

The realistic seed needs the authorized Mac-local source dataset. It retains
private notes. Keep it out of cloud setup and public evidence.
`pnpm dev` keeps local edits. `--disposable` removes its copy on shutdown.
A caller-supplied `DATABASE_URL` stays caller-owned and cannot use `--disposable`.

The launcher loads secrets once before Turbo. It removes the service-account
token before the application command. It loads Development ordinary settings,
even for a production-mode build. It rejects live Clerk and Stripe keys.
Failed authentication stops the command. Restart a command after a rotation.
The application does not fetch secrets during requests or restarts.

Next loads app env files. Standalone scripts use `@next/env`.
Supplied process values take priority over local overrides and tracked defaults.
The retired root `.env.development` file is not loaded.
`pnpm env:dev -- <command>` loads ordinary settings only. Commands with secrets
already supplied by CI use those values directly. Production file delivery
through `env:prod` retains its root path until the separate production cutover.

## Checks

```sh
pnpm verify
pnpm verify --full
```

Neither command fetches 1Password secrets. The full suite uses disposable local
providers. Use a free `INTEGRATION_PORT` if the default pair is occupied.

## Current Codex Cloud

Create a private environment for this repository. Provision the declared Node
and pnpm versions. Set its Install script to `pnpm setup:cloud`. This checks the
versions, installs the frozen lockfile and locked Chromium browser, and installs CLI 2.41.1 from a SHA-256 checked official
archive into `.tmp/tools/op`. The Linux launcher uses that fixed path.
Setup needs `unzip` and the Playwright Linux system libraries in the image.
It requires no write access to `/usr/local/bin`. The final headless Chromium
probe checks the image's browser support. If libraries are missing, provision
them with the cloud image's supported system-package tools, then rerun setup.
Setup does not fetch application secrets.

For a Cloud image with an inherited HTTP proxy, set `NODE_USE_ENV_PROXY=1`
before setup. Node's native download client must use that proxy. Keep
`PLAYWRIGHT_BROWSERS_PATH` set when the image uses a custom browser cache.
The local runtime passes this path to its browser-test child process.

Set the Start skill to read this guide, run `pnpm setup:local` after a branch or
lockfile change, and run `pnpm dev:local` when an app is needed. Wait for
`Local app ready` before browser work. Use `pnpm verify` for normal checks.
Use one existing integration flow for the first headless Chromium probe:

```sh
INTEGRATION_PORT=3462 node apps/main/scripts/run-integration-local.mjs \
  tests/integration/create-edit-listing.integration.ts
```

Publish the environment and start a fresh task. Setup logs alone do not prove
task startup or Chromium support. Check public-preview support separately.

For connected work, create a separate read-only Development service account.
Give it no Production or vault grant. Enter `OP_SERVICE_ACCOUNT_TOKEN` through
the cloud direct-variable UI. Prefer a requested personal value scoped to this
private environment. A network-secret placeholder is not the token.
Verify one connected command in a fresh task and a resumed task. Confirm the
grant from 1Password metadata. Do not print secret values.

Use the package-manager network preset first. Add only observed download,
1Password account-region, and test-service hosts. The CLI download uses
`cache.agilebits.com`; record redirects and the actual service endpoints during
the trial. Do not substitute a wildcard list.

If connected access fails, use `dev:local` and normal checks. Keep the old
credential files until real delivery is verified. Remove only migrated secret
entries after that check. GitHub, production, backup, and deployment changes
require their separate rollout.

## Trusted CI trial

Only the `Development CI` GitHub environment requires approval from `makoncline`
before trial group 1 starts. Shared `Preview` keeps its existing behavior. Review the workflow and checked-out commit before
approving a run. A same-repository branch can change the code that reads secrets.

On this trial branch, E2E group 1 uses a separate read-only
**Daylily — CI Development** service account. Store its token as the `Development CI`
environment secret `OP_SERVICE_ACCOUNT_TOKEN`. Give that account Development
read access only, with no Production or vault grant. Do not reuse the Cloud token.
The job installs pinned CLI 2.41.1 without the token. Only its connected test
step receives the token and calls `pnpm secrets:dev`; the launcher removes the
token before the application starts.

Other PR branches keep their existing workflow. The other connected groups
on this branch keep their narrow GitHub provider secrets. Fork checks fetch no 1Password values. The trial does not
remove existing provider secrets or change `Verify PR` result rules. To stop
the trial, remove its CI token and restore group 1 to the native-key step.
Decide the wider CI rollout before merging the trial workflow into main.
