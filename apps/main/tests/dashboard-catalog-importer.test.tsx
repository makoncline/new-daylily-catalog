import "fake-indexeddb/auto";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardCatalogImport } from "@/app/dashboard/imports/_components/use-dashboard-catalog-import";
import { DashboardCatalogImporter } from "@/app/dashboard/imports/_components/dashboard-catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const mocks = vi.hoisted(() => ({
  capturePosthogEvent: vi.fn(),
  importRows: vi.fn(),
  revalidate: vi.fn<() => Promise<void>>(),
  draft: null as CatalogImporterDraft | null,
}));

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: mocks.capturePosthogEvent,
}));

vi.mock("@/app/dashboard/_components/dashboard-db-provider", () => ({
  useDashboardDb: () => ({
    refreshDashboardCatalog: mocks.revalidate,
    userId: "user-1",
  }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardV2: {
      listing: {
        importRows: {
          useMutation: () => ({
            isPending: false,
            mutateAsync: mocks.importRows,
          }),
        },
        list: {
          useQuery: () => ({
            data: [],
            isError: false,
            isLoading: false,
            refetch: vi.fn().mockResolvedValue({ isError: false }),
          }),
        },
      },
    },
  },
}));

vi.mock("@/app/dashboard/imports/_components/dashboard-import-table", () => ({
  DashboardImportTable: () => <div>Import selection table</div>,
}));

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-excluded-rows",
  () => ({
    DashboardImportExcludedRows: () => null,
  }),
);

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-start-over",
  () => ({
    DashboardImportStartOver: () => null,
  }),
);

function createReadyRow(index: number): CatalogImportRow {
  const name = `Listing ${index}`;

  return {
    cultivarReferenceIdWarning: null,
    description: "",
    duplicateAccepted: false,
    duplicateOfSourceRow: null,
    id: `source-row-${index}`,
    linkProvenance: "exact-name",
    linkState: "linked",
    match: {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 100,
      cultivarReferenceId: `cultivar-${index}`,
      displayName: name,
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: name.toLowerCase(),
      ploidy: null,
      rebloom: false,
      scapeHeightIn: null,
      year: null,
    },
    outputState: "included",
    price: null,
    priceWarning: null,
    privateNote: "",
    rowKind: "listing",
    sourceCultivarReferenceId: "",
    sourcePrice: "",
    sourceRow: index,
    sourceTitle: name,
    suggestedMatch: null,
    title: name,
  };
}

describe("DashboardCatalogImporter", () => {
  beforeEach(async () => {
    await clearCatalogImporterDraft();
    mocks.importRows.mockReset();
    mocks.capturePosthogEvent.mockReset();
    mocks.revalidate.mockReset();
    mocks.revalidate.mockResolvedValue(undefined);
    mocks.draft = {
      version: 3,
      activeReviewRowId: null,
      headerRowIndex: null,
      initialIssueCount: 0,
      initialReviewCount: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        price: null,
        privateNote: null,
        title: null,
      },
      matchedRowsKey: "ready",
      selectedSheetIndex: 0,
      reviewedIssueActions: [],
      matchedRows: Array.from({ length: 201 }, (_, index) =>
        createReadyRow(index + 1),
      ),
      parsedSpreadsheet: null,
      projectId: "project-1",
    };
  });

  it("blocks a second submission before React renders and while refresh is pending", async () => {
    let finishRefresh!: () => void;
    mocks.importRows.mockResolvedValue({
      createdCount: 100,
      reusedCount: 0,
      alreadyImportedCount: 0,
      skippedCount: 0,
      skippedRows: [],
    });
    mocks.revalidate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve;
        }),
    );
    const { result } = renderHook(() => useDashboardCatalogImport(mocks.draft));
    let first!: Promise<void>;
    act(() => {
      first = result.current.runImport();
      void result.current.runImport();
    });
    await waitFor(() => expect(mocks.revalidate).toHaveBeenCalledOnce());
    expect(mocks.importRows).toHaveBeenCalledTimes(1);
    expect(result.current.batchResult?.createdCount).toBe(100);
    expect(result.current.isImporting).toBe(true);
    await act(async () => {
      await result.current.runImport();
    });
    expect(mocks.importRows).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishRefresh();
      await first;
    });
    expect(result.current.isImporting).toBe(false);
    expect(result.current.readyRows).toHaveLength(101);
  });

  it("selects the next batch and persists handled rows without clearing unfinished work", async () => {
    mocks.importRows.mockResolvedValue({
      createdCount: 100,
      reusedCount: 0,
      alreadyImportedCount: 0,
      skippedCount: 0,
      skippedRows: [],
    });
    render(<DashboardCatalogImporter initialDraft={mocks.draft} />);
    expect(
      screen.getByRole("heading", { name: "201 ready to import" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Import 100 listings" }),
    );
    await screen.findByRole("heading", { name: "101 ready to import" });
    const saved = await readCatalogImporterDraft();
    expect(saved?.matchedRows).toHaveLength(201);
    expect(saved?.importProgress?.handledRowIds).toHaveLength(100);
    expect(saved?.importProgress?.handledRowIds).not.toContain(
      "source-row-201",
    );
    expect(saved?.importProgress?.createdCount).toBe(100);
    expect(mocks.importRows).toHaveBeenCalledOnce();
  });

  it("keeps the completed result on remount", async () => {
    mocks.draft!.matchedRows = [createReadyRow(1)];
    mocks.importRows.mockResolvedValue({
      createdCount: 1,
      reusedCount: 0,
      alreadyImportedCount: 0,
      skippedCount: 0,
      skippedRows: [],
    });
    const view = render(
      <DashboardCatalogImporter initialDraft={mocks.draft} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Import 1 listing" }));
    await screen.findByRole("heading", { name: "Selected rows saved" });
    await waitFor(async () =>
      expect(
        (await readCatalogImporterDraft())?.importProgress?.refreshPending,
      ).toBe(false),
    );
    const saved = await readCatalogImporterDraft();
    view.unmount();
    render(<DashboardCatalogImporter initialDraft={saved} />);
    expect(
      screen.getByRole("heading", { name: "Selected rows saved" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Import 1 listing" }),
    ).toBeNull();
    expect(mocks.capturePosthogEvent).toHaveBeenCalledWith(
      "catalog_import_completed",
      {
        created_count: 1,
        existing_count: 0,
        import_id: "project-1",
        skipped_count: 0,
      },
    );
  });

  it("persists a refresh failure and retries only refresh after remount", async () => {
    mocks.importRows.mockResolvedValue({
      createdCount: 100,
      reusedCount: 0,
      alreadyImportedCount: 0,
      skippedCount: 0,
      skippedRows: [],
    });
    mocks.revalidate
      .mockRejectedValueOnce(new Error("Refresh failed"))
      .mockResolvedValueOnce(undefined);
    const view = render(
      <DashboardCatalogImporter initialDraft={mocks.draft} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Import 100 listings" }),
    );
    await screen.findByText("Saved. Dashboard refresh did not finish.");
    const saved = await readCatalogImporterDraft();
    expect(saved?.importProgress?.refreshPending).toBe(true);
    view.unmount();
    render(<DashboardCatalogImporter initialDraft={saved} />);
    expect(
      screen.getByRole("heading", { name: "101 ready to import" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry refresh" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Saved. Dashboard refresh did not finish."),
      ).toBeNull(),
    );
    expect(mocks.revalidate).toHaveBeenCalledTimes(2);
    expect(mocks.importRows).toHaveBeenCalledOnce();
    expect(mocks.importRows.mock.calls[0]?.[0].rows[0].importKey).toBe(
      "project-1:source-row-1",
    );
  });
  it("retains skipped and unresolved rows after a partial save", async () => {
    mocks.draft!.matchedRows = [
      createReadyRow(1),
      createReadyRow(2),
      { ...createReadyRow(3), linkState: "pending" },
      createReadyRow(4),
    ];
    mocks.importRows.mockResolvedValue({
      createdCount: 2,
      reusedCount: 0,
      alreadyImportedCount: 0,
      skippedCount: 1,
      skippedRows: [
        {
          importKey: "project-1:source-row-2",
          title: "Listing 2",
          reason: "ambiguous-list",
        },
      ],
    });
    render(<DashboardCatalogImporter initialDraft={mocks.draft} />);
    fireEvent.click(screen.getByRole("button", { name: "Import 3 listings" }));
    fireEvent.click(screen.getByRole("button", { name: "Import listings" }));
    await screen.findByText("2 created · 0 already saved · details unchanged");
    const saved = await readCatalogImporterDraft();
    expect(saved?.matchedRows).toHaveLength(4);
    expect(saved?.importProgress?.handledRowIds).toEqual([
      "source-row-1",
      "source-row-4",
    ]);
    expect(saved?.importProgress?.skippedRowIds).toEqual(["source-row-2"]);
    expect(
      saved?.matchedRows?.find((row) => row.id === "source-row-3")?.linkState,
    ).toBe("pending");
  });
});
