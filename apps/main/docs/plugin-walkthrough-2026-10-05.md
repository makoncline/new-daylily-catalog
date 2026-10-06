# Plugin review walkthrough

Updated on 2026-10-06.

## Production proof

The five positive and three negative submission cases were checked against
the production MCP endpoint. The member cases used the dedicated non-Pro
reviewer and a temporary private ChatGPT connection. The original submission
draft has working OAuth and a clean authenticated scan of 26 tools.

| Case | Observed result |
| --- | --- |
| Public inventory | Search results, exact listing, photo, price, and grower page agree. |
| Cultivar research | Cultivar detail and public grower collections returned source links. |
| Own catalog | Hidden listings, synthetic private note, memberships, and profile images were read. |
| Catalog writes | Listing and list creation, edits, and membership addition saved correctly. A repeat run reused the samples and kept one membership. |
| Profile | Description and photo order saved. Exact reads and the normal dashboard agree. Photo addition opens the existing image manager. |
| Foreign private data | ChatGPT refused the request. Separate isolated server integration tests prove ownership rejection. No foreign production probe was made. |
| Destructive actions | Exact owned dashboard review links were returned. A populated list cannot be deleted. Opening the removal link did not mutate data. Cancel kept the membership. |
| Payments | No checkout or charge was started. The plugin directs access problems to support. |

Additional checks covered cultivar linking, name synchronization, title
restoration, repeat membership addition, and help search.

## Releases

- [PR 434](https://github.com/makoncline/new-daylily-catalog/pull/434) deployed
  limited non-Pro remote access with the existing dashboard quotas.
- [PR 435](https://github.com/makoncline/new-daylily-catalog/pull/435) added the
  reviewed timestamp data correction. Legacy text versions caused profile
  edit conflicts. The correction was rehearsed against a restored fresh
  backup, applied, and checked in production. No schema changed. See
  [the correction report](member-version-storage-correction-2026-10-06.md).

All four review listings return public 404. Seller search, the directory, and
the sitemap exclude the reviewer. Its direct profile link works as accepted
by the owner. Keep new samples hidden from creation. Public replica reads can
lag a visibility change; a primary read alone does not prove public removal.

## Review video and package

The final video uses edited captures of real production ChatGPT results and
normal site screens. It includes local narration, visible English captions,
a subtitle track, and chapter metadata. It is not a continuous screencast or
an exported raw tool trace. The older mixed local/production draft is obsolete
and must not be submitted.

Media and the private reviewer report stay in this task's visualization
folder, outside Git. The report records the hosted video URL and final ZIP
checksum. Keep the URL out of this public repository. The package builder
requires `--review-video-url` and adds it to
`extensions.com.openai.review.demo_recording_url` in the ignored ZIP.

Reviewer credentials stay in the original portal's private Review details.
They must not appear in the video, ZIP, public docs, or PR description.

See [the submission checklist](../../../plugins/daylily-catalog/README.md).
The owner performs final Submit and legal attestations. Hosted ChatGPT compute
remains deferred in [GOALS.md](../../../GOALS.md).
