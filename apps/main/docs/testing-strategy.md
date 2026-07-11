# Testing strategy

The test suite should maximize confidence per minute rather than maximize the number of isolated tests. Prefer tests that exercise the same public interfaces and state transitions users rely on.

## Test levels

### Unit tests

Use unit tests for pure logic with meaningful branching: parsers, validation, calculations, codecs, and data mapping. Do not test behavior guaranteed by TypeScript.

### Integration tests

Most tests should be integration tests. Exercise real components, state management, routers, services, and temporary SQLite databases together whenever practical. Assert observable behavior rather than internal calls.

Mock only at true system boundaries:

- Use MSW to represent an external HTTP service while keeping the native `fetch` implementation and real application request construction.
- Prefer a real temporary database and real tRPC callers over mocking repositories or application routers.
- Mock third-party SDK clients such as Clerk, Stripe, S3, SES, and analytics only when contacting the real service would be unsafe, nondeterministic, or impossible in the test environment.
- Mock browser primitives only when jsdom does not implement the required behavior.

Do not use MSW to replace this app's own API or tRPC routes by default. A test that intercepts the application under test loses much of the integration confidence we want.

Keep MSW handlers local to the test until multiple tests genuinely share the same external contract. Start each server with `onUnhandledRequest: "error"` so unexpected network access fails instead of silently reaching the internet.

### End-to-end tests

E2E tests protect the small set of complete happy paths whose failure would directly hurt users or revenue. They use a real browser, Next server, temporary database, and stage test identities. Keep setup through fixtures or direct database helpers, but perform the behavior being verified through the UI.

Important happy paths include:

- anonymous grower onboarding through account creation and dashboard arrival;
- returning grower sign-in and dashboard load;
- listing creation and editing;
- listing image preview, reorder, persistence, and deletion;
- list creation and membership management;
- catalog search, filtering, sorting, pagination, and touch interaction;
- profile editing and public catalog visibility;
- buyer inquiry and seller contact behavior.

## Browser exploration

Before adding or changing a happy-path E2E test, an agent should exercise the flow with browser use against realistic local data. Chrome, Computer Use, and CDP can reveal understandable labels, real transition timing, console errors, failed requests, and missing UI states. Convert stable observations into semantic locators, state-based waits, page-object actions, and assertions.

Browser exploration discovers behavior; integration tests encode most behavior cheaply; E2E tests prove the crucial complete journeys.
