# Maintainability Hotspots

The maintainability hotspot report is an advisory file-size signal for source
and test files. It is a smell to investigate, not an automatic quality
judgment: a large file can still be reasonable, and a small file can still be
hard to maintain.

Run it before large refactors, after adding a major feature file, or during
code review when a file feels too large to reason about comfortably.

```sh
pnpm maintainability:hotspots
```

To smoke-check threshold behavior locally:

```sh
node scripts/report-source-hotspots.mjs --max-lines 1200 --fail-on-threshold
```

The current stance is to keep this out of CI as a blocker. Use the report to
find candidates for characterization tests and planned extraction work before
refactoring.

The default report excludes `apps/main/src/components/ui` because those files
are mostly local shadcn UI components and should not dominate the signal.
