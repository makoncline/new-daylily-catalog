# Agent development performance

Performance tooling changes must preserve the test suite and demonstrate a wall-time improvement against a recorded baseline. Faster internal phases do not count if the complete command is not faster.

## Baseline

Recorded July 10, 2026 before the E2E execution changes:

| Loop                            | Environment                            | Baseline |
| ------------------------------- | -------------------------------------- | -------: |
| PR workflow                     | GitHub Actions run 29132787951         |   7m 43s |
| Complete local E2E suite        | Same Actions run, 14 tests, one worker |   5m 48s |
| Playwright browser installation | Same Actions run                       |   1m 10s |
| Unit suite                      | Local, 142 files and 485 tests         |   31.66s |
| Typecheck then lint             | Local                                  |    8.75s |

The E2E run included two failed 30-second attempts for `listing-image-manager` before its successful retry. Preserve that observation when comparing later runs rather than crediting unrelated infrastructure for a change in retry count.

## Candidate measurements

| Change                                      | Before |                                 After | Status                                             |
| ------------------------------------------- | -----: | ------------------------------------: | -------------------------------------------------- |
| Run typecheck and lint concurrently         |  8.75s |                                 4.76s | Keep: 46% faster and both commands passed          |
| Preserve a separate Next E2E compiler cache |  20.1s |                                 21.8s | Rejected: complete focused run was not faster      |
| Three-way isolated E2E CI sharding          | 5m 48s | 2m 24s cold; 2m 41s warm with retries | Keep: all 14 flows passed                          |
| Complete E2E CI job                         | 7m 43s |              3m 33s cold; 3m 24s warm | Keep: 54-56% faster end to end                     |
| Playwright Chromium provisioning            | 1m 10s |                 24s cold; 15-25s warm | Keep: browser download skipped on every warm shard |

## Comparison rules

1. Run the same command, tests, worker count, and environment before and after.
2. Record complete command wall time, not only compilation or test-body duration.
3. Confirm the same Playwright test count. The three shards must total all 14 local E2E flows.
4. Record retries and failures separately; a retry-free run is not directly comparable to a flaky baseline without noting the difference.
5. Keep a change only when the improvement repeats or is confirmed by the corresponding GitHub Actions job.
6. Do not weaken assertions, remove flows, increase timeouts, or replace integration coverage to improve timing.

The cold candidate measurement is GitHub Actions run `29141461230`. Its three shards ran 5, 5, and 4 tests with no retries. The slowest test phase was 2m 24s and the slowest complete shard job was 3m 33s. The unit job failed before the Node 24 follow-up because `realistic-data-snapshot.test.ts` requires the `node:sqlite` built-in that is unavailable under the workflow's previous Node 20 runtime.

The successful warm-cache verification is GitHub Actions run `29141650462`. Lint, Node 24 typecheck, all 485 unit tests, and all 14 E2E flows passed. Chromium installation was skipped on every shard. Shards 1 and 2 each needed one retry, so their 2m 41s and 2m 38s test phases should not be compared as retry-free runs; the slowest complete job still finished in 3m 24s.
