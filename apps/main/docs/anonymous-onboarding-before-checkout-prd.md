# Anonymous Onboarding Before Checkout PRD

Date: 2026-06-19
Status: implementation handoff
Base requirement: start implementation work from `origin/main`, not local `main`.

## Summary

Build a new anonymous onboarding flow that happens before sign-in and Stripe checkout. The goal is to let a prospective seller invest effort in a guided setup flow before payment, without creating a free Clerk/app account and without saving their onboarding data to the server until a Stripe trial/subscription is active and the customer has verified/sign-in access through Clerk.

The v1 should stay deliberately simple:

- Anonymous users can complete onboarding with localStorage-backed draft state.
- Signed-in users cannot use onboarding; they see an explicit "already signed in" treatment with a dashboard CTA.
- The first onboarding step collects an email lead and records it in PostHog.
- The listing portion is only a demo/example listing. Do not create or import a real listing from anonymous onboarding in v1.
- After Stripe checkout succeeds and the customer verifies/signs in with Clerk, import only profile data from the local draft.
- If an existing user signs in after onboarding, ignore the onboarding draft and send them to the dashboard.

## Goals

- Move the onboarding experience before account creation and checkout for new prospective sellers.
- Avoid creating new free users before payment/trial.
- Collect email leads before onboarding starts.
- Keep older/non-technical users from getting trapped in onboarding when they already have an account.
- Make the new flow repeatable through focused integration tests and one end-to-end onboarding/checkout happy path.

## Non-Goals

- Do not make the entire product paid-only in this first project.
- Do not remove or change existing free-user dashboard behavior.
- Do not import/save a first listing from anonymous onboarding in v1.
- Do not build self-serve post-payment email correction in v1.
- Do not publicly check Clerk for existing accounts by email unless explicitly revisited; it creates user-enumeration tradeoffs.
- Do not build a custom email OTP system separate from Clerk.

## Current Codebase Context

Known from code research:

- `/start-membership` currently starts with Clerk sign-up and redirects to `/onboarding`.
  - `apps/main/src/app/start-membership/_components/seller-landing-actions.tsx`
- `/onboarding` is currently protected by `apps/main/src/proxy.ts`; signed-out users redirect to `/auth-error`.
- The current onboarding route renders `StartOnboardingPageClient` from:
  - `apps/main/src/app/start-onboarding/start-onboarding-page-client.tsx`
- Current onboarding assumes an authenticated app user and calls protected dashboard APIs.
- Current save flow writes profile/listing/image data to the server before Stripe:
  - `apps/main/src/app/start-onboarding/_hooks/use-onboarding-save-flow.ts`
- Current listing flow creates a server listing draft just by entering the listing step:
  - `apps/main/src/app/start-onboarding/_hooks/use-onboarding-listing-flow.ts`
- Current draft persistence is sessionStorage and is scoped to signed-in user identity:
  - `apps/main/src/app/start-onboarding/_hooks/use-onboarding-bootstrap-state.ts`
- Current Stripe checkout generation is authenticated only:
  - `apps/main/src/server/api/routers/stripe.ts`
  - `generateCheckout` is a protected procedure tied to the current app user.
- Current checkout success page is protected:
  - `apps/main/src/app/subscribe/success/page.tsx`
- `hasActiveSubscription()` treats both `active` and `trialing` as active.
- `dashboardDb.ahs.search/get` are protected. Pre-auth onboarding should not rely on them in v1.

## Product Decisions Already Made

### Anonymous-only onboarding

Signed-in users should not be able to complete onboarding. If a signed-in user visits `/onboarding`, show a clear page:

- They are already signed in.
- Primary CTA: go to dashboard.
- Optional secondary CTA: manage membership/upgrade, if this fits existing UI.

Do not silently redirect them in v1. The explicit message matters because some users are older and may be confused if they enter the wrong path.

### Existing free users

Do not change existing free-user dashboard access in this project. Existing free users already have limited dashboard behavior and upgrade messaging. If they visit onboarding, treat them the same as any signed-in user: show the "already signed in" page and send them to the dashboard.

### Existing account from onboarding

If a user completes anonymous onboarding and then signs into an existing account:

- Ignore the anonymous onboarding draft.
- Do not ask whether to import it in v1.
- Send them to the dashboard.
- If they paid through the onboarding checkout with the same email, the billing claim flow may attach the Stripe customer/subscription to the existing account, but the onboarding draft still should not be imported.

### Listing data

Do not save a real first listing from onboarding in v1.

Use a hardcoded set of cultivar/example listing options for the onboarding preview. This avoids pre-auth AHS search, server listing creation, image upload ownership, duplicate first-listing conflict handling, and overwrite/import prompts.

If the UI lets the user adjust a listing preview image, keep that data local-only for preview continuity. Do not upload it or import it.

### Profile data

Profile data is the only onboarding data to import after payment/trial and Clerk verification.

For new paid users, apply the profile draft automatically. If the authenticated app user already has meaningful profile data, ignore the draft rather than overwriting it. This should be rare for the intended new-user path and keeps v1 simple.

### Email collection and editing

Step 1 should collect the email address before onboarding starts.

Before redirecting to Stripe checkout, show a pre-checkout review step with the account email clearly visible and an edit action. Yes, the user should be able to edit the email here.

Recommended event model:

- Use one server-side PostHog event name: `onboarding_email_collected`.
- Include a `stage` property rather than inventing multiple lead concepts.
- Initial step: `stage: "initial"`.
- Pre-checkout edit: `stage: "pre_checkout_review"`, `changed: true`.
- Include `draftId`, `email`, `emailDomain`, and a source/context property.

The user intentionally wants email leads visible in PostHog, so raw email may be included as a person/event property. Keep the event server-side and validate the email before capture.

Add a prominent "Already have an account? Log in" button on the email step. If clicked, sign them into the existing account and ignore/clear anonymous onboarding data.

## Stripe and Clerk Research

Stripe does not appear to provide a built-in "verify this email inbox before hosted Checkout" flow.

Relevant Stripe behavior:

- `customer_email` or a Customer with a valid email can prefill Checkout.
- If a Checkout Session is created with a Customer that already has a valid email, Stripe displays it and does not let the customer edit it in Checkout.
- Stripe validates email format/acceptability for checkout collection, but this is not ownership verification.
- Link may send an OTP for Link authentication, but that authenticates a Link/payment autofill session, not the Daylily Catalog account email.
- Stripe Customer Portal uses email OTP for existing customer portal login, not for verifying a new Checkout email before purchase.

Relevant Clerk behavior:

- Clerk remains the source of truth for app login identity and email verification.
- The site uses Clerk email code/OTP login.
- After checkout success, the user should verify/sign in through Clerk using the paid email.
- Do not treat Stripe payment as Clerk email verification.

Research links:

- Stripe Checkout Session create docs: https://docs.stripe.com/api/checkout/sessions/create
- Stripe hosted/custom Checkout email collection docs: https://docs.stripe.com/checkout/form/quickstart
- Stripe Link docs: https://docs.stripe.com/payments/link
- Stripe Customer Portal docs: https://docs.stripe.com/customer-management/activate-no-code-customer-portal
- Clerk sign-up/sign-in options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Clerk email address create/update docs: https://clerk.com/docs/reference/backend/email-addresses/create-email-address

## Proposed V1 Flow

### 1. Entry

Anonymous user visits `/onboarding` or clicks the seller/start-membership CTA.

If signed out:

- Show anonymous onboarding.

If signed in:

- Show "already signed in" page.
- Do not load local onboarding draft.
- Do not show onboarding steps.
- CTA to `/dashboard`.

### 2. Email lead step

Collect email with a normal email input and browser/server validation.

On submit:

- Save email to localStorage draft.
- Capture server-side PostHog event `onboarding_email_collected` with `stage: "initial"`.
- Continue to onboarding steps.

Include:

- "Already have an account? Log in" button.
- Short reassurance/copy can be refined later; do not over-focus copy in the first implementation.

### 3. Anonymous onboarding steps

Use localStorage for all draft state.

Draft should include:

- `version`
- `draftId`
- `email`
- `createdAt`
- `updatedAt`
- profile fields
- profile image data, if selected and small enough
- listing preview selections only

Do not call protected dashboard APIs from the anonymous flow.

Use hardcoded cultivar/listing examples. Do not use `dashboardDb.ahs.search/get` pre-auth.

### 4. Pre-checkout review

Show the chosen account email clearly before checkout:

- "Your account email: user@example.com"
- Primary CTA: continue to checkout.
- Secondary action: edit email.

If they edit the email:

- Validate the new email.
- Update localStorage draft.
- Capture another `onboarding_email_collected` event with `stage: "pre_checkout_review"` and `changed: true`.
- Use the edited email for Stripe checkout and later Clerk verification.

### 5. Create Stripe checkout

Create a new public onboarding checkout endpoint or route. It should not require Clerk auth.

Inputs:

- email
- draftId
- optional return/cancel context

Server behavior:

- Validate email.
- Create or use a Stripe Customer for this anonymous checkout path.
- Set Customer email from the current draft email.
- Create Checkout Session in subscription/trial mode.
- Include metadata/client reference fields such as:
  - `flow: "anonymous_onboarding"`
  - `draftId`
  - `email`
- Use an expected price id from existing config.
- Success URL should point to a public onboarding checkout success route with `session_id`.
- Cancel URL should return to onboarding and keep the local draft.

Important:

- If passing a Customer with email, Checkout should show a non-editable email.
- Do not create a Clerk user here.
- Do not create an app `User` here.
- Do not save onboarding profile/listing data here.

### 6. Checkout success and Clerk verification

Current `/subscribe/success` is protected and tied to authenticated checkout. Add a public onboarding success path instead of overloading the existing protected page too heavily.

On success page:

- Retrieve/verify Checkout Session by `session_id` server-side.
- Confirm the session belongs to `flow: "anonymous_onboarding"`.
- Confirm the subscription/payment state is usable. Treat `trialing` and `active` as access-eligible.
- Show the paid email from Stripe/metadata.
- Prompt the user to verify/sign in with Clerk:
  - "Send login code to user@example.com"
  - "This email is wrong" support path

Do not mark email verified yourself. Clerk OTP is the verification step.

After Clerk auth succeeds:

- Call an authenticated claim/import endpoint.
- The endpoint retrieves the Stripe Checkout Session/subscription/customer.
- It verifies:
  - subscription is `trialing` or `active`
  - Stripe customer id is present
  - authenticated Clerk primary email matches the Stripe customer/session email, unless a manual support correction has been applied
  - Stripe customer is not already attached to a different app user
- Link the Stripe customer/subscription to the app user using existing billing model patterns.
- Import profile draft from localStorage if this is a new/blank profile.
- Do not import listing draft.
- Clear anonymous onboarding draft after successful claim/import.
- Redirect to dashboard.

### 7. Wrong email recovery

V1 recovery can be manual.

If a customer pays with the wrong email and cannot receive the Clerk OTP:

- They use the "This email is wrong" support path on the success page.
- Support finds the Stripe Customer/subscription by Checkout Session ID, support code, customer name, charge date, or email typo.
- Support updates:
  - Stripe Customer email
  - any app-side pending checkout/claim record, if implementation adds one
  - any Clerk user email if a bad Clerk user was already created

Preferred operational path:

- Avoid creating a Clerk user until the success page starts Clerk verification.
- If no Clerk user exists yet, correction is mostly Stripe/customer metadata plus retrying the claim flow.
- If a bad Clerk user exists, add the correct email to that Clerk user, make it primary only after verification/support confirmation, and remove/ignore the bad email.
- If the corrected email already belongs to an existing app user, attach/link billing to that existing user and ignore the onboarding draft.

Do not build customer self-serve email reassignment in v1.

## Storage Requirements

### localStorage draft

Use a versioned key, for example:

`daylily:onboarding-draft:v1`

Suggested shape:

```ts
type AnonymousOnboardingDraft = {
  version: 1;
  draftId: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    displayName?: string;
    nurseryName?: string;
    location?: string;
    bio?: string;
    website?: string;
  };
  profileImage?: {
    dataUrl: string;
    mimeType: string;
    updatedAt: string;
  };
  listingPreview?: {
    cultivarKey?: string;
    title?: string;
    price?: string;
    imageDataUrl?: string;
  };
};
```

Profile image notes:

- Current cropper behavior can produce images too large for localStorage.
- For anonymous localStorage, cap images much smaller than the current server-upload path.
- Use a compressed square image suitable for preview/import, for example 512-800px JPEG/WebP.
- Catch quota/storage errors.
- If image persistence fails, keep text draft and ask user to reselect image after account creation.

Do not store secrets, Stripe session URLs, or payment identifiers in localStorage beyond what is already safe in URLs.

## Server/API Requirements

### Lead collection endpoint

Public endpoint or server action.

Responsibilities:

- Validate email with zod or existing validation pattern.
- Rate-limit or basic abuse guard if the repo has an established pattern.
- Capture PostHog event server-side.
- Return success/failure only.

Event:

```ts
{
  event: "onboarding_email_collected",
  distinctId: draftId,
  properties: {
    draftId,
    email,
    emailDomain,
    stage: "initial" | "pre_checkout_review",
    changed: boolean,
    source: "anonymous_onboarding"
  }
}
```

### Checkout creation endpoint

Public endpoint for anonymous onboarding checkout.

Responsibilities:

- Validate input.
- Create Stripe Customer/Checkout Session.
- Put `draftId`, email, and flow marker in metadata.
- Use the current subscription/trial product setup.
- Return redirect URL.

### Claim endpoint

Authenticated endpoint called after Clerk session exists.

Responsibilities:

- Retrieve Stripe Checkout Session by `session_id`.
- Verify flow marker, subscription state, price/product if applicable, and email match.
- Link Stripe customer/subscription to authenticated app user.
- Import profile draft idempotently.
- Ignore listing draft.
- Handle repeated calls safely.
- Reject if the Stripe customer is already linked to a different app user.

## Webhook Requirements

Existing Stripe webhooks must tolerate anonymous onboarding sessions.

For anonymous onboarding checkout events:

- Do not require an app user to already exist.
- Do not create a Clerk user.
- Do not import onboarding data.
- Store/sync subscription state only if the existing schema supports anonymous pending billing safely; otherwise defer linking until the authenticated claim endpoint retrieves Stripe state directly.

The claim endpoint should be correct even if the webhook is delayed.

## Edge Cases

- Signed-in pro user visits `/onboarding`: show already-signed-in page, dashboard CTA.
- Signed-in existing free user visits `/onboarding`: same already-signed-in page.
- User clicks "Already have an account? Log in" on email step: sign in, ignore draft, dashboard.
- User completes onboarding then signs into existing account without checkout: ignore draft.
- User pays with existing account email: after Clerk sign-in, attach billing if appropriate, ignore draft, dashboard.
- User pays with typo email: manual support correction; no app access until corrected email can verify with Clerk.
- User cancels Stripe checkout: return to onboarding with draft preserved.
- Stripe payment incomplete/past_due: save/import nothing; show retry/support state.
- Trial/subscription active but localStorage draft missing: claim billing, skip profile import, dashboard still works.
- Browser closes after checkout: success URL with session id should still allow claim; missing draft only affects profile import.
- Multiple tabs: latest local draft wins; authenticated claim/import must be idempotent.
- localStorage unavailable/quota exceeded: allow flow to continue with reduced persistence, warn/reselect image later.
- Stripe webhook delayed: success/claim path retrieves Stripe directly.
- Stripe customer already linked to another app user: reject and show support.
- Clerk primary email does not match Stripe paid email: reject and show wrong-email/support path.
- Existing profile data present during import: do not overwrite; ignore draft.

## Testing Requirements

Follow repo guidance: write tests, not too many, mostly integration. Do not test type-system guarantees.

### Focused integration tests

Add targeted coverage for:

- Email lead endpoint:
  - validates email
  - captures PostHog event with `stage`
  - supports initial and pre-checkout edit events
- Anonymous checkout creation:
  - does not require Clerk auth
  - creates Stripe Customer/Session with expected email and metadata
  - returns safe redirect URL
- Claim endpoint:
  - rejects unpaid/incomplete sessions
  - accepts `trialing`/`active`
  - rejects email mismatch
  - links customer/subscription idempotently
  - imports profile only
  - does not create a listing
- Signed-in onboarding route/controller behavior:
  - signed-in user gets already-signed-in treatment
  - anonymous onboarding controller does not call protected dashboard APIs
- localStorage draft helper:
  - saves/loads versioned draft
  - handles bad JSON/version mismatch
  - handles storage failure gracefully

### E2E test

Create or rewrite a repeatable Playwright test for the new happy path.

Suggested path:

1. Signed-out user opens `/onboarding`.
2. Enters email.
3. Lead event is observed via test stub/mock.
4. Completes profile fields and example listing preview.
5. Refreshes and draft persists.
6. Reviews email before checkout.
7. Edits email and sees updated value.
8. Starts checkout with mocked Stripe session or test-mode stub.
9. Simulates successful trialing checkout.
10. Completes Clerk test OTP/sign-in.
11. Claim/import runs.
12. Dashboard loads.
13. Profile data exists.
14. No listing was created from onboarding.

Add a small separate E2E or integration check:

- Signed-in user visits `/onboarding` and sees the already-signed-in page.

Existing E2E to revisit:

- `apps/main/tests/e2e/onboarding-full-flow.e2e.ts` currently assumes Clerk signup before protected onboarding and will need replacement or substantial rewrite.

## Implementation Phases

1. Branch/base
   - Fetch `origin main`.
   - Create implementation branch from `origin/main`, not local `main`.

2. Route/auth split
   - Allow anonymous access to the new onboarding route.
   - Add signed-in already-signed-in treatment.
   - Keep existing authenticated dashboard behavior intact.

3. Draft and lead capture
   - Add versioned localStorage draft helper.
   - Add public lead capture endpoint/server action.
   - Add email step and pre-checkout edit/review behavior.

4. Anonymous onboarding UI/controller
   - Reuse UI components where practical.
   - Split out logic that assumes authenticated dashboard APIs.
   - Replace protected cultivar/listing calls with hardcoded examples.
   - Ensure no server mutations happen before checkout claim.

5. Public Stripe checkout
   - Add anonymous checkout route.
   - Create Customer/Checkout Session with email and metadata.
   - Use success/cancel URLs for onboarding flow.

6. Success, Clerk verification, claim/import
   - Add public success page.
   - Guide into Clerk OTP/sign-in.
   - Add authenticated claim endpoint.
   - Link billing and import profile idempotently after trial/subscription is active.

7. Tests and verification
   - Add focused integration tests.
   - Add or update one repeatable E2E happy path.
   - Run targeted tests first, then broader relevant checks if the diff touches shared auth/billing behavior.

## Acceptance Criteria

- Signed-out users can complete onboarding before login.
- Email is collected before onboarding and captured to PostHog.
- Users can edit email on the pre-checkout review step; edited email is captured with `stage: "pre_checkout_review"`.
- Stripe Checkout uses the reviewed email.
- No Clerk/app user is created before checkout.
- No profile/listing data is saved to the server before checkout success and Clerk verification.
- Clerk remains the email verification step after checkout.
- Successful trialing/active checkout plus Clerk verification links billing to the user and imports profile data only.
- No listing is created from anonymous onboarding.
- Existing signed-in users cannot enter onboarding and get a clear dashboard CTA.
- Existing free-user dashboard behavior is unchanged.
- Wrong-email paid users have a clear support path.
- The new onboarding/checkout happy path is covered by repeatable E2E.
