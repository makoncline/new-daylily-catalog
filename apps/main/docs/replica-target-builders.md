# Replica target builders

Use this seam for a one-shot producer that builds a local artifact from the
normal embedded Turso replica.

```ts
import { syncEmbeddedReplica } from "@/server/db";
import { streamToTargetWorker } from "@/server/target-worker-stream.js";

const sourceDb = await syncEmbeddedReplica();

const { sourceResult, targetResult } = await streamToTargetWorker({
  targetWorkerPath,
  targetWorkerArgs,
  stream: async (writeMessage) => {
    // Query sourceDb with an immutable keyset cursor.
    // Keep each page bounded and await each writeMessage call.
    // Return a small JSON summary for the target child.
  },
});
```

`syncEmbeddedReplica()` explicitly syncs the captured libSQL client and returns
the exact singleton `replicaDb` that owns that client. It fails if production
does not have the embedded replica. It does not fall back to the remote Turso
primary. Outside production, it returns the local `replicaDb`, which is the
normal `db` when no embedded replica is configured.

`streamToTargetWorker()` owns child-process startup, NDJSON framing,
backpressure, completion, and worker-error propagation. After `stream()`
returns, it sends this final message:

```json
{ "type": "complete", "sourceResult": {} }
```

The target child must print one JSON result as its last non-empty stdout line.
The function returns that value as `targetResult`.

Each producer owns these parts:

- Its immutable keyset cursor and page-size limit.
- Its page message names and row projection.
- Its run coalescing or schedule.
- Its target schema and validation.
- Its `.next` output, atomic replacement, and last-known-good artifact.

The source stream is not one long database transaction. A producer must use a
stable keyset order and must accept that a sync can happen between page queries.
This keeps the shared replica available to normal app reads.

The target child must not import `db.ts`, receive replica configuration, or
open or copy the libSQL-managed replica file. It must read only its stdin and
write only its own local target files. It must consume stdin with pull-based
chunk iteration. Do not use `readline.Interface` async iteration for page
messages because it can queue many complete pages before target writes finish.

The public search implementation is the reference integration. It keeps its
search SQL, 1,000-row page limit, target schema, validation, and atomic
promotion private.
