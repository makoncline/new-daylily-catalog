# Local Query Profiler

This profiler is opt-in and local-only.
Use one command to run the strategic profiling session end-to-end:

```sh
LOCAL_DATABASE_URL="file:/absolute/path/to/apps/web/prisma/local-prod-copy-daylily-catalog.db" \
USE_TURSO_DB=false \
pnpm web env:dev pnpm profile:queries
```

`pnpm web env:dev ...` runs the wrapped command inside `apps/web`, which is why the follow-up command is `pnpm profile:queries` instead of `pnpm web profile:queries`.

Long-lived analysis notes and TODO tracking live in `docs/query-performance-notes.md`.
Raw report artifacts in `apps/web/tests/.tmp/query-profiler/` should remain local-only and not be committed.

## 1. Pull a local production snapshot

```sh
pnpm web env:dev bash scripts/db-backup.sh
```

## 2. Run Profiling Session

```sh
LOCAL_DATABASE_URL="file:/absolute/path/to/apps/web/prisma/local-prod-copy-daylily-catalog.db" \
USE_TURSO_DB=false \
pnpm web env:dev pnpm profile:queries
```

This command:

- starts local app with query profiler enabled
- runs only the strategic `@profile` e2e spec
- generates SQL and operation reports

Outputs:

- `apps/web/tests/.tmp/query-profiler/e2e-session.jsonl`
- `apps/web/tests/.tmp/query-profiler/e2e-strategic-report.md`
- `apps/web/tests/.tmp/query-profiler/e2e-strategic-report.json`
- `apps/web/tests/.tmp/query-profiler/e2e-strategic-report-operation.md`
- `apps/web/tests/.tmp/query-profiler/e2e-strategic-report-operation.json`

### Safety Gate

- The spec (`apps/web/tests/e2e/query-profiler-strategic.e2e.ts`) only runs when:
  - `E2E_PROFILE_SCENARIO=1`
  - `BASE_URL` is set
- Standard `pnpm web test:e2e` and CI runs remain unchanged.

## Environment flags

- `LOCAL_DATABASE_URL`: required; point to local SQLite prod snapshot.
- `USE_TURSO_DB=false`: required for local SQLite profiling.
- `BASE_URL` (optional): defaults to `http://localhost:3000`.
- `PORT` (optional): defaults to `3000`.

Notes:

- Profiler only activates when the active DB is a local SQLite file (`file:` URL).
- If Turso is active, profiler is skipped with a warning.
