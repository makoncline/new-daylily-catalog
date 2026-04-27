# Local Query Profiler

This profiler is opt-in and local-only.
Use one command to run the strategic profiling session end-to-end:

```sh
DATABASE_URL="file:/absolute/path/to/prisma/local-prod-copy-daylily-catalog.db" \
pnpm env:dev pnpm profile:queries
```

Long-lived analysis notes and TODO tracking live in `docs/query-performance-notes.md`.
Raw report artifacts in `tests/.tmp/query-profiler/` should remain local-only and not be committed.

When local SQLite timing is not representative enough, use
`docs/prod-readonly-dashboard-smoke.md` to run local code against production
Turso through a `daylilycatalog.com` Cloudflare tunnel without doing writes.

## 1. Pull a local production snapshot

```sh
pnpm env:dev bash scripts/db-backup.sh
```

## 2. Run Profiling Session

```sh
DATABASE_URL="file:/absolute/path/to/prisma/local-prod-copy-daylily-catalog.db" \
pnpm env:dev pnpm profile:queries
```

This command:

- starts local app with query profiler enabled
- runs only the strategic `@profile` e2e spec
- generates SQL and operation reports

Outputs:

- `tests/.tmp/query-profiler/e2e-session.jsonl`
- `tests/.tmp/query-profiler/e2e-strategic-report.md`
- `tests/.tmp/query-profiler/e2e-strategic-report.json`
- `tests/.tmp/query-profiler/e2e-strategic-report-operation.md`
- `tests/.tmp/query-profiler/e2e-strategic-report-operation.json`

### Safety Gate

- The spec (`tests/e2e/query-profiler-strategic.e2e.ts`) only runs when:
  - `E2E_PROFILE_SCENARIO=1`
  - `BASE_URL` is set
- Standard `pnpm test:e2e` and CI runs remain unchanged.

## Environment flags

- `DATABASE_URL`: required; point to local SQLite prod snapshot.
- `BASE_URL` (optional): defaults to `http://localhost:3000`.
- `PORT` (optional): defaults to `3000`.

Notes:

- Profiler only activates when the active DB is a local SQLite file (`file:` URL).
- If Turso is active, profiler is skipped with a warning.

## Local Large-Catalog Dashboard Debug

Use this when you want to reproduce dashboard behavior locally against a real
large catalog from the production snapshot.

### 1. Back up the local prod copy before auth remapping

```sh
mkdir -p tests/.tmp
sqlite3 prisma/local-prod-copy-daylily-catalog.db \
  ".backup tests/.tmp/local-prod-copy-before-rollingoaks-auth-remap.sqlite"
```

### 2. Remap the Rollingoaks catalog to the local Clerk test user

This snapshot uses `rollingoaksdaylilies` on `User.id = '3'`, while the local
dev test login uses Clerk user `user_32T1tvQIoeDiev3SJwar7ogR8oo`.

```sh
sqlite3 prisma/local-prod-copy-daylily-catalog.db <<'SQL'
BEGIN;
UPDATE "User"
SET "clerkUserId" = NULL
WHERE "clerkUserId" = 'user_32T1tvQIoeDiev3SJwar7ogR8oo';

UPDATE "User"
SET "clerkUserId" = 'user_32T1tvQIoeDiev3SJwar7ogR8oo'
WHERE "id" = '3';
COMMIT;
SQL
```

Verify:

```sh
sqlite3 prisma/local-prod-copy-daylily-catalog.db \
  "select User.id, User.clerkUserId, UserProfile.slug
   from User
   join UserProfile on UserProfile.userId = User.id
   where UserProfile.slug = 'rollingoaksdaylilies';"
```

### 3. Run the app against the local prod copy

```sh
DATABASE_URL="file:./prisma/local-prod-copy-daylily-catalog.db" \
SKIP_ENV_VALIDATION=1 \
NEXT_PUBLIC_SENTRY_ENABLED=false \
pnpm dev
```

### 4. Restore the original local prod copy if needed

```sh
cp tests/.tmp/local-prod-copy-before-rollingoaks-auth-remap.sqlite \
  prisma/local-prod-copy-daylily-catalog.db
```
