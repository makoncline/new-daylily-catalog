# Catalog mass import: spreadsheet preparation

The product is a daylily catalog mass-import flow. A spreadsheet is the starting
point, not the product boundary. The public entry point lets a prospective
seller experience the matching, issue-resolution, catalog preview, and
collection-analysis value before membership. The same prepared catalog can
later continue into a paid dashboard import or replace repetitive onboarding
data entry.

The current milestone stops before database writes: it adds stable cultivar
identity to an XLSX or CSV spreadsheet, but does not create listings or save the
workbook to the application database.

## User flow

1. Upload an XLSX or CSV spreadsheet.
2. Choose the header row and map the listing fields.
3. Reveal the confidently linked portion as a private catalog, including
   reference photographs, searchable cultivar traits, and exact counts for
   source rows, detected listings, linked listings, and unique cultivars.
4. Explore the private catalog and collection analysis. The preview starts
   with 20 cultivars and expands only when the seller chooses **Show more**.
5. Repair the remaining data through focused cultivar-name decisions and
   grouped spreadsheet issue controls.
6. Export the current or fully prepared copy of the original workbook.
7. Continue to Pro only when the seller wants the hosted public catalog,
   dashboard, ongoing management, and discovery features.

The original workbook and review progress stay in the browser. Cultivar names
and previously saved cultivar reference IDs are sent to the matching endpoint.
Only confident automatic matches, valid saved IDs, and matches confirmed by the
seller appear in the preview or insights. The complete preparation and download
flow remains available without membership. Nothing is published or imported.

## Shared search composition

The preview reuses `PublicCatalogSearchAdvancedPanel`, the complete seller
catalog search registry, and `createPublicCatalogSearchColumns`. Its basic mode
includes global search, For Sale, and Has Photo; the empty Lists control is
hidden because spreadsheet rows do not have saved dashboard lists. Advanced
mode uses the same Listing, Registration, Bloom Traits, and Classification &
Details groups as a published catalog.

Matched spreadsheet rows are adapted to the shared searchable listing shape
while retaining their original importer row for card rendering. Cultivar match
responses include the search-index traits needed by the full panel: bloom
habit, season, size, scape height, bud count, branches, form, ploidy, foliage,
fragrance, color, parentage, hybridizer, awards, Flower Show, and sculpted
type. The last four use the same exact multi-select facet behavior as
`/cultivars`. Filtering remains browser-local.

The smaller controlled `CatalogSearch` primitives remain available for pages
that only need part of the interface. Full catalog experiences should prefer
the registry and panel so labels, filter semantics, facet splitting, ranges,
active-filter summaries, and responsive behavior do not diverge.

## Cleaned workbook

The uploaded file is never modified. Download creates a new prepared copy that
keeps the seller's other worksheets, columns, included rows, and non-catalog
data while cleaning the mapped listing fields:

- a linked listing name becomes the registered cultivar name;
- an unmatched listing keeps the seller's original name;
- mapped description and private-note whitespace is normalized;
- a resolved price becomes a numeric value or an approved blank;
- a resolved image URL becomes the normalized, approved URL;
- unresolved seller price and image values remain unchanged; and
- only rows the seller explicitly removes are omitted.

The selected sheet receives three identity columns:

| Column                          | Meaning                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `Daylily Catalog ID`            | Stable, validated cultivar identity and future import key.                  |
| `Daylily Catalog Cultivar Name` | Human-readable registered cultivar name for the linked ID.                  |
| `Daylily Catalog Cultivar URL`  | Permanent Daylily Catalog cultivar page, useful from the seller's workbook. |

A known-invalid saved ID is cleared from the prepared identity field so a
future importer cannot mistake it for a valid link. The row remains in the
workbook and can still be deliberately linked or left unmatched.

Legacy `cultivarReferenceId`, `registeredCultivarName`, and `cultivarUrl`
headers are recognized and renamed instead of duplicated.

CSV input produces cleaned CSV. XLSX input produces a new XLSX workbook with
each sheet reconstructed from the cell values available to the browser reader.
Formatting, formula expressions, comments, merged cells, drawings, validation,
and hidden-sheet state are not copied. When the reader supplies a formula's
calculated value, that value is written as an ordinary cell. This is a catalog
data preparation tool, not a general-purpose Excel editor.

## Future importer contract

`Daylily Catalog ID` is the spreadsheet's authoritative cultivar identity. It
maps to the internal `cultivarReferenceId` field:

1. When the ID is present, look up that exact `CultivarReference.id` and link
   the listing to it.
2. If the ID is unknown, report an actionable issue. The user may clear it and
   deliberately match the row by name; never silently replace it.
3. Only when the ID is blank should name matching propose or establish a link.

`Daylily Catalog Cultivar Name` remains useful for people, search, and
diagnostics, but a normalized name is not a durable foreign key. Names and
normalization rules can change, and an approximate or ambiguous name must never
override a valid ID.

There is no database-writing importer in this stage. The dashboard continuation
should consume `Daylily Catalog ID`, validate it against the current database,
and treat the registered name as display and diagnostic data rather than
identity. This keeps the public preparation flow and paid import flow on one
file contract instead of building two products.

## Flywheel

Use the browser-first process in
[`agent-development-flywheel.md`](./agent-development-flywheel.md). The declared
flow ID remains `catalog-importer` because that is the current route and code
namespace:

```sh
node apps/main/scripts/run-atlas-flow.mjs catalog-importer --output=local/atlas/catalog-cleaner-before
node apps/main/scripts/run-atlas-flow.mjs catalog-importer --output=local/atlas/catalog-cleaner-after
```

Inspect all eight desktop and mobile states in both galleries, then run the
catalog-cleaner integration and connected E2E tests listed in the gallery.

## Product analytics

Importer analytics use aggregate workflow facts only: file type, sheet and row
counts, linked/review/issue counts, interaction type, decision state, resolved
issue type and quantity, current/prepared download state, and membership prompt
IDs. Events must never contain filenames, cultivar names, spreadsheet cells,
descriptions, private notes, image URLs, or other seller content.
