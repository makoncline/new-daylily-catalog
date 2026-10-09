# Sign in on a Vercel preview

Clerk development instances support native `*.vercel.app` preview URLs. The
custom preview alias is not required for this setup. See [Clerk preview
environments](https://clerk.com/docs/guides/development/managing-environments#preview-environments).

Keep the existing shared development Clerk instance and seeded Turso database.
Do not create another instance, seed database, or test user for this check.

## Verify a deployment

The preview workflow checks out the deployment's commit and uses its immutable
Vercel URL. The `@preview` member test signs in through the real email-code form
with the existing Rolling Oaks persona. It checks the native origin, dashboard,
session after refresh, seeded profile, and sign-out. It does not modify catalog
data. Clerk's testing token avoids bot detection; it does not replace form login.

The existing GitHub `preview` environment must provide the development
`CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. The deployed app must
use that same existing development instance. These are existing settings; this
change does not replace keys or change Clerk settings.

Run the existing **E2E on Vercel Preview** workflow for the full commit SHA and
immutable native deployment URL. For a local runner with those development env
values already loaded:

    BASE_URL=https://<deployment>.vercel.app pnpm main exec playwright test tests/e2e/preview-sign-in.e2e.ts

Do not use a moving branch alias or custom domain to prove native URL login.

## Access and failures

Keep preview protection enabled. The seeded personas use Clerk's documented
fixed test code, so public test accounts are not a protection boundary.

When the existing automation bypass secret is present, the fixture sends it once
to the preview origin with `x-vercel-set-bypass-cookie: true`. It does not follow
that request's redirect. Playwright stores the resulting cookie in the browser
context. Browser requests and popups then use cookies rather than global secret
headers, so Clerk and other origins do not receive the bypass header.

- An HTTP access failure occurs before the Clerk sign-in form loads. Inspect
  Vercel protection/firewall configuration separately from Clerk.
- A missing email form indicates Clerk did not load or a different sign-in
  method is configured. Capture the visible error without tokens or cookies.
- A failed code step is an authentication failure.
- A profile mismatch after sign-in is distinct from authentication. Inspect the
  existing seeded identity mapping; do not reseed automatically.

The alias-creation workflow remains until this test passes on a native preview.
Remove that workflow after the proof passes, without changing the production
host, Clerk instance, seed data, or domain configuration.
