# V2 AHS Cultivar Migration

This document captures the concrete process for adding and backfilling
`V2AhsCultivar` plus `CultivarReference.v2AhsCultivarId`.

## Purpose

- Add a source-shaped AHS V2 cultivar table to the app database.
- Preserve the raw-ish scraped cultivar payload in a dedicated table.
- Link existing `CultivarReference` rows to the new V2 rows by canonical
  normalized cultivar name.
- Create new `CultivarReference` rows for V2 cultivars that do not exist in the
  legacy AHS source.
- Keep the rollout additive and safe: no read-path changes in this migration.

## Prerequisite

This migration assumes the canonical cultivar normalization cleanup has already
been applied in the target environment:

- `prisma/data-migrations/20260407_apply_cultivar_reference_search_normalization_cleanup.sql`

If the target environment has not had that cleanup yet, stop and apply it first.

## Artifacts

Structural migration SQL:

- `prisma/migrations/20260408131530_add_v2_ahs_cultivar/migration.sql`

Schema verification SQL:

- `prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql`

Generated data SQL artifacts:

- `prisma/data-migrations/20260407_upsert_v2_ahs_cultivars/`
- `prisma/data-migrations/20260407_backfill_v2_ahs_cultivar_reference.sql`
- `prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql`

Generator script:

- `scripts/generate-v2-ahs-cultivar-data-sql.ts`
- `scripts/apply-v2-ahs-cultivar-import.ts`

## Regenerating Data SQL

Use the current repo-root scraped SQLite snapshot as the source:

```bash
pnpm db:generate:v2-ahs-cultivar-data-sql
```

Optional alternate source path:

```bash
pnpm db:generate:v2-ahs-cultivar-data-sql -- --source-db /absolute/path/to/cultivars.db
```

The generator writes a contained import directory with chunked SQL plus a
`manifest.json`. With the current `104211`-row source snapshot and `32` insert
batches per file, it produces `17` import chunks.

Apply those chunks with one command instead of running them manually:

```bash
pnpm db:apply:v2-ahs-cultivar-import -- --db <turso-db-name>
```

Local SQLite rehearsal uses:

```bash
pnpm db:apply:v2-ahs-cultivar-import -- --sqlite prisma/local-prod-copy-daylily-catalog.db
```

## Structural Migration Authoring

Generate or regenerate the structural migration from a clean local SQLite
authoring DB, not the local prod copy:

```bash
rm -f prisma/local-dev.sqlite prisma/local-dev.sqlite-wal prisma/local-dev.sqlite-shm

DATABASE_URL="file:./prisma/local-dev.sqlite" \
NODE_OPTIONS='' RUST_LOG=info npx dotenv -e .env.development -- \
  npx prisma migrate dev --create-only --name add_v2_ahs_cultivar
```

Then use the local prod copy only to rehearse the generated SQL.

## Execution Order

Always run in this order:

1. Schema verification SQL.
2. Structural migration SQL.
3. Schema verification SQL again.
4. V2 cultivar import SQL.
5. V2 data verification SQL.
6. V2 cultivar-reference backfill SQL.
7. V2 data verification SQL again.

## Local

If your local prod copy has not had the normalization cleanup yet, apply it
before this flow.

```bash
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/migrations/20260408131530_add_v2_ahs_cultivar/migration.sql
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
pnpm db:apply:v2-ahs-cultivar-import -- --sqlite prisma/local-prod-copy-daylily-catalog.db
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/data-migrations/20260407_backfill_v2_ahs_cultivar_reference.sql
sqlite3 prisma/local-prod-copy-daylily-catalog.db < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
```

## Stage

```bash
turso db shell daylily-catalog-stage < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
turso db shell daylily-catalog-stage < prisma/migrations/20260408131530_add_v2_ahs_cultivar/migration.sql
turso db shell daylily-catalog-stage < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
pnpm db:apply:v2-ahs-cultivar-import -- --db daylily-catalog-stage
turso db shell daylily-catalog-stage < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
turso db shell daylily-catalog-stage < prisma/data-migrations/20260407_backfill_v2_ahs_cultivar_reference.sql
turso db shell daylily-catalog-stage < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
```

## Production

Take a fresh backup first:

```bash
pnpm env:dev bash scripts/db-backup.sh
```

Then apply the exact same SQL files:

```bash
turso db shell daylily-catalog < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
turso db shell daylily-catalog < prisma/migrations/20260408131530_add_v2_ahs_cultivar/migration.sql
turso db shell daylily-catalog < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_schema.sql
pnpm db:apply:v2-ahs-cultivar-import -- --db daylily-catalog
turso db shell daylily-catalog < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
turso db shell daylily-catalog < prisma/data-migrations/20260407_backfill_v2_ahs_cultivar_reference.sql
turso db shell daylily-catalog < prisma/data-migrations/20260407_verify_v2_ahs_cultivar_data.sql
```

## Validation Queries

Schema verification SQL should return `1` for every check after the structural
migration:

- `has_v2_ahs_cultivar_table`
- `has_cultivar_reference_v2_column`
- `has_v2_link_unique_index`
- `has_v2_link_lookup_index`
- `has_v2_link_normalized_name_index`

Data verification SQL should return these values after the full backfill:

- `v2_ahs_cultivar_row_count = 104211`
- `linked_cultivar_reference_count = 104211`
- `dual_source_cultivar_reference_count = 102540`
- `new_v2_only_cultivar_reference_count = 1671`
- `v2_rows_missing_link_normalized_name = 0`
- `v2_duplicate_link_normalized_name_groups = 0`
- `v2_unlinked_row_count = 0`
- `dangling_v2_links = 0`
- `normalized_name_match_already_linked_to_other_v2 = 0`
- `existing_v2_link_name_mismatch_count = 0`

## Recorded Local Rehearsal

On a disposable copy of the local prod snapshot, using the generated SQL
artifacts:

- schema verification passed after structural apply
- V2 import inserted `104211` rows
- backfill linked `102540` existing `CultivarReference` rows
- backfill created `1671` new V2-only `CultivarReference` rows
- rerunning the backfill SQL produced the same verification output with no new
  drift

## Failure Policy

If any schema check fails:

1. Stop before importing data.
2. Fix the structural migration artifact and re-run locally before stage/prod.

If any data verification check fails after import/backfill:

1. Do not enable V2 read-path behavior in that environment.
2. Re-run the verification SQL to confirm the failing counts.
3. Investigate the target rows before attempting another apply.
