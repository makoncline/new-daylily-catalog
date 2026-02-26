# Cultivar Reference Dedupe Runbook

## Why this migration exists

`CultivarReference.normalizedName` currently has duplicates sourced from `AhsListing` name collisions.  
This causes ambiguous cultivar lookup and fallback logic in live requests.

This phase does three things:

1. Picks one canonical `CultivarReference` row per duplicate `normalizedName`.
2. Remaps linked `Listing.cultivarReferenceId` and `Listing.ahsId` to that canonical row.
3. Deletes duplicate `CultivarReference` rows.

No `AhsListing` rows are deleted in this phase.

## Artifacts

- Generator script: `scripts/generate-cultivar-reference-dedupe-sql.ts`
- Migration SQL: `prisma/data-migrations/20260225_dedupe_cultivar_reference_normalized_name.sql`
- Verification SQL: `prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql`
- Local transaction helper: `scripts/open-cultivar-reference-dedupe-transaction.sh`
- Prisma schema migration SQL (phase 2): `prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql`

Regenerate deterministic SQL anytime:

```sh
npx tsx scripts/generate-cultivar-reference-dedupe-sql.ts
```

## Local testing on a DB copy

Create a safe copy from local prod snapshot:

```sh
sqlite3 prisma/local-prod-copy-daylily-catalog.db ".backup tests/.tmp/prod-dedupe-check.sqlite"
```

Open transaction review (before verify -> apply -> after verify):

```sh
scripts/open-cultivar-reference-dedupe-transaction.sh --db tests/.tmp/prod-dedupe-check.sqlite
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
npx tsx scripts/generate-cultivar-reference-dedupe-sql.ts
```

### 2) Baseline verify on target DB

```sh
turso db shell "$TURSO_DATABASE_NAME" < prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql
```

### 3) Apply migration SQL

```sh
turso db shell "$TURSO_DATABASE_NAME" < prisma/data-migrations/20260225_dedupe_cultivar_reference_normalized_name.sql
```

### 4) Verify again

```sh
turso db shell "$TURSO_DATABASE_NAME" < prisma/data-migrations/20260225_verify_dedupe_cultivar_reference_normalized_name.sql
```

### 5) Repeat against prod

Use same SQL files after stage verifies cleanly.

## Phase 2: add uniqueness via Prisma migration

After dedupe succeeds on stage/prod, apply the Prisma-generated schema migration:

```sh
turso db shell "$TURSO_DATABASE_NAME" < prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql
```

Then run verify SQL again and confirm:

- `duplicate_normalized_name_groups = 0`
- `normalized_name_unique_index_exists = 1`

## Regenerating the Prisma schema migration (if needed)

This repo environment may block `prisma migrate dev --create-only` in non-interactive mode.

Current migration SQL was generated from Prisma schema diff:

```sh
git show HEAD:prisma/schema.prisma > tests/.tmp/schema-before-normalized-unique.prisma

./node_modules/.bin/prisma migrate diff \
  --from-schema-datamodel tests/.tmp/schema-before-normalized-unique.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260225183013_add_cultivar_reference_normalized_name_unique/migration.sql
```

## Schema contract

After stage/prod data migration is complete, sync Prisma schema to match DB:

1. Add uniqueness on `CultivarReference.normalizedName` in `prisma/schema.prisma`.
2. Use mapped name to align with the index name from the Prisma migration SQL:
   `@@unique([normalizedName], map: "CultivarReference_normalizedName_unique_idx")`
3. Apply the separate schema migration SQL after dedupe SQL.

For this phase, that is the only schema contract change.
