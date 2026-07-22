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

async function openPreview() {
  return screen.findByRole("region", { name: "Catalog preview ready" });
}

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
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        disconnect() {}
        observe(target: Element) {
          this.callback(
            [
              {
                contentRect: {
                  height: 224,
                  width: 800,
                },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        }
        unobserve() {}
      },
    );
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/catalog-importer");
    await clearCatalogImporterDraft();
    capturePosthogEventMock.mockClear();
    downloadCatalogImportFileMock.mockReset();
    downloadCatalogImportFileMock.mockResolvedValue(undefined);
    requestCultivarMatchesMock.mockReset();
    requestCultivarMatchesMock.mockResolvedValue([]);
  });

  it("starts directly with concise source choices", () => {
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
      screen.getByRole("button", { name: "Add listings manually" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Catalog importer steps" }),
    ).toBeVisible();

    expect(
      screen.queryByText("Prepare a spreadsheet that imports perfectly"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/MVP imports/)).not.toBeInTheDocument();
  });

  it("builds the same preview from a manually entered listing", async () => {
    const candidate = {
      awardNames: null,
      bloomSizeIn: 7.5,
      bloomSeason: "Late",
      color: "Purple",
      confidence: 100,
      cultivarReferenceId: "cultivar-vanguard",
      displayName: "Vanguard",
      form: "Single",
      hybridizer: "Stamile",
      imageAsset: null,
      imageUrl: "https://example.com/vanguard.jpg",
      listingCount: 1,
      normalizedName: "vanguard",
      ploidy: "Tetraploid",
      rebloom: false,
      scapeHeightIn: 37,
      year: 2017,
    };
    requestCultivarMatchesMock.mockResolvedValue([
      {
        candidates: [candidate],
        exactMatch: candidate,
        inputName: "Vanguard",
        normalizedInput: "vanguard",
      },
    ]);
    render(<CatalogImporterWorkbench />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add listings manually" }),
    );
    const search = screen.getByLabelText("Search cultivar name");
    fireEvent.change(search, { target: { value: "Vanguard" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByRole("img", { name: "Vanguard reference photo" }),
    ).toBeVisible();
    expect(screen.queryByText("No cultivars found")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));

    expect(screen.getByText("1/10 listings")).toBeVisible();
    expect(screen.getByRole("cell", { name: "Vanguard" })).toBeVisible();
    expect(screen.queryByLabelText("Name for row 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Vanguard" }));
    expect(screen.getByText("0/10 listings")).toBeVisible();

    fireEvent.change(search, { target: { value: "Vanguard" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Build catalog preview" }),
    );
    await openPreview();
    await waitFor(async () => {
      const draft = await readCatalogImporterDraft();
      expect(draft?.parsedSpreadsheet?.sheets[0]?.rows[1]).toEqual([
        "Vanguard",
        "",
        "",
        "",
        "cultivar-vanguard",
      ]);
    });

    expect(
      within(
        screen.getByRole("region", { name: "Catalog listings" }),
      ).getByRole("heading", { name: "Vanguard" }),
    ).toBeVisible();
    expect(capturePosthogEventMock).toHaveBeenCalledWith(
      "catalog_import_started",
      { file_type: "csv", source: "manual" },
    );
  });

  it("tracks sample imports with aggregate properties only", async () => {
    render(<CatalogImporterWorkbench />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    expect(
      screen.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spreadsheet preview" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Hide spreadsheet preview" }),
    ).not.toBeInTheDocument();
    const uploadedSpreadsheet = screen.getByRole("region", {
      name: "Uploaded spreadsheet",
    });
    const spreadsheetPreview = screen.getByRole("heading", {
      name: "Spreadsheet preview",
    });
    const spreadsheetPreviewSection = spreadsheetPreview.closest("section");
    const pinnedPreviewColumns = spreadsheetPreviewSection?.querySelector(
      '[data-slot="data-table-pinned-left"]',
    );
    const scrollablePreviewColumns = spreadsheetPreviewSection?.querySelector(
      '[data-slot="data-table-scrollable"]',
    );
    expect(pinnedPreviewColumns).not.toBeNull();
    expect(scrollablePreviewColumns).not.toBeNull();
    expect(
      within(pinnedPreviewColumns as HTMLElement).getByRole("columnheader", {
        name: "Row",
      }),
    ).toBeVisible();
    expect(
      within(pinnedPreviewColumns as HTMLElement).getByRole("columnheader", {
        name: "A",
      }),
    ).toBeVisible();
    expect(
      within(scrollablePreviewColumns as HTMLElement).getByRole(
        "columnheader",
        { name: "B" },
      ),
    ).toBeVisible();
    const columnMapping = screen.getByRole("heading", {
      name: "Map your columns",
    });
    const buildPreview = await screen.findByRole("button", {
      name: "Build catalog preview",
    });
    for (const [earlier, later] of [
      [uploadedSpreadsheet, spreadsheetPreview],
      [spreadsheetPreview, columnMapping],
      [columnMapping, buildPreview],
    ] as const) {
      expect(
        earlier.compareDocumentPosition(later) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    fireEvent.click(buildPreview);

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
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Prepare" }));
    expect(
      screen.getByRole("heading", { name: "Map your columns" }),
    ).toBeVisible();
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

    expect(await openPreview()).toBeVisible();
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

    fireEvent.click(screen.getByRole("button", { name: "Issues 0/1" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      screen.getByRole("heading", {
        name: "We matched 1 listing to 1 registered cultivar",
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
    await openPreview();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    const downloadButton = screen.getByRole("button", {
      name: "Download original workbook",
    });

    fireEvent.click(downloadButton);
    expect(
      screen.getByRole("alertdialog", {
        name: "Download before review is complete?",
      }),
    ).toHaveTextContent("10 potential matches and 2 spreadsheet items remain");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Download anyway",
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
        name: "Download anyway",
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
        download_type: "enriched",
      },
    );
  });

  it("hides acquisition prompts for Pro members without gating download", async () => {
    render(<CatalogImporterWorkbench viewerState="pro" />);

    fireEvent.click(screen.getByRole("button", { name: "Use sample catalog" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Build catalog preview" }),
    );
    await openPreview();

    expect(
      screen.queryByRole("heading", {
        name: "Build a public catalog with Pro",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeVisible();
  });

  it("opens the enriched catalog before preparation and membership prompts", async () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private readonly callback: IntersectionObserverCallback) {}

        disconnect() {}
        observe(target: Element) {
          this.callback(
            [
              {
                intersectionRatio: 1,
                isIntersecting: true,
                target,
              } as IntersectionObserverEntry,
            ],
            this as unknown as IntersectionObserver,
          );
        }
        takeRecords() {
          return [];
        }
        unobserve() {}
        root = null;
        rootMargin = "0px";
        thresholds = [0.5];
      },
    );
    const linkedNames = new Set([
      "Action Figure",
      "Happy Returns",
      "My Favorite Martian",
      "Orange Velvet",
      "Primal Scream",
      "Ruby Spider",
      "Stella de Oro",
    ]);
    const bloomSeasons = [
      "Late",
      "Early",
      "Midseason",
      "Extra Early",
      "Very Late",
      "Mid-Late",
      "Early-Midseason",
      "Late-Midseason",
      "Late",
    ];
    const flowerShowClassifications = [
      "Large",
      "Small",
      "Unusual Form",
      "Miniature",
      "Spider",
      "Extra-Large",
      "Double/Poly",
      "Seedling",
      "Large",
    ];
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
                    bloomSeason: bloomSeasons[index] ?? "Midseason",
                    color: "Yellow",
                    confidence,
                    cultivarReferenceId: `cultivar-${suggestedName.toLowerCase().replaceAll(" ", "-")}`,
                    displayName: suggestedName,
                    form: "Single",
                    flowerShow: flowerShowClassifications[index] ?? "Large",
                    hybridizer: index % 2 === 0 ? "Example One" : "Example Two",
                    imageAsset: {
                      blurUrl: null,
                      displayUrl: `https://media.example/${index}.jpg`,
                      id: `asset-${index}`,
                      originalUrl: null,
                      status: "ready",
                      thumbUrl: `https://media.example/${index}-thumb.jpg`,
                    },
                    imageUrl: `https://media.example/${index}.jpg`,
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

    const results = await openPreview();
    expect(
      screen.queryByRole("status", { name: "Catalog results reveal" }),
    ).not.toBeInTheDocument();
    expect(
      within(results).getByRole("heading", {
        name: "We matched 8 listings to 7 registered cultivars",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("2", {
        selector: "[data-testid='pending-decision-count']",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("2", {
        selector: "[data-testid='issue-count']",
      }),
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
      name: "Catalog importer steps",
    });
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Review 0/2",
      }),
    ).toBeVisible();
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Issues 0/2",
      }),
    ).toBeVisible();
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Download",
      }),
    ).toBeVisible();
    const preview = screen.getByRole("heading", {
      name: "Your catalog preview",
    });
    const insights = screen.getByRole("heading", {
      name: "Collection insights",
    });
    expect(screen.getByText("7 linked cultivars")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /Example One 4/,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Example One is your most represented hybridizer, with 4 cultivars.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: "Flower show" })).toBeVisible();

    fireEvent.click(screen.getByText("By ploidy", { exact: true }));
    expect(new URLSearchParams(window.location.search).get("insight")).toBe(
      "ploidy",
    );
    expect(
      screen.getByText("Diploid represents 100% of your linked cultivars."),
    ).toBeVisible();

    const previewSearch = screen.getByPlaceholderText("Search listings...");
    fireEvent.change(previewSearch, { target: { value: "Stella" } });
    expect(previewSearch).toHaveValue("Stella");
    fireEvent.click(screen.getByText("By year", { exact: true }));
    expect(
      screen.getByText(/^Your collection spans \d+ years of registrations,/),
    ).toBeVisible();
    const registrationYears = screen.getByRole("table", {
      name: "Registration years",
    });
    expect(
      within(registrationYears).getByRole("row", { name: "1975 1" }),
    ).toBeInTheDocument();
    expect(within(registrationYears).getAllByRole("row")).toHaveLength(8);
    fireEvent.click(
      screen.getByRole("button", { name: "Filter catalog by 1975" }),
    );
    expect(new URLSearchParams(window.location.search).getAll("year")).toEqual([
      "1975:1975",
    ]);
    expect(previewSearch).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /Year: 1975/ }));

    fireEvent.click(screen.getByText("Bloom size", { exact: true }));
    expect(
      screen.getByText("Every recorded bloom size is 5 inches."),
    ).toBeVisible();

    fireEvent.click(screen.getByText("Award winning", { exact: true }));
    expect(
      screen.getByText(
        "1 cultivar in your collection has received recognized awards.",
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByText("Bloom season", { exact: true }));
    expect(
      within(screen.getByRole("table", { name: "Bloom seasons" }))
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual([
      "Extra Early1",
      "Early1",
      "Early-Midseason1",
      "Midseason1",
      "Mid-Late1",
      "Late1",
      "Very Late1",
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Filter catalog by Midseason" }),
    );
    expect(
      new URLSearchParams(window.location.search).getAll("bloomSeason"),
    ).toEqual(["Midseason"]);

    fireEvent.click(screen.getByText("Flower show", { exact: true }));
    fireEvent.click(
      screen.getByRole("button", { name: "Filter catalog by Miniature" }),
    );
    expect(new URLSearchParams(window.location.search).has("bloomSeason")).toBe(
      false,
    );
    expect(
      new URLSearchParams(window.location.search).getAll("flowerShow"),
    ).toEqual(["Miniature"]);
    fireEvent.click(
      screen.getByRole("button", { name: /Flower Show: Miniature/i }),
    );
    expect(
      within(
        screen.getByRole("table", {
          name: "Flower show classifications",
        }),
      )
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual([
      "Miniature1",
      "Small1",
      "Large1",
      "Extra-Large1",
      "Double/Poly1",
      "Spider1",
      "Unusual Form1",
    ]);

    const listingRegion = screen.getByRole("region", {
      name: "Catalog listings",
    });
    expect(
      within(listingRegion).queryByText("Reference photo", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Your catalog preview" }),
    ).toHaveTextContent(
      "8 of 10 listings are linked and shown. 2 still need a cultivar decision.",
    );
    fireEvent.click(
      within(listingRegion).getAllByRole("button", {
        name: "View details for Stella de Oro",
      })[0]!,
    );
    const listingDetails = screen.getByRole("dialog", {
      name: "Stella de Oro",
    });
    expect(listingDetails).toHaveTextContent("Daylily Database Data");
    expect(listingDetails).toHaveTextContent("Scape Height");
    expect(listingDetails).toHaveTextContent('24"');
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    const membership = screen.getByRole("heading", {
      name: "Build a public catalog with Pro",
    });
    await waitFor(
      () =>
        expect(capturePosthogEventMock).toHaveBeenCalledWith(
          "catalog_import_membership_prompt_viewed",
          {
            cta_id: "catalog-importer-preview-membership",
            matched_count: 8,
            unique_cultivar_count: 7,
          },
        ),
      { timeout: 1_500 },
    );

    expect(
      results.compareDocumentPosition(insights) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      insights.compareDocumentPosition(preview) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      preview.compareDocumentPosition(membership) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(membership.parentElement).toHaveTextContent(
      "Your prepared workbook remains free",
    );
    expect(
      within(membership.closest("section")!).queryByRole("button", {
        name: "Not now",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    const reviewQuiz = await screen.findByRole("region", {
      name: "Review potential matches",
    });
    expect(
      within(reviewQuiz).getByRole("button", {
        name: "Use match 1: Vanguard",
      }),
    ).toBeVisible();
    expect(
      within(reviewQuiz).getByRole("button", {
        name: "Exclude from catalog",
      }),
    ).toHaveAttribute("aria-keyshortcuts", "X");
    expect(reviewQuiz).toHaveTextContent(
      "Leave unmatched keeps this row in the workbook without a Daylily Catalog cultivar ID or link.",
    );
    fireEvent.click(
      await within(reviewQuiz).findByRole("button", {
        name: "Leave unmatched",
      }),
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
    const unmatchedRows = screen
      .getByText("1 left unmatched")
      .closest("details");
    expect(unmatchedRows).not.toBeNull();
    fireEvent.click(screen.getByText("1 left unmatched"));
    expect(unmatchedRows).toHaveTextContent("Vanguard 2");
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Review 1/2",
      }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Undo identity decision" }),
    );
    expect(
      within(workspaceNavigation).getByRole("button", {
        name: "Review 0/2",
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Continue to issues" }));
    const priceIssues = await screen.findByRole("region", {
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
    await waitFor(async () => {
      await expect(readCatalogImporterDraft()).resolves.toMatchObject({
        initialIssueCount: 2,
        initialReviewCount: 2,
      });
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Continue to download" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Download catalog-only spreadsheet",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Download original workbook" }),
    ).toBeVisible();
    expect(screen.getByText("File details")).toBeVisible();
  }, 10_000);
});
