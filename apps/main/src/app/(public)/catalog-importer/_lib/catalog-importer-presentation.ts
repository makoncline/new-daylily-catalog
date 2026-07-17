import type { OptimizedImageSource } from "@/components/optimized-image";
import type {
  CatalogColumnMapping,
  CatalogImportMatchStatus,
  CatalogImportRow,
  CultivarMatchCandidate,
  SpreadsheetCell,
} from "@/lib/catalog-importer";

export type CatalogImporterMappingField = keyof CatalogColumnMapping;

export interface CatalogImporterCandidateResult {
  candidates: CultivarMatchCandidate[];
  error: string | null;
  loading: boolean;
  query: string;
  rowId: string;
}

export interface CatalogImporterMappingFieldDefinition {
  description: string;
  field: CatalogImporterMappingField;
  label: string;
  required?: boolean;
}

export const CATALOG_IMPORTER_MAPPING_FIELDS: CatalogImporterMappingFieldDefinition[] =
  [
    {
      field: "title",
      label: "Cultivar name",
      description: "The name used to find the registered cultivar.",
      required: true,
    },
    {
      field: "price",
      label: "Price",
      description:
        "A number such as 12 or 12.50. Currency symbols are cleaned.",
    },
    {
      field: "description",
      label: "Description",
      description: "Public notes or sales copy for the listing.",
    },
    {
      field: "privateNote",
      label: "Private note",
      description:
        "Garden location, source, inventory, or other internal notes.",
    },
    {
      field: "imageUrl",
      label: "Image URL",
      description: "A direct http or https URL for the listing image.",
    },
  ];

export const CATALOG_IMPORTER_STATUS_OPTIONS: Array<{
  label: string;
  value: CatalogImportMatchStatus;
}> = [
  { label: "Exact match", value: "exact" },
  { label: "Selected match", value: "selected" },
  { label: "Needs review", value: "pending" },
  { label: "Skipped", value: "unmatched" },
];

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function getSourcePreviewCellText(cell: SpreadsheetCell) {
  if (cell === null) {
    return "";
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  return String(cell);
}

export function getCultivarImage(
  candidate: CultivarMatchCandidate | null,
): OptimizedImageSource | null {
  if (!candidate?.imageUrl) {
    return null;
  }

  return {
    id: candidate.imageAsset?.id ?? candidate.cultivarReferenceId,
    imageAsset: candidate.imageAsset,
    url: candidate.imageUrl,
  };
}

export function getUploadedImages(
  row: CatalogImportRow,
): OptimizedImageSource[] {
  return row.imageUrl ? [{ id: `uploaded-${row.id}`, url: row.imageUrl }] : [];
}

export function getCandidateMeta(candidate: CultivarMatchCandidate) {
  return [candidate.hybridizer, candidate.year]
    .filter((value) => value !== null && value !== "")
    .join(" · ");
}

export function getCultivarTraitSummary(candidate: CultivarMatchCandidate) {
  return [
    candidate.color,
    candidate.bloomSizeIn ? `${candidate.bloomSizeIn}\" bloom` : null,
    candidate.scapeHeightIn ? `${candidate.scapeHeightIn}\" scape` : null,
    candidate.form,
    candidate.ploidy,
    candidate.bloomSeason,
    candidate.rebloom ? "Reblooms" : null,
  ].filter((value): value is string => Boolean(value));
}

export function getMatchStatusLabel(status: CatalogImportMatchStatus) {
  return (
    CATALOG_IMPORTER_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function getRowIssues(row: CatalogImportRow) {
  const issues: string[] = [];

  if (row.duplicateOfSourceRow !== null) {
    issues.push(`Duplicate of source row ${row.duplicateOfSourceRow}`);
  }
  if (row.priceWarning) {
    issues.push(`Price could not be cleaned: ${row.priceWarning}`);
  }
  if (row.imageUrlWarning) {
    issues.push(`Image URL could not be used: ${row.imageUrlWarning}`);
  }

  return issues;
}

export function getDownloadFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "daylily-catalog";

  return `${safeName}-cleaned.csv`;
}
