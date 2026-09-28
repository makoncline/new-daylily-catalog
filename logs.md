# Reusable Project Lessons

Read a note when its topic affects the work. These are historical lessons;
check current code before applying them.

- [2026-09-24] Cultivar social images: Next ImageResponse rejected WOFF2, and Satori ignored `inset` on absolute overlays. When changing social cards, use TTF or OTF fonts, set explicit overlay bounds, and inspect a generated PNG.
- [2026-07-19] AHS award labels: V2 AHS uses `L/W` for both the Lambert-Webster and Lenington All-American awards. When expanding award codes, keep the combined label or use the award URL to distinguish them.
- [2026-07-21] Cloudflare origin headers: A prior hostname-wide Cache Rule followed ordinary Next `Cache-Control` when no CDN-specific header was present. When excluding a public document, send an explicit CDN `no-store` directive and verify the result at the edge.
- [2026-07-17] Atlas lazy images: Waiting for `image.decode()` before scrolling can stall on lazy images the browser has not requested. When capturing a full page, traverse its geometry first, then wait for scoped visible images and check the final page height.
- [2026-07-16] Seeded Turso restores: A physical-order SQLite dump can leave mixed data after rejected inserts even when the Turso CLI exits successfully. When changing seed sync, preserve child-first drops, parent-first inserts, and post-sync table-count checks.
- [2026-06-18] R2 uploads: R2 rejected virtual-hosted S3 bucket requests in this project. When creating an R2 `S3Client`, use `forcePathStyle: true` and verify an upload against the intended endpoint.
- [2026-09-27] Atlas visual proof: A successful capture shows that the state was reached. When reviewing a UI change, inspect before and after images for clipping, overflow, missing content, and layout changes.
- [2026-09-27] Search candidate proof after index refactor: `mcp-real-sqlite-proof.test.ts` needs `.tmp/search/public-search-candidate.sqlite` with the current schema; the old index path does not satisfy cultivar search. After a search-index refactor, build the candidate from the sanitized local snapshot before the opt-in proof.
- [2026-09-27] Side-mutation manual Save: A list membership or image reorder action can write immediately and leave no parent form fields to send. When the user then clicks Save, the no-field branch must show success and close the editor without a redundant parent update.
