# Daylily Catalog plugin submission

This folder updates the original hosted OpenAI entry:
[Daylily Catalog](https://platform.openai.com/plugins/manage/plugin_asdk_app_6a061b5279b88191a07a9e0866721e29).
Its package name is `app-6a061b5279b88191a07a9e0866721e29`.
Keep that identity for updates. The display name is Daylily Catalog.

## Build

From the repository root, run:

```sh
pnpm plugin:build
```

The ZIP is saved in ignored `local/plugins/`. It contains only
`.codex-plugin/plugin.json` and `assets/icon.svg`. The existing entry manages
its MCP connection separately. This ZIP updates metadata. It does not create
or prove an OAuth connection. Do not add a new bundled MCP server or an
`.app.json` mapping to this update.

`review-cases.json` contains five positive and three negative cases. It stays
outside this ZIP. The importer rejects plugin-level review cases when the
ZIP does not declare an MCP server. Complete these cases in the hosted review
setup after the MCP connection is ready. Keep reviewer credentials, tokens,
and member data out of the package and Git.

Run the focused checks:

```sh
RUN_MCP_MEMBER_WRITE_PROOF=1 pnpm verify --tests tests/mcp-read-only.test.ts tests/mcp-member-write-sqlite.test.ts tests/daylily-plugin-package.test.ts
```

The SQLite write proof copies this checkout's realistic-data fixture into a
disposable database. It does not write to Turso.

## Verified upload and remaining setup

On October 4, version 1.1.4 was accepted into the original entry. Metadata
reported **No Issues**. The earlier update was wrong: it added a bundled
MCP declaration to that hosted entry. A new plugin identity was not required
for the metadata fix.

The original MCP configuration still reports **Unavailable**. Its old app
version is rejected. There is no editable pending MCP version or Connect
action. The accepted metadata ZIP does not repair that state. Do not submit
it while MCP setup is incomplete.

The supported ChatGPT connection form is available at
[Plugins](https://chatgpt.com/plugins) → Add → Create custom MCP server.
After entering the endpoint, open Advanced OAuth settings. Select
User-Defined OAuth Client, enter the existing public client ID, leave the
secret empty, and use token endpoint authentication `none`.
The production endpoint is `https://daylilycatalog.com/api/mcp/server`.
The issuer is `https://clerk.daylilycatalog.com`.

Use the exact callback shown by that form. On October 4 it showed
`https://chatgpt.com/connector_platform_oauth_redirect`. The owner approved this callback. It was added to the existing production
Clerk client on October 5. The old callback-ID URL is a different address.

For the first read-only connection check, select `catalog:read` only. Use
`openid`, `email`, and `profile` for OIDC. Do not copy all advertised Clerk
scopes: they include metadata scopes and `catalog:manage` that the existing
client does not permit. Stop before a member-data grant unless the owner
approves it. A connection created in ChatGPT must still be linked to the
correct public submission and pass its tool scan.

On October 5, `Daylily Catalog Review` was installed in ChatGPT with the
predefined client and no account linked. Its ID is
`plugin_asdk_app_6ac3b8d3dccc819183b2a619baae656c`. The first public case
returned matching listings, photos, cultivar details, and a grower catalog.
This private test is separate from the public submission.

The public endpoint draft still fails Connect with:
`OAuth client ID is required when using pre-defined OAuth client credentials.`
Its drawer has no client ID input. Do not treat a verified domain as a
completed OAuth connection. The official submission reference also excludes
`apps` and `.app.json` references from public ZIPs. Do not upload a private
connection mapping as a proposed public fix.

Portable and standalone Codex import experiments are not release candidates.
Do not use them as proof that the hosted OAuth client is configured.

## Review preparation

1. Release the privacy and MCP result fixes through the normal app process.
   Check live privacy text and tool labels before scanning.
2. Complete the hosted OAuth setup and tool scan. Check the app identity,
   endpoint, OAuth client, callback, and discovered tools.
3. Use the existing dedicated reviewer account with password sign-in and member permissions,
   hidden and public listings, private notes, lists, a profile story, and
   at least two profile photos. Do not use a real member's account.
4. Enter review credentials separately. The reviewer must not need MFA,
   email codes, magic links, or private network access.
5. Run `review-cases.json` through the connected plugin on desktop and mobile.
   Record a current walkthrough. The
   [earlier local recordings](../../apps/main/docs/member-mcp-feature-proof-2026-09-30.md)
   show the implementation, but do not prove this directory connection.
6. Add the current video and test results to the hosted review form. Check
   imported metadata and release notes. Submit only when scans pass and
   the owner confirms the attestations.

The May 18 rejection concerned privacy disclosures and unneeded user data.
The app fixes disclose reads, writes, permissions, recipients, retry receipts,
and dashboard handoffs. MCP write results use explicit field schemas and
retain record versions for stale-write checks. The normal dashboard is
unchanged by these submission fixes.

The plugin has no embedded UI, bundled skills, or subscription checkout.
Existing account permissions control member tools. Destructive removal
requires dashboard approval. OpenAI's destructive tool label also covers
field overwrites; it does not replace the product approval flow.

## Hosted AI compute

Hosted ChatGPT plan usage is deferred in [GOALS.md](../../GOALS.md). It is a
separate integration. Do not add it to this plugin release.

## Sources

- [Package format](https://developers.openai.com/plugins/build/plugins)
- [Submission flow](https://developers.openai.com/plugins/deploy/submission)
- [OAuth and callbacks](https://developers.openai.com/plugins/build/auth)
- [Plugin rules](https://developers.openai.com/plugins/plugin-guidelines)
