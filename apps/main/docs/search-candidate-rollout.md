# Search candidate: manual production trial

The candidate is built separately from the old index. The default-off
`candidateSearchIndex` runtime flag selects it for search, facets, importer
matching, and future parentage builds. The optional VPS timer runs once daily.
Deployment alone does not change the reader or install/enable the timer.

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

The reader trial below follows acceptance of this manual path. PR 3 removes
the old lifecycle and temporary rollout controls after reader acceptance.

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

## Production manual trial (2026-09-04)

The VPS agent reported two successful builds: 104,486 cultivars, 4,872 linked
listings, schema 13, and `quick_check=ok`. All 54 origin probes returned HTTP
200 with the baseline response hash. Exact/prefix, hybridizer and award checks
matched all 25 baseline IDs in order. The serving file checksum did not change.

Builds took about 44 and 39 seconds, with peak container memory of 731 and
828 MiB. Host swap-out was about 97 and 41 MiB. First-build origin p95/max was
1.162/2.981 seconds; second-build p95/max was 352/552 ms. There were no build-time
5xx or OOM events. Configuration was restored after the trial. These results
support an off-peak daily build, not request-triggered or frequent rebuilds.

## Reader trial (PR 2)

Activation and timer installation require owner approval. Keep the trial short:
the old artifact is the rollback copy and does not refresh while paused.

1. Confirm the deployed commit, a usable old index, host memory headroom, and
   the absence of competing jobs. Capture representative origin responses.
2. Set the old refresh interval to `0`, configure the dedicated token, and
   recreate the app as described above. Leave the reader flag off.
3. Build and validate a fresh candidate through the loopback POST/GET commands.
   Compare exact/prefix searches, filters, facets, importer matches and full
   responses with listing samples. Investigate differences due to source age.
4. Enable the reader without restarting the app:

   ```sh
   cd /srv/stacks/daylilycatalog
   docker compose exec -T app node apps/main/scripts/set-feature-flag.mjs candidateSearchIndex true
   ```

5. Repeat origin checks and browser checks for `/cultivars` and importer matching.
   Confirm the effective flag in `/api/runtime-config` and validate the candidate
   through GET. Let any initial parentage build finish before comparing full
   responses; that separate background build can change null trees to results.
   CDN-cached responses can predate the switch; use loopback for source proof.
   Confirm parentage reads remain available. Existing parentage artifacts are
   not rebuilt merely because this flag changes.
6. Run one manual build while the candidate serves requests. Check continuous
   availability, result correctness, memory/swap pressure and latency. A build
   failure must leave the last validated candidate available.
7. Only after these checks pass, install the two unit files from this deployed
   revision's `apps/main/deploy/vps/` into `/etc/systemd/system/` as root-owned,
   mode 0644 files. Config sync alone does not install or activate these units.

   ```sh
   sudo systemd-analyze verify /etc/systemd/system/daylily-search-candidate.service /etc/systemd/system/daylily-search-candidate.timer
   sudo systemctl daemon-reload
   sudo systemctl enable --now daylily-search-candidate.timer
   systemctl list-timers daylily-search-candidate.timer
   ```

The timer calls the same authenticated endpoint at 05:30 UTC daily, based on the
VPS traffic audit. It does not replay missed runs after boot. Recheck competing
jobs before activation. The token remains inside the app environment; the unit
does not contain it. Keep old refreshes at `0` throughout the reader trial.

Inspect each run with `journalctl -u daylily-search-candidate.service` and check
candidate age. After 24 hours the candidate status is stale but remains usable;
requests never build or sync it. A missing or incompatible candidate fails
explicitly, without an automatic old-index fallback. The five-minute service
timeout bounds the caller, not the in-app build; do not assume stopping the
service cancels a build. Do not start repeated retries after a timeout.

### Rollback

Disable the timer first with `sudo systemctl disable --now daylily-search-candidate.timer`.
Then use the same flag command with `candidateSearchIndex false`. This restores
old-index reads without restarting the app. Confirm origin search, facets,
importer matching and app health. An in-flight candidate build may finish, but
cannot replace the old serving artifact.

After the build settles, restore the original refresh interval and remove the
trial token, then recreate the app and verify health. This resumes the legacy
builder with its known source-replica design risk; it is not the final solution.
Leave the candidate and `.previous` artifacts intact.

Observe at least one scheduled build and an approved normal restart before
accepting PR 2. Do not inject production failures. PR 3 removes the old builder,
its second-replica lifecycle, and the temporary reader flag after acceptance.

## Local reader proof (2026-09-11)

All 775 tests passed. Typecheck, changed-code lint, and the production Docker
build passed. The compiled app used the retained sanitized libSQL fixture and
its normal embedded replica, limited to two CPUs and 1,400 MiB.

- Six HTTP cases matched the baseline: exact/prefix text, hybridizer, award,
  facets, and full search. A temporary name marker in the disposable candidate
  appeared only with the flag on, proving reader selection. The marker was restored.
- With the candidate serving requests, a rebuild completed in 20.4 seconds:
  104,486 cultivars, 4,840 linked listings, schema 13, integrity OK. All 35
  concurrent origin probes matched; p95 was 165 ms and maximum 275 ms.
- The baseline checksum stayed unchanged, and the prior candidate was retained.
  A missing candidate returned 503; switching the flag off restored baseline
  reads without a restart. Restoring the candidate and restarting the local
  container preserved the enabled flag and successful search.
- The integration test also exercised real importer matches and a parentage
  build from the selected candidate. Full HTTP comparisons waited for the
  separate initial parentage build to finish.
- Debian systemd validated both units and the 05:30 UTC calendar expression.
  No host timer was installed or enabled.

This verifies the local implementation, not PR 2 deployment or VPS activation.
