# Next 16 Cache Migration Notes

This document is historical. The older plan was written for a Vercel-hosted
site using remote Turso reads, function-level `unstable_cache`, and
mutation-time tag/path invalidation.

The current public-page strategy is different: the VPS uses Turso embedded
replica reads through `replicaDb`, public SEO pages use route-level TTLs, and
dashboard mutations do not invalidate public pages. See
[public-rendering-cache-strategy.md](./public-rendering-cache-strategy.md) for
the active decision record.
