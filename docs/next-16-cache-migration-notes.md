# Next 16 Cache Migration Notes

## Goal

Document why this branch was refactored the way it was, and how that work lowers the cost of a later move to Next 16 cache components and tag-based invalidation.

## What This Branch Changed

### 1. Public data is split into reusable read models

Instead of treating public pages as one route-shaped fetch, the public layer is now organized around smaller sections and shared reads.

See:

- [src/server/db/public-profile-cache.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/public-profile-cache.ts)
- [src/server/db/public-cache.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/public-cache.ts)
- [src/server/db/public-seller-data.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/public-seller-data.ts)
- [src/server/db/getPublicListings.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/getPublicListings.ts)
- [src/server/db/getPublicCultivars.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/getPublicCultivars.ts)

That matters because Next 16 caching works better when the cacheable unit is a function/component-sized read model rather than a whole page blob.

### 2. Listing pages use collection-first reads

`/:slug` no longer needs to think in terms of one giant page query only. It now has a clearer split between:

- listing page membership/order
- batched listing-card reads

See:

- [src/server/db/getPublicListings.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/getPublicListings.ts)
- [src/app/(public)/[userSlugOrId]/_lib/public-profile-route.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/app/(public)/[userSlugOrId]/_lib/public-profile-route.ts)

That is closer to the Next 16 model where cached data ownership is explicit and shared across routes.

### 3. Cultivar pages are split by section

Cultivar data is now closer to page sections instead of one monolithic route fetch.

See:

- [src/server/db/getPublicCultivars.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/getPublicCultivars.ts)
- [src/server/db/public-cache.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/db/public-cache.ts)

That is useful later if these become separately cached server components or `'use cache'` functions behind `Suspense`.

### 4. Invalidation now starts from semantic refs

Mutation handlers no longer encode most path/tag behavior directly. They emit semantic refs and a central mapper resolves those refs into the current invalidation actions.

See:

- [src/types/public-types.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/types/public-types.ts)
- [src/server/api/routers/dashboard-db/public-isr-reference-helpers.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/api/routers/dashboard-db/public-isr-reference-helpers.ts)
- [src/server/api/routers/dashboard-db/public-isr-invalidation.ts](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/src/server/api/routers/dashboard-db/public-isr-invalidation.ts)

That is the most important bridge to Next 16. It separates:

- what changed
from
- how invalidation is applied

## Why This Helps the Next 16 Move

Next 16 cache components push toward:

- explicit cached reads
- tag ownership at the data/function/component level
- central tag invalidation

This branch already moves in that direction:

- read models are more explicit
- shared data is less route-shaped
- mutation handlers emit semantic change refs
- the invalidation resolver is centralized

So the later migration can focus on changing the cache transport:

- today: `unstable_cache` plus `revalidatePath` / `revalidateTag`
- later: `'use cache'`, `cacheTag`, `revalidateTag(..., "max")`, and possibly `updateTag`

without redesigning the whole public data model again.

## What Was Intentionally Simplified

This branch does **not** try to fully simulate the final Next 16 model.

Intentional simplifications:

- `/:slug/page/:n` is treated as an SEO snapshot, not a live surface
- cultivar pages are allowed to be coarse/stale
- mutation-time invalidation is still used for now
- seller refs were collapsed to one `seller` ref to keep the model smaller

Those are tradeoffs to keep the current app simpler while still moving in the correct architectural direction.

## Expected Later Migration Path

1. keep the current semantic ref layer
2. add the dirty-ref cron described in [docs/public-invalidation-cron-plan.md](/Users/makon/.codex/worktrees/c829/new-daylily-catalog/docs/public-invalidation-cron-plan.md)
3. move the public read models to Next 16 cache primitives
4. move invalidation from path-heavy behavior toward tag-first behavior

The point of this branch was not just to optimize current ISR. It was to make the public layer easier to reason about before the Next 16 switch.
