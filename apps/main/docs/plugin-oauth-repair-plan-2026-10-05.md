# Plugin OAuth repair plan

Date: 2026-10-05. Updated on 2026-10-06. Production connection, scan, and
review cases passed. Final package upload and test cleanup remain open.

## Goal

Make the existing public Daylily Catalog plugin connect, discover its tools,
and pass its review cases. Use the accepted portable package. Keep member
scope, ownership, membership, and destructive-operation checks.

## Order, from most to least promising

### 1. Repair the confirmed MCP contracts and retain the existing client

This has the lowest change risk. The predefined Clerk client already worked
with a private ChatGPT connection. Its binding to the public submission is
still missing.

- Add endpoint-specific resource metadata with read and write scopes.
- Point MCP HTTP challenges, tool challenges, and the server card to it.
- Add error codes and descriptions to tool authentication results. Keep the
  HTTP no-credentials challenge separate.
- Distinguish missing credentials, rejected tokens, missing scopes, and
  rejected clients. Check that each rejection occurs before member reads.
- Inspect one sanitized failed Connect save and the read response that filled
  the drawer. Establish client-ID presence, registration mode, response error,
  and request ID. Keep credentials and session data out of the evidence.
- Use a documented setup control if it is available on the existing record.

Acceptance: local request tests, lint, and typecheck pass. Live token and
resource handling also pass before deployment. The exact public record
connects and discovers the intended tools. A private connection alone does
not satisfy this check.

### 2. Test restricted Clerk CIMD in development

CIMD uses a client metadata URL as the client ID. It can remove the manual
client-ID setup. Current docs support this path, but this instance and the
exact ChatGPT metadata document still need a compatibility test.

- Check whether the Clerk instance uses its current OAuth implementation.
- Pre-register the exact ChatGPT client document with required scopes.
- Use restricted admission. Do not leave arbitrary client admission enabled.
- Check metadata fetch, token authentication method, S256, callback, scopes,
  and the returned client identity.
- Test deliberate MCP client policy and member API destructive-operation
  rejection for that identity. Keep the current checks until this is proved.
- Check that the existing public record actually rediscovers this method.

Acceptance: an approved development grant completes and member reads work.
Invalid issuer/token, scope, client, and foreign-owner requests fail. An
unregistered client cannot obtain access. Production auth changes need a
reviewed configuration and action-time approval.

### 3. Escalate the proven portal failure

Use this if the supported setup paths remain blocked. The support draft must
remain unsent until the owner authorizes it.

Provide the exact public record, accepted ZIP hash, discovery results,
sanitized save facts, and loaded frontend validation evidence. The observed
error occurs before an MCP save request, so this attempt has no failed-save
response or request ID. Separate the portal failure from the confirmed server
defects. Keep the existing public record.

### 4. Consider DCR only if Clerk confirms a supported long-term path

The current Clerk dashboard marks DCR deprecated. It also adds a public
registration endpoint and more client records. Prefer the supported CIMD
path or a repair to predefined hosted setup. Do not add a temporary DCR
architecture to bypass this error.

If Clerk confirms a supported long-term DCR path, first prove registration,
client admission, scope restrictions, and access in development. Then prove
that the existing public record can use it.

## Completion checks

- Initialize, tool discovery, bounded public read, and unauthenticated member
  rejection work on the deployed endpoint.
- The existing public record connects and completes a fresh tool scan.
- The dedicated reviewer account passes all five positive and three negative
  cases. New member grants need action-time approval.
- Scanned annotations, justifications, review credentials, and recording are
  complete.
- Test the installed Codex plugin separately from the ChatGPT connection.
- Prepare final submission for owner review. Stop before legal acceptance or
  final submission.

## Sources

- [Independent Pro review](https://chatgpt.com/c/6ac44fb5-e574-83e8-bbc7-c1ff554ed99c)
- [OpenAI authentication](https://developers.openai.com/plugins/build/auth)
- [OpenAI submission](https://developers.openai.com/plugins/deploy/submission)
- [Portable MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
- [Clerk CIMD](https://clerk.com/docs/guides/configure/auth-strategies/oauth/client-id-metadata-documents)
- [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html#section-3.3)

## Progress

- [x] Read and save the independent review. Verify the missing Clerk discovery
      endpoint. It advertises S256 and issuer-response support, but no CIMD flag
      or registration endpoint.
- [x] Confirm public initialization and 26 discovered tools. Confirm that the
      unauthenticated member call returns no member data.
- [x] Complete the local contract fixes, lint, typecheck, and selected tests.
      The selected suites contain 60 distinct tests after the proxy discovery
      test was added. Live token/resource proof is still required.
- [x] Capture the public record's failed Connect. Network and public frontend
      source show a validation error before an MCP save request. There is no
      failed-save HTTP response to report. The missing binding cause remains
      unproved.
- [x] Confirm that Clerk Development exposes native CIMD registration. Prepare
      the ChatGPT metadata URL with catalog:read and required offline_access.
      Save the registration after owner approval. Clerk shows the ChatGPT name
      and logo, with no visible metadata error. The workspace remains on Hobby.
- [x] Reach the development read-only consent screen for the exact ChatGPT
      metadata URL. Reject an invalid callback, missing PKCE, and the unassigned
      catalog:write scope after sign-in. No consent was granted. A client with
      an unresolved metadata URL also fails; this does not prove admission
      policy for a valid unknown client.
- [x] Check the actual local Next route with an isolated SQLite copy. Resource
      metadata, initialization, 26 tools, no-credentials rejection, and rejected
      Bearer challenges pass. Disable telemetry and paid-service credentials.
- [x] Complete the real ChatGPT development connection and bounded member
      reads. The owner approved the MCP-only tunnel and the read-only grant.
      ChatGPT returned from Clerk and showed a connected account. The private
      connection used User-Defined OAuth Client with the registered CIMD URL,
      token auth `none`, `catalog:read`, and `offline_access`. Its list and
      listing calls each returned one row and a next-page cursor. No token
      was extracted or saved. Native CIMD discovery remains unproved.
- [x] Publish development CIMD support with pre-registered clients only. The
      owner approved the change. Save both settings together. The saved UI and
      public issuer metadata confirm publication. DCR stays off.
- [x] Observe automatic ChatGPT selection of CIMD, the stable ChatGPT client
      metadata URL, the exact callback, development issuer, and MCP resource.
      The native path reaches the development read-only consent screen.
- [x] Test an unregistered official client document listed by Clerk. The
      public Claude document is valid and the client is absent from the
      registry. Clerk returns invalid_client and issues no grant. Its generic
      document-resolution message does not distinguish admission rejection
      from a provider fetch failure.
- [x] Complete native CIMD token exchange and member reads. The separate
      private Daylily CIMD Automatic Dev test requests only catalog:read and
      offline_access, with OIDC off. The owner approved its grant. On resume,
      ChatGPT showed the connected account. Both bounded member reads passed.
- [x] Complete production hosted authentication and a fresh authenticated
      scan on the original public record. It shows Configured and Account
      connected. All 26 tools are present, with no scan findings.
- [x] Complete all production reviewer cases. Keep the reviewer non-Pro and
      all sample listings hidden. Verify saved values in the normal dashboard.
      See [current walkthrough proof](plugin-walkthrough-2026-10-05.md).
- [ ] Host and inspect the final production review video. Upload its complete
      package to the original draft and verify a fresh authenticated scan.
- [ ] Complete final test cleanup after the original plugin passes production
      connection, tool discovery, and review checks. The owner requested this
      cleanup. Use the checklist below.

## Development connection evidence

The temporary forwarder exposes only MCP and public OAuth discovery routes.
It strips cookies, accepts GET and POST, and rejects other paths. Public
checks returned the exact endpoint resource and development Clerk issuer.
The dashboard path returned 404. A proof header identified this checkout.

The private test record is `plugin_asdk_app_6ac462a7a914819190bcfdc92f6aa393`.
It is separate from the existing public submission. Its supported setup used
the registered URL identity in the predefined-client form because automatic
CIMD selection was disabled. Do not claim that this repairs the public record.

See the [bounded read chat](https://chatgpt.com/c/6ac46483-6224-83e8-bf60-2ecf389225a4).
The calls used `limit: 1` and did not follow cursors or perform writes, image
operations, public search, or paid API inference. The app used an isolated
SQLite copy with Turso and paid-service credentials disabled.

ChatGPT's app details modal also lists all 26 tools. Visibility does not grant
write access; the approved token has no write scope.

Clerk Development now publishes CIMD support with admission restricted to
pre-registered clients only. The owner approved this change. The UI uses an
unsaved form, so publication and restricted admission were saved together.
No broad-admission save occurred. The public issuer metadata advertises CIMD
and still has no registration endpoint. A fresh ChatGPT setup now selects
CIMD automatically. It fills the client document URL and exact callback.
The native path reaches the read-only consent screen. Its separate grant is
approved and completed. The automatic private test record is
`plugin_asdk_app_6ac4676ce47c8191ad984e7d9ef246ea`. Its
[read test](https://chatgpt.com/c/6ac46a91-8710-83e8-b136-81418066194f)
returned one list and one listing, each with a next-page cursor. Each call used
`limit: 1`. It did not follow pagination or perform writes. This proves the
native discovery and token exchange path for the private development test.
It does not prove refresh-token rotation or the existing public record's
connection. Both temporary accounts are now disconnected through ChatGPT's
normal UI. The owned tunnel, forwarder, and Next processes are stopped. The
private records are retained. Production settings are recorded below.

## Next public-record checks

The native development test passed. It does not establish that the existing
public record will adopt CIMD. Use these checks for an approved production
change:

1. Confirm production feature access without an upgrade or added charge.
2. Allow the exact ChatGPT document with only the intended MCP scopes.
3. Publish CIMD and pre-registered-only admission in one save. Keep DCR off.
4. Match the MCP client policy to that identity. Retain scope, owner,
   membership, and member API destructive-operation protections.
5. Deploy the verified MCP resource and tool-challenge fixes through the
   approved release.
6. Check the original public record's discovered registration mode. It must
   complete Connect and a current tool scan. If it retains the unusable
   predefined state, collect that evidence for the unsent support request.
7. Run the review cases and prepare submission for owner review.

The owner approved production configuration and the release. Final legal
acceptance and submission remain owner steps. No paid service is authorized.

Production Clerk now has the exact ChatGPT client metadata URL registered
with `catalog:read`, `catalog:write`, `offline_access`, `openid`, `email`, and
`profile`. The owner specifically approved the identity scopes. CIMD publication
is on. Admission is pre-registered clients only. DCR is off. PKCE is on.
Opaque access tokens and Include Audience off are unchanged. The saved
fallback scopes for a client that omits `scope` are `catalog:read` and
`offline_access`. The issuer discovery check advertises CIMD and S256 and
has no registration endpoint. The Hobby workspace required no upgrade.

The server preparation check found the app healthy at `509bbe0e`. Its saved
and live MCP client ID was the former predefined client; the member API OAuth
allowlist was unset. The authorized release is now deployed at
`17ccbdac26f26911aad818363c54bb80891e625c`. The live client ID is
`https://chatgpt.com/oauth/client.json`. The member API allowlist remains
unset. The deployed MCP contract checks, normal dashboard reload, and public
listing check passed. This repair has no database schema changes.

The portal's old account-connection bootstrap still requested `catalog:manage`
after the anonymous tool scan passed. The supported Connect drawer's
Reconnect and Continue controls refreshed the setup. The owner-approved
reviewer grant completed with `openid`, `email`, `offline_access`,
`catalog:read`, and `catalog:write`. The hosted flow uses the site-root
resource. The original public record now shows Configured and Account
connected. A fresh authenticated scan has no findings.

The dedicated reviewer remains non-Pro. No subscription was created. The owner
accepts its direct profile link. Public discovery excludes it and all four
sample listings return public 404. PR 434 deployed limited remote writes
under the existing dashboard quotas. Production catalog and profile cases
passed. PR 435 deployed the timestamp correction tools; the approved data
correction was rehearsed on a restored fresh backup and applied. No schema
changed. See [non-Pro access](non-pro-plugin-review-research-2026-10-06.md) and
[the current walkthrough](plugin-walkthrough-2026-10-05.md).
The older private Review connection requested its retired
predefined client; its different grant was canceled and it remains unlinked.
After Refresh tools, a new connection attempt still requested that client.
The consent was canceled again. Do not repeat Refresh tools to repair this
client binding or grant access to the retired client.

## Final test cleanup

Run this after the original public plugin works in production and passes its
connection, tool discovery, and review checks. Keep this step open until all
temporary access and test assets have been checked.

- [x] Disconnect the two private development test accounts in ChatGPT.
- [x] Stop the owned tunnel, forwarder, and Next processes. Confirm that
      loopback ports 3012 and 3217 are closed.
- [ ] Remove the temporary private Daylily CIMD Development and Daylily CIMD
      Automatic Dev plugin records through the normal product controls.
      Check for other private test connections and obsolete draft records
      created during this repair. Identify each record before removal.
      Obtain action-time confirmation if the product requires permanent
      deletion with no recovery flow.
- [ ] Check Clerk for remaining test grants. Revoke temporary grants. Remove
      obsolete test client registrations. Retain the intended development
      and production clients and the dedicated submission reviewer account.
- [x] Remove `apps/main/local/plugin-cimd-proof-20261005.sqlite` and its
      journal, WAL, or SHM files. Remove other isolated database copies created
      only for these tests. Check ownership before removal.
- [ ] Remove obsolete diagnostic ZIP variants, temporary probe scripts,
      forwarders, and temporary configuration created during this repair.
      Keep the final accepted package and its checksum.
- [ ] Check local and hosted development surfaces for remaining test
      processes, routes, tunnel exposure, and test-only environment overrides.
      Close temporary browser tabs.
- [ ] Retain the final sanitized report, relevant proof, and permanent
      automated regression tests. Record the completed cleanup in this plan
      and the test-state artifact. List any required item that remains.

## Cost boundary

The owner requires no added cost. Development Clerk features can be tested
without a plan upgrade. Use the local SQLite copy and existing development
tools. Do not buy a plan, enable a paid add-on, create paid infrastructure, or
run paid model or image calls. Confirm the cost and admission settings before
any later production configuration change.

See [Clerk development feature testing](https://clerk.com/pricing).
