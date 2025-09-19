# Repository Guidelines

## Project Structure & Module Organization
The Next.js application lives in `src/app`, with server helpers under `src/server` and cross-cutting utilities in `src/lib`, `src/config`, and `src/trpc`. Reusable UI sits in both `src/components` and the root-level `components` directory; static assets belong in `public/`. Database schema and migrations are managed through `prisma/`, and environment bootstrap scripts live in `scripts/`. Unit and integration tests are in `tests/`, while Playwright setup files reside in `e2e/` and authenticated browser state is cached under `playwright/.auth/`.

## Build, Test, and Development Commands
- `pnpm dev` — start the local dev server with Turbopack.
- `pnpm build` / `pnpm start` — generate and serve an optimized production build.
- `pnpm lint` — run ESLint against the TypeScript surface.
- `pnpm test` or `pnpm test:watch` — execute Vitest suites; keep failing specs out of main.
- `pnpm test:e2e` — launch Playwright against the default base URL; use `pnpm test:e2e:local` when targeting `localhost:3000`.
- `pnpm db:push` & `pnpm migrate` — sync Prisma schema and run scripted migrations; regenerate clients with `pnpm db:generate` after schema edits.

## Coding Style & Naming Conventions
Prettier (with the Tailwind plugin) standardizes formatting; run `pnpm prettier --write` if needed. Keep TypeScript code typed and rely on ESLint’s TypeScript rules (array-type, consistent imports) to stay aligned. Use PascalCase for React components, camelCase for functions and hooks, and SCREAMING_SNAKE_CASE for environment variables. Tailwind classes should follow logical grouping (layout → spacing → color) to benefit from automatic sorting. Import from `@/...` aliases rather than relative climbs when files live under `src`.

## Testing Guidelines
Follow the existing `*.test.ts[x]` naming for Vitest specs, colocated in `tests/`. Prefer mocking expensive services via utilities in `tests/temp-db.test.ts` before reaching out to external systems. End-to-end flows belong in `tests/e2e/*.e2e.ts` and rely on global setup defined in `e2e/global-setup.ts`; refresh the logged-in fixture with `pnpm test:e2e --update-snapshots` when auth changes.

## Commit & Pull Request Guidelines
Commits (see `git log`) stay concise, lower-case imperative, and focused on a single concern—follow that pattern and reference tickets with `[#123]` when applicable. Before opening a PR, ensure `pnpm lint`, `pnpm test`, and `pnpm test:e2e` succeed locally, then summarize scope, link to related issues, and attach UI screenshots or recordings for front-end updates. Highlight any schema or configuration changes, calling out required `.env` keys so reviewers can validate easily.
