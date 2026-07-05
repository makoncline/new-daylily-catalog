# Public Rendering and Cache Strategy

Date: 2026-05-10

This document records the public-page strategy after moving the main site from
Vercel to the VPS and adding Turso/libSQL embedded replica support.

> 2026-07-05 update: this document records the earlier VPS-local ISR baseline.
> High-cardinality public HTML is now moving to Cloudflare as the single
> whole-document cache owner. Use
> `public-cloudflare-html-cache.md` for current public HTML cache rollout work.

It supersedes the older direction in `next-16-cache-migration-notes.md` for
public pages. That note was written for a Vercel/remote-Turso world where
function-level caching and precise invalidation reduced remote reads and
function pressure. On the VPS, public reads can be served from a local embedded
replica, so the simplest correct path is different.

## Decision

Use one app-level cache owner for public HTML: route-level time-based rendering
and revalidation.

- Keep dashboard, auth, mutations, and webhooks on the remote Turso primary via
  `db`.
- Use `replicaDb` for public read models. On the VPS, `replicaDb` can read from
  `TURSO_EMBEDDED_REPLICA_URL`; on Vercel or local envs without that variable,
  it aliases the normal database client.
- Public `unstable_cache` wrappers and public data-cache tags are removed.
- Prefer route-level TTLs for public SEO pages instead of mutation-specific
  function-cache invalidation.
- Do not invalidate public pages from dashboard mutations. A mutation can
  outpace replica sync, so immediate regeneration can still produce stale HTML.
- Do not add Cloudflare HTML caching until the Next/app-level model is simpler
  and measured. If Cloudflare HTML caching is added later, it should be the
  explicit edge cache layer with known TTLs and auth/dashboard/API bypass rules.

## Why

The old system had several overlapping freshness mechanisms:

- static/ISR route output
- `unstable_cache` wrappers around public data reads
- tag invalidation
- path invalidation
- an internal revalidation route
- possible Cloudflare caching

That complexity made sense when remote Turso latency and Vercel limits were the
main constraints. With the VPS-local embedded replica, public route cache misses
are cheap enough that the extra data-cache layer is no longer buying enough to
justify its maintenance cost.

The new baseline should be easier to reason about:

```text
dashboard write -> remote Turso primary
replica sync -> local replicaDb reads
public route TTL -> bounded public staleness
```

Expected stale window is roughly:

```text
replica sync interval + route TTL
```

For catalog pages, that is acceptable as long as the chosen TTL is explicit.

## Benchmark

Method:

- Ran representative public read-model functions directly.
- Bypassed `unstable_cache` because the benchmark ran outside a Next request
  context.
- Used a temporary read-only Turso token for the remote run.
- Used an embedded replica file under ignored `local/` for the replica run.
- Ran each workload seven times after a one-run replica warmup.

These numbers measure database/read-model work, not full React render time and
not route cache hits.

| workload              | remote p50 | replica p50 | speedup |
| --------------------- | ---------: | ----------: | ------: |
| seller summary        |    527.2ms |      12.3ms |   43.0x |
| seller content        |     55.8ms |       0.1ms |  420.1x |
| seller lists          |     94.2ms |       9.0ms |   10.5x |
| profile page 1        |    707.2ms |       9.1ms |   77.6x |
| catalog cards         |    439.3ms |      20.4ms |   21.6x |
| catalog route entries |    340.6ms |       1.6ms |  217.1x |
| cultivar listing ids  |    397.6ms |       0.9ms |  463.4x |
| cultivar page         |   1289.9ms |      15.0ms |   86.1x |

Conclusion: public reads from the embedded replica are fast enough that route
cache misses are no longer scary. Cache hits still win, but the miss path does
not need a second function-level cache layer to protect Turso or Vercel.

## Target TTL Shape

Start conservative and tune from real traffic:

- Seller root pages: 10-15 minutes.
- Seller paginated pages: 10-30 minutes.
- `/catalogs`: 15-30 minutes.
- Cultivar pages: 1-24 hours, depending on how fresh public offers should be.
- Sitemaps: 24 hours.
- Public search: dynamic or short-lived route/data caching; not a primary SEO
  surface.
- Dashboard/API/auth: no public cache.

The first implementation should favor one or two shared constants over many
route-specific knobs. Add route-specific TTLs only when measurement shows a real
need.

## Migration Plan

1. Keep the `replicaDb` split and VPS replica env.
2. Use direct public read-model functions instead of `public-cache.ts` and
   `public-profile-cache.ts`.
3. Set explicit route-level TTLs on public SEO routes.
4. Remove mutation-time public invalidation. A mutation may outpace replica
   sync, so immediate regeneration can still produce stale public HTML.
5. Delete unused public cache tags, `unstable_cache` wrappers, and tests that
   only verify the old tag/cache behavior.
6. Measure route MISS latency and public Turso read volume after deployment.

Do not introduce a Rolling Oaks style whole-site JSON snapshot as the default
architecture for this app. That pattern is useful for a single-seller catalog,
but Daylily Catalog has many sellers, cultivar pages, cross-seller offer pages,
search, route aliases, and dashboard writes. A whole-site snapshot would add a
new freshness system on top of the replica and route cache.
