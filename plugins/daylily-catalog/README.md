# Daylily Catalog plugin

This folder is the source package for the OpenAI plugin submission. The
package name is `daylily-catalog`. The display name is Daylily Catalog.
The plugin uses the app's remote MCP server and Clerk OAuth.

## Build

From the repository root, run:

```sh
pnpm plugin:build
```

The ZIP is saved in ignored `local/plugins/`. It includes only the manifest,
MCP configuration, and icon. No credentials or member data are included.

Run the focused checks before building:

```sh
RUN_MCP_MEMBER_WRITE_PROOF=1 pnpm verify --tests tests/mcp-read-only.test.ts tests/mcp-member-write-sqlite.test.ts tests/daylily-plugin-package.test.ts
```

The SQLite write proof needs this checkout's local realistic-data fixture.
It copies that fixture into a disposable database. It does not write to Turso.

## Review preparation

1. Deploy the privacy and MCP fixes through the normal app release process.
   Check the live privacy text and all tool labels before a scan.
2. Use a dedicated sample account. Give it password sign-in, existing member
   permissions, private notes, lists, hidden and public listings, a profile
   story, and at least two profile photos. Do not use a real member's account.
   Keep its credentials out of this folder and Git.
3. Upload the ZIP to the
   [current draft](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ac30d5ff6508191b3d2647ec281fa3e).
4. Complete MCP setup and domain verification in the portal. Use the exact
   challenge value and origin shown there if verification is required. The
   draft currently shows Domain verified. Connect Clerk OAuth and inspect
   the current tool scan. Resolve findings before submission.
5. Enter the demo credentials separately in Review details. The reviewer
   must not need an email code, MFA approval, or private network access.
6. Run the five positive and three negative cases in `plugin.json` through
   ChatGPT on desktop and mobile. The [earlier recordings](../../apps/main/docs/member-mcp-feature-proof-2026-09-30.md)
   show the local implementation. They are supporting evidence. Add
   `extensions.com.openai.review.demo_recording_url` with a current plugin
   walkthrough before final submission. Do not claim the earlier recordings
   prove the directory plugin has been tested.
7. Check the imported review information and release notes. Submit only
   after the required scans pass and the owner confirms the attestations.

The May 18 rejection concerned privacy disclosures and unneeded user data.
The current changes disclose reads, writes, permissions, recipients, retry
receipts, and dashboard handoffs. Write results use explicit field schemas.
Record versions remain available for stale-write checks.

On October 4, the old unpublished entry blocked its ZIP update with "Publish
the existing MCP app before updating its plugin ZIP." It had no Connect
action. A fresh draft with the package name `daylily-catalog` accepted the
same package and reported No Issues for metadata. It shows the correct MCP
endpoint and a Connect action. Use the current draft above. Neither entry
has been submitted or published by this change.

OAuth setup is still blocked. The fresh draft has no attached OAuth client.
The current Connect panel shows Authorization unavailable and has no
predefined client-ID field. Clerk discovery does not advertise DCR or CIMD.
Resolve the supported predefined-client setup path before the live tool scan.
Passing package metadata and domain verification does not prove a connection.
Keep client secrets and tokens out of the ZIP. A change to Clerk client
admission needs a separate security review and owner approval.

The plugin has no embedded UI, bundled skills, or subscription checkout.
Existing members use their account permissions. Destructive removal remains
in the dashboard approval flow. OpenAI's destructive tool label also covers
field overwrites; it is separate from that product approval flow.

## Hosted AI compute

Hosted ChatGPT plan usage is deferred in [GOALS.md](../../GOALS.md). It is a
separate integration. Do not add it to this plugin release.

## Sources

- [Package format](https://developers.openai.com/plugins/build/plugins)
- [Submission flow](https://developers.openai.com/plugins/deploy/submission)
- [Plugin rules](https://developers.openai.com/plugins/plugin-guidelines)
- [Submission validation](https://developers.openai.com/plugins/deploy/submission-errors)
