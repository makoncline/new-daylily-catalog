import "fake-indexeddb/auto";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";
import { createCatalogImportSampleSpreadsheet } from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());
const requestCultivarMatchesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("@/lib/catalog-importer-match-client", () => ({
  requestCultivarMatches: requestCultivarMatchesMock,
}));

describe("CatalogImporterWorkbench", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearCatalogImporterDraft();
    capturePosthogEventMock.mockClear();
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

    await waitFor(() => {
      expect(capturePosthogEventMock).toHaveBeenCalledWith(
        "catalog_import_started",
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
          issue_count: 2,
          matched_count: 0,
          review_count: 10,
          row_count: 10,
          sheet_count: 1,
        },
      );
    });
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

    await waitFor(() =>
      expect(requestCultivarMatchesMock).toHaveBeenCalledOnce(),
    );
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

  it("resumes an incomplete draft and retries a failed match", async () => {
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
      version: 2,
    };
    requestCultivarMatchesMock
      .mockRejectedValueOnce(new Error("Cultivar matching is warming up."))
      .mockResolvedValue([]);

    render(<CatalogImporterWorkbench initialDraft={initialDraft} />);

    expect(
      await screen.findByRole("heading", {
        name: "Cultivar matching did not finish",
      }),
    ).toBeVisible();
    expect(requestCultivarMatchesMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", {
        name: "Your catalog is taking shape",
      }),
    ).toBeVisible();
    expect(requestCultivarMatchesMock.mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
