# Public search index

Production uses one app-owned embedded Turso replica and one derived search index.
The reader trial passed on September 23, 2026. Search now always reads
`/data/search/public-search-candidate.sqlite`; there is no reader-selection flag.

The existing file, endpoint, token, and systemd names remain unchanged. They are
operational names, not alternate code paths. No server file migration is needed.

## Build and read boundaries

- The daily timer calls the running app over loopback. The app explicitly syncs
  the normal embedded replica, then pages through the exact `replicaDb` singleton.
- Source pages contain at most 1,000 rows. The target-only child has no database
  credentials or replica path. Never open or copy a managed replica with stock SQLite.
- The child builds `.next`, validates counts, integrity, and FTS consistency, closes
  the database, then replaces the serving artifact atomically. The prior index
  remains at `.previous`. Failed builds leave the validated index available.
- Source reads do not hold a long transaction. Background replica sync can occur
  between pages, so a build is not a guaranteed point-in-time snapshot.
- Search, facets, importer matching, and new parentage builds use this artifact.
  Parentage retains its separate refresh policy.
- Search requests never sync or rebuild the search index. After 24 hours the
  artifact is stale but usable. A missing or incompatible index returns an error;
  there is no old-index fallback.

## VPS operation

Keep the normal replica configuration, writable `/data` volume, and dedicated
`SEARCH_INDEX_CANDIDATE_TOKEN` (at least 32 random characters). Do not reuse or
print service credentials.

The installed `daylily-search-candidate.timer` runs daily at 05:30 UTC.
It does not replay missed runs after boot. Check it with:

```sh
systemctl list-timers daylily-search-candidate.timer
journalctl -u daylily-search-candidate.service
```

To pause builds, disable the timer. Requests continue to use the validated index.
The service's five-minute timeout stops the caller, not the in-app build.
Do not assume stopping the service cancels a build, or start repeated retries.

For an approved manual build, run from `/srv/stacks/daylilycatalog`:

```sh
docker compose exec -T app node --input-type=module -e '
const response = await fetch("http://127.0.0.1:3000/api/internal/search-candidate", {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.SEARCH_INDEX_CANDIDATE_TOKEN }
});
console.log(response.status, await response.text());
if (!response.ok) process.exitCode = 1;
'
```

For validation, use GET on the same endpoint. Optional filters are `q`,
`hybridizer`, and `award`, each at most 128 characters. GET checks integrity
and returns up to 25 results without building. POST waits for the build and
returns counts, duration, schema, and integrity. Concurrent POSTs share one
in-process build. All responses are no-store. Without a configured token, or
on Vercel, the endpoint returns 404; an invalid bearer token returns 401.

## Cleanup deployment and rollback

Before deploying this cleanup, verify a compatible candidate exists and the daily
timer is healthy. Deployment does not install units, delete artifacts, or change
the replica, token, timer, or artifact paths. The old reader flag and
`PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS` are no longer read. Leftover
settings do not affect the new code and need not be removed during deployment.

After deployment, check origin status, search, facets, importer matching, listing
samples, and parentage. Confirm the selected build time and next timer run.
Use loopback to avoid cached CDN responses.

There is no flag rollback after this cleanup. If needed, deploy the previously
accepted reader-trial image and confirm its persisted `candidateSearchIndex=true`
and legacy refresh interval `0` before it serves traffic. Preserve those settings
during the rollback window. This returns to the tested candidate path, not the
unsafe legacy builder. Do not delete old server artifacts as part of this PR.

## Local development

`pnpm db:seed:prepare` builds the local search artifact through libSQL/Prisma.
Without `--source`, `pnpm main search:index:build` reads the documented local
production copy at `apps/main/prisma/local-prod-copy-daylily-catalog.db`.
To rebuild it from an existing sanitized local database:

```sh
pnpm main search:index:build --source local/realistic-data/realistic-data.sqlite
```

The CLI uses the same bounded builder and defaults to
`.tmp/search/public-search-candidate.sqlite`. It refuses production execution
and the configured managed replica path. Use the running app endpoint on the VPS.
Vercel public search remains disabled; this cleanup does not add a Vercel builder.

## Production acceptance evidence

The server agent reported the following on September 23, 2026, for release
`cdf491c48cad784dbbe1d7905a3dea74ce23dff9`:

- Two manual builds passed, including one with the new reader active.
  All 77 build-window requests returned 200 with unchanged result hashes.
- The actual 05:30 UTC timer build passed in 41.847 seconds: schema 13,
  104,486 cultivars, 4,882 linked listings, and `quick_check=ok`.
- All 108 scheduled-build probes returned 200 with no hash differences;
  p95 was 1.012 seconds and maximum was 1.869 seconds.
- Peak app memory was 587.2 MiB; swap-out was at most 38.5 MiB. Memory PSI
  remained negligible, with no OOM or build-time restart.
- The normal 08:00:50 UTC recreation preserved candidate selection and health.
  It caused approximately 10.8 seconds of connection unavailability, even
  though no HTTP 5xx responses were observed. This was not zero downtime.
- The old index stayed unchanged. No managed replica was opened or copied
  with stock SQLite.

These are reported VPS trial results, not a verification of the cleanup image.

## Cleanup verification

On September 23, the cleanup passed 765 tests, typecheck, lint (one existing
dashboard warning), and a local ARM64 production Docker build. With the prior
image's sanitized fixture, the cleanup rebuilt 104,486 cultivars and 4,840 listings
in 24.4 seconds through the normal embedded replica. All 40 build-window probes
passed; p95 was 383 ms and maximum was 1.019 seconds. Six search/facet responses
matched before and after the build and container restart. The check also proved
that the retired flag is ignored, `.previous` is retained, the old index stays
unchanged, and a missing index returns 503 without fallback. No OOM occurred.
This is local image evidence, not a production deployment of the cleanup.
