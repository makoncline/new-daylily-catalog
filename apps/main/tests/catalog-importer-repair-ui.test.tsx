import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import { CatalogImporterReviewedIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-issues";
import { CatalogImporterReviewedRows } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-rows";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
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
    excludeAllReviewRows: vi.fn(),
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
    excludeIssueRows: vi.fn(),
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
  it("groups reviewed identity decisions and resets one row", () => {
    const resetReviewedRow = vi.fn();
    const linked = importRow({
      id: "row-2",
      identityReviewed: true,
      linkProvenance: "user-confirmed",
      linkState: "linked",
      match: vanguardCandidate,
      sourceRow: 2,
      sourceTitle: "Vanguard",
    });
    const unmatched = importRow({
      id: "row-3",
      identityReviewed: true,
      linkState: "intentionally-unmatched",
      sourceRow: 3,
      sourceTitle: "Vanguard 2",
    });
    const excluded = importRow({
      id: "row-4",
      identityReviewed: true,
      outputState: "removed",
      sourceRow: 4,
      sourceTitle: "Unknown flower",
    });

    render(
      <CatalogImporterReviewedRows
        controller={controller([linked, unmatched, excluded], {
          matchedRows: [linked, unmatched, excluded],
          resetReviewedRow,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Reviewed linked 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Reviewed without link 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Reviewed excluded 1" }),
    ).toBeVisible();
    expect(screen.getByText(/Stamile · 2017/)).toBeVisible();
    expect(screen.getByText(/7.5" bloom/)).toBeVisible();
    const excludedSection = screen
      .getByRole("heading", { name: "Reviewed excluded 1" })
      .closest("section");
    expect(excludedSection).not.toBeNull();
    expect(
      excludedSection!.querySelector('[data-slot="data-table-scrollable"]'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Reset review for Vanguard 2" }),
    );
    expect(resetReviewedRow).toHaveBeenCalledWith("row-3");
  });

  it("shows resolved issue changes as compact spreadsheet rows", () => {
    const undoReviewedIssueAction = vi.fn();
    const previousUpdatedPrice = importRow({
      id: "row-2",
      price: null,
      priceWarning: "Price must be a whole number.",
      sourcePrice: "two for $30",
      sourceRow: 2,
      sourceTitle: "Aerial Art",
    });
    const previousRemovedPrice = importRow({
      id: "row-3",
      price: null,
      priceWarning: "Price must be a whole number.",
      sourcePrice: "trade",
      sourceRow: 3,
      sourceTitle: "Brookwood Black Kitten",
    });
    const previousExcluded = importRow({
      id: "row-4",
      sourceRow: 4,
      sourceTitle: "Wispy Rays",
    });
    const updatedPrice = {
      ...previousUpdatedPrice,
      price: 15,
      priceWarning: null,
    };
    const removedPrice = {
      ...previousRemovedPrice,
      priceWarning: null,
    };
    const excluded = {
      ...previousExcluded,
      outputState: "removed" as const,
    };

    render(
      <CatalogImporterReviewedIssues
        controller={controller([updatedPrice, removedPrice, excluded], {
          matchedRows: [updatedPrice, removedPrice, excluded],
          reviewedIssueActions: [
            {
              id: 1,
              message: "1 price value was updated.",
              previousRows: [previousUpdatedPrice],
            },
            {
              id: 2,
              message: "1 price value was updated.",
              previousRows: [previousRemovedPrice],
            },
            {
              id: 3,
              message: "1 listing was excluded.",
              previousRows: [previousExcluded],
            },
          ],
          undoReviewedIssueAction,
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Resolved issues 3" }),
    ).toBeVisible();
    expect(screen.getByText("Price updated to $15")).toBeVisible();
    expect(screen.getByText("Price removed")).toBeVisible();
    expect(screen.getByText("Listing excluded")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Undo issue change for row 3",
      }),
    );
    expect(undoReviewedIssueAction).toHaveBeenCalledWith(2, "row-3");
  });

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
    fireEvent.click(screen.getByRole("button", { name: "Keep 2" }));
    expect(keepDuplicateRows).toHaveBeenCalledWith(["row-2", "row-3"]);
    fireEvent.click(screen.getByRole("button", { name: "Exclude 2" }));
    expect(excludeDuplicateRows).toHaveBeenCalledWith(["row-2", "row-3"]);
    expect(
      screen.getByRole("button", {
        name: "Exclude row 3 from workbook",
      }),
    ).toBeVisible();
  });

  it("edits every price issue in one spreadsheet table", () => {
    const excludeIssueRows = vi.fn();
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
        destination="import"
        controller={controller([first, second], {
          excludeIssueRows,
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
    fireEvent.click(
      screen.getByRole("button", { name: "Exclude 2 from import" }),
    );
    const excludeDialog = screen.getByRole("alertdialog");
    expect(
      within(excludeDialog).getByRole("heading", {
        name: "Exclude 2 listings from import?",
      }),
    ).toBeVisible();
    fireEvent.click(
      within(excludeDialog).getByRole("button", { name: "Exclude 2" }),
    );
    expect(excludeIssueRows).toHaveBeenCalledWith(["row-2", "row-3"]);
    excludeIssueRows.mockClear();

    fireEvent.click(
      within(table).getByRole("button", { name: "Remove price from row 2" }),
    );
    expect(resolvePriceIssues).toHaveBeenCalledWith([
      { preserveOriginalOffer: true, price: null, rowId: "row-2" },
    ]);
    resolvePriceIssues.mockClear();

    fireEvent.click(
      within(table).getByRole("button", {
        name: "Exclude row 2 from import",
      }),
    );
    expect(excludeIssueRows).toHaveBeenCalledWith(["row-2"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove all invalid prices" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove prices" }));
    expect(resolvePriceIssues).toHaveBeenCalledWith([
      { preserveOriginalOffer: true, price: null, rowId: "row-2" },
      { preserveOriginalOffer: true, price: null, rowId: "row-3" },
    ]);
    resolvePriceIssues.mockClear();
    const firstPriceInput = within(table).getByRole("textbox", {
      name: "Correct price for row 2",
    });
    const secondPriceInput = within(table).getByRole("textbox", {
      name: "Correct price for row 3",
    });
    expect(firstPriceInput).toHaveValue("two for $30");
    expect(screen.getByRole("button", { name: "Save all" })).toBeDisabled();
    fireEvent.change(secondPriceInput, { target: { value: "$" } });
    expect(
      within(table).getByRole("button", { name: "Save price for row 3" }),
    ).toBeDisabled();
    expect(screen.getAllByText("Price must be a whole number.")).toHaveLength(
      2,
    );

    fireEvent.change(secondPriceInput, {
      target: { value: "12.50" },
    });
    expect(screen.getAllByText("Price must be a whole number.")).toHaveLength(
      2,
    );
    expect(screen.getByRole("button", { name: "Save all" })).toBeDisabled();
    fireEvent.change(firstPriceInput, { target: { value: "15" } });
    fireEvent.change(secondPriceInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save all" }));
    expect(resolvePriceIssues).toHaveBeenCalledWith([
      { preserveOriginalOffer: false, price: 15, rowId: "row-2" },
      { preserveOriginalOffer: false, price: null, rowId: "row-3" },
    ]);
  });

  it("does not add seller-image repair work to the importer MVP", () => {
    const row = importRow({
      imageUrlWarning: "Seller image could not be previewed",
      sourceImageUrl: "https://seller.example/daylily.jpg",
    });

    const { container } = render(
      <CatalogImporterIssues controller={controller([row])} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("focuses review and uses fixed keys to leave unmatched or exclude", () => {
    const row = importRow();
    const nextRow = importRow({
      id: "row-3",
      sourceRow: 3,
      sourceTitle: "Another cultivar",
      title: "Another cultivar",
    });
    const excludeAllReviewRows = vi.fn();
    const excludeReviewRow = vi.fn();
    const moveReviewRow = vi.fn();
    const onFindDifferentCultivar = vi.fn();
    const skipReviewRow = vi.fn();
    render(
      <CatalogImporterReviewQuiz
        onFindDifferentCultivar={onFindDifferentCultivar}
        controller={controller([row, nextRow], {
          activeReviewSourceCells: [
            {
              column: "A",
              label: "Name",
              mapped: true,
              value: row.sourceTitle,
            },
            {
              column: "B",
              label: "Price",
              mapped: true,
              value: "12",
            },
          ],
          candidateResult: {
            candidates: [vanguardCandidate],
            error: null,
            loading: false,
            query: row.title,
            rowId: row.id,
          },
          excludeAllReviewRows,
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
    expect(review).toHaveFocus();
    const sourceRow = within(review).getByRole("region", {
      name: "Uploaded spreadsheet row 2",
    });
    const pinnedColumns = sourceRow.querySelector(
      '[data-slot="data-table-pinned-left"]',
    );
    const scrollableColumns = sourceRow.querySelector(
      '[data-slot="data-table-scrollable"]',
    );
    expect(pinnedColumns).not.toBeNull();
    expect(scrollableColumns).not.toBeNull();
    expect(
      within(pinnedColumns as HTMLElement).getByRole("columnheader", {
        name: "Row",
      }),
    ).toBeVisible();
    expect(
      within(pinnedColumns as HTMLElement).getByRole("columnheader", {
        name: "Name",
      }),
    ).toBeVisible();
    expect(
      within(scrollableColumns as HTMLElement).getByRole("columnheader", {
        name: "Price",
      }),
    ).toBeVisible();
    const previous = within(review).getByRole("button", {
      name: "Previous unmatched name",
    });
    const next = within(review).getByRole("button", {
      name: "Next unmatched name",
    });
    expect(previous).toHaveAttribute("data-slot", "kbd");
    expect(previous).toHaveAttribute("aria-keyshortcuts", "ArrowLeft");
    expect(next).toHaveAttribute("data-slot", "kbd");
    expect(next).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
    fireEvent.click(previous);
    fireEvent.click(next);
    expect(moveReviewRow).toHaveBeenNthCalledWith(1, -1);
    expect(moveReviewRow).toHaveBeenNthCalledWith(2, 1);
    moveReviewRow.mockClear();
    expect(within(review).queryByText("1–5")).not.toBeInTheDocument();
    expect(
      within(review).queryByRole("button", { name: "Decide later" }),
    ).not.toBeInTheDocument();
    expect(
      within(review).queryByText("Search another cultivar", { exact: true }),
    ).not.toBeInTheDocument();

    const leaveUnmatched = within(review).getByRole("button", {
      name: "Leave unmatched",
    });
    expect(leaveUnmatched).toHaveAttribute("aria-keyshortcuts", "U");
    expect(leaveUnmatched).toHaveAttribute("data-slot", "kbd");
    fireEvent.keyDown(review, { key: "u" });
    expect(skipReviewRow).toHaveBeenCalledOnce();

    const exclude = within(review).getByRole("button", {
      name: "Exclude from catalog",
    });
    expect(exclude).toHaveAttribute("aria-keyshortcuts", "X");
    expect(exclude).toHaveAttribute("data-slot", "kbd");
    fireEvent.keyDown(review, { key: "x" });
    expect(excludeReviewRow).toHaveBeenCalledOnce();
    expect(moveReviewRow).not.toHaveBeenCalled();
    fireEvent.keyDown(review, { key: "e" });
    expect(excludeReviewRow).toHaveBeenCalledOnce();
    expect(within(review).queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(
      within(review).getByRole("button", {
        name: "Exclude all from workbook",
      }),
    );
    const excludeAllDialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(excludeAllDialog).getByRole("button", { name: "Exclude all" }),
    );
    expect(excludeAllReviewRows).toHaveBeenCalledOnce();
  });
});
