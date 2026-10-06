# Plugin walkthrough status

## Submission requirement

The [OpenAI submission guide](https://developers.openai.com/plugins/deploy/submission)
requires a reviewer-accessible video URL. The video must show the test cases
and plugin functions. Run the positive cases with the dedicated test account
before submission. Keep credentials outside the public package.

## Completed draft

The local artifact is `daylily-plugin-walkthrough-draft.mp4`. It has narration,
visible English captions, an English subtitle track, and 15 chapters.
It is a review draft. It is not the final submission recording.

The artifact folder is `plugin-walkthrough-2026-10-05` in this task's
visualizations directory. It contains the MP4, subtitle files, source manifest,
render script, chapter list, and verification results. Media stays outside Git.

The draft includes:

- October 5 production portal captures of the configured original plugin and
  its clean scan.
- October 5 ChatGPT public catalog responses and the actual public pages.
- September 30 local recordings of member reads, listing and list writes,
  cultivar links, profile fields, photo ordering, and dashboard approvals.
- October 5 ChatGPT refusals for foreign private data, direct deletion, and
  payment requests. This test connection has no linked member account.

The local recordings use real app handlers, a local Next dashboard, isolated
SQLite, synthetic records, and simulated Clerk. They show an earlier dashboard
presentation. They do not prove the current production reviewer connection.
The draft omits the old crop-coordinate controls. See
[local recording limits](member-mcp-feature-proof-2026-09-30.md#proof-limits).

The current ChatGPT captures show prompts and responses. They do not contain
an exported tool invocation trace. A model refusal is not proof of a server
ownership rejection. The labeled local checks show that separate boundary.

## Remaining submission checks

1. Deploy the limited non-Pro remote access change. Keep the reviewer non-Pro,
   within the 25-listing and one-list limits. Keep sample listings hidden.
   Its direct profile link is acceptable; public discovery must exclude it.
2. Use a connection bound to the current production OAuth client. The old
   private Review connection still uses the retired client for member access.
3. Run all five positive and three negative cases from
   `plugins/daylily-catalog/review-cases.json`. Record the current member flows
   with sample data. Replace the local member excerpts in the submission cut.
4. Host the completed video at an accessible URL. Check that reviewers can
   open it without owner sign-in. Set `review.demo_recording_url` in the package
   or the applicable portal field.
5. Review the exact submission materials. Obtain owner approval for final
   submission and the required legal attestations.

No video was hosted or submitted during this work. No paid narration,
inference API, upload service, subscription, or new infrastructure was used.
