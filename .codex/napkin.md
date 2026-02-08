# Napkin

## Log

- 2026-02-07 - e2e cleanup - Full suite stabilized after removing most custom timeout/retry/poll code and validating with repeats.
- 2026-02-07 - e2e issue - Profile content sometimes disappeared after reload due autosave race; fixed by waiting for `userProfile.updateContent` response after blur.
- 2026-02-07 - e2e issue - Clerk modal has variant state: after email click `Continue`; after code entry do not submit again (auto-submit). If warning says code wasn't sent, click `Continue` once.
- 2026-02-07 - e2e issue - Select/popup items can be outside viewport; `scrollIntoViewIfNeeded()` before click fixed intermittent failures.
- 2026-02-07 - e2e issue - Listings row-action dropdown was flaky in CI/local when relying on generic role selectors or `force: true`; stable approach is explicit row-action test IDs + menu scoping to `[data-slot="dropdown-menu-content"][data-state="open"]`, with `Edit` selected via keyboard (`ArrowDown` + `Enter`) and `Delete` via direct menu-item click.

## Preferences

- Use the term `napkin` (not `codex napkin`).
- Keep E2E tests UI-only; if UI behavior fails, test should fail (don't hide with non-UI shortcuts).

## Patterns That Work

- Simplify first: remove stability scaffolding, then re-add only minimal waits tied to real UI/events when failures prove necessary.
- Use `--repeat-each` to prove changes: spec-level `--repeat-each 3` while iterating, then suite-level `tests/e2e/*.e2e.ts --repeat-each 2`.
- Prefer UI signals (visible/enabled/url/assertions) over polling and explicit timeouts.
- For Radix dropdown interactions in table rows, use open-menu assertions (`data-state=\"open\"`) and action-specific selectors instead of structural table locators (`table.last()`, `aria-controls`).

## Patterns That Fail

- Preemptive "stability" code (long custom timeouts, retry loops, blanket force-clicks) made tests harder to reason about.
- Reloading immediately after EditorJS typing without waiting for save completion caused flaky assertions.
- Pressing submit after entering Clerk verification code added instability; code field completion should auto-submit.
- Row-action flows tied to table re-renders can detach menu items mid-click; generic `getByRole(\"menuitem\")` across the page is brittle.

## Domain Notes

- Occasional server-side `ECONNRESET` or transient tRPC errors may appear during runs; prioritize actual test assertion failures over noisy logs.
