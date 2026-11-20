import {
  createCatalogImporterProjectId,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import {
  prepareTempCatalogListing,
  validateTempListingDraft,
  toTempListingDraft,
  type TempListing,
} from "./temp-list";

import type { CultivarMatchCandidate } from "@/lib/catalog-importer";

const PROJECT_KEY = "daylily-catalog:temp-import-id";
const STORAGE_ERROR =
  "Could not save your import in this browser. Keep this page open and try again.";

export async function saveTempCatalogImport(
  listings: TempListing[],
  matches?: Record<string, CultivarMatchCandidate>,
) {
  if (listings.length === 0) throw new Error("Add a listing first.");
  for (const listing of listings) {
    const checked = validateTempListingDraft(toTempListingDraft(listing));
    if (!checked.success)
      throw new Error(
        `${listing.name}: ${checked.issue.errors.map((error) => error.message).join(" ")} Edit this row before saving to your account.`,
      );
  }
  let projectId: string;
  try {
    projectId =
      localStorage.getItem(PROJECT_KEY) ?? createCatalogImporterProjectId();
    localStorage.setItem(PROJECT_KEY, projectId);
  } catch {
    throw new Error(STORAGE_ERROR);
  }
  const draft: CatalogImporterDraft = {
    source: "playground",
    version: 3,
    projectId,
    activeReviewRowId: null,
    headerRowIndex: null,
    initialIssueCount: 0,
    initialReviewCount: 0,
    mapping: {
      title: null,
      price: null,
      description: null,
      privateNote: null,
      cultivarReferenceId: null,
      lists: null,
    },
    matchedRowsKey: null,
    parsedSpreadsheet: null,
    reviewedIssueActions: [],
    selectedSheetIndex: 0,
    matchedRows: listings.map((listing, index) => {
      const prepared = prepareTempCatalogListing(listing);
      return {
        ...prepared,
        extraFields: listing.extraFields,
        id: listing.id,
        sourceRow: index + 1,
        sourceTitle: prepared.title,
        sourceCultivarReferenceId: prepared.cultivarReferenceId ?? "",
        sourcePrice: prepared.price === null ? "" : String(prepared.price),
        title: prepared.title,
        description: prepared.description ?? "",
        privateNote: prepared.privateNote ?? "",
        cultivarReferenceIdWarning: null,
        duplicateAccepted: false,
        duplicateOfSourceRow: null,
        identityReviewed: true,
        preserveTitle: true,
        linkProvenance: prepared.cultivarReferenceId ? "saved-id" : null,
        linkState: prepared.cultivarReferenceId
          ? "linked"
          : "intentionally-unmatched",
        match: prepared.cultivarReferenceId
          ? (matches?.[prepared.cultivarReferenceId] ?? null)
          : null,
        suggestedMatch: null,
        outputState: "included",
        priceWarning: null,
        rowKind: "listing",
      };
    }),
  };
  if ((await writeCatalogImporterDraft(draft)) !== "saved") {
    throw new Error(STORAGE_ERROR);
  }
  return projectId;
}
