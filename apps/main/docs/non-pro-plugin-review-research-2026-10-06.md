# Non-Pro plugin review access

Date: 2026-10-06. Status: PR 434 deployed; production reviewer cases passed.

## Recommendation

Keep the review account non-Pro. Use the existing dashboard limits. They
already fit the five positive and three negative submission cases. A full
Pro grant or larger quotas are not required for those cases.

The MCP and member HTTP API now admit confirmed non-Pro writes in this
checkout. Both use the shared dashboard handlers and their existing caps.
PR 434 deployed this change. The production reviewer cases passed. See
[the current walkthrough](plugin-walkthrough-2026-10-05.md).

The owner accepts a working direct profile link. The review catalog must stay
out of public browsing and search. The existing non-Pro membership filter
provides that discovery boundary. Keep the review listings hidden as specified
in the submission cases.

MCP and member API access use the same tier rules as the dashboard. Both admit
authenticated non-Pro writes with the required scopes, then apply the existing
limits in the shared handlers. The reviewer can keep the normal non-Pro
dashboard UI. This also gives limited remote access to other non-Pro accounts,
including unpaid and canceled accounts.

No REVIEWER role, public-exclusion list, full Pro grant, or schema change is
required for the accepted privacy requirement.

## Current rules

| Capability                       | Current non-Pro dashboard behavior                                   | Review requirement                                        |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| Create listings                  | Up to 25 listings, including hidden listings                         | One new hidden listing; quota is enough                   |
| Create lists                     | Up to one list                                                       | One new list; start below the cap                         |
| Edit listings and lists          | Owned records can be edited without a Pro check                      | Supported by existing handlers                            |
| Add or remove list members       | Ownership checks apply; no Pro check in the dashboard handler        | Addition is an MCP write; removal uses dashboard approval |
| Link a listing to a cultivar     | Owned record can be linked without a Pro check                       | Fits the existing limited account                         |
| Edit basic profile fields        | Available without Pro                                                | Existing submission case uses description                 |
| Profile story                    | Available in the dashboard; MCP uses a dashboard handoff             | No MCP story write is required                            |
| Upload listing or profile photos | Available without Pro; four photos per target                        | Two existing profile photos are enough to prove reorder   |
| Remove or reorder photos         | Ownership checks apply; no Pro check in the dashboard handler        | Reorder is an MCP write; removal uses dashboard approval  |
| Customize profile URL            | Pro-only in the UI and member API URL operation                      | Not required by the submission cases                      |
| Dashboard catalog import         | Pro-only in the dashboard UI                                         | Not part of the MCP submission cases                      |
| Private MCP reads                | OAuth read scope; Pro is not required                                | Already allowed                                           |
| MCP writes                       | Required OAuth scope and confirmed account tier; existing caps apply | Implemented locally                                       |
| Member HTTP API writes           | Required OAuth scope and confirmed account tier; existing caps apply | Implemented locally                                       |

The four-photo limit applies to paid accounts too. It is not a free-account
restriction. Do not change the global photo limits to prepare this review.

Sources:

- [Limits](../src/config/constants.ts): `FREE_TIER_MAX_LISTINGS = 25`,
  `FREE_TIER_MAX_LISTS = 1`, and four images per listing or profile.
- [Listing creation and import](../src/server/api/routers/dashboard-db/listing.ts):
  bounded server checks enforce the non-Pro listing cap.
- [List creation](../src/server/api/routers/dashboard-db/list.ts): a bounded
  server check enforces the non-Pro list cap.
- [Image handlers](../src/server/api/routers/dashboard-db/image.ts): ownership,
  file, moderation, and image-slot checks apply without a subscription gate.
- [Profile handlers](../src/server/api/routers/dashboard-db/user-profile.ts)
  and [profile URL UI](../src/components/forms/profile-url-field.tsx).
- [MCP admission](../src/server/mcp/read-only-mcp.ts),
  [MCP caller context](../src/server/mcp/member-write-mcp.ts), and
  [member API admission](../src/server/api/member-http.ts).
- [Submission cases](../../../plugins/daylily-catalog/review-cases.json).

## Signup facts

The normal signup path does not show a free signup form:

- `/sign-up` redirects to `/catalog-importer`.
- The sign-in component sets `withSignUp={false}`.
- The dashboard route requires sign-in, not Pro membership.

Chrome on production confirmed the `/sign-up` redirect. The research incognito
window shared an existing signed-in test session. It therefore did not prove
anonymous Clerk account-creation admission. The research tab was closed.

This check did not inspect Clerk's global signup setting or every hosted OAuth
signup path. Do not use the removed signup form as proof that no new unpaid
account can ever exist.

## Options, from simplest to most work

1. **Make remote access match the dashboard for every account.** Allow all
   authenticated non-Pro accounts to use the same limited operations through
   MCP and the member API. Keep the 25-listing and one-list quotas. This uses
   the same handlers and needs no account-specific role. It also gives remote
   writes to legacy unpaid, canceled, and other non-Pro accounts. A working
   direct profile URL is acceptable to the owner.
2. **Limit the exception to reviewers.** Mark the dedicated account REVIEWER
   and admit only that non-Pro role to remote writes. Apply the normal caps.
   Use this only if the owner wants other unpaid accounts to remain blocked
   from remote writes. It adds an account-specific rule that option 1 avoids.
3. **Give the reviewer full complimentary Pro access.** This adds entitlement
   work that the review cases do not need. It also requires a separate public
   exclusion. It is more work than keeping the account within the current caps.

## Implementation rules

- Keep OAuth scopes, allowed-client checks, ownership, request budgets,
  idempotency, version checks, and dashboard approval for destructive actions.
- Set `_confirmedActiveMembership` to the actual confirmed tier: true for
  active or trialing membership, false for non-Pro, and undefined when not
  resolved. A confirmed non-Pro caller must not receive true, because it
  skips the listing and list caps. Shared handlers reuse both confirmed states.
- Continue to reject unconfirmed subscription lookups at the remote boundary.
  Current dashboard handlers intentionally skip creation caps when Stripe
  status is unconfirmed. The existing tests confirm that behavior. Do not
  accidentally extend it to the reviewer remote path.
- Update tool descriptions and member help to describe the selected policy.
- Confirm that the reviewer stays absent from the public directory, global
  inventory search, and sitemap entries. Its direct profile link can work.
  Hidden review listings must still reject direct public reads.
- Reuse the verified member user and subscription decision. Keep public checks
  on local data.
- The member API keeps `profile.updateWithUrl` Pro-only. Non-Pro callers use
  `profile.update` for basic fields. The remote MCP only exposes basic fields.
  The older dashboard mutation still relies on its existing browser URL gate;
  this change does not alter that UI path. The reviewer does not need a custom URL.

## Review fixtures and repeat runs

Prepare a small, synthetic account with a few hidden listings, two profile
images, and no list before the first create-list case. Keep private credentials
out of the package and video. Reuse the named sample records on repeat runs.
Create only missing records, so the one-list cap does not block later runs.

Photo uploads use the normal cropper, resize, moderation, and storage path.
The MCP returns the dashboard photo-manager link. This research made no upload,
moderation API request, paid AI request, subscription, or production write.

## Read efficiency

Non-Pro listing creation checks at most 25 owned IDs. List creation checks at
most one owned ID. Image attachment checks at most four existing image IDs
for its target. These checks do not require an exact total or global aggregate.

An account without `stripeCustomerId` returns a confirmed non-Pro status
without a Stripe request or subscription-cache read. No new account lookup is
needed to apply the remote access policy. Accounts with a customer ID use
one subscription-cache lookup per remote write. Create handlers reuse that
decision; they do not repeat the lookup.

## Research baseline

Executed from the repository root:

```sh
pnpm --filter @daylily-catalog/main exec vitest run \
  tests/dashboard-db-list-entitlements.integration.test.ts \
  tests/dashboard-db-listing-entitlements.integration.test.ts \
  tests/get-pro-user-id-set.test.ts \
  tests/get-public-listings.test.ts \
  --maxWorkers=1
```

Result: four files passed; 20 tests passed; 8.77 seconds.

The entitlement integration tests used disposable local SQLite databases.
The public read-model tests used mocked database data. This proves the current
cap and directory-filter behavior covered by those tests. It does not prove the
proposed non-Pro remote access or complete production submission flow.

## Local implementation verification

The new `member-non-pro-access.integration.test.ts` uses disposable SQLite
and mocks only external service boundaries. Its four tests cover both MCP
and the member HTTP API:

- Non-Pro listing and list creation, safe retries, edits, list addition,
  profile edits, and profile photo order.
- Rejected foreign writes, missing write scope, and wrong clients.
- Rejected non-Pro custom URL writes from a trusted member API client.
- Deletion links without deletion, and rejection of direct MCP-managed deletion.
- Creation at the existing caps; paid active and trialing creation above them.
- One subscription-cache lookup per write; no Stripe call for cached status
  or an account without a customer ID.
- Rejection of unconfirmed billing before mutation.

All four tests first failed at the old Pro-only gate, then passed after the
change. Lint and typecheck passed. Lint reported 1,173 existing warnings and
no errors. The focused verification passed 77 tests in 11 files. It includes
dashboard tier limits, MCP reads and metadata, member versions and read bounds,
request budgets, public listing filters, and the Atlas registry.

The optional realistic SQLite proofs also passed: four tests in two files.
They use disposable copies of the local seeded database. The paid creation
checks confirm one user read, one subscription-cache read, and no `COUNT`
query. The new non-Pro tests confirm one subscription-cache lookup per write.

Commands:

```sh
pnpm verify --tests \
  tests/member-non-pro-access.integration.test.ts \
  tests/dashboard-db-list-entitlements.integration.test.ts \
  tests/dashboard-db-listing-entitlements.integration.test.ts \
  tests/mcp-read-only.test.ts tests/oauth-metadata.test.ts \
  tests/member-versioning.integration.test.ts \
  tests/member-request-budget.test.ts \
  tests/member-read-bounds.integration.test.ts \
  tests/get-pro-user-id-set.test.ts tests/get-public-listings.test.ts \
  tests/atlas-flows.test.ts --maxWorkers=1 --silent

INTEGRATION_MODE=1 RUN_MCP_MEMBER_WRITE_PROOF=1 RUN_MEMBER_HTTP_PROOF=1 \
  STRIPE_SECRET_KEY=sk_test_local_proof \
  pnpm --filter @daylily-catalog/main exec vitest run \
  tests/mcp-member-write-sqlite.test.ts tests/member-http-sqlite.test.ts \
  --maxWorkers=1 --silent
```

The access change made no schema change. Production review used the current
ChatGPT OAuth client and passed the catalog and profile cases. A legacy
timestamp data correction was required for existing profile edits; see
[the correction report](member-version-storage-correction-2026-10-06.md).
