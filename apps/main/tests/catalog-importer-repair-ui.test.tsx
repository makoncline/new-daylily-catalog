import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX,
  type CatalogImportRow,
  type CultivarMatchCandidate,
} from "@/lib/catalog-importer";

function importRow(
  overrides: Partial<CatalogImportRow> = {},
): CatalogImportRow {
  return {
    cultivarReferenceIdWarning: null,
    description: "",
    duplicateAccepted: false,
    duplicateOfSourceRow: null,
    id: "row-2",
    imageUrl: "",
    imageUrlWarning: null,
    linkProvenance: null,
    linkState: "pending",
    match: null,
    outputState: "included",
    price: 12,
    priceWarning: null,
    privateNote: "",
    rowKind: "listing",
    sourceCultivarReferenceId: "",
    sourceImageUrl: "",
    sourcePrice: "12",
    sourceRow: 2,
    sourceTitle: "Vanguard 2",
    suggestedMatch: null,
    title: "Vanguard 2",
    ...overrides,
  };
}

function controller(
  rows: CatalogImportRow[],
  overrides: Partial<CatalogImporterWorkbenchController> = {},
) {
  return {
    activeReviewIndex: 0,
    activeReviewRow: rows[0] ?? null,
    activeReviewSourceCells: [
      { column: "A", label: "Name", value: rows[0]?.sourceTitle ?? "" },
    ],
    candidateResult: null,
    clearCultivarReferenceIdIssues: vi.fn(),
    finishReviewRow: vi.fn(),
    getSourceCellsForRow: (row: CatalogImportRow) => [
      { column: "A", label: "Name", value: row.sourceTitle },
    ],
    includedRows: rows,
    issueCount: 0,
    mapping: {
      cultivarReferenceId: null,
      description: null,
      imageUrl: null,
      price: null,
      privateNote: null,
      title: 0,
    },
    moveReviewRow: vi.fn(),
    removeDuplicateRow: vi.fn(),
    resetCandidateSearch: vi.fn(),
    resolveImageUrlIssues: vi.fn(),
    resolvePriceIssues: vi.fn(),
    reviewQuery: rows[0]?.sourceTitle ?? "",
    reviewRows: rows,
    searchCandidateResult: null,
    searchCandidates: vi.fn(),
    setReviewQuery: vi.fn(),
    skipReviewRow: vi.fn(),
    ...overrides,
  } as unknown as CatalogImporterWorkbenchController;
}

const vanguardCandidate: CultivarMatchCandidate = {
  awardNames: null,
  bloomSizeIn: 7.5,
  bloomSeason: "Midseason",
  color: "Purple",
  confidence: 82,
  cultivarReferenceId: "cultivar-vanguard",
  displayName: "Vanguard",
  form: "Single",
  hybridizer: "Stamile",
  imageAsset: null,
  imageUrl: null,
  listingCount: 1,
  normalizedName: "vanguard",
  ploidy: "Tetraploid",
  rebloom: false,
  scapeHeightIn: 30,
  year: 2017,
};

describe("catalog importer repair UI", () => {
  it("keeps possible duplicates by default and offers only explicit exclusion", () => {
    const first = importRow({
      id: "row-2",
      linkState: "linked",
      match: vanguardCandidate,
      sourceRow: 2,
      sourceTitle: "Vanguard",
      title: "Vanguard",
    });
    const duplicate = importRow({
      duplicateOfSourceRow: 2,
      id: "row-3",
      linkState: "linked",
      match: vanguardCandidate,
      sourceRow: 3,
      sourceTitle: "Vanguard",
      title: "Vanguard",
    });

    render(
      <CatalogImporterIssues controller={controller([first, duplicate])} />,
    );

    expect(
      screen.getByRole("heading", { name: "Possible duplicate listings" }),
    ).toBeVisible();
    expect(screen.getByText(/All rows are kept unless/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Keep (both|all)/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Exclude row 3 from prepared workbook",
      }),
    ).toBeVisible();
  });

  it("shows an unloadable valid image as a warning without an edit-and-save task", () => {
    const imageUrl = "https://seller.example/daylily.jpg";
    const row = importRow({
      imageUrlWarning: `${CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX}${imageUrl}`,
      sourceImageUrl: imageUrl,
    });

    render(<CatalogImporterIssues controller={controller([row])} />);

    const warning = screen.getByRole("region", {
      name: "Seller images could not be previewed",
    });
    expect(warning).toHaveTextContent("The URLs are kept");
    expect(warning).toHaveTextContent(imageUrl);
    expect(within(warning).queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      within(warning).queryByRole("button", { name: /Save/ }),
    ).not.toBeInTheDocument();
  });

  it("removes navigation and reset controls when the only review item cannot use them", () => {
    const row = importRow();
    const moveReviewRow = vi.fn();
    const { rerender } = render(
      <CatalogImporterReviewQuiz
        controller={controller([row], {
          candidateResult: {
            candidates: [vanguardCandidate],
            error: null,
            loading: false,
            query: row.title,
            rowId: row.id,
          },
          moveReviewRow,
        })}
      />,
    );

    const review = screen.getByRole("region", {
      name: "Review potential matches",
    });
    expect(
      within(review).queryByRole("button", {
        name: "Previous unmatched name",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(review).queryByRole("button", { name: "Next unmatched name" }),
    ).not.toBeInTheDocument();
    expect(
      within(review).queryByRole("button", { name: "Decide later" }),
    ).not.toBeInTheDocument();
    expect(
      within(review).queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(review, { key: "x" });
    expect(moveReviewRow).not.toHaveBeenCalled();

    rerender(
      <CatalogImporterReviewQuiz
        controller={controller([row], {
          candidateResult: {
            candidates: [vanguardCandidate],
            error: null,
            loading: false,
            query: row.title,
            rowId: row.id,
          },
          moveReviewRow,
          reviewQuery: "",
        })}
      />,
    );
    expect(within(review).getByRole("button", { name: "Reset" })).toBeVisible();
  });
});
