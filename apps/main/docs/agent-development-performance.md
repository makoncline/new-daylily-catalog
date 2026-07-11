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

| Change                                      | Before |                                 After | Status                                               |
| ------------------------------------------- | -----: | ------------------------------------: | ---------------------------------------------------- |
| Run typecheck and lint concurrently         |  8.75s |                                 4.76s | Keep: 46% faster and both commands passed            |
| Preserve a separate Next E2E compiler cache |  20.1s |                                 21.8s | Rejected: complete focused run was not faster        |
| Three-way isolated E2E CI sharding          | 5m 48s | 2m 24s cold; 2m 41s warm with retries | Keep: all 14 flows passed                            |
| Complete E2E CI job                         | 7m 43s |              3m 33s cold; 3m 24s warm | Keep: 54-56% faster end to end                       |
| Playwright Chromium provisioning            | 1m 10s |                 24s cold; 15-25s warm | Keep: browser download skipped on every warm shard   |
| Preview smoke workflow                      | 2m 00s |                                1m 30s | Keep: 25% faster end to end                          |
| PR Docker rebuild                           | 5m 33s |                                   20s | Keep: warm cache avoided rebuilding unchanged app    |
| Related Vitest for leaf UI change           | 26.47s |                                 4.16s | Keep: 84% less test time; full CI remains            |
| Agent checks with related tests             |  4.76s |                                 7.10s | Keep: adds integration signal for 2.34s              |
| Weighted E2E groups                         | 3m 39s |                               Pending | Same 14 files; measured groups target about 91s each |
| CI ESLint cache                             |    28s |                               Pending | Complete lint still runs with content cache restored |

## Comparison rules

1. Run the same command, tests, worker count, and environment before and after.
2. Record complete command wall time, not only compilation or test-body duration.
3. Confirm the same Playwright test count. The three shards must total all 14 local E2E flows.
4. Record retries and failures separately; a retry-free run is not directly comparable to a flaky baseline without noting the difference.
5. Keep a change only when the improvement repeats or is confirmed by the corresponding GitHub Actions job.
6. Do not weaken assertions, remove flows, increase timeouts, or replace integration coverage to improve timing.

The cold candidate measurement is GitHub Actions run `29141461230`. Its three shards ran 5, 5, and 4 tests with no retries. The slowest test phase was 2m 24s and the slowest complete shard job was 3m 33s. The unit job failed before the Node 24 follow-up because `realistic-data-snapshot.test.ts` requires the `node:sqlite` built-in that is unavailable under the workflow's previous Node 20 runtime.

The successful warm-cache verification is GitHub Actions run `29141650462`. Lint, Node 24 typecheck, all 485 unit tests, and all 14 E2E flows passed. Chromium installation was skipped on every shard. Shards 1 and 2 each needed one retry, so their 2m 41s and 2m 38s test phases should not be compared as retry-free runs; the slowest complete job still finished in 3m 24s.

The preview-smoke baseline is GitHub Actions run `29141978987`: 2m 00s total, including 1m 16s for `playwright install --with-deps` and 13s for the unchanged preview smoke test. Its candidate replaces only browser provisioning and leaves the smoke test unchanged.

The successful optimized preview smoke is GitHub Actions run `29142175681`: 1m 30s total. Browser cache restoration plus Chromium system dependencies took 29s, the browser download was skipped, and the unchanged smoke test passed. Its test phase varied to 23s, so the accepted improvement is the complete 30-second workflow reduction rather than a claim about test execution.

The PR Docker workflow also demonstrated its warm-cache boundary: run `29141827884` took 5m 33s for the first complete build, while the workflow-only follow-up run `29142069076` completed in 20s without rebuilding the unchanged application.

Related Vitest selection was benchmarked with `currency-input.tsx`: two dependent test files completed in 4.16s versus the 26.47s full local suite. Running those tests concurrently with typecheck and lint completed in 7.10s, compared with the previous 4.76s static-check-only loop. A central AHS display source selected 23 files and took 25.8s, so related selection is a leaf-change optimization and signal improvement, not a universal suite replacement.
