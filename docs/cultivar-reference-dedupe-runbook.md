# Cultivar Reference Dedupe Runbook

## Why this migration exists

`CultivarReference.normalizedName` currently has duplicates sourced from `AhsListing` name collisions.  
This causes ambiguous cultivar lookup and fallback logic in live requests.

This phase does three things:

1. Picks one canonical `CultivarReference` row per duplicate `normalizedName`.
2. Remaps linked `Listing.cultivarReferenceId` and `Listing.ahsId` to that canonical row.
3. Deletes duplicate `CultivarReference` rows.

No `AhsListing` rows are deleted in this phase.

## Rollout status

As of February 26, 2026:

- `seeded-daylily-catalog` (preview): complete
- `daylily-catalog` (prod): complete

Final verify state on both:

- `duplicate_normalized_name_groups = 0`
- `dangling_listing_cultivar_reference_id = 0`
- `cultivar_reference_ahs_missing = 0`
- `linked_listings_on_reserved_year_ahs = 0`
- `normalized_name_unique_index_exists = 1`

## Artifacts

- Generator script: `apps/web/scripts/generate-cultivar-reference-dedupe-sql.ts`
- Migration SQL: `apps/web/prisma/data-migrations/20260225_dedupe_cultivar_reference_normalized_name.sql`
- Verification SQL: `apps/web/prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql`
- Local transaction helper: `apps/web/scripts/open-cultivar-reference-dedupe-transaction.sh`
- Prisma schema migration SQL (phase 2): `apps/web/prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql`

Regenerate deterministic SQL anytime:

```sh
npx tsx apps/web/scripts/generate-cultivar-reference-dedupe-sql.ts
```

## Local testing on a DB copy

Create a safe copy from local prod snapshot:

```sh
sqlite3 apps/web/prisma/local-prod-copy-daylily-catalog.db ".backup apps/web/tests/.tmp/prod-dedupe-check.sqlite"
```

Open transaction review (before verify -> apply -> after verify):

```sh
apps/web/scripts/open-cultivar-reference-dedupe-transaction.sh --db tests/.tmp/prod-dedupe-check.sqlite
```

Inside the shell:

- `ROLLBACK;` then `.quit` to discard
- `COMMIT;` then `.quit` to persist

Expected verification output on this dataset after apply:

- `duplicate_normalized_name_groups = 0`
- `dangling_listing_cultivar_reference_id = 0`
- `cultivar_reference_ahs_missing = 0`
- `linked_listings_on_reserved_year_ahs = 0`
- `normalized_name_unique_index_exists = 0` (still phase 1)

## Turso rollout (after local confidence)

Run on stage first, then prod.

### 1) Re-generate SQL from repo state

```sh
npx tsx apps/web/scripts/generate-cultivar-reference-dedupe-sql.ts
```

### 2) Baseline verify on target DB

```sh
turso db shell "$TURSO_DATABASE_NAME" < apps/web/prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql
```

### 3) Apply migration SQL

```sh
turso db shell "$TURSO_DATABASE_NAME" < apps/web/prisma/data-migrations/20260225_dedupe_cultivar_reference_normalized_name.sql
```

### 4) Verify again

```sh
turso db shell "$TURSO_DATABASE_NAME" < apps/web/prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql
```

### 5) Repeat against prod

Use same SQL files after stage verifies cleanly.

### Operator notes

- In Turso shell, prefer SQL-only scripts and `.read`/`.quit`; common sqlite dot-formatting commands may not be available.
- Always run verification SQL from a fresh connection after apply. Treat that result as the source of truth for commit success.

## Phase 2: add uniqueness via Prisma migration

After dedupe succeeds on stage/prod, apply the Prisma-generated schema migration:

```sh
turso db shell "$TURSO_DATABASE_NAME" < apps/web/prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql
```

Then run verify SQL again and confirm:

- `duplicate_normalized_name_groups = 0`
- `normalized_name_unique_index_exists = 1`

## Regenerating the Prisma schema migration (if needed)

This repo environment may block `prisma migrate dev --create-only` in non-interactive mode.

Current migration SQL was generated from Prisma schema diff:

```sh
git show HEAD:apps/web/prisma/schema.prisma > apps/web/tests/.tmp/schema-before-normalized-unique.prisma

./node_modules/.bin/prisma migrate diff \
  --from-schema-datamodel apps/web/tests/.tmp/schema-before-normalized-unique.prisma \
  --to-schema-datamodel apps/web/prisma/schema.prisma \
  --script > apps/web/prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql
```

## Schema contract

After stage/prod data migration is complete, sync Prisma schema to match DB:

1. Add uniqueness on `CultivarReference.normalizedName` in `apps/web/prisma/schema.prisma`.
2. Use mapped name to align with the index name from the Prisma migration SQL:
   `@@unique([normalizedName], map: "CultivarReference_normalizedName_unique_idx")`
3. Apply the separate schema migration SQL after dedupe SQL.

For this phase, that is the only schema contract change.
