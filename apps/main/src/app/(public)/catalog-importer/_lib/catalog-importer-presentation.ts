import type { OptimizedImageSource } from "@/components/optimized-image";
import type { AhsDisplayListing } from "@/lib/utils/ahs-display";
import type {
  CatalogColumnMapping,
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
      description: "A whole number. Currency symbols are cleaned.",
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

function formatInches(value: number | null) {
  return value === null ? null : `${value}"`;
}

function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

export function getCandidateAhsDisplayListing(
  candidate: CultivarMatchCandidate,
): AhsDisplayListing {
  return {
    id: candidate.cultivarReferenceId,
    name: candidate.displayName,
    ahsImageUrl: null,
    hybridizer: candidate.hybridizer,
    year: candidate.year === null ? null : String(candidate.year),
    scapeHeight: formatInches(candidate.scapeHeightIn),
    bloomSize: formatInches(candidate.bloomSizeIn),
    bloomSeason: candidate.bloomSeason,
    ploidy: candidate.ploidy,
    foliageType: candidate.foliageType ?? null,
    bloomHabit: candidate.bloomHabit ?? (candidate.rebloom ? "Reblooms" : null),
    color: candidate.color,
    form: candidate.form,
    parentage: candidate.parentage ?? null,
    fragrance: candidate.fragrance ?? null,
    budcount: formatCount(candidate.budCount),
    branches: formatCount(candidate.branches),
    sculpting: candidate.sculptedTypes ?? null,
    foliage: null,
    flower: null,
  };
}

export function getUploadedImages(
  _row: CatalogImportRow,
): OptimizedImageSource[] {
  return [];
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

const AWARD_DISPLAY_NAME_BY_CODE: Record<string, string> = {
  AM: "Award of Merit",
  ATG: "Annie T. Giles Award",
  DCS: "Don C. Stevens Award",
  DFM: "Donn Fischer Memorial Cup",
  ELD: "Extra Large Diameter",
  ESB: "Early Season Bloom",
  Foster: "Eugene S. Foster Award",
  FSC: "Florida Sunshine Cup",
  GDAA: "Georgia Doubles Appreciation Award",
  HM: "Honorable Mention",
  IM: "Ida Munson Award",
  "Junior Citation": "Junior Citation",
  "L/W": "Lambert-Webster / Lenington All-American Awards",
  "NRS/UFA": "Ned Roberts Spider / Unusual Form Award",
  PC: "President's Cup",
  RWMJA: "R. W. Munson Jr. Award",
  Spider: "Harris Olson Spider Award",
  Stout: "Stout Silver Medal",
};

export function getAwardDisplayName(code: string) {
  return AWARD_DISPLAY_NAME_BY_CODE[code] ?? code;
}

export function getAwardCode(displayName: string) {
  return (
    Object.entries(AWARD_DISPLAY_NAME_BY_CODE).find(
      ([, label]) => label === displayName,
    )?.[0] ?? displayName
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
  if (row.cultivarReferenceIdWarning) {
    issues.push(
      `Daylily Catalog ID was not found: ${row.cultivarReferenceIdWarning}`,
    );
  }

  return issues;
}

export function getDownloadFileName(fileName: string) {
  const extension = fileName.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "daylily-catalog";

  return `${safeName}-daylily-catalog-prepared.${extension}`;
}

export function getCatalogImporterDownloadFileName(
  fileName: string,
  kind: "clean" | "enriched",
) {
  const extension = fileName.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "daylily-catalog";

  return `${safeName}-${kind === "clean" ? "clean-catalog" : "enriched-original"}.${extension}`;
}
