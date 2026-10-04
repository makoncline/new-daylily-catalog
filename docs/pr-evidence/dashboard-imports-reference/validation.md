# Dashboard Imports validation

The sheet uses Chromium 140.0.7339.16 at desktop 1024 × 1000 and mobile 402 × 874. Baseline product source is `e31a2cc34c3b1a75bc945acbfa19c75bfa8981aa`. Empty, ready, confirmation, rejected write, next batch, complete, Start over and saved-write refresh-warning after frames use combined product source `416347053cbc207edb7495da468d8992a1a4b666` on base `ce72669672a82f2396225ef60b793ba62f631fbc`. Review/issue/existing groups, non-Pro downloads, catalog-check loading/failure and builder exclusions retain earlier after frames from `487d502b40447ca828c45460b15dc972954cd733`. Each row and manifest frame identifies its source. Do not read the earlier rows as combined-source proof.

The image is 2960 × 16548 and keeps each frame at its source dimensions. Full-page frames can exceed the viewport height. Gray cells have no paired frame. New states are marked AFTER ONLY; retained older states are marked EARLIER. The prior complete sheet and its 42 hashes are preserved in Git at `487d502b` and locally in ignored task evidence.

The three paired full-app tests passed before the product edits. Four workflows passed on that earlier source: three passed in the full run, and the added catalog-check/exclusion workflow passed in isolation after its query-retry wait was fixed. The initial full-run failure is retained locally. The baseline harness had an optional repaired-focus assertion. The maintained test requires Cancel to return focus to Import. Other after-only checks hold a write to test disabled controls and repeated Enter, reject a dashboard refresh after an actual saved write, and check existing-catalog failure/retry and a builder-excluded row.

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


On 2026-10-04, parent review found that a non-applied refresh (`false`) cleared the warning. The correction keeps saved batch progress, shows Retry refresh, and leaves the existing account/provider checks in the refresh function intact. A bounded DOM regression failed before the fix, then passed; it checks warning, saved batch count, next-batch progress, stable import key, absence of write-failure reporting, and refresh retry without another mutation. This is a mocked canceled-result check, not a real-browser cancellation claim.

Current main `ce72669672a82f2396225ef60b793ba62f631fbc` was merged locally. Both log histories are preserved. #417 changes remain in the base and are not part of the Imports diff. Imports uses `useReactTable` directly; the main changes to URL-sync hooks retain their default behavior for the saved-listing table. The combined-source checks and newer frames are recorded in ignored task evidence, with exact source and result labels. The original 42 frame hashes were verified unchanged before preparing this new sheet. Publication and PR CI remain pending; this is not reviewed readiness.


The combined product source `416347053cbc207edb7495da468d8992a1a4b666` passed the two affected Chromium workflows (desktop and mobile, 36.9 seconds). Each run saved 105 listings, checked pinned columns during middle scrolling, rejected and retried a write, retried a throwing refresh, replayed an import request without duplicates, and reopened saved fields in the listing editor after reload. No uncaught page errors were recorded. Typecheck, three focused DOM tests, changed-file format, and uncached hook lint passed on the combined source. The combined-source frames now appear in the complete sheet. Their source images and diagnostics are in ignored `apps/main/local/imports-reference/combined-after-41634705/`. No unchanged broad suite or normal-auth browser matrix was repeated.


A fresh uncached full-app lint pass after the main merge reports zero errors and 1174 warnings (19 in Imports), unchanged from the earlier after count. Parent code and affected UI review was CLEAN at `9dc4171dea016ea227c43a020771e841f9e715b0` against `ce72669672a82f2396225ef60b793ba62f631fbc`. Subsequent changes update evidence only. Public draft creation, rendered-image verification and exact-head CI remain pending.
