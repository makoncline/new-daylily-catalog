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

## Stability playbook (for future agents)

### Process that works

- Simplify first, then prove:
  - Remove custom timeouts, retries, and polling unless a real failure appears.
  - Run the affected spec with repeats:
    - `pnpm test:e2e tests/e2e/<file>.e2e.ts --repeat-each 3`
  - If it fails, add one minimal wait tied to a real UI/event signal and re-run.
- Validate broadly after local fixes:
  - `pnpm test:e2e tests/e2e/*.e2e.ts --repeat-each 2`

### Keep tests UI-first

- Prefer waiting on visible/enabled/clickable UI states over arbitrary sleeps.
- Do not add `waitForTimeout`.
- If a click target can be off-screen (popover/select/table rows), call `scrollIntoViewIfNeeded()` before clicking.

### Known gotchas in this repo

- Clerk sign-in/sign-up:
  - After entering email, click `Continue`.
  - After entering verification code, do **not** press Enter/click submit again; Clerk auto-submits on full code entry.
  - If Clerk shows "You need to send a verification code before attempting to verify.", click `Continue` once.
- Profile content autosave:
  - Typing in EditorJS and immediately reloading can race save.
  - A minimal `waitForResponse` for `userProfile.updateContent` after blur is acceptable and stable.

### Mistakes to avoid

- Adding broad "stability code" preemptively (long custom timeouts, retry loops, force-click everywhere).
- Mixing UI and non-UI waiting when a direct UI assertion would work.
- Keeping flaky selectors when a role/label/test-id selector exists.

### Quick debugging commands

- Open latest HTML report:
  - `pnpm exec playwright show-report`
- Reproduce one spec repeatedly:
  - `pnpm test:e2e tests/e2e/<file>.e2e.ts --repeat-each 5`
- Run one test title repeatedly:
  - `pnpm test:e2e tests/e2e/<file>.e2e.ts --grep "<test title>" --repeat-each 5`
