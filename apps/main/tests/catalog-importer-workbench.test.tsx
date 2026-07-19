import "fake-indexeddb/auto";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";
import {
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());
const downloadCatalogImportFileMock = vi.hoisted(() => vi.fn());
const requestCultivarMatchesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("@/lib/catalog-importer-match-client", () => ({
  requestCultivarMatches: requestCultivarMatchesMock,
}));

vi.mock("@/lib/catalog-importer-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/catalog-importer-file")>()),
  downloadCatalogImportFile: downloadCatalogImportFileMock,
}));

describe("CatalogImporterWorkbench", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    await clearCatalogImporterDraft();
    capturePosthogEventMock.mockClear();
    downloadCatalogImportFileMock.mockReset();
    downloadCatalogImportFileMock.mockResolvedValue(undefined);
    requestCultivarMatchesMock.mockReset();
    requestCultivarMatchesMock.mockResolvedValue([]);
  });

  it("starts with one clear upload path and concise supporting controls", () => {
    render(<CatalogImporterWorkbench />);

    expect(
      screen.getByText("Drop a spreadsheet here, or choose a file"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Download template" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Use sample catalog" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Catalog cleaning progress" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Prepare a spreadsheet that imports perfectly"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/MVP imports/)).not.toBeInTheDocument();
  });

  it("tracks sample imports with aggregate properties only", async () => {
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    expect(
      screen.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );

    await waitFor(() => {
      expect(capturePosthogEventMock).toHaveBeenCalledWith(
        "catalog_import_started",
        {
          file_type: "csv",
          source: "sample",
        },
      );
      expect(capturePosthogEventMock).toHaveBeenCalledWith(
        "catalog_import_uploaded",
        {
          file_type: "csv",
          row_count: 11,
          sheet_count: 1,
          source: "sample",
        },
      );
      expect(capturePosthogEventMock).toHaveBeenCalledWith(
        "catalog_import_previewed",
        {
          file_type: "csv",
          issue_count: 1,
          matched_count: 0,
          review_count: 10,
          row_count: 10,
          sheet_count: 1,
        },
      );
    });
    expect(screen.getByRole("button", { name: "Map columns" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Start over with this file" }),
    ).not.toBeInTheDocument();
  });

  it("saves the spreadsheet before cultivar matching finishes", async () => {
    let finishMatching!: (value: []) => void;
    requestCultivarMatchesMock.mockReturnValue(
      new Promise<[]>((resolve) => {
        finishMatching = resolve;
      }),
    );
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));

    expect(requestCultivarMatchesMock).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );
    const processingStatus = await screen.findByRole("status", {
      name: "Building catalog preview",
    });
    expect(processingStatus).toBeVisible();
    await waitFor(() =>
      expect(requestCultivarMatchesMock).toHaveBeenCalledOnce(),
    );
    await waitFor(() =>
      expect(processingStatus).toHaveTextContent("Matching cultivar names"),
    );
    expect(processingStatus).toHaveTextContent("Matching cultivar names");
    await waitFor(async () => {
      await expect(readCatalogImporterDraft()).resolves.toMatchObject({
        mapping: { title: 0 },
        matchedRows: null,
        parsedSpreadsheet: {
          fileName: "Sample daylily catalog.csv",
        },
      });
    });

    await act(async () => {
      finishMatching([]);
    });
  });

  it("explains and confirms clearing browser-local progress", async () => {
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear local progress" }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "Clear local progress?" }),
    ).toHaveTextContent(
      "This clears the workbook and all progress saved in this browser. Your original file is not changed.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Sample daylily catalog.csv")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear local progress" }),
    );
    fireEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Clear local progress?" }),
      ).getByRole("button", {
        name: "Clear local progress",
      }),
    );

    expect(
      await screen.findByText("Drop a spreadsheet here, or choose a file"),
    ).toBeVisible();
  });

  it("restores an incomplete draft and retries a failed match", async () => {
    const spreadsheet = createCatalogImportSampleSpreadsheet();
    const initialDraft: CatalogImporterDraft = {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: 2,
        imageUrl: 4,
        price: 1,
        privateNote: 3,
        title: 0,
      },
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: spreadsheet,
      selectedSheetIndex: 0,
      version: 3,
    };
    requestCultivarMatchesMock
      .mockRejectedValueOnce(new Error("Cultivar matching is warming up."))
      .mockResolvedValue([]);

    render(<CatalogImporterWorkbench initialDraft={initialDraft} />);

    expect(requestCultivarMatchesMock).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Build catalog preview" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Cultivar matching did not finish",
      }),
    ).toBeVisible();
    expect(requestCultivarMatchesMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", {
        name: "Your private catalog preview is ready",
      }),
    ).toBeVisible();
    expect(requestCultivarMatchesMock.mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("replaces an unavailable saved ID only after a confident name rematch", async () => {
    const spreadsheet = {
      fileName: "saved-id.csv",
      sheets: [
        {
          name: "Catalog",
          rows: [
            ["name", "Daylily Catalog ID"],
            ["A.W. Shucks", "missing-id"],
          ],
        },
      ],
    };
    const mapping = {
      cultivarReferenceId: 1,
      description: null,
      imageUrl: null,
      price: null,
      privateNote: null,
      title: 0,
    };
    const [sourceRow] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping,
      rows: spreadsheet.sheets[0]!.rows,
    });
    const candidate = {
      awardNames: null,
      bloomSizeIn: 7.5,
      bloomSeason: "Late",
      color: "Purple",
      confidence: 100,
      cultivarReferenceId: "cultivar-aw-shucks",
      displayName: "A.W. Shucks",
      form: "Spider",
      hybridizer: "Herrington",
      imageAsset: null,
      imageUrl: null,
      listingCount: 1,
      normalizedName: "a w shucks",
      ploidy: "Diploid",
      rebloom: true,
      scapeHeightIn: 26,
      year: 2014,
    };
    requestCultivarMatchesMock.mockResolvedValue([
      {
        candidates: [candidate],
        exactMatch: candidate,
        inputName: "A.W. Shucks",
        normalizedInput: "a.w. shucks",
      },
    ]);
    const initialDraft: CatalogImporterDraft = {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping,
      matchedRows: [
        {
          ...sourceRow!,
          cultivarReferenceIdWarning: "missing-id",
          linkState: "pending",
        },
      ],
      matchedRowsKey: "saved-id",
      parsedSpreadsheet: spreadsheet,
      selectedSheetIndex: 0,
      version: 3,
    };

    render(<CatalogImporterWorkbench initialDraft={initialDraft} />);

    expect(
      screen.getByRole("heading", { name: "Saved cultivar IDs not found" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Match by name" }));

    expect(
      (
        await screen.findAllByText(
          "1 ID was replaced by a confident name match.",
        )
      )[0],
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Saved cultivar IDs not found" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("1", {
        selector: "[data-testid='linked-listing-count']",
      }),
    ).toBeVisible();
  });

  it("reports download failures separately and allows another download", async () => {
    downloadCatalogImportFileMock
      .mockRejectedValueOnce(new Error("The browser blocked the download."))
      .mockResolvedValueOnce(undefined);
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );
    const downloadButton = within(
      await screen.findByRole("navigation", {
        name: "Catalog preparation workspace",
      }),
    ).getByRole("button", { name: "Download current workbook" });

    fireEvent.click(downloadButton);
    expect(
      screen.getByRole("alertdialog", {
        name: "Download before review is complete?",
      }),
    ).toHaveTextContent(
      "You have 10 potential matches to review. You have 1 issue to review.",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Spreadsheet download did not finish",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: "Cultivar matching did not finish",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(downloadButton);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue",
      }),
    );
    await waitFor(() =>
      expect(downloadCatalogImportFileMock).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", {
          name: "Spreadsheet download did not finish",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_downloaded",
      {
        download_state: "current",
        file_type: "csv",
        issue_count: 1,
        matched_count: 0,
        review_count: 10,
        row_count: 10,
        sheet_count: 1,
      },
    );
  });

  it("hides acquisition prompts for Pro members without gating download", async () => {
    render(<CatalogImporterWorkbench showMembershipPrompts={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );

    expect(
      screen.queryByRole("heading", {
        name: "Imagine this as your public catalog",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(
        await screen.findByRole("navigation", {
          name: "Catalog preparation workspace",
        }),
      ).getByRole("button", { name: "Download current workbook" }),
    ).toBeVisible();
  });

  it("reveals the enriched catalog before preparation and membership prompts", async () => {
    const linkedNames = new Set([
      "Action Figure",
      "Happy Returns",
      "My Favorite Martian",
      "Orange Velvet",
      "Primal Scream",
      "Ruby Spider",
      "Stella de Oro",
    ]);
    requestCultivarMatchesMock.mockImplementation(
      ({ names }: { names: string[] }) =>
        Promise.resolve(
          names.map((name, index) => {
            const normalizedInput = name.toLowerCase();
            const suggestedName = name === "Vanguard 2" ? "Vanguard" : name;
            const confidence = linkedNames.has(name)
              ? 100
              : name === "Vanguard 2"
                ? 82
                : null;
            const candidate =
              confidence !== null
                ? {
                    awardNames: name === "Stella de Oro" ? "L/W" : null,
                    bloomSizeIn: 5,
                    bloomSeason: "Midseason",
                    color: "Yellow",
                    confidence,
                    cultivarReferenceId: `cultivar-${suggestedName.toLowerCase().replaceAll(" ", "-")}`,
                    displayName: suggestedName,
                    form: "Single",
                    hybridizer: index % 2 === 0 ? "Example One" : "Example Two",
                    imageAsset: {
                      blurUrl: null,
                      displayUrl: `https://media.example/${index}.jpg`,
                      id: `asset-${index}`,
                      originalUrl: null,
                      status: "ready",
                      thumbUrl: `https://media.example/${index}-thumb.jpg`,
                    },
                    imageUrl: null,
                    listingCount: 1,
                    normalizedName: suggestedName.toLowerCase(),
                    ploidy: "Diploid",
                    rebloom: true,
                    scapeHeightIn: 24,
                    year: 1975 + index,
                  }
                : null;

            return {
              candidates: candidate ? [candidate] : [],
              exactMatch: confidence === 100 ? candidate : null,
              inputName: name,
              normalizedInput,
            };
          }),
        ),
    );
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );

    const reveal = await screen.findByRole("heading", {
      name: "Your private catalog preview is ready",
    });
    expect(
      screen.getByText("8", {
        selector: "[data-testid='linked-listing-count']",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("2", {
        selector: "[data-testid='pending-decision-count']",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("1", {
        selector: "[data-testid='issue-count']",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Linked listings now include Daylily Catalog photos and registry details.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/Private browser preview/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: /Review \d+% match/ }),
    ).toHaveLength(0);
    const stellaDetailsButtons = screen.getAllByRole("button", {
      name: "View details for Stella de Oro",
    });
    expect(stellaDetailsButtons).toHaveLength(2);
    fireEvent.click(stellaDetailsButtons[0]!);
    expect(
      await screen.findByRole("button", {
        name: "Change cultivar match",
      }),
    ).toBeVisible();
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Stella de Oro" })).getByRole(
        "button",
        { name: "Close" },
      ),
    );
    const workspaceNavigation = screen.getByRole("navigation", {
      name: "Catalog preparation workspace",
    });
    expect(workspaceNavigation).toHaveTextContent("8 linked");
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Review names (2)",
      }),
    ).toHaveAttribute("href", "#catalog-importer-review-quiz");
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Fix data (1)",
      }),
    ).toHaveAttribute("href", "#catalog-importer-issues");
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Download current workbook",
      }),
    ).toBeVisible();
    const mobileActions = screen.getByRole("navigation", {
      name: "Catalog preparation actions",
    });
    expect(
      within(mobileActions).getByRole("link", { name: /Review 2/ }),
    ).toHaveAttribute("href", "#catalog-importer-review-quiz");

    const preview = screen.getByRole("heading", {
      name: "Your catalog preview",
    });
    const insights = screen.getByRole("heading", {
      name: "Explore your catalog",
    });
    expect(
      screen.getByText(
        "Based on 7 linked unique cultivars. 2 unresolved listings are not included.",
      ),
    ).toBeVisible();
    const topHybridizerInsight = screen.getByRole("link", {
      name: "Show 4 cultivars for Example One",
    });
    expect(topHybridizerInsight).toBeVisible();
    fireEvent.click(topHybridizerInsight);
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_preview_interacted",
      {
        filter_type: "hybridizer",
        interaction_type: "insight",
      },
    );
    expect(
      screen.getByRole("button", { name: /Hybridizer: Example One/ }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Catalog listings" }),
      ).queryByRole("heading", { name: "Happy Returns" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Hybridizer: Example One/ }),
    );
    expect(
      within(
        screen.getByRole("region", { name: "Catalog listings" }),
      ).getByRole("heading", { name: "Happy Returns" }),
    ).toBeVisible();

    fireEvent.click(screen.getByText("By year", { exact: true }));
    expect(screen.getAllByTestId("catalog-analysis-bar")).toHaveLength(7);
    for (const bar of screen.getAllByTestId("catalog-analysis-bar")) {
      expect(bar).toHaveStyle({ width: "100%" });
    }

    fireEvent.click(screen.getByText("Award winning", { exact: true }));
    expect(
      screen.getByRole("link", {
        name: /Lambert-Webster.*Lenington All-American Awards/,
      }),
    ).toBeVisible();

    const listingRegion = screen.getByRole("region", {
      name: "Catalog listings",
    });
    expect(
      within(listingRegion).queryByText("Reference photo", { exact: true }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(listingRegion).getAllByRole("button", {
        name: "View details for Stella de Oro",
      })[0]!,
    );
    expect(
      screen.getByRole("dialog", { name: "Stella de Oro" }),
    ).toHaveTextContent("Lambert-Webster / Lenington All-American Awards");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    const review = screen.getByRole("heading", {
      name: "Review potential matches",
    });
    const issues = screen.getByRole("heading", {
      name: "Review spreadsheet data",
    });
    expect(
      screen.queryByRole("heading", {
        name: "Your current workbook is ready",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("File details")).not.toBeInTheDocument();
    const membership = screen.getByRole("heading", {
      name: "Imagine this as your public catalog",
    });
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_membership_prompt_viewed",
      {
        cta_id: "catalog-importer-preview-membership",
      },
    );

    for (const [earlier, later] of [
      [reveal, preview],
      [preview, insights],
      [insights, membership],
      [membership, review],
      [review, issues],
    ] as const) {
      expect(
        earlier.compareDocumentPosition(later) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(membership.parentElement).toHaveTextContent(
      "Your prepared workbook remains free",
    );
    expect(
      within(membership.closest("section")!).queryByRole("button", {
        name: "Not now",
      }),
    ).not.toBeInTheDocument();

    const reviewQuiz = screen.getByRole("region", {
      name: "Review potential matches",
    });
    expect(
      within(reviewQuiz).getByRole("button", {
        name: "Use match 1: Vanguard",
      }),
    ).toBeVisible();
    expect(
      within(reviewQuiz).getByRole("button", { name: "Decide later" }),
    ).toHaveAttribute("aria-keyshortcuts", "X");
    expect(reviewQuiz).toHaveTextContent(
      "Leave unmatched keeps this row in the prepared workbook without a Daylily Catalog cultivar ID or link.",
    );

    fireEvent.keyDown(reviewQuiz, { key: "x" });
    expect(
      screen.getByText("2 manual matches remaining", { exact: false }),
    ).toBeVisible();
    expect(
      within(reviewQuiz).getByRole("heading", { name: "Aerial Art" }),
    ).toBeVisible();
    fireEvent.click(
      within(reviewQuiz).getByRole("button", {
        name: "Previous unmatched name",
      }),
    );
    fireEvent.click(
      within(reviewQuiz).getByRole("button", { name: "Leave unmatched" }),
    );
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_identity_decided",
      expect.objectContaining({
        decision_state: "unmatched",
        final_decision: false,
        first_decision: true,
        remaining_count: 1,
      }),
    );
    expect(
      await screen.findByRole("region", { name: "Listings left unmatched" }),
    ).toHaveTextContent("Vanguard 2");
    fireEvent.click(
      screen.getByRole("button", { name: "Review Vanguard 2 again" }),
    );
    expect(
      await screen.findByText("2 manual matches remaining", { exact: false }),
    ).toBeVisible();

    fireEvent.click(
      within(reviewQuiz).getByRole("button", {
        name: "Use match 1: Vanguard",
      }),
    );

    expect(
      await screen.findByText("Vanguard was added to your preview."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "View in preview" })).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Catalog listings" }),
      ).getByRole("heading", { name: "Vanguard" }),
    ).toBeVisible();
    expect(
      screen.getByText("9", {
        selector: "[data-testid='linked-listing-count']",
      }),
    ).toBeVisible();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Review names (1)",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Based on 8 linked unique cultivars. 1 unresolved listing is not included.",
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Undo identity decision" }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("region", { name: "Catalog listings" }),
        ).queryByRole("heading", { name: "Vanguard" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText("8", {
        selector: "[data-testid='linked-listing-count']",
      }),
    ).toBeVisible();
    expect(
      within(workspaceNavigation).getByRole("link", {
        name: "Review names (2)",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Based on 7 linked unique cultivars. 2 unresolved listings are not included.",
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "View details for Stella de Oro",
      })[0]!,
    );
    fireEvent.click(
      within(
        await screen.findByRole("dialog", { name: "Stella de Oro" }),
      ).getByRole("button", { name: "Change cultivar match" }),
    );
    const matchSheet = await screen.findByRole("dialog", {
      name: "Change cultivar match",
    });
    expect(matchSheet).toHaveTextContent(
      "Leave unmatched keeps this row in the prepared workbook without a Daylily Catalog cultivar ID or link.",
    );
    fireEvent.click(
      within(matchSheet).getByRole("button", { name: "Leave unmatched" }),
    );
    expect(
      await screen.findByRole("region", { name: "Listings left unmatched" }),
    ).toHaveTextContent("Stella de Oro");
    fireEvent.click(
      screen.getByRole("button", { name: "Undo identity decision" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Listings left unmatched" }),
      ).not.toBeInTheDocument(),
    );

    const priceIssues = screen.getByRole("region", {
      name: "Price formats need review",
    });
    await act(async () => {
      fireEvent.change(
        within(priceIssues).getByLabelText("Correct price for row 11"),
        {
          target: { value: "15.00" },
        },
      );
      fireEvent.click(
        within(priceIssues).getByRole("button", {
          name: "Save price for row 11",
        }),
      );
    });
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_issue_resolved",
      expect.objectContaining({
        issue_type: "price",
        resolved_count: 1,
      }),
    );
  });
});
