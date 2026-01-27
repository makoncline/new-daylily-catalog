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
