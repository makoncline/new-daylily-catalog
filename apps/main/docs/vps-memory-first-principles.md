# VPS Memory First Principles

## Opt-in memory telemetry

Production memory telemetry is disabled by default. To turn it on for the VPS
container, set:

```sh
MEMORY_TELEMETRY_ENABLED=1
```

The server logs single-line JSON from the long-lived Next Node process:

- `v8_heap_limit`: emitted once at process boot with the V8 heap size limit.
- `process_memory`: emitted every 60 seconds with `rss`, `heapTotal`,
  `heapUsed`, `external`, and `arrayBuffers`.

Interpretation:

- `heapUsed` rising monotonically means JavaScript heap growth.
- `external` or `arrayBuffers` rising while `heapUsed` is stable suggests
  off-heap, native, or Next response-buffer growth.
- `rss` rising while `heapUsed`, `external`, and `arrayBuffers` are stable
  suggests allocator behavior, page cache, or pressure outside these Node
  memory fields.
