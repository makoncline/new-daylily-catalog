import {
  CATALOG_LISTING_HEADERS,
  cellToText,
  parseCatalogListNames,
  parsePriceValue,
} from "@/lib/catalog-importer";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";
import {
  catalogImportListingKey,
  normalizeCatalogImportName,
} from "@/lib/catalog-import-existing-listings";
import {
  CATALOG_IMPORT_BATCH_LIST_LIMIT,
  CATALOG_IMPORT_BATCH_SIZE,
  catalogImportCultivarIdSchema,
  catalogImportRowSchema,
  type CatalogImportRowInput,
} from "@/lib/catalog-import-rows";
import type { RouterOutputs } from "@/trpc/react";

type FileRowIdentity = {
  rowNumber: number;
  title: string;
  cultivarReferenceId: string | null;
};
type ValidRow = FileRowIdentity & { listing: CatalogImportRowInput };
type InvalidRow = FileRowIdentity & { reason: string };
type FileRow = ValidRow | InvalidRow;

export async function readDashboardImportFile(
  file: File,
): Promise<FileRow[] | null> {
  const spreadsheet = await parseCatalogImportFile(file, {
    firstSheetOnly: true,
  }).catch(() => null);
  const [headers, ...rows] = spreadsheet?.sheets[0]?.rows ?? [];
  if (
    !headers ||
    !CATALOG_LISTING_HEADERS.every(
      (header, index) =>
        cellToText(headers[index]).toLowerCase() === header.toLowerCase(),
    )
  )
    return null;

  return rows.flatMap<FileRow>((cells, index) => {
    const [name, priceCell, description, privateNote, lists, cultivarId] =
      cells;
    if (
      cells
        .slice(0, CATALOG_LISTING_HEADERS.length)
        .every((cell) => !cellToText(cell))
    )
      return [];
    const title = String(name ?? "").trim();
    const cultivarReferenceId = String(cultivarId ?? "") || null;
    const identity = { rowNumber: index + 2, title, cultivarReferenceId };
    const invalid = (reason: string) => [{ ...identity, reason }];
    const price = parsePriceValue(priceCell);
    if (price.warning) return invalid(price.warning);
    if (
      cultivarReferenceId &&
      !catalogImportCultivarIdSchema.safeParse(cultivarReferenceId).success
    ) {
      return invalid("Cultivar reference ID exceeds 200 characters.");
    }
    const parsed = catalogImportRowSchema.safeParse({
      title,
      price: price.price,
      description: String(description ?? "").trim() || null,
      privateNote: String(privateNote ?? "").trim() || null,
      lists: parseCatalogListNames(lists),
      cultivarReferenceId,
    });
    return parsed.success
      ? [{ ...identity, listing: parsed.data }]
      : invalid(parsed.error.issues[0]!.message);
  });
}

export function previewDashboardImport(
  rows: FileRow[],
  catalog: RouterOutputs["dashboardV2"]["listing"]["readImportPreview"],
) {
  const knownCultivarIds = new Set(catalog.cultivarReferenceIds);
  const ambiguousLists = new Set(catalog.ambiguousListNames);
  const knownListings = new Set(
    catalog.existingListings.map(catalogImportListingKey),
  );
  const preview = {
    newRows: [] as ValidRow[],
    skippedRows: [] as ValidRow[],
    invalidRows: [] as InvalidRow[],
  };
  for (const row of rows) {
    if ("reason" in row) {
      preview.invalidRows.push(row);
      continue;
    }
    const key = catalogImportListingKey(row);
    if (knownListings.has(key)) {
      preview.skippedRows.push(row);
      continue;
    }
    const { cultivarReferenceId, listing } = row;
    const ambiguous = listing.lists.find((name) =>
      ambiguousLists.has(normalizeCatalogImportName(name)),
    );
    if (
      cultivarReferenceId !== null &&
      !knownCultivarIds.has(cultivarReferenceId)
    ) {
      preview.invalidRows.push({ ...row, reason: "Unknown cultivar link." });
    } else if (ambiguous) {
      preview.invalidRows.push({
        ...row,
        reason: `More than one list is named “${ambiguous}”.`,
      });
    } else {
      knownListings.add(key);
      preview.newRows.push(row);
    }
  }
  return preview;
}

export function batchDashboardImportRows(rows: CatalogImportRowInput[]) {
  const batches: CatalogImportRowInput[][] = [];
  let batch: CatalogImportRowInput[] = [];
  let listNames = new Set<string>();
  for (const row of rows) {
    const names = row.lists.map(normalizeCatalogImportName);
    const distinct = names.filter((name) => !listNames.has(name)).length;
    if (
      batch.length === CATALOG_IMPORT_BATCH_SIZE ||
      listNames.size + distinct > CATALOG_IMPORT_BATCH_LIST_LIMIT
    ) {
      batches.push(batch);
      batch = [];
      listNames = new Set();
    }
    batch.push(row);
    for (const name of names) listNames.add(name);
  }
  if (batch.length) batches.push(batch);
  return batches;
}
