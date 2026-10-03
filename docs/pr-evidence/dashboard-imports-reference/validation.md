# Dashboard Imports validation

The paired frames use Chromium 140.0.7339.16 at desktop 1024 × 1000 and mobile 402 × 874. Baseline product source is `e31a2cc34c3b1a75bc945acbfa19c75bfa8981aa`. After frames use the product source in this PR. Source PNG dimensions and hashes are in `capture-manifest.json`. Full-page frames can exceed the viewport height. The contact sheet keeps each frame at its source dimensions. Gray cells have no paired frame. The catalog-check loading and failure rows are after-only desktop states.

The three paired full-app tests passed before the product edits. The final tests cover four workflows. The baseline harness had an optional repaired-focus assertion. The maintained test requires Cancel to return focus to Import. Other after-only checks hold a write to test disabled controls and repeated Enter, reject a dashboard refresh after an actual saved write, and check existing-catalog failure/retry and a builder-excluded row.

| Check | Result |
| --- | --- |
| Desktop and mobile imports | 105 saved rows each, in batches of 100 and 5 |
| Selection and scrolling | Initial/individual/visible selection; 100-row cap; Show more; Return to top; pinned include/name and source row/name while the middle scrolls; no page overflow |
| Write retry and idempotency | Rejected write saves zero rows; retry succeeds; replay of the successful request creates zero additional rows |
| Pending input and focus | Selection, builder return and Start over disabled; repeated Enter sends no extra write; Cancel returns focus to Import |
| Saved write / failed refresh | 100 rows remain saved; separate warning and refresh retry; no write-failure message or repeated mutation |
| Draft and saved data | Builder return and reload preserve prepared rows; saved values and editor popup checked after reload |
| Group context | Existing, review and issue reasons/fields; builder-excluded original cells after reload |
| Start over | Cancel preserves draft; confirmation removes draft; existing listings survive |
| Non-Pro | Listing creation gated; prepared and enhanced downloads succeed and contain expected values |
| Normal signed-in route, before and after | Fresh Clerk test sign-in, real cultivar matcher and Pro viewer check, three saved listings, saved editor reopen/reload, Start over; original source file unchanged |
| Focused Vitest | 16 tests passed across seven files |
| Typecheck | Passed |
| Fresh source lint | Zero errors; 1199 → 1174 total warnings, 44 → 19 in Imports |

The full-app tests use the repository's loopback authentication/provider adapters and scoped cultivar-match and viewer-state fixtures. Actual writes, import keys, saved data, and editor reopen use the real application and SQLite. Those fixtures do not prove real matching or normal authentication. The separate normal signed-in check supplies that evidence with a disposable copy of the verified realistic database and search index. No saved session was copied. Its account frames, database, source file, traces and logs stay local and are not published.

Browser diagnostics contain no uncaught page errors. The injected write, refresh and catalog-check failures produce expected 500 responses, tRPC error logs and red Next development issue indicators in those frames. Navigation and reload cancel requests. Next development logs also record aborted-request ECONNRESET/JSON errors during those transitions. No production telemetry, external purchase, merge or deployment was performed. Remaining lint warnings concern the existing responsive catalog-table layout and bounded table scroll geometry; lint policy is unchanged.
