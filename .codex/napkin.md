# Napkin

## User Preferences
- Keep responses direct and pragmatic.
- In quick-fix mode, prioritize fast UI iteration first, then full validation.
- Do not commit unless explicitly asked.
- Prefer two responsive modes for new UI in this repo: base (`< lg`) and `lg` (`>= lg`).

## PR 112 High-Signal Notes
- Onboarding now runs at `/onboarding` with URL-driven step state (`?step=...`).
- Start membership is integrated as the final onboarding step.
- Kept onboarding behavior isolated in onboarding-local components where possible.
- Removed shared-runtime mock upload behavior from production paths:
  - `src/server/api/routers/dashboard-db/image.ts`
  - `src/lib/utils.ts`
- E2E stability fix avoids generated starter-overlay uploads by default in onboarding flow tests:
  - disable `#starter-overlay`
  - select a starter image via `data-testid="onboarding-starter-image-picker"`
- Additional derisk: onboarding only creates `Image` DB rows when an actual blob upload succeeds; static starter/cultivar URLs are used for preview/profile/listing without persisting fake-key image records.

## Current Validation Baseline
- `pnpm exec tsc --noEmit` passes.
- `pnpm lint` passes with one existing warning in `src/hooks/use-data-table.ts`.
- `pnpm test:e2e` passes locally.

## Repo/Tooling Gotchas
- Quote App Router paths in shell commands (`src/app/(...)/[...]`) to avoid zsh glob errors.
- If Playwright reports port conflicts, check and clear port `3100` listeners first.
- Ignore noisy `NO_COLOR` warnings during Playwright webServer boot; they are non-blocking.

## Session Notes 2026-02-28
- User wants to build a ChatGPT app for the Daylily Catalog and explicitly requested reading Apps SDK docs first.
- For this session: prioritize official OpenAI Apps SDK guidance and convert it into actionable integration steps for this codebase.
- Web docs crawl note: using `open` with `lineno` on a nav page may not navigate to linked docs; use `click` by link id to fetch target pages.
- Tooling gotcha: `web.click` may fail on some docs pages even when link ids are visible in rendered text; fallback to direct URL opens or targeted search queries.
