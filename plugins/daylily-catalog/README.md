# Daylily Catalog plugin submission

This folder builds the portable package for the
[remaining Daylily Catalog draft](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ac30d5ff6508191b3d2647ec281fa3e).
The portal has version `1.2.0`. Production OAuth setup passed on 2026-10-05.
The original draft shows Configured and Account connected. Its fresh
authenticated scan found all 26 tools with no findings. A narrated walkthrough
draft is complete. Full production reviewer cases and the submission recording
remain incomplete. See [walkthrough status](../../apps/main/docs/plugin-walkthrough-2026-10-05.md).

## Build and test

Run these commands from the repository root:

```sh
pnpm plugin:build
pnpm verify --tests tests/daylily-plugin-package.test.ts
```

The ZIP is saved in ignored `local/plugins/`. It contains:

- `plugin.json`: Portable identity and OpenAI listing metadata. The build adds
  the five positive and three negative cases from `review-cases.json`.
- `mcp.json`: The production Streamable HTTP endpoint.
- `assets/icon.svg`: The referenced icon.

Include all components in each update. Keep the package name and MCP server
name as `daylily-catalog`. Update this existing draft. Public submission does
not accept `apps` or `.app.json` references. Keep tokens, client secrets,
reviewer credentials, and member data outside the ZIP and Git.

## OAuth setup

The endpoint is `https://daylilycatalog.com/api/mcp/server`.
The issuer is `https://clerk.daylilycatalog.com`.
The intended MCP client ID is `https://chatgpt.com/oauth/client.json`. It is
a public metadata URL. Clerk admits only pre-registered clients. The client
can request `catalog:read`, `catalog:write`, `offline_access`, `openid`,
`email`, and `profile`. The owner approved these scopes. Default scopes are
read and offline access. DCR stays off and PKCE stays on. The production app
uses this exact client URL for its MCP client check.

CIMD publication resolved the public draft's missing client-ID setup.
Complete hosted setup through the portal's Connect drawer. Use Reconnect
after OAuth discovery changes. A tool Rescan alone did not refresh old
account-connection scopes. Reconnect and Continue reached the correct
reviewer consent. The actual grant requested `openid`, `email`,
`offline_access`, `catalog:read`, and `catalog:write`. It did not request
`catalog:manage`. The portal uses the site-root resource in this flow.
The server also publishes the endpoint-specific resource metadata at
`/.well-known/oauth-protected-resource/api/mcp/server`.

Keep OAuth credentials out of the ZIP. The portable MCP 1.0.0 schema has no
OAuth client-ID field. Do not repeat unsupported auth-field uploads.
Check the saved client, exact consent, Configured status, account connection,
and a fresh scan. A verified domain or clean anonymous scan is insufficient.

The older private `Daylily Catalog Review` test connection requested the
retired predefined client. Its different grant was canceled. It remains
unlinked. Refresh tools did not change that client binding: a new connection
attempt still requested the retired client and was canceled. It does not
prove current member reads. The approved development
CIMD connections previously passed bounded member reads against local SQLite.

## Review preparation

1. Preserve the working hosted setup on the original draft. Recheck its
   account connection and tool scan after a relevant change.
2. Use the dedicated reviewer account with password sign-in and sample data.
   The prepared cases need member permissions, listings, lists, notes, and
   photos. Enter credentials only in private Review details. The reviewer
   remains non-Pro and uses the normal limits: 25 listings and one list.
   The owner accepts its direct profile link. Keep it out of public browsing
   and search, and keep the sample listings hidden. Limited non-Pro MCP and
   member API writes are implemented locally. Deploy and run the hosted
   review cases before claiming that the positive cases pass.
3. Run all cases in `review-cases.json` through the connected plugin. Record a
   current walkthrough and add its accessible URL to review information.
   [Earlier local recordings](../../apps/main/docs/member-mcp-feature-proof-2026-09-30.md)
   do not prove this hosted connection.
4. Check metadata, cases, privacy disclosures, tool safety labels, release notes,
   and scan results. Get owner approval before final submission and legal
   attestations.

Hosted ChatGPT compute is deferred in [GOALS.md](../../GOALS.md).

## Sources

- [Package format](https://developers.openai.com/plugins/build/plugins)
- [Hosted setup and submission](https://developers.openai.com/plugins/deploy/submission)
- [OAuth registration methods](https://developers.openai.com/plugins/build/auth)
- [Portable MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
- [Codex plugin OAuth fields](https://learn.chatgpt.com/docs/extend/mcp#plugin-provided-mcp-servers)
