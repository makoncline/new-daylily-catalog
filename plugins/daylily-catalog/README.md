# Daylily Catalog plugin submission

This folder builds the portable package for the
[remaining Daylily Catalog draft](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ac30d5ff6508191b3d2647ec281fa3e).
The portal has version `1.2.0`. Metadata checks passed. The domain is verified.
OAuth setup and live tool discovery are incomplete.

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

## OAuth setup blocker

The endpoint is `https://daylilycatalog.com/api/mcp/server`.
The issuer is `https://clerk.daylilycatalog.com`.
The intended MCP client ID is `https://chatgpt.com/oauth/client.json`. It is
a public metadata URL. Clerk admits only pre-registered clients. The client
has `catalog:read`, `catalog:write`, and `offline_access`. Default scopes are
read and offline access. DCR stays off and PKCE stays on.

The remaining draft's Connect drawer shows OAuth and Authorization unavailable.
It has no client ID input. The reported save error is:

> OAuth client ID is required when using pre-defined OAuth client credentials.

The portable MCP 1.0.0 schema has no OAuth or auth extension field. OpenAI
instructs builders to complete hosted setup in the dashboard. Codex separately
documents `oauth.clientId` in `.mcp.json`. Earlier Codex ZIP trials retained that
field but exposed no hosted Connect action. Do not repeat those uploads as a
portable-package fix.

The submission guide's setup screenshot contains a server-level
`extensions.com.openai.auth` object. Its shape is not defined in the text, and
its only shown field is `type: "oauth"`. The linked portable schema rejects
server-level extensions. This is a documentation and setup gap. No supported
client-ID import path was found on 2026-10-05.

A metadata check, verified domain, or accepted ZIP does not prove a connection.
Complete the hosted client setup, authenticate, and verify discovered tools
and a current scan before reporting readiness. Keep the current production
permission checks. The approved restricted CIMD path passed native ChatGPT development OAuth
and bounded member reads. The existing public record still needs live proof.

The private `Daylily Catalog Review` connection in ChatGPT is separate. Earlier
checks showed anonymous reads working there. This does not prove that the public
submission is connected. Inspect the exact consent before a new member grant.

## Review preparation

1. Resolve the hosted client setup on the remaining draft. Verify tool discovery.
2. Use the dedicated reviewer account with password sign-in and sample data.
   The prepared cases need member permissions, listings, lists, notes, and
   photos. Enter credentials only in private Review details.
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
