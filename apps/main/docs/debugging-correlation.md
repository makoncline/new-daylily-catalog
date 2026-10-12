# Debug logs and errors

The app writes one JSON record for each console call after Next.js instrumentation starts. Each record has `correlation_id`, `correlation_scope`, `level`, and `timestamp`. Server records also include the release when `SENTRY_RELEASE` is set. Error records keep the error name, stack, and cause.

Use `logEvent(level, event, attributes)` for new application logs. Keep `event` constant. Put IDs, counts, status codes, and durations in attributes. Do not add an ID to an error message or a Sentry fingerprint.

## Correlation

- tRPC requests send `x-correlation-id`. The server uses the same ID for procedure logs, mutation audit logs, error responses, and the response header. Error response data uses `correlationId`. The client retains this context through `TRPCClientError` wrapping.
- MCP and Clerk/Stripe webhook requests also use an isolated request context and return `x-correlation-id`.
- Cultivar search requests use the same request context. Error responses return `X-Correlation-Id`. Cached success responses do not expose an origin request ID that a cache could reuse for another request.
- Other instrumented requests use the active Sentry trace ID. `trace_id` and `span_id` identify the trace and span. A trace can cover more than one HTTP request; `cf_ray` identifies a request at Cloudflare.
- Parentage refreshes have a new ID for each run. `parent_correlation_id` links a run to the request that started it. Image work scheduled with `after()` retains the scheduling context. The external search build timer is outside app instrumentation.
- Startup, memory, and other logs outside a request or trace use the runtime ID. `correlation_scope=runtime` means that the ID identifies a process or browser runtime, not a request. If Sentry is disabled, tRPC, MCP, webhooks, and search still have request isolation; other logs without an explicit operation use runtime scope.

The ID is diagnostic metadata. It is not proof of identity. Incoming IDs must contain 8–80 letters, digits, underscores, or hyphens. Other values are replaced.

Sentry `beforeSend` and `beforeSendLog` add the same ID to error events and SDK logs. These hooks do not enable a new console log upload stream. Server JSON logs remain in the server journal. The console wrapper also covers framework and dependency console calls after app instrumentation starts. Native process output, the reverse proxy, external worker launchers, and messages written before instrumentation starts are outside this application boundary.

## Find a failure

1. Read the `correlationId` in the tRPC error, the `x-correlation-id` response header, or the Sentry `correlation_id` tag.
2. Search the app journal for that ID. Compare `procedure`, `operation_type`, `duration_ms`, `error_code`, and `release`.
3. Compare `http_request_started` with `http_response_created` or `http_request_failed`. A created response does not prove delivery or completion of a streamed body. Procedure records show subsequent streamed failures.
4. For an HTTP transport failure, inspect `http_status`, `content_type`, `cf_ray`, `pathname`, and `failure_kind`. A 502 response with HTML is a transport failure, even if the old client message described a JSON parsing error.
5. Use `cf_ray` and time to check proxy logs. A proxy failure can occur before the app receives the request. Such a failure will have no app record.

Expected tRPC domain errors, such as `CONFLICT` and `PRECONDITION_FAILED`, use `trpc_procedure_rejected` at warning level. Unexpected procedure errors also go to Sentry. Framework request errors include the route pattern, method, content type, render source, and revalidation reason.

Known invalid Server Action messages use stable text. Their variable reference IDs do not split groups. Invalid tRPC responses group by failure kind and HTTP status. Other exceptions retain Sentry's default grouping and original stack frames.

Do not log request bodies or form inputs. The transport logger records response metadata without reading the response body. Shared serialization removes credential fields, email fields, and URL query strings from structured context. Sentry request headers, cookies, bodies, and query strings are removed. This is not a substitute for selecting safe attributes at the call site.

## Assessment: 3–10 October 2026

The server agent reviewed 2026-10-03 16:19:48 UTC through 2026-10-10 16:19:48 UTC. The app journal and proxy error log retain the full window. Proxy access logs retain only the final 44.5 hours. The inspected production revision was `cca54ff1cc45e25a90371c80b4cd527b43540a1d`; these local changes have not been deployed.

| Observation                       |         Count | Debugging implication                                                                   |
| --------------------------------- | ------------: | --------------------------------------------------------------------------------------- |
| Proxy upstream 502 responses      |            38 | 36 were within 60 seconds of an app startup. Check deployment handover separately.      |
| Invalid Server Action references  |            41 | Keep a stable message and add route and method.                                         |
| FormData parsing errors           | 2 app records | Keep request context. Sentry recorded one event.                                        |
| Expected member mutation failures |             4 | One precondition failure and three conflicts; keep these separate from internal errors. |
| Missing image asset fallbacks     |           132 | Add severity, time, release, and correlation. Twelve image IDs were affected.           |
| Proxy incomplete responses        |           264 | All reported `context canceled`; the logs do not establish the cause.                   |
| Scheduled search builds           |  14 successes | No build failure was observed.                                                          |
| Logged public searches            | 586 successes | No search failure was observed.                                                         |

The app journal had 12,217 records. Memory telemetry accounted for 10,064 records. The review did not change this diagnostic setting.

An exact seven-day Sentry event read ended at 2026-10-10 16:21:02 UTC. It found five error events across three groups, plus 13 performance events across four N+1 groups. Both events in [NEW-DAYLILY-CATALOG-5Z](https://makon-dev.sentry.io/issues/7684918862/) followed listing mutation requests with HTTP 502 responses. The old error text reported a browser pattern/JSON error. The October 9 `listing.linkAhs` failure matches a proxy connection reset outside a startup window; the app had no matching error record. Its cause remains unknown.

The other error groups were [NEW-DAYLILY-CATALOG-60](https://makon-dev.sentry.io/issues/7686623688/) (two Android WebView bridge errors) and [NEW-DAYLILY-CATALOG-6B](https://makon-dev.sentry.io/issues/7774928592/) (one FormData error). These are different failure types. This change does not suppress them or claim to fix their causes.

## Local verification

- TypeScript check and ESLint passed for the changed files.
- Four browser checks passed: listing create/edit/reload, required-name validation, list management with a rejected deletion, and profile URL validation.
- After rebasing onto current main, all three list browser checks passed: desktop, mobile, and canceled removal review. Both device flows verify successful batched and unbatched request IDs and a rejected deletion.
- This change adds no unit tests or mocked integration tests. Existing tests only have the updates needed for the new headers and log fields.
- The browser flow in `tests/integration/list-management.integration.ts` creates and edits a list, adds a listing, reloads it, and tries to delete the populated list. It compares the real request IDs, response headers, browser error, and server logs. The rejected deletion comes from the database-backed application rules. The test also checks that the description is absent from the logs.
- The local browser runner uses the real Next app, tRPC handlers, and disposable SQLite database. Its existing external-service substitutes include Clerk. External traffic is blocked, and Sentry delivery is not tested. App logs are saved in `tests/.tmp/integration-server.log`.
- Production behavior after deployment has not been verified. Proxy configuration and server deployments were not changed.
