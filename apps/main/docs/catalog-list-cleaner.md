# Catalog import contract

The catalog importer has two shells that use one browser-local project.

## Public preparation

`/catalog-importer` prepares an XLSX or CSV file without creating listings.
The flow:

1. reads one selected worksheet;
2. maps name, price, description, private note, and an existing Daylily
   Catalog ID;
3. links confident cultivar matches;
4. lets the seller review uncertain names and spreadsheet issues;
5. previews linked listings with Daylily Catalog reference data; and
6. downloads a prepared catalog file or an enhanced copy of the source file.

The workbook and project state stay in IndexedDB on the current device. Cultivar
names and saved cultivar IDs go to the matching endpoint. The application does
not publish the preview or save the workbook to its database.

The public page can pass the browser-local project to `/dashboard/imports` on
the same device. This handoff does not upload the workbook.

## Dashboard import

`/dashboard/imports` is the Pro, create-only continuation. It reads the same
browser-local project and separates rows into:

- ready to create;
- name review required;
- spreadsheet issue;
- already present in the seller's catalog; and
- excluded by the seller.

Only selected, ready rows are sent to the listing import mutation. One request
contains at most 100 rows. The selection table reveals more rows in groups of
100 without clearing the current selection. Existing exact listings are
skipped. The client sends a stable project-and-row import key, and the server
skips keys that it has already processed. The flow does not update or merge
existing listings.

## Row identity and preparation

`Daylily Catalog ID` is the durable cultivar identity. A valid saved ID has
precedence over name matching. An unknown saved ID is an issue; it is not
exported as a valid identity.

The shared importer domain owns row disposition and listing preparation. Public
completion counts, dashboard partitions, existing-listing comparison, and the
server payload must use the same helpers.

The prepared catalog file contains:

- `Name`;
- `Price`;
- `Description`;
- `Private Note`;
- `Daylily Catalog ID`;
- `Daylily Catalog Cultivar Name`; and
- `Daylily Catalog Cultivar URL`.

A linked name uses the registered cultivar name. An intentionally unmatched
name keeps the seller's name. Approved price corrections become numeric values.
When a seller removes an invalid price, the original text is retained in the
private note.

The enhanced workbook keeps the selected worksheet's seller-owned columns and
all other worksheets. It adds the identity columns and applies approved mapped
field corrections. Rows excluded from the prepared catalog remain in the
enhanced workbook.

The dashboard listing CSV uses the same seller fields and identity columns
before its reporting columns. It can be uploaded to the builder again. The
builder maps the supported fields and preserves the remaining columns as
seller-owned data.

## Unsupported data

Seller image URLs are not mapped, validated, previewed, or imported. An
unrecognized image column remains seller-owned data in the enhanced workbook.
Cultivar reference photographs can appear in the browser preview, but they are
not copied into either download.

XLSX output preserves cell values, not the complete Excel document model.
Formula expressions, formatting, comments, merged cells, drawings, validation,
macros, and hidden state are not guaranteed to survive. When the reader exposes
a calculated formula value, the output writes that value as an ordinary cell.

## Shared preview composition

The preview uses the shared public-catalog search registry, advanced filter
panel, searchable listing adapter, listing card, and listing grid. Importer
matching and project state stay feature-local.

Importer analytics contain aggregate counts and workflow states only. Do not
send filenames, cultivar names, spreadsheet cells, descriptions, private
notes, or other seller content.
