# VPS Memory First Principles

## Next 16.3 canary memory-leak test

This PR tests `next@16.3.0-canary.75` and `eslint-config-next@16.3.0-canary.75`
against the production RSS growth seen on the self-hosted standalone Next server.
`16.3.0-preview.5` was tried first, but local `next build` attempts hung at
`Creating an optimized production build ...` with only idle parent pnpm
processes remaining after several minutes. The canary fallback was chosen
because the upstream issue trail for the suspected
`arrayBuffers` / `WriteWrap` retention points at canary/minor-line fixes rather
than the `16.2.x` patch line; `16.2.10` explicitly contains no relevant runtime
changes.

The working hypothesis is off-heap response-buffer retention in standalone
response/cache paths under high-cardinality public traffic, especially crawler
traffic that creates many ISR/cache misses across `/cultivar/*` and adjacent
public pages.

Production confirmation still depends on memory telemetry after deploy. Treat
the upgrade as promising only if `rss`, `external`, and `arrayBuffers` stay
flatter under comparable crawler-shaped traffic.
