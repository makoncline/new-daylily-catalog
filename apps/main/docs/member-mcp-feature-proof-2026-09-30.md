# Member MCP feature proof

Date: 2026-09-30

## Current behavior

Remote MCP exposes 26 tools. Browser WebMCP exposes 10 separate page tools.
Remote MCP does not write profile stories or add photos. It does not accept
`logoUrl` in profile edits. Photo addition opens the owned listing or profile
image manager. The browser cropper supports labelled numeric controls and
square WebP output at a maximum of 1,600 pixels. Story edits open the rich
text editor. The member API still supports the app's existing native flows.

Safe writes create or edit one record per call. List additions accept one
listing per call. A client can repeat that call. Deletion, list member removal,
image removal and cultivar unlink require the dashboard review flow. A list
cannot be deleted while it has members. Navigation does not perform a removal.

Public reads use the local search index or public replica. They do not fall
back to the live database. Member reads use bounded pages and exact owned
records. They do not return catalog totals or run aggregate count queries.

## Videos

These are silent local recordings with captions. Total duration is about nine
minutes. The ten MP4 files are attached to [PR 404](https://github.com/makoncline/new-daylily-catalog/pull/404).

| Video                                                                                                                   | Duration | Shown behavior                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [01: Public search, catalogs and help](https://github.com/user-attachments/assets/823abc5d-7511-4d00-b7b6-e2abce5c6da4) |      45s | Nine public tools. Cultivar and listing search/detail, seller profiles, lists and help.                                                       |
| [02: Private records and filters](https://github.com/user-attachments/assets/82cfbbaa-84b1-4356-880c-5199fa7081be)      |      38s | Owned profile, lists, listings and images. Bounded pages and photo filters.                                                                   |
| [03: Create and edit listings](https://github.com/user-attachments/assets/221605dc-bf3b-4903-9589-34a26f22fa86)         |      35s | Fields, price, private note and visibility. Same-request retry and stale-edit rejection.                                                      |
| [04: Cultivar reference links](https://github.com/user-attachments/assets/054be238-37ba-4535-8690-c12796b0ada2)         |      25s | Link, name sync and dashboard unlink approval.                                                                                                |
| [05: Lists and membership approvals](https://github.com/user-attachments/assets/f523af2a-61c4-4565-955e-154b71762775)   |      88s | Create/edit, add, repeated add, batch removal review and cancel. Empty-list deletion and nonempty-list guard.                                 |
| [06: Profile and dashboard links](https://github.com/user-attachments/assets/84a61367-dc54-4e7c-b55a-22330106fe4b)      |      50s | Profile fields, URL editor, story and block focus, import and tags.                                                                           |
| [07: Listing photos](https://github.com/user-attachments/assets/3b9242ce-5364-4ea5-a68b-2c213f384495)                   |      63s | Crop validation, resize, successful local upload and three variants. Reorder, refresh, removal cancel and approval.                           |
| [08: Profile photos](https://github.com/user-attachments/assets/2ab29e53-3fac-4030-9da8-d11b124d8a40)                   |      72s | Portrait crop, resize, successful local upload and variants. Reorder, refresh, removal cancel and approval.                                   |
| [09: Deletion and access checks](https://github.com/user-attachments/assets/a1b43210-ffd5-4d17-87d4-a29f61f1f04a)       |      51s | Listing deletion cancel and approval. Anonymous, read-only, unapproved-client and foreign-owner rejection. Removed inputs and tools rejected. |
| [10: Browser WebMCP](https://github.com/user-attachments/assets/e4c82381-5ab9-44b8-9409-a04008d942c1)                   |      67s | All ten page tools, including both image editor links.                                                                                        |

### Remote tool coverage

| Tools                                                                                                                                                                                                | Video  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `search_cultivars`, `get_cultivar`, `search_public_listings`, `get_public_listing`, `list_public_profiles`, `get_public_profile`, `list_public_profile_lists`, `list_public_listings`, `search_help` | 01     |
| `get_profile`, `list_lists`, `get_list`, `list_listings`, `get_listing`, `list_images`, `get_image`                                                                                                  | 02     |
| `create_listing`, `update_listing`                                                                                                                                                                   | 03     |
| `link_listing_to_cultivar`, `sync_listing_cultivar_name`                                                                                                                                             | 04     |
| `create_list`, `update_list`, `add_listing_to_list`                                                                                                                                                  | 05     |
| `update_profile`                                                                                                                                                                                     | 06     |
| `reorder_images`                                                                                                                                                                                     | 07, 08 |
| `open_dashboard`                                                                                                                                                                                     | 03–09  |

All remote names have the `daylily.` prefix.

### Dashboard handoff coverage

| Targets                                                                                                 | Video |
| ------------------------------------------------------------------------------------------------------- | ----- |
| `create_listing`, `edit_listing`                                                                        | 03    |
| `unlink_listing_cultivar`                                                                               | 04    |
| `create_list`, `edit_list`, `manage_list`, `remove_listings_from_list`, `delete_list`                   | 05    |
| `profile`, `edit_profile_url`, `edit_profile_content`, `remove_profile_content_block`, `import`, `tags` | 06    |
| `manage_listing_images`, `remove_listing_image`                                                         | 07    |
| `manage_profile_images`, `remove_profile_image`                                                         | 08    |
| `delete_listing`                                                                                        | 09    |

### Browser tool coverage

Video 10 calls `navigate`, `dashboard-state`, `search-cultivars`,
`update-profile`, `create-listing`, `update-listing`, `link-cultivar`,
`create-list`, `open-image-editor` and `add-listing-to-list`.
Browser names also have the `daylily.` prefix. They use hyphens where the
remote tool names use underscores.

## Fresh real Clerk OAuth proof

The normal development Clerk consent flow completed on 2026-09-30. It used
the existing approved client and `catalog:read catalog:write` scopes. The
local Next server used a disposable copy of this worktree's seeded SQLite
database. The original seed was not changed by this run.

The real HTTP smoke passed these checks:

- MCP initializes with protocol `2025-11-25` and lists exactly 26 tools.
- All six removed story and photo tools are absent. `logoUrl` is absent.
- Anonymous requests are rejected. Owned MCP and member HTTP pages agree.
- Owned listing and profile image links use the trusted local origin and
  exact image anchors. MCP and member API handoff paths agree.
- Listing and list create/edit, cultivar link/name sync, list addition,
  normal profile fields and member HTTP list edits succeed and read back.
- Nonempty-list deletion is blocked. Removal and empty-list deletion return
  review links. Profile image reorder reads back in the requested order.
- The disposable database passes `quick_check`. It contains one new test
  listing and one new test list. No remote database was used.

No access token, authorization code, private profile fields or full member
records are included in this report. Chrome first blocked the callback with
`ERR_BLOCKED_BY_CLIENT`; the normal callback then completed. No credential
extraction or browser protection bypass was used.

## Validation

- Current affected Vitest run: 38 passed across four files. This includes
  the opt-in SQLite MCP write proof and member API image storage proof.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with existing design warnings and zero errors.
- The recorder passed all tool and handoff coverage assertions. It checked
  the stored photo bytes, three real variants and displayed image order.
- All ten MP4 files loaded in the local Chromium gallery without media errors.
- New tracked tests cover numeric crop inputs and viewport changes in a real
  browser, plus successful member API storage and variants with SQLite.

These local checks precede the latest main-branch integration. See the PR for
the exact final commit and its CI results. An earlier green CI run does not
establish that a later commit passes.

## Proof limits

The video client sends actual JSON-RPC requests to the real handler in a test
process. Clerk is simulated at that external boundary. The dashboard runs on
a real local Next server and disposable SQLite. A recording polyfill supplies
the browser WebMCP registry. The separate Clerk smoke above uses real bearer
tokens and real local HTTP routes; it is not the video transport.

Photo signing and attachment use the real shared image router through a test
transport. The browser sends its cropped bytes to loopback storage. Ownership,
object checks, database attachment and Sharp variants use the real app code.
Moderation provider responses are simulated. External bucket permissions and
real provider moderation remain unverified.

An open dashboard can keep a cached image order after a remote reorder. The
photo videos use the visible Refresh dashboard data control and verify IDs in
display order. This is a limitation for an already open dashboard.

Each exposed tool and handoff is shown. This does not prove every input,
import execution, tag printing, story block deletion or zero app regressions.
Local SQLite query checks do not measure billed Turso rows.

The earlier deployed-preview smoke failed because no local public database
source was configured. The public guard remains closed; no live primary
fallback was added. The GitHub Codex review was blocked by the account review
limit. Its previous clean review covers an older commit. These limits remain
explicit until fresh evidence replaces them.
