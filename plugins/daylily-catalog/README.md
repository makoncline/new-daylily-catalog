# Daylily Catalog plugin submission

Use the [original Daylily Catalog draft](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ac30d5ff6508191b3d2647ec281fa3e).
Keep its identity and MCP server key. Do not create another submission.
The draft has working production OAuth and 26 discovered tools.
See [review evidence](../../apps/main/docs/plugin-walkthrough-2026-10-05.md).

## Build and test

Run from the repository root:

```sh
pnpm plugin:build --review-video-url '<reviewer-accessible HTTPS video URL>'
pnpm verify --tests tests/daylily-plugin-package.test.ts
```

The video URL is required. Obtain the final URL from the private review report.
Keep it out of this public repository. The builder adds it as
`extensions.com.openai.review.demo_recording_url` in the ZIP.

The ignored `local/plugins/daylily-catalog-1.2.1.zip` contains:

- `plugin.json`: Portable identity, listing metadata, video URL, and the five
  positive and three negative cases from `review-cases.json`.
- `mcp.json`: The production Streamable HTTP endpoint.
- `assets/icon.svg`: The referenced icon.

Each upload must contain all three files. Keep the package name and MCP server
key as `daylily-catalog`. Update the existing draft. Keep credentials, tokens,
client secrets, and member data outside the ZIP and Git. Enter reviewer
credentials only in the portal's private Review details.

## OAuth setup

- Endpoint: `https://daylilycatalog.com/api/mcp/server`.
- Issuer: `https://clerk.daylilycatalog.com`.
- Registered CIMD client: `https://chatgpt.com/oauth/client.json`.
- Admission: pre-registered clients only. DCR is off. PKCE is on.
- Permitted scopes: `catalog:read`, `catalog:write`, `offline_access`, `openid`,
  `email`, and `profile`. Defaults are read and offline access.

CIMD discovery resolved the missing OAuth client-ID setup. The portable MCP
schema has no OAuth client-ID field. Do not add unsupported OAuth fields to
the ZIP. Use the portal's Connect drawer to set up the hosted connection.
A Rescan does not refresh an old OAuth client binding or grant scope.

The approved reviewer grant contains `openid`, `email`, `offline_access`,
`catalog:read`, and `catalog:write`. It excludes `catalog:manage` and metadata
scopes. The portal uses the site-root OAuth resource. The endpoint also
publishes its own protected-resource metadata at
`/.well-known/oauth-protected-resource/api/mcp/server`.

After an upload, check Configured, Authorized, Domain verified, and a fresh
scan of all 26 tools. “Not live” is expected while the plugin is unpublished.
A domain check or an anonymous scan alone does not prove member access.

## Review account and cases

Use the dedicated password-enabled reviewer account. It stays non-Pro and
uses the normal limits: 25 listings, one list, and four photos per target.
Its direct profile link is accepted. Public discovery excludes it. Keep all
sample listings hidden from creation.

The sample has unpriced hidden listings, a synthetic private note, two profile
photo references, and the hidden Review Bloom listing in Review Collection.
Case 4 reuses these records when present. This makes repeat runs fit the
one-list limit. Creation paths were exercised when the records were absent.
Create one record per call. Preserve its request ID on retry. Read current
versions before editing. Repeat membership addition must not create duplicates.

Remote tools support owned reads and non-destructive writes. Deletion,
removal, photo addition, and rich story editing use exact dashboard handoffs.
The plugin cannot process subscriptions or payments.

Run the cases in `review-cases.json`. Check the saved results in the normal
dashboard. Check hidden-record exclusion through anonymous public endpoints.
Keep a model refusal separate from a server ownership-rejection test.

## Final portal checks

1. Upload the complete final ZIP to the original draft.
2. Check metadata, support and privacy links, release notes, commerce
   disclosure, review cases, private credentials, video URL, and countries.
3. Check the existing OAuth setup and run a fresh authenticated MCP scan.
4. Remove temporary test connections. Keep the original draft, intended Clerk
   clients, dedicated reviewer account, sample fixtures, and final evidence.
5. Leave final Submit and legal attestations to the owner.

Hosted ChatGPT compute remains deferred in [GOALS.md](../../GOALS.md).

## Sources

- [Package format](https://developers.openai.com/plugins/build/plugins)
- [Hosted setup and submission](https://developers.openai.com/plugins/deploy/submission)
- [OAuth registration](https://developers.openai.com/plugins/build/auth)
- [Portable MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
