# Local Issue Debugging Runbook

Use this process when a production-only or crawler-amplified issue needs to be
reproduced safely against local code and a local database copy before shipping a
fix.

This runbook is self-contained. It uses the July 2026 memory/OOM investigation
as an example, but it should still be usable from a fresh checkout without any
ignored local harness files or incident-specific notes.

## Principles

- Reproduce production shape locally before changing broad architecture.
- Use a local database copy by default. Do not hit live Turso unless that is
  explicitly part of the test.
- Compare matched workloads. A suspect route only matters if it behaves
  differently from a similar clean control at the same request shape.
- Change one variable per run. Name runs after the actual variable under test.
- Separate the primary fix from hygiene. Useful cleanup can ship, but it should
  not be counted as proof unless it changes the failing signal.
- Keep durable notes while running the investigation. Future agents should be
  able to read the doc and continue without rediscovering the same dead ends.

## Build a Reproduction Harness

Fresh checkouts do not include any private or ignored local harness. Treat a
harness as a disposable tool that must satisfy the requirements below, not as a
tracked repo dependency.

Minimum harness requirements:

- Run against the current checkout and record the exact git commit.
- Use a local database copy by default, and make the database URL visible in the
  run metadata. If a test intentionally hits a remote system, label that clearly.
- Start the app in a mode that matches the production behavior under
  investigation as closely as practical. For Next.js memory issues, prefer a
  production build/start or a production-like Docker run over dev mode.
- Drive a fixed path list with a fixed request shape: method, concurrency,
  delay, duration, seed, and idle window.
- Save app output before cleanup. Logs from a failed run are often the fastest
  way to spot a bad control.
- Save machine-readable summaries for request counts, status codes, errors,
  latency, memory fields, and load-to-idle deltas.
- Refuse to overwrite an existing run directory or otherwise make accidental
  evidence loss difficult.

A useful run should leave this information behind:

| artifact         | required contents                                                |
| ---------------- | ---------------------------------------------------------------- |
| run metadata     | run name, git commit, app mode, database source, path list, seed |
| workload summary | request count, status codes, errors, latency, request shape      |
| memory summary   | sampled fields, warm/load/idle values, load-to-idle deltas       |
| app log          | build/start output, route errors, warnings, crash details        |
| path list        | the exact URLs or route paths used for the run                   |

Scratch scripts and result directories can live under an ignored local scratch
directory, but the debugging conclusion must not depend on those files existing
later. Copy the important command shape, run metadata, result table, and
conclusion into the PR, issue, or checked-in investigation note.

The basic loop is:

1. Prepare one or more path lists for the route families under test.
2. Start the app against the intended local database and record the app mode.
3. Warm the app, run the fixed workload, then keep an idle window long enough to
   see whether memory recovers.
4. Compare the suspect route to a matched control route before changing code.
5. Keep the result table close to the code review or incident notes so someone
   can continue the investigation without the scratch harness.

## Start With Controls

Do not start by bisecting components. First prove which route family carries the
signal.

For memory issues, the useful control pattern was:

1. Run the broad failing path list.
2. Run a matched clean route family at the same shape.
3. Split the failing family into narrower path lists.
4. Keep any negative controls that recover. They prevent later overfitting.

In the July 2026 incident:

| question                                   | local result                                            |
| ------------------------------------------ | ------------------------------------------------------- |
| Is libsql / embedded replica primary?      | No. Replica + cultivar GETs recovered.                  |
| Does Next 16.3 canary fix it?              | No. Seller workload still grew and did not reclaim.     |
| Do abort/RSC/HEAD request shapes cause it? | Not required. Plain drained GETs leaked.                |
| Is `/search` required?                     | No. Search-disabled seller document pages still leaked. |
| Is `/{seller}` required?                   | No. Seller root and paginated profile pages recovered.  |
| Is `/{seller}/{listing}` sufficient?       | Yes. Listing detail pages reproduced retention.         |

The important narrowing step was splitting seller traffic into:

- `/{seller}` roots
- `/{seller}/page/{n}` pages
- `/{seller}/{listing}` detail pages

Only the listing detail family retained `arrayBuffers` after idle.

## Bisect Page Features

Once a route family is isolated, bisect the render path with temporary feature
gates. Keep the gates local and remove them before the final patch.

Good bisection order:

1. Bare route shell: no data load, no metadata, tiny server output.
2. Data load only: route lookup and read model, tiny server output.
3. Metadata only: full `generateMetadata`, tiny server output.
4. Static server output only: JSON-LD, headings, simple markup.
5. Client islands one at a time.
6. Expensive display components one at a time.
7. Full page with the suspected feature removed.
8. Full page with the final intended patch.

For each variant, record:

- run name
- exact route variant
- path list
- request count
- status and error summary
- memory field under investigation
- whether the value recovered after idle

Prefer a compact table in the PR, issue, or checked-in working note. The goal is
not just to find a fix; it is to make every ruled-out hypothesis visible.

## Interpreting Memory Runs

For this incident, the key signal was `arrayBuffers` and `external`, not just
`heapUsed` or RSS.

Treat a run as suspicious when:

- `arrayBuffers` climbs during load and stays high after the idle window.
- `external` tracks `arrayBuffers`.
- RSS sawtooths or remains elevated in the same window.
- A matched control route recovers under the same request shape.

Treat a run as clean when:

- `arrayBuffers` falls back near baseline after idle.
- `external` falls with it.
- Request errors are not masking the workload.

The exact numbers vary by run, but the July 2026 threshold was visually clear:
leaking seller listing variants ended idle with hundreds of MB retained;
clean variants ended near `0.4 MB` of `arrayBuffers`.

## July 2026 Minimum Fix

The app-level issue was the public listing detail route:

`apps/main/src/app/(public)/[userSlugOrId]/[listingSlugOrId]/page.tsx`

The page was already static ISR:

```ts
export const revalidate = 900;
export const dynamic = "force-static";
export const dynamicParams = true;
```

The problem was not that the whole page was client-rendered. The problem was an
unnecessary client island in a high-cardinality ISR route:

`apps/main/src/app/(public)/_components/public-breadcrumbs.tsx`

`PublicBreadcrumbs` is a `"use client"` wrapper. It calls `usePathname()` and
mounts tRPC fallback query hooks keyed by route params. On listing detail pages,
the server already has the seller and listing names, so that route-aware client
wrapper was not needed.

The minimal fix:

- Remove `PublicBreadcrumbs` from the listing detail page.
- Render static breadcrumbs from the server-loaded listing data with the
  server-safe `ServerBreadcrumbs` component.
- Use `next/link` for internal links with `prefetch={false}`.
- Leave the route as ISR/static.
- Do not change the listing read model, metadata, JSON-LD, contact island, or
  `ListingDisplay` as part of this fix.

Final local verification:

| run                                | paths                    | requests | arrayBuffers load-to-idle | result    |
| ---------------------------------- | ------------------------ | -------: | ------------------------- | --------- |
| `listing-fixed-server-breadcrumbs` | 5212 listing detail URLs |     5142 | 5.78 MB -> 0.46 MB        | recovered |

This run used the local SQLite production copy, not live Turso.

## Why This Was Hard To Find

- The visible UI was tiny and boring: breadcrumbs.
- The route remained ISR/static, so a client component inside the route was easy
  to overlook.
- The tRPC fallback hooks looked harmless because the listing page passed the
  data needed to disable fetching.
- The failure showed in `arrayBuffers` and `external`, not only in normal heap.
- Single-page manual testing would not reproduce the issue. The signal required
  high-cardinality crawler-like traffic across thousands of unique URLs.
- Several plausible suspects had to be ruled out first: database replica,
  request shape, `/search`, profile pages, listing display, JSON-LD, metadata,
  framework canary, and analytics hygiene.

## Production Follow-Up

After shipping a local fix, verify production instead of assuming success.

Use `MEMORY_TELEMETRY_ENABLED=1` and compare `arrayBuffers`, `external`,
`heapUsed`, and RSS across at least 48 to 72 hours. Keep any daily restart or
external mitigation until production telemetry is clean.

Cloudflare HTML caching and bot rate limits are still useful defense for public
high-cardinality ISR routes. They reduce origin render pressure, but they should
not replace the app-level fix when the local harness has isolated one.

## Reusable Rule

For high-cardinality public ISR/SSG pages, route chrome should be server-rendered
when the route already has the data. Avoid route-aware client wrappers that read
`usePathname()` and mount query hooks just to render static labels.
