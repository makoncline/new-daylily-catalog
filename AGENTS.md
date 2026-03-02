# Agents

This file is for agentic coding tools working in this repo. Follow the rules
below and mirror existing conventions before introducing new ones.

## Quick Commands

- Package manager: `pnpm` (see `package.json`)
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start: `pnpm start`
- Lint: `pnpm lint`
- Typecheck: `npx tsc --noEmit`
- Unit tests: `pnpm test`
- Unit tests (watch): `pnpm test:watch`
- E2E tests: `pnpm test:e2e`
- E2E tests (attach to existing server): `pnpm test:e2e:attach`
- Query profiler (single command session): `LOCAL_DATABASE_URL="file:/absolute/path/to/prisma/local-prod-copy-daylily-catalog.db" USE_TURSO_DB=false pnpm env:dev pnpm profile:queries`

For query profiling workflow details, always start with `docs/local-query-profiler.md`.

### Run a Single Test

- Vitest by file: `pnpm test -- tests/some-file.test.ts`
- Vitest by test name: `pnpm test -- -t "test name"`
- Vitest watch by file: `pnpm test:watch -- tests/some-file.test.ts`
- Playwright by file: `pnpm test:e2e -- tests/some-file.e2e.ts`
- Playwright by title/grep: `pnpm test:e2e -- --grep "checkout flow"`

## Temp DB Workflow (Local UI + E2E)

```sh
# Create a fresh temp DB
npx tsx scripts/create-temp-db.ts

# Seed example data (optional)
npx tsx scripts/seed-temp-db-example.ts

# Run app against the temp DB
LOCAL_DATABASE_URL="file:tests/.tmp/ui-listings.sqlite" pnpm dev
```

Custom DB path:

```sh
npx tsx scripts/create-temp-db.ts --db tests/.tmp/custom-temp.sqlite
npx tsx scripts/seed-temp-db-example.ts --db tests/.tmp/custom-temp.sqlite
LOCAL_DATABASE_URL="file:tests/.tmp/custom-temp.sqlite" pnpm dev
```

Note: `scripts/seed-temp-db-example.ts` is minimal; write a purpose-built
seed script for e2e, QA, or demos.

Playwright local runs auto-provision a temp DB and start `pnpm dev` unless
`BASE_URL` is set. Local E2E uses `E2E_PORT` (default `3100`).

## Local "Prod" Build Workflow (with Production Data Snapshot)

Use this when you need production-mode behavior locally with a local copy of
production data.

```sh
# Pull local copy of prod DB to file
pnpm env:dev bash scripts/db-backup.sh

# Build in production mode against local prod DB copy
LOCAL_DATABASE_URL="file:./local-prod-copy-daylily-catalog.db" USE_TURSO_DB=false NODE_ENV=production pnpm env:dev pnpm build

# Run production server locally against local prod DB copy
LOCAL_DATABASE_URL="file:./local-prod-copy-daylily-catalog.db" USE_TURSO_DB=false NODE_ENV=production pnpm env:dev pnpm start
```

## Approximate Data Scale (for query work)

Use these as order-of-magnitude expectations when evaluating query behavior:

- `AhsListing`: ~100,000 rows
- `CultivarReference`: ~100,000 rows
- `User`: ~100 rows
- `Listing`: ~5,000 rows
- `Image`: hundreds of rows (varies)

## Static Public Pages + Search Params

For SEO-focused public routes, keep the server render static and treat query
params as client-only UI state.

- Public SEO pages should render as static/ISR (not request-time dynamic).
- Do not read `searchParams` in server `page.tsx`, `layout.tsx`, or
  `generateMetadata` for static public routes.
- Canonical URLs should be query-free (base path only).
- Parse and apply query params in client components only (for sort/filter/toggle
  UX via `useSearchParams` + `router.replace`).
- Query params should not change server data fetching, metadata, or structured
  data for static public pages.
- For routes that should only serve build-known slugs, use
  `dynamic = "force-static"` and `dynamicParams = false`.
- Verify behavior with the local prod workflow and check headers for static
  pages (`x-nextjs-cache: HIT` and `Cache-Control: s-maxage=...`).

## Repo Structure (High-Level)

- `src/app/` Next.js App Router (routes + route-level `_components`)
- `src/components/` shared components (`ui/` is shadcn-only)
- `src/server/` server-side logic (tRPC, db, stripe, clerk)
- `src/types/` shared types and zod schemas
- `prisma/` Prisma schema and migrations (do not generate migrations)
- `tests/` unit and e2e tests

## Cursor Rules (from `.cursorrules`)

- Use specification and guidelines as you build the app
- Write complete code for every step
- Use `<ai_context>` tags in code as context clues
- Use `@` alias for app imports
- Use kebab-case for files/folders
- Do not update shadcn components unless asked
- Env: update `.env.example` when env vars change
- Env: use `.env.development`; avoid exposing server-only vars
- Env: use `NEXT_PUBLIC_` for client-exposed vars
- Env: import via `import { env } from "@/env"`
- Types: put types in `src/types/` and export via `src/types/index.ts`
- Types: name type files `example-types.ts`
- Types: prefer interfaces over type aliases
- Types: use zod + `z.infer<typeof schema>`
- Types: db types from `@prisma/client`
- Frontend: use `lucide-react` for icons
- Frontend: use `div` unless specified otherwise
- Frontend: add blank lines between main DOM sections
- Frontend: every component/page/layout must include `"use server"` or
  `"use client"` at top
- Frontend: server components fetch data and pass to client props
- Frontend: use `@/trpc/server` for mutations
- Backend: do not generate migrations; ignore `prisma/migrations`
- Backend: use `user.id` (not Clerk auth id)
- Backend: include `createdAt`/`updatedAt` and cascade deletes when needed
- tRPC: routers in `src/server/api/routers` in CRUD order
- tRPC: return `undefined` when no data should be returned
- Auth: import auth via `@clerk/nextjs/server`

## Code Style Guidelines

### Imports and Module Boundaries

- Use path alias `@/` for app imports (see `tsconfig.json`)
- Prefer type-only imports (`import type { ... }`) per ESLint rules
- Keep `@prisma/client` imports for DB types and client access
- Do not import server components into client components

### Formatting

- Prettier is configured with Tailwind plugin (`prettier-plugin-tailwindcss`)
- Keep Tailwind class order stable (Prettier handles it)
- Use default Next.js/TypeScript formatting; no custom rules beyond lint

### Naming

- Kebab-case for files and folders
- Components: `example-component.tsx`
- Types files: `example-types.ts`
- zod schema files: `example-schemas.ts`

### Types and Validation

- Prefer interfaces, use type aliases only when necessary
- Create zod schemas for validation and derive types via `z.infer`
- Export all shared types from `src/types/index.ts`

### Error Handling

- Wrap tRPC mutations in `try/catch` and throw `TRPCError`
- Log errors with context before throwing
- Return `undefined` from procedures that do not return data

### Frontend Conventions

- Add `"use client"` or `"use server"` at top of every component/page/layout
- Use server components for data fetching; pass results to client props
- Use Suspense for async server components; skip if no async work
- Icons come from `lucide-react`
- `src/components/ui/` is shadcn-only; avoid editing unless requested
- Responsive design default: use only two breakpoint modes for new UI work
  in this repo: base (`< lg`, below 1024px) and `lg` (`>= 1024px`). Avoid
  `sm`/`md`/`xl` unless explicitly requested.

### Backend Conventions

- tRPC routers live in `src/server/api/routers` by domain
- Order procedures: Create, Read, Update, Delete
- Use `@/trpc/server` and `@/trpc/react` for procedure imports
- Do not generate Prisma migrations

### Environment Variables

- Keep env changes synced in `.env.example`
- Store local env in `.env.development`
- Use `NEXT_PUBLIC_` prefix only when needed on the client
- Access env via `import { env } from "@/env"`

## Testing Notes

- Unit tests are `tests/**/*.test.ts(x)` (Vitest, `jsdom`)
- E2E tests are `tests/**/*.e2e.ts(x)` (Playwright)
- Playwright tags: `@local` runs only locally; `@preview` runs only on preview
- Local Playwright runs a dev server and temp DB if `BASE_URL` is not set

## CI Reference

- PR checks run: lint, typecheck, unit tests, and e2e in CI
- E2E CI sets placeholder env vars and uses `pnpm test:e2e`

## Cursor Cloud specific instructions

### Environment

- `.env.development` is created by the VM snapshot with placeholder keys and
  `SKIP_ENV_VALIDATION=1`. The app starts without real Clerk/Stripe/AWS keys
  but auth-dependent flows will not work.
- Prisma client is generated to `prisma/generated/sqlite-client` by the
  `postinstall` hook (`prisma generate`).

### Running the dev server

Use the Temp DB Workflow documented above. The key env vars are:

```sh
LOCAL_DATABASE_URL="file:tests/.tmp/ui-listings.sqlite" \
USE_TURSO_DB=false SKIP_ENV_VALIDATION=1 \
NEXT_PUBLIC_SENTRY_ENABLED=false pnpm dev
```

### Gotchas

- **Turbopack cache corruption**: if the dev server or E2E tests fail with
  `Failed to restore task data (corrupted database or bug)`, delete
  `.next` (`rm -rf .next`) and retry.
- **Next.js dev lock**: if you see `Unable to acquire lock at .next/dev/lock`,
  remove the lock file (`rm -f .next/dev/lock`) before starting the server or
  E2E tests.
- **E2E tests manage their own server**: `pnpm test:e2e` starts a dev server
  on port 3100 and provisions a temp DB automatically. Do not start a separate
  dev server on port 3100 before running E2E tests. Kill any process on port
  3000/3100 before running E2E to avoid conflicts.
- **Lint and typecheck** require `SKIP_ENV_VALIDATION=1` when real env vars are
  not present.
- **Playwright browsers**: Chromium is installed to
  `~/.cache/ms-playwright/chromium-*`; the update script keeps it current.
