# AHS V2 Migration Plan

## Goal
Integrate the new AHS cultivar dataset into the app safely, using a separate worktree for implementation and local verification before any production changes.

## Current Direction
- Keep existing `AhsListing` and `Listing.ahsId` behavior intact during transition.
- Add new table(s) for V2 data and old-to-new mapping.
- Build and validate migration process locally against a local copy of production data.
- Create a separate production rollout plan after local validation is complete.

## Phase 1: Worktree Setup
1. Create a new worktree on a dedicated branch (example branch name prefix: `codex/`).
2. Ensure environment setup in that worktree (`.env.development` link/copy as needed).
3. Install dependencies in the worktree.

## Phase 2: Data Setup in Worktree
1. Run the existing DB backup workflow to obtain a local copy of production DB data.
2. Place the local backup DB file inside the worktree (or point local env to it).
3. Copy `cultivars.db` into the worktree so scripts can read the same source dataset.
4. Verify file paths in the worktree (app DB path + cultivars DB path) before coding migration logic.

## Phase 3: Local Migration Implementation
1. Schema work:
- Add/confirm `AhsListingV2` table for new dataset.
- Add/confirm mapping table from old AHS IDs to V2 IDs (`AhsListingV2Map`).
- Keep existing listing foreign key untouched for now.

2. Import process (scripted, repeatable):
- Read from `cultivars.db`.
- Upsert rows into `AhsListingV2`.
- Normalize fields consistently (string trimming, numeric parsing, boolean mapping).
- Record import metadata (run timestamp, counts) in logs/output artifacts.

3. Mapping process:
- Build old-to-new mapping using deterministic rules.
- Start with exact normalized name matches.
- Add tie-breakers (year, hybridizer legacy code, core field checks) for confidence scoring.
- Mark unresolved/ambiguous rows explicitly for manual review.

4. Diff/report artifacts:
- Generate a dry-run report with:
  - candidate inserts
  - candidate updates
  - mapped rows
  - unresolved rows
  - ambiguous rows
- Save report outputs to a predictable path (for review and reruns).

## Phase 4: Local Validation
1. Validate row counts:
- V2 total count matches source expectations.
- Mapping coverage is high enough for safe rollout.

2. Validate data quality:
- Sample check mapped rows.
- Compare key fields for mismatches.
- Confirm unresolved/ambiguous sets are understood.

3. Validate application behavior:
- Existing listing queries still work.
- New V2 reads can be exercised in parallel without breaking current flows.

## Phase 5: Production Rollout Plan (After Local Success)
1. Pre-flight:
- Fresh production backup.
- Freeze window / maintenance communication.
- Confirm rollback path and owner.

2. Production execution (staged):
- Apply schema changes.
- Run import in dry-run mode first.
- Review counts and mismatch summary.
- Run apply mode in controlled batches.

3. Post-run checks:
- Validate expected row counts and mapping coverage.
- Run smoke tests for listing read paths.
- Confirm no regression in key queries.

4. Rollback strategy:
- If thresholds fail, stop and restore from backup.
- Keep all migration scripts idempotent and rerunnable.

## Suggested Acceptance Gates
- `AhsListingV2` row count is within expected tolerance of source count.
- Mapping coverage meets agreed threshold before any query cutover.
- Ambiguous mappings are either resolved or explicitly excluded.
- Zero regressions on existing listing workflows.

## Deliverables in Worktree
- Migration/import scripts
- Mapping generation script
- Dry-run diff report output
- Validation checklist output
- Production runbook (step-by-step commands and rollback)
