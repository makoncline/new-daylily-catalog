# Search candidate: manual production trial

This is PR 1 of the search rollout. Public search, facets, importer matching,
and parentage still use the old index. There is no candidate reader flag or
schedule yet.

The candidate is `/data/search/public-search-candidate.sqlite`. Its builder
syncs the normal app replica, pages through the exact `replicaDb` singleton,
and streams at most 1,000 rows per page to a target-only child. The child has
no database credentials or replica path. It builds `.next`, validates row
counts, SQLite integrity and FTS consistency, closes it, then replaces the
candidate atomically. The prior candidate stays at `.previous`.

The shared source is not held in a long transaction. A normal replica sync can
occur between pages. Compare old and candidate results with snapshot age in
mind. Neither a successful sync nor a matching count proves an identical snapshot.

## Prepare

Deployment and production configuration changes need owner approval.

1. Confirm a usable old serving index and its schema before the trial.
2. Set `PUBLIC_SEARCH_INDEX_REFRESH_INTERVAL_SECONDS=0` to pause the old
   builder. Keep this setting throughout the trial. Do not invoke the old
   source-replica worker or inspect any managed replica file with SQLite.
3. Set `SEARCH_INDEX_CANDIDATE_TOKEN` to a new random token of at least 32
   characters. Do not reuse a Clerk, Stripe, or Turso secret. Store it only in
   the existing VPS environment file.
4. Keep the normal embedded replica configured and the existing `/data`
   volume writable by the app. Recreate the container to apply environment
   changes. This PR does not delete any old files.

The internal endpoint returns 404 without the token configuration or on Vercel.
An invalid bearer token returns 401. All responses use `Cache-Control: no-store`.
Production builds refuse to start unless old refreshes are disabled and wait
for any old in-process refresh to finish.

## Build and check

Run from the existing Compose stack directory. These commands call the running
app over loopback. They do not open the replica in the command process or print
the token. The POST waits for completion; keep it off the CDN request path.

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

To validate the completed candidate and run the real search query:

```sh
docker compose exec -T app node --input-type=module -e '
const response = await fetch("http://127.0.0.1:3000/api/internal/search-candidate?q=stella", {
  headers: { Authorization: "Bearer " + process.env.SEARCH_INDEX_CANDIDATE_TOKEN }
});
console.log(response.status, await response.text());
if (!response.ok) process.exitCode = 1;
'
```

GET accepts only `q`, `hybridizer`, and `award` (up to 128 characters each).
Without filters it checks the first 25 names. It returns schema, build time,
counts, integrity status, and at most 25 normal search results. Parentage-tree
and listing-sample expansion are disabled so the check cannot start another
builder. GET never syncs or builds; a missing candidate returns 404.

POST returns build duration, counts, schema and integrity status. Concurrent
POSTs share one build in the current app process. Errors return a bounded 500
response; inspect the app error log for details. A failed or empty source build
does not replace a good candidate. After a process restart, invoke POST again;
the disposable `.next` is rebuilt. The serving index is never a target.

Before PR 2, record candidate checks for exact/prefix names, hybridizers and
awards, build duration, container peak memory/CPU, and public search responses
during a build. Verify failed-build preservation and a container restart.
Use a controlled test source for failure injection; do not damage production
data or its replica to simulate failure.

PR 2 adds the reader switch and schedule only after this manual path passes.
PR 3 removes the old lifecycle and temporary rollout controls after acceptance.

## Local production-container proof (2026-09-04)

The production Dockerfile built and ran on local ARM64 with Node 20 and Next
16.3. The runtime used a disposable libSQL server with the full sanitized
dataset, TLS, and one app-owned embedded replica. No production credentials
or production Turso connection were used. Unlike the auth-focused prod-like
runbook, this test kept the embedded replica enabled.

- The candidate contained 104,486 cultivars and 4,840 linked listings, with
  schema 13 and `quick_check=ok`.
- Exact/prefix, hybridizer, and award results matched the old builder's
  full-size artifact. A source edit appeared after explicit sync, before the
  normal ten-minute background sync interval.
- With two CPUs and the VPS Compose limit of 1,400 MiB, a warm rebuild took
  24.7 seconds. All 41 concurrent public-search checks returned unchanged
  results: p95 290 ms, maximum 911 ms. Under concurrent local test load, a
  rebuild took 52 seconds and p95 reached 731 ms.
- The first replica download caused one 6.8-second public request. Rebuilds
  are not latency-free; run the manual trial during low traffic and measure
  the actual VPS before adding a schedule.
- Peak container memory across the runs was about 840 MiB, including file
  cache; no OOM events occurred. After restart, the measured peak was about
  539 MiB.
- Stopping the disposable source returned a bounded 500. Hashes proved that
  candidate, `.previous`, and serving index were unchanged and still readable.
- Killing the container during `.next` construction preserved those files.
  Restart and manual retry completed successfully.

All 772 Vitest tests passed with two workers, without timeout changes. The
unrelated image-worker CI failure passed on an unchanged rerun. Final Codex
review was clean. These results support merging the disabled-by-default manual
trial; they do not approve switching public search to the candidate or replace
the VPS trial required before PR 2.
