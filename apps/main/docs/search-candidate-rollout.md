# Public Search Index Operation

Production search reads `/data/search/public-search-candidate.sqlite`. The
scheduled build uses the running app and its managed embedded replica. Do not
open or copy that replica with stock SQLite. Search requests do not rebuild the
index. The last validated artifact remains available if a build fails.

## VPS schedule and manual build

Keep the normal replica configuration, writable `/data` volume, and a dedicated
`SEARCH_INDEX_CANDIDATE_TOKEN` with at least 32 random characters. Install or
update the tracked `daylily-search-candidate.service` and `.timer` separately
from app deployment. The timer runs at 05:30 and 17:30 UTC and does not replay
missed runs after boot.

```sh
systemctl list-timers daylily-search-candidate.timer
journalctl -u daylily-search-candidate.service
```

Disable the timer to pause builds. Requests continue to use the last validated
index. Stopping the systemd service does not necessarily cancel a build already
running inside the app. Do not start repeated retries while one runs.

For a manual build, run from the configured stack directory:

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

After a build, check the endpoint, public search and facets, importer matching,
and parentage against origin. Use loopback requests so CDN caching cannot hide
a failure. Keep the previous validated artifact for recovery.

## Local rebuild

`pnpm db:seed:prepare` builds the local search artifact. To rebuild it from an
existing sanitized local database, run:

```sh
pnpm main search:index:build --source local/realistic-data/realistic-data.sqlite
```

Do not use the local CLI against the VPS managed replica. Use the running app
endpoint on the VPS.
