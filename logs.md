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
- [2026-09-28] Tailwind spacing units: This app's Tailwind spacing scale uses `0.25rem` per step. When cleaning arbitrary pixel utilities, do not treat equal values at a 16px root size as exact replacements. Preserve the unit and compare computed styles at enlarged root font sizes.
- [2026-09-28] Shadcn lint coverage: Adding a UI path to an ESLint ignores-only config hides it globally, even when a later config enables rules. When scoping existing rules away from shared primitives, keep ignores-only entries unchanged and verify that ESLint scans the primitive files.
- [2026-09-28] Sidebar cascade layers: Unlayered `:root` and `.dark` sidebar tokens won over later duplicates in `@layer utilities` because normal unlayered declarations have higher cascade priority. When editing theme tokens, check computed light, dark, and portal values before removing a duplicate block.
