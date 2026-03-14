# Public Invalidation Cron Plan

## Goal

Move public invalidation for crawler-facing pages away from mutation-time path/tag branching and toward one coarse hourly processor.

Target pages:

- `/catalogs`
- `/:slug`
- `/:slug/page/:n`
- `/cultivar/:slug`

Human-facing freshness should continue to come from live paths like `/:slug/search`.

## Current Bridge

This branch already uses semantic invalidation references instead of route-specific mutation logic.

See:

- [src/types/public-types.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/types/public-types.ts)
- [src/server/api/routers/dashboard-db/public-isr-reference-helpers.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/api/routers/dashboard-db/public-isr-reference-helpers.ts)
- [src/server/api/routers/dashboard-db/public-isr-invalidation.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/api/routers/dashboard-db/public-isr-invalidation.ts)

Current ref types:

- `seller:{userId}`
- `listing:{listingId}`
- `cultivar:{segment}`
- `catalogs:index`

That ref layer is intended to stay stable when the transport changes from immediate invalidation to cron-driven processing.

## Planned Model

Mutations should write the semantic refs they affected into one dirty table. A VPS cron should periodically:

1. read new refs since its checkpoint
2. dedupe them
3. resolve them into current invalidation targets
4. invalidate local caches
5. advance its checkpoint

The key change is:

- today: mutation emits refs and invalidates immediately
- later: mutation emits the same refs and persists them

## Storage

Use one table for dirty refs and keep per-host checkpoints separate.

Recommended shape:

- one row per `(referenceType, referenceId, dirtyAt)`
- one checkpoint per consumer/host

Do not use `KeyValue` for the dirty rows themselves. `KeyValue` is acceptable for host checkpoints only.

## Mutation Policy

Write only the affected semantic refs.

Expected patterns:

- listing update: `listing`, `seller`, `catalogs:index`
- listing create/delete: `seller`, `catalogs:index`, and linked/old `cultivar`
- list membership change: `seller`, `listing`
- profile update: `seller`, `catalogs:index`
- listing image update: `listing`
- profile image update: `seller`, `catalogs:index`

One exception remains even after cron exists:

- slug changes should still carry old-path context, because the old slug cannot be inferred from current DB state after the write

## Resolution Policy

The future cron resolver should stay aligned with the current direct resolver in [src/server/api/routers/dashboard-db/public-isr-invalidation.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/api/routers/dashboard-db/public-isr-invalidation.ts).

Planned mapping:

- `seller` -> seller root path plus seller-scoped tags
- `listing` -> seller root, current linked cultivar, listing-card tag
- `cultivar` -> cultivar path plus cultivar-scoped tags
- `catalogs:index` -> `/catalogs`

Do not directly invalidate `/:slug/page/:n` from mutations or cron. Those deeper SEO pages should be treated as daily snapshots.

## Freshness Contract

These pages are SEO snapshots, not live app views.

Accept up to 24 hours of staleness for:

- listing order
- pagination boundaries
- counts
- cultivar offer/photo ordering

Immediate freshness still matters for:

- seller identity/profile changes
- listing card content
- slug/path changes
- create/delete/link/unlink membership changes

## Multi-Host Transition

While production is split across Vercel and the VPS:

1. run one cron on the VPS
2. call a protected invalidation-processing route on both hosts
3. let each host read the same dirty refs
4. let each host keep its own checkpoint

Do not share one global checkpoint across both hosts.

## Why This Helps

This reduces mutation complexity and makes the invalidation model easier to operate on a long-running server:

- mutations record what changed
- one resolver decides what to invalidate
- the same ref layer can later map to Next 16 tag-first caching
