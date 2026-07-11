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

| Change                                      | Before |   After | Status                                          |
| ------------------------------------------- | -----: | ------: | ----------------------------------------------- |
| Run typecheck and lint concurrently         |  8.75s |   4.76s | Keep: 46% faster and both commands passed       |
| Preserve a separate Next E2E compiler cache |  20.1s |   21.8s | Rejected: complete focused run was not faster   |
| Three-way isolated E2E CI sharding          | 5m 48s | Pending | Keep experimental until measured in Actions     |
| Cache Playwright Chromium download          | 1m 10s | Pending | Keep experimental until a cache-hit Actions run |

## Comparison rules

1. Run the same command, tests, worker count, and environment before and after.
2. Record complete command wall time, not only compilation or test-body duration.
3. Confirm the same Playwright test count. The three shards must total all 14 local E2E flows.
4. Record retries and failures separately; a retry-free run is not directly comparable to a flaky baseline without noting the difference.
5. Keep a change only when the improvement repeats or is confirmed by the corresponding GitHub Actions job.
6. Do not weaken assertions, remove flows, increase timeouts, or replace integration coverage to improve timing.

After the next CI run, update the pending rows with the workflow, E2E job, and browser-install durations. Revert either candidate if it does not materially improve its complete phase.
