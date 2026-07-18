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
3. Search the private catalog preview and review the catalog analysis. The
   preview starts with 20 cultivars and expands only when the seller chooses
   **Show more**.
4. Confirm uncertain cultivar names, then resolve spreadsheet issues.
5. Download the enriched copy of the original workbook.

The original workbook and review progress stay in the browser. Cultivar names
and previously saved cultivar reference IDs are sent to the matching endpoint.
The free flow can clean the entire workbook. Membership begins when a seller
wants to save listings or publish the preview as a hosted catalog.

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

## Enriched workbook

The download creates a new workbook containing:

- every original cell value and column;
- every original sheet's cell values;
- rows that remain unmatched; and
- the user's non-catalog data.

XLSX formatting, formulas, merged cells, drawings, and other workbook-level
features are not copied. The browser flow is a data preparation tool, not a
general-purpose Excel editor.

The selected sheet receives three columns:

| Column                   | Meaning                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `Daylily Catalog ID`     | Stable cultivar ID; unknown saved IDs remain until resolved or cleared.  |
| `registeredCultivarName` | Human-readable registered cultivar name for the linked ID.               |
| `cultivarUrl`            | Permanent Daylily Catalog cultivar page, useful from the seller's sheet. |

CSV input produces enriched CSV. XLSX input produces a new XLSX workbook
containing each sheet's cell values. Duplicate rows explicitly removed in the
issues flow are the only source rows omitted from the output.

## Future importer contract

`Daylily Catalog ID` is the spreadsheet's authoritative cultivar identity. It
maps to the internal `cultivarReferenceId` field:

1. When the ID is present, look up that exact `CultivarReference.id` and link
   the listing to it.
2. If the ID is unknown, report an actionable issue. The user may clear it and
   deliberately match the row by name; never silently replace it.
3. Only when the ID is blank should name matching propose or establish a link.

`registeredCultivarName` remains useful for people, search, and diagnostics,
but a normalized name is not a durable foreign key. Names and normalization
rules can change, and an approximate or ambiguous name must never override a
valid ID.

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
