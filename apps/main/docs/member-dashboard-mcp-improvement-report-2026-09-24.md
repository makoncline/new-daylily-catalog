# Member dashboard MCP improvement report

> Historical audit and first implementation record. The current MCP contract, OAuth proof, and Turso read-cost decision are in [Member MCP local proof and read cost](member-mcp-local-proof-and-read-cost-2026-09-25.md). The overview and member aggregate counts described below were removed on 2026-09-25.

Date: 2026-09-24

Scope: repository review of the remote MCP, dashboard WebMCP, and member dashboard, including a second pass through every public tool's data source. The implementation was tested with focused MCP and dashboard tests, a signed-in seeded local browser, and a production-shaped local SQLite snapshot. No production MCP session was tested.

## Initial implementation (superseded by the 2026-09-25 report)

Public MCP database reads now use the local replica. Owner reads use the primary. Public database tools are omitted from discovery and return an unavailable-source error if the server has neither a local file database nor an embedded replica. Indexed cultivar search still reads the local search index. The public seller profile and listing paths also reuse the resolved seller and active-seller check within a call, avoiding repeated local lookups.

`daylily.open_dashboard` returns owned listing and list links for edit or deletion review, plus profile, create, import, and tags links. A deletion link opens the existing confirmation dialog after the record loads; it does not delete on load. A nonempty list gets an edit link and a clear prerequisite instead of deletion intent. If a linked record is absent from the dashboard cache, its editor makes one primary-backed point lookup before it shows an unavailable message. Exact `get_listing` and `get_list` results also include a dashboard edit URL.

`daylily.get_catalog_overview` returns listing and list totals, missing photo/price/cultivar-link counts, profile completion, and dashboard URLs. It makes one primary aggregate query and one primary profile query after the owner lookup. `daylily.search_help` searches six curated workflow answers without a database read. Member pages now return at most 100 compact listing or list rows. Full listing detail is available through `get_listing`; `get_list` returns a membership count, and `list_listings` with `listId` pages its members. This removes unbounded list membership arrays and full image/cultivar graphs from broad member pages.

Focused MCP and dashboard tests cover the source split, no-local-source behavior, ownership, overview query count, help search, compact results, handoff URLs, and cancellation without deletion. In a signed-in local browser with the seeded Rolling Oaks member, `/dashboard/listings?editing=10&intent=delete` opened a confirmation for the correct title. Cancel returned to the editor, and the listing remained in the local database. A missing listing ID showed an unavailable message, and Back removed both query parameters. On the local realistic-data SQLite snapshot, the overview aggregate returned 3,079 listings and 7 lists for Rolling Oaks. Twenty warmed runs took a median 1.43 ms and a maximum 3.36 ms inside SQLite. This measures only the local SQL query, not Clerk auth, a remote primary call, or MCP transport.

For the first 100 Rolling Oaks listings, a local Prisma query with the new summary selection serialized to 21,375 bytes. A representative full selection with descriptions, private notes, images, lists, and cultivar data serialized to 193,447 bytes. The compact selection was 89% smaller in this sample. This compares selected database rows, not complete MCP wire responses. The text response is now compact JSON while retaining `structuredContent` for current clients.

### Local MCP and primary-read proof (2026-09-25)

`pnpm dev` selects `apps/main/local/realistic-data/realistic-data.sqlite` when the invoking shell has no explicit `DATABASE_URL`. That sanitized seed is a separate SQLite file, so local MCP calls do not incur Turso reads. An explicit `DATABASE_URL` still overrides this default. The 199 MB seed has a Rolling Oaks member with 3,079 listings.

The opt-in `tests/mcp-real-sqlite-proof.test.ts` calls the actual MCP request handler with real Prisma clients and SQL profiling against that seed. It stubs only Clerk authentication. The table shows one measured run after the 100-row listing query was improved; each member count includes the owner lookup. These SQL counts describe the live-primary query shape. On this local run, the primary is SQLite, so the times are not remote Turso latency or billing measurements.

| Tool | Local elapsed | Primary SQL statements | SQL time | MCP result bytes |
| --- | ---: | ---: | ---: | ---: |
| `get_catalog_overview` | 33.33 ms | 3 | 23.73 ms | 978 |
| `list_listings`, 100 rows | 12.59 ms | 3 | 1.92 ms | 57,760 |
| `get_listing` | 11.11 ms | 7 | 5.47 ms | 2,642 |
| `list_lists` | 11.16 ms | 2 | 8.33 ms | 2,810 |
| `get_list` | 5.79 ms | 2 | 4.08 ms | 658 |
| `open_dashboard`, deletion review | 1.64 ms | 2 | 0.19 ms | 594 |

The same run called `get_public_profile`: it used 11 **local** SQLite statements, took 57.81 ms elapsed, and returned 8,486 bytes. Its overlapping SQL calls summed to 97.08 ms, which can exceed elapsed time. In a deployed process with an embedded replica, these are local replica reads rather than per-call Turso primary reads. The test asserts that the configured public client is local. Indexed cultivar search has its own local index refresh cost, separate from a tool call.

The first implementation of `list_listings` asked Prisma for relation counts for every row. SQLite spent about 298 ms on that query for a 100-row page. The revised query selects scalar page rows, then checks photos and list membership only for those page IDs in one owner-scoped statement. The corresponding SQL time fell to 1.92 ms for the three-statement call. The tool still returns at most 100 rows.

The actual local Next route also completed MCP `initialize`, listed 15 tools, answered a public help call, and returned the Rolling Oaks public profile over HTTP with no token. The real Clerk OAuth exchange and authenticated HTTP calls are a separate check; they are not implied by the handler test.

To repeat the SQL proof after `pnpm db:seed:prepare`, run `RUN_MCP_REAL_SQLITE_PROOF=1 pnpm --filter main exec vitest run tests/mcp-real-sqlite-proof.test.ts --reporter=verbose` from the repository root. The test is skipped in ordinary suites. For an OAuth HTTP smoke check, start the seeded local server with the existing development Clerk OAuth client ID in `DAYLILY_MCP_OAUTH_CLIENT_ID`, then run `apps/main/scripts/smoke-mcp-oauth-local.mjs` through `with-env.mjs`. The smoke script uses a registered loopback callback and keeps the code and access token in memory.

This does not establish the deployed server's replica configuration or live OAuth client behavior. There are no known existing MCP users, so the implementation does not preserve an old tool contract for compatibility.

### Work that needs a live authorization decision

Direct remote writes and broader OAuth client admission remain unshipped. The current token grants private note reads through Clerk's broad `profile` scope and is restricted to `DAYLILY_MCP_OAUTH_CLIENT_ID`. [Clerk now supports custom OAuth scopes](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth) and [Client ID Metadata Documents](https://clerk.com/docs/guides/configure/auth-strategies/oauth/client-id-metadata-documents), but those features are off or must be configured in the Clerk dashboard; source code cannot prove the production instance has them. Before remote writes: create and advertise distinct catalog read/write scopes, assign them to clients, keep consent on, verify token audience/resource handling, and test one CIMD client and one other MCP client end to end. Then add idempotent create/update tools using the existing dashboard domain operations. Keep permanent deletion in the dashboard confirmation flow. The current code keeps the working read-only OAuth setup until that live configuration is verified.

## Decision

Keep public MCP reads on the local search index or a true embedded replica. Use the live primary for member-owned records when current state matters, with narrow and bounded queries. Next, return verified dashboard links for specific member tasks. Make a deletion link open the existing record and confirmation UI; opening a URL must never delete data. Add direct MCP writes for routine tasks only after their authorization, error, and retry behavior is defined. Keep a human confirmation step for permanent deletion, imports, billing, and other consequential work.

This responds to [Rhys Sullivan's MCP guide](https://x.com/RhysSullivan/status/2103280866084708510): cover dashboard tasks, hand off unsafe actions by link, help agents find documentation, avoid MCP-specific code mode, let clients connect through standard OAuth, and consider tool selection. A [reply to the post](https://x.com/johnroodepic/status/2103284199742709801) also identifies the retry problem after a person completes an action in the dashboard.

## What existed at review time

| Surface | Current capability | Evidence |
| --- | --- | --- |
| Remote MCP | Seven public read tools and five authenticated owner read tools. No write or dashboard-link tool. | `src/server/mcp/read-only-mcp-tools.ts:28-262`; `src/server/mcp/read-only-mcp.ts:1123-1177` |
| Dashboard WebMCP | Browser-only navigation, dashboard reads, cultivar search, profile/listing/list writes, image upload preparation/attachment, and add-to-list. No delete tools. It runs only on a signed-in dashboard page with browser WebMCP support. | `src/components/webmcp-provider.tsx:119-132,134-201,233-680` |
| Dashboard routes | Listing and list edit screens already open from `?editing=<id>`. A list detail page uses `/dashboard/lists/<id>`. Profile, imports, and tags have their own routes. | `src/app/dashboard/listings/page.tsx:23-27,92-99`; `src/app/dashboard/lists/page.tsx:22-32,108-115`; `src/app/dashboard/lists/[listId]/page.tsx`; `src/app/dashboard/profile/page.tsx`; `src/app/dashboard/imports/page.tsx`; `src/app/dashboard/tags/page.tsx` |
| Deletion | Listing and list forms have confirmation dialogs. The server checks record ownership. List deletion refuses a nonempty list. Deletion is permanent in the current UI. The URL does not open the confirmation step. | `src/components/forms/listing-form.tsx:146-155,513-531`; `src/components/forms/list-form.tsx:275-294`; `src/server/api/routers/dashboard-db/listing.ts:519-557`; `src/server/api/routers/dashboard-db/list.ts:180-203` |
| Agent guidance | Public skill and `llms-full.txt` cover public discovery. They tell agents not to use private dashboard routes as data sources. No member workflow help tool exists. | `src/lib/agent-readiness.ts:193-249` |
| Authentication | Owner MCP access requires a Clerk OAuth token with `profile` scope *and* one configured client ID. | `src/server/mcp/read-only-mcp.ts:69-77,764-805`; `src/lib/agent-readiness.ts:44-53` |

The remote and browser MCPs have different purposes. Browser WebMCP writes do not give a remote Codex, Claude, or ChatGPT session those tools. The read-only remote MCP is a sound starting layer, but it does not yet cover the member's full dashboard workflow.

### Public MCP data sources

This section records the source behavior before the first implementation slice above.

The **seven public tools and five member tools share one `/api/mcp/server` endpoint**. They have different authentication rules, but the current request handler gives all of them the same `readDb` (`src/server/mcp/read-only-mcp.ts:1246-1250`). More importantly, `replicaDb` is always defined: with `TURSO_EMBEDDED_REPLICA_URL`, it is a local embedded replica; without that variable, it **aliases `db`**, which can be the remote Turso primary (`src/server/db.ts:9-10,28-43,96-123,131-134`). The earlier wording `replicaDb ?? db` therefore did not guarantee cheap public reads.

| Public tool | Current source per call | Constraint |
| --- | --- | --- |
| `search_cultivars` | Local SQLite/FTS search index (`src/server/mcp/read-only-mcp.ts:829-841`; `src/server/search/cultivar-search.ts:606-619`). | Index refresh synchronizes a dedicated source replica on its own schedule. A normal search does not query the primary, but an index refresh is separate remote work (`src/server/search/public-search-index.ts:556-579,659-678`). |
| `get_cultivar` | `replicaDb` lookup of `CultivarReference` (`src/server/mcp/read-only-mcp.ts:843-868`). | A remote primary lookup if the embedded replica is absent. The current search index contains the cultivar ID and many display fields, so an index-backed exact lookup is feasible after checking the output contract (`scripts/build-public-search-index.mjs:169-213`). |
| `search_public_listings`, `list_public_listings`, `get_public_listing` | `replicaDb` listing query plus public visibility and seller lookups (`src/server/mcp/read-only-mcp.ts:559-707,871-938`). | `getProUserIds` reads user and subscription KV rows on `replicaDb` for each call (`src/server/db/getProUserIds.ts:4-19`; `src/server/db/getProUserIdSet.ts:16-43`). Without the embedded replica, these are remote primary reads as well. |
| `get_public_profile`, `list_public_profile_lists` | Public seller read model on `replicaDb` (`src/server/mcp/read-only-mcp.ts:901-913`; `src/server/db/public-seller-read-model.ts:112-136,315-399`). | A profile call can make several local replica queries; without it, they become primary queries. |

The existing search index is **not** a full replacement for public listing/profile reads. Its listing table contains only published, cultivar-linked listings and omits complete listing images, lists, and profile data (`scripts/build-public-search-index.mjs:237-252,522-557`). Use the embedded replica for those full records unless a measured use case justifies a separate public read model. The repository's [public cache strategy](public-rendering-cache-strategy.md) already documents the VPS replica and the alias behavior on deployments without it.

There is also avoidable query work within the local source: public listing lookup by seller slug checks active sellers twice, and public profile lookup resolves the seller slug twice (`src/server/mcp/read-only-mcp.ts:671-699,901-905`; `src/server/db/public-seller-read-model.ts:386-392`). After the source boundary is enforced, pass the resolved seller ID and active status through a call instead of repeating those lookups. Measure the improvement before adding caching.

## The post, point by point

| Idea in the post | Daylily recommendation |
| --- | --- |
| Cover dashboard actions, including deletion | Add task-level coverage. Start with live reads, routine writes, and human-confirmed deletion links. A dashboard action need not be an unattended API mutation. |
| Deep links into product | Return ordinary HTTPS dashboard URLs in tool results. [MCP resource links](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#resource-links) identify fetchable MCP resources; they do not ensure that a client opens a browser. [URL-mode elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) can improve a sensitive handoff in supporting clients, but should be optional. |
| Search docs and skills | Add member help search. Keep the existing public skill for buyer research. [Sentry's first-party MCP](https://github.com/getsentry/sentry-mcp/blob/main/packages/mcp-core/README.md) offers a useful docs-search example. |
| Avoid custom lazy loading and code mode | Keep directly discoverable tools. [MCP tool listing](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#capabilities) supports paging and a set that varies by granted authorization. |
| Optional toolsets and permissions | Group tools by member task and granted capability when the list grows. Validate authorization again inside each call. [Sentry's security design](https://github.com/getsentry/sentry-mcp/blob/main/docs/security.md) is an example, not a template to copy wholesale. |
| OAuth from any client | Replace the one-client gate after Clerk and client interoperability checks. [CIMD](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration) helps unknown clients identify themselves, but the authorization server must support and validate it. |
| API specification plus CIMD | Our [current OpenAPI document](../src/lib/agent-readiness.ts#L315) describes public read-only discovery, not member operations. A member API specification could help HTTP-capable agents, but it is a separate access path. It must share the same ownership and permission rules as MCP. |

[PostHog's remote MCP setup](https://posthog.com/docs/model-context-protocol/codex) and [data-quality permissions](https://posthog.com/docs/data-warehouse/data-quality/mcp) are concrete examples of OAuth onboarding and read/write distinction. They do not establish that the same permissions exist in Clerk or in our current deployment.

## Findings, in priority order

### 1. P0: Enforce the public no-primary boundary

Public tool calls should never silently switch from local data to the remote Turso primary. Make the public source choice explicit in code and deployment checks. When `DATABASE_URL` is remote, require a usable local index for indexed tools and `hasEmbeddedReplica` for full public records, or serve the public MCP from an origin that has them. A local file database remains valid for development and tests. Decide the unavailable-source response deliberately; do not quietly fall back to the remote `db`. Current MCP tests mock `db` and `replicaDb` as the same client (`tests/mcp-read-only.test.ts:42-45`), so add tests with separate clients and prove **every** public tool, including helper lookups, avoids the primary. Verify the actual MCP-serving environment before claiming this holds in production. Keep index refresh/sync work separate from per-call reads, and measure it before making a total cost claim.

### 2. P0: Current member reads should use the primary database

`handleMcpRequest` currently gives member tools the same source as public tools (`src/server/mcp/read-only-mcp.ts:1246-1250`). Owner lookup, lists, and listings then use that source (`src/server/mcp/read-only-mcp.ts:794-805,968-1029`). A member action can precede replica sync. This can show a deleted item, miss a new item, or report an old field value immediately after a dashboard save. It also makes completion checks unreliable. Split public and member access; use the primary for member-owned profile, lists, listings, and operation status. Continue to use the index or replica for shared cultivar reference data. Primary reads do not need to mean many reads: keep searches selective, pages bounded, and overview counts aggregated; avoid repeatedly loading every listing. Measure calls and latency on a large member catalog before adding caching. Add an integration test with different primary and replica states to prove read-after-write.

### 3. P0: Give agents a typed dashboard handoff tool

Add one `daylily.open_dashboard` or `daylily.prepare_dashboard_action` tool. Its input should be a small task enum and an optional record ID, not an arbitrary path. Useful first destinations are `profile`, `create_listing`, `edit_listing`, `delete_listing`, `create_list`, `edit_list`, `delete_list`, `import`, and `tags`. For record tasks, authenticate the member and confirm current ownership on the primary before returning an HTTPS URL, record title, task label, and next step. The current edit routes support links such as `/dashboard/listings?editing=<listing-id>` and `/dashboard/lists?editing=<list-id>`; those links take the member to the record but still require the member to press Delete. A dedicated `intent=delete` URL can open the existing confirmation dialog after the record loads, without executing deletion on page load. The confirmation should show the actual record title and explain list deletion's empty-list precondition.

Keep task intent separate from credentials. Do not put bearer tokens, private notes, or draft content in query parameters. After sign-in, preserve only the same-origin destination. Reject missing, deleted, or foreign IDs with a useful result rather than generating a link that appears valid. Return the same link from owner `get_listing` and `get_list` where it helps a common follow-up; a separate tool is still useful when the agent knows the task and ID already. Put the URL in both the tool's structured result and its text result for broad client support ([MCP structured results](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#structured-content)).

### 4. P1: Define completion and retry behavior for handoffs

A link is a handoff, not proof that the person acted. The [MCP elicitation specification](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation#url-mode-elicitation-requests) makes the same distinction for URL interactions. For the first read-only handoff, the agent can ask the member to return and then re-read the record from the primary. A permanent delete needs a clearer state: prepared, completed, cancelled, or stale. If the product adds a durable prepared operation, give it an opaque operation ID bound to the member, action, and record. The dashboard confirms exactly that operation; a status tool reports the outcome. Retrying the status call must not repeat the mutation. Avoid a general job framework until a second workflow needs it. Test cancellation, replay, stale record, another member's ID, and double submission.

### 5. P1: Expand member task coverage from real workflows

The dashboard can create/update/delete listings and lists, connect cultivars, manage images and profile text, import rows, export listings, print tags, and manage membership. The remote MCP exposes only profile/list/listing reads (`src/server/mcp/read-only-mcp-tools.ts:177-262`), while WebMCP exposes some writes (`src/components/webmcp-provider.tsx:233-680`). Cover these in this order:

1. Read-only catalog overview: counts, missing photos/prices/cultivar links, profile completion, and links to the matching dashboard views. The dashboard already computes related statistics (`src/app/dashboard/page.tsx:9-36`). This answers common member questions without paging through every listing.
2. Routine writes: create or update a single listing/list and change list membership. Reuse the domain rules and ownership checks of the existing dashboard procedures. Return the changed record and its dashboard link. Define how a client can retry a create without duplicating it before shipping these tools.
3. Rich media, bulk import, print/export, and membership: provide task links first. These workflows require file transfer, visual review, bulk changes, or payment UI. Add direct MCP operations only when a real member task justifies the added contract.
4. Permanent deletion: keep dashboard confirmation for the first version. Add direct remote delete tools only if members need them and a narrower permission and explicit approval model are in place.

Do not copy every tRPC procedure into MCP. Expose member tasks with clear inputs and results; retain the dashboard as the place for visual checks and decisions.

### 6. P1: Let more OAuth clients connect, with narrower permissions

The resource currently rejects any OAuth client whose `clientId` differs from `DAYLILY_MCP_OAUTH_CLIENT_ID` (`src/server/mcp/read-only-mcp.ts:73-77,783-791`). This conflicts with the post's cross-client goal. Remove the single-client restriction only after testing Clerk's actual support for client registration and client metadata documents, token audience/resource binding, PKCE, and redirect URI validation. Authenticate the token's issuer, audience, subject, and requested permission on every member tool. The current `profile` scope grants access even to private listing notes (`src/server/mcp/read-only-mcp.ts:69,720-727,783-789`). Before introducing writes, define separate read and write permissions, or a similarly enforceable capability model supported by the authorization server. Document how members can revoke client access.

The current authorization metadata is assembled in app code (`src/lib/agent-readiness.ts:91-118`). Verify its fields against live Clerk metadata and two independent MCP clients. Publishing metadata or an OpenAPI file alone does not prove arbitrary clients can complete OAuth.

### 7. P2: Add searchable member help, using the existing public skill as a base

Provide `daylily.search_help` for short, curated workflow answers with source URLs: what a listing status means, why a nonempty list cannot be deleted, how a cultivar link affects a listing, and how import/image/membership steps work. Keep public cultivar guidance and authenticated member guidance distinct. Start with a small indexed set of existing docs and UI help, not a new vector service. A member help response should explain the relevant tool or dashboard link and state when human action is required. The existing public skill (`src/lib/agent-readiness.ts:227-249`) should remain public guidance; its route warning should not be presented as a ban on authenticated dashboard handoff links.

### 8. P2: Reduce large tool responses before adding more tools

`list_lists` can return up to 500 lists and every listing ID in each list; `list_listings` can return up to 500 full records with images and cultivar data (`src/server/mcp/read-only-mcp.ts:720-762,968-1015`; `src/server/mcp/read-only-mcp-schema-builders.ts:1-2`). The server also puts the same JSON in both text and `structuredContent` (`src/server/mcp/read-only-mcp.ts:171-180`). This may consume large client contexts, especially for a large catalog. Use compact page rows and exact detail tools, return counts where IDs are not needed, and keep pagination bounded. Measure payload size and latency on a production-shaped local seed before changing defaults.

### 9. P2: Keep the tools directly discoverable

The current server publishes ordinary MCP tools directly and has no custom lazy loader or code mode (`src/server/mcp/read-only-mcp.ts:1123-1177`). Preserve that design. If the tool list grows enough to hurt selection, use a few stable task groups and permission-based discovery. Do not add a second code execution layer. The existing WebMCP and remote MCP tool names use different punctuation and capability sets; document which is available in each context so agents do not assume a browser-only write tool exists remotely.

## Initial slice status (superseded by the 2026-09-25 report)

1. **Done in code:** Public local-source guard and distinct public/member clients. All six replica-backed public tools fail closed when the server lacks a local public source; indexed search remains separate. Deployment configuration still needs verification.
2. **Done in code:** Current owner reads use the primary. Overview avoids paging the full catalog. The local aggregate was measured against 3,079 member listings. A deployed Turso read count and latency check is still needed.
3. **Done in code:** Typed, owner-checked dashboard handoffs for listing/list edit and delete, profile, creation, import, and tags. Exact detail tools include edit links.
4. **Done locally:** `intent=delete` opens confirmation, with a primary point lookup for a missing cached record. The signed-in browser check covered listing cancellation and a stale link; focused tests cover list cancellation and the nonempty-list rule.
5. **Available now:** After a handoff, the agent can call `get_listing` or `get_list` against the primary to observe current state. That does not prove whether the member cancelled or another actor changed the record. Add a durable operation ID only if actual client use needs that distinction.
6. **Still needs live proof:** Complete an OAuth MCP client flow against the deployed endpoint, open the returned link in a separate browser, confirm deletion on a disposable record, and re-read status. This should use a large member catalog and a nonempty list. No production record was changed during this work.

## Review loop and stop point

Pass 1 mapped the post to current tools and routes. Pass 2 traced deletion, ownership, and read-after-write behavior. Pass 3 checked auth, docs, response size, and browser versus remote MCP boundaries. Pass 4 followed all public tools through their helpers and found the replica alias and partial search-index coverage that the first report missed. Pass 5 checked deployment documentation and tests against that new boundary and found no further distinct category. The remaining questions are implementation and live-client verification.

## Limits

The review and local implementation do not establish current production deployment, live Clerk client-registration support, or deployed MCP latency. The signed-in local browser covered listing deletion review and a stale listing link; it did not exercise every dashboard destination or a live OAuth MCP client. Remote MCP writes are intentionally absent until enforceable catalog write scope and retry behavior can be verified.
