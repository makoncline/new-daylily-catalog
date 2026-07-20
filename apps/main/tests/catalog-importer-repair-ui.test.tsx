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
    acknowledgeImagePreviewWarnings: vi.fn(),
    activeReviewIndex: 0,
    activeReviewRow: rows[0] ?? null,
    activeReviewSourceCells: [
      { column: "A", label: "Name", value: rows[0]?.sourceTitle ?? "" },
    ],
    candidateResult: null,
    clearCultivarReferenceIdIssues: vi.fn(),
    completedIssueCount: 0,
    completedReviewCount: 0,
    excludeReviewRow: vi.fn(),
    finishReviewRow: vi.fn(),
    getSourceCellsForRow: (row: CatalogImportRow) => [
      { column: "A", label: "Name", value: row.sourceTitle },
    ],
    includedRows: rows,
    issueCount: 0,
    issueProgressTotal: 1,
    mapping: {
      cultivarReferenceId: null,
      description: null,
      imageUrl: null,
      price: null,
      privateNote: null,
      title: 0,
    },
    moveReviewRow: vi.fn(),
    excludeDuplicateRows: vi.fn(),
    keepDuplicateRows: vi.fn(),
    removeDuplicateRow: vi.fn(),
    remainingIssueCount: 1,
    resetCandidateSearch: vi.fn(),
    resolveImageUrlIssues: vi.fn(),
    resolvePriceIssues: vi.fn(),
    reviewQuery: rows[0]?.sourceTitle ?? "",
    reviewRows: rows,
    reviewProgressTotal: rows.length,
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
  it("offers group and row actions for possible duplicates", () => {
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

    const keepDuplicateRows = vi.fn();
    const excludeDuplicateRows = vi.fn();
    render(
      <CatalogImporterIssues
        controller={controller([first, duplicate], {
          excludeDuplicateRows,
          keepDuplicateRows,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Possible duplicate listings" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep all" }));
    expect(keepDuplicateRows).toHaveBeenCalledWith(["row-2", "row-3"]);
    fireEvent.click(screen.getByRole("button", { name: "Exclude all" }));
    expect(excludeDuplicateRows).toHaveBeenCalledWith(["row-2", "row-3"]);
    expect(
      screen.getByRole("button", {
        name: "Exclude row 3 from prepared workbook",
      }),
    ).toBeVisible();
  });

  it("edits every price issue in one spreadsheet table", () => {
    const resolvePriceIssues = vi.fn();
    const first = importRow({
      id: "row-2",
      priceWarning: "Use one numeric price.",
      sourcePrice: "two for $30",
      sourceRow: 2,
      sourceTitle: "Vanguard",
    });
    const second = importRow({
      id: "row-3",
      priceWarning: "Use one numeric price.",
      sourcePrice: "$18 each",
      sourceRow: 3,
      sourceTitle: "Aerial Art",
    });

    render(
      <CatalogImporterIssues
        controller={controller([first, second], {
          mapping: {
            cultivarReferenceId: null,
            description: null,
            imageUrl: null,
            price: 1,
            privateNote: 2,
            title: 0,
          },
          resolvePriceIssues,
        })}
      />,
    );

    const table = screen.getByRole("table", { name: "Price format rows" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    fireEvent.change(
      within(table).getByRole("textbox", {
        name: "Correct price for row 3",
      }),
      { target: { value: "18" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save all" }));
    expect(resolvePriceIssues).toHaveBeenCalledWith([
      { preserveOriginalOffer: true, price: 15, rowId: "row-2" },
      { preserveOriginalOffer: false, price: 18, rowId: "row-3" },
    ]);
  });

  it("keeps an unloadable valid image URL without an edit-and-save task", () => {
    const imageUrl = "https://seller.example/daylily.jpg";
    const row = importRow({
      imageUrlWarning: `${CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX}${imageUrl}`,
      sourceImageUrl: imageUrl,
    });
    const acknowledgeImagePreviewWarnings = vi.fn();

    render(
      <CatalogImporterIssues
        controller={controller([row], { acknowledgeImagePreviewWarnings })}
      />,
    );

    const warning = screen.getByRole("region", {
      name: "Seller images could not be previewed",
    });
    expect(warning).toHaveTextContent(imageUrl);
    expect(within(warning).queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(within(warning).getByRole("button", { name: "Keep URL" }));
    expect(acknowledgeImagePreviewWarnings).toHaveBeenCalledWith(["row-2"]);
  });

  it("uses numbered actions to leave unmatched or exclude a review item", () => {
    const row = importRow();
    const excludeReviewRow = vi.fn();
    const moveReviewRow = vi.fn();
    const onFindDifferentCultivar = vi.fn();
    const skipReviewRow = vi.fn();
    render(
      <CatalogImporterReviewQuiz
        onFindDifferentCultivar={onFindDifferentCultivar}
        controller={controller([row], {
          candidateResult: {
            candidates: [vanguardCandidate],
            error: null,
            loading: false,
            query: row.title,
            rowId: row.id,
          },
          excludeReviewRow,
          moveReviewRow,
          skipReviewRow,
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Find a different cultivar" }),
    );
    expect(onFindDifferentCultivar).toHaveBeenCalledWith(row);

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
      within(review).queryByText("Search another cultivar", { exact: true }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(review, { key: "x" });
    expect(moveReviewRow).not.toHaveBeenCalled();

    expect(
      within(review).getByRole("button", { name: "Leave unmatched" }),
    ).toHaveAttribute("aria-keyshortcuts", "2");
    fireEvent.keyDown(review, { key: "2" });
    expect(skipReviewRow).toHaveBeenCalledOnce();
    expect(
      within(review).getByRole("button", { name: "Exclude from catalog" }),
    ).toHaveAttribute("aria-keyshortcuts", "3");
    fireEvent.keyDown(review, { key: "3" });
    expect(excludeReviewRow).toHaveBeenCalledOnce();
    expect(within(review).queryByRole("textbox")).not.toBeInTheDocument();
  });
});
