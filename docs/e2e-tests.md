# E2E Tests

End-to-end tests live in `tests/e2e/` and use Playwright.

## Run

- Full suite (local temp DB):
  - `pnpm test:e2e`
- Single test by name:
  - `pnpm test:e2e --grep "manual sign-in"`
- UI mode:
  - `pnpm exec playwright test --ui`
  - `pnpm exec playwright test --ui tests/e2e`

## Preview vs Local (Tagging)

Tag rules are enforced in `playwright.config.ts`:

- `@local` → runs only when `BASE_URL` is **not** set (local temp DB).
- `@preview` → runs only when `BASE_URL` **is** set (preview/attach mode).
- no tag → runs in both.

### Examples

- `test.describe("guest user tour @preview", ...)` → preview only.
- `test.describe("signed-in user tour @local", ...)` → local only.

## Notes

- Local mode provisions a temp SQLite DB and seeds data in tests.
- Preview mode attaches to an existing environment and must **not** seed data.

## Page object methodology

- Page objects contain selectors and user actions (navigation, clicks, form flows).
- Prefer feature surfaces (e.g., auth modal) over stuffing everything into a single page.
- Page objects include readiness helpers (e.g., `isReady()`), but no assertions.
- Tests own assertions (URL, title, copy, and domain-specific expectations).
- Keep page objects small and focused; prefer feature-level objects over one giant page.
