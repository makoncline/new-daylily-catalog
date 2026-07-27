import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCatalogImporter } from "@/app/dashboard/imports/_components/dashboard-catalog-importer";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const mocks = vi.hoisted(() => ({
  importRows: vi.fn(),
  revalidate: vi.fn(async () => undefined),
  workbench: null as unknown as CatalogImporterWorkbenchController,
}));

vi.mock(
  "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench",
  () => ({
    useCatalogImporterWorkbench: () => mocks.workbench,
  }),
);

vi.mock("@/app/dashboard/_components/dashboard-db-provider", () => ({
  useDashboardDb: () => ({ userId: "user-1" }),
}));

vi.mock(
  "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence",
  () => ({
    revalidateDashboardDbInBackground: mocks.revalidate,
  }),
);

vi.mock("@/trpc/react", () => ({
  api: {
    dashboardDb: {
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
            refetch: vi.fn(),
          }),
        },
      },
    },
  },
}));

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-table",
  () => ({
    DashboardImportTable: () => <div>Import selection table</div>,
  }),
);

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-excluded-rows",
  () => ({
    DashboardImportExcludedRows: () => null,
  }),
);

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-existing-listings",
  () => ({
    DashboardImportAlreadyExistingRows: () => null,
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
  beforeEach(() => {
    mocks.importRows.mockReset();
    mocks.revalidate.mockClear();
    mocks.workbench = {
      liveAnnouncement: "",
      matchedRows: Array.from({ length: 201 }, (_, index) =>
        createReadyRow(index + 1),
      ),
      parsedSpreadsheet: null,
      projectId: "project-1",
      resetImporter: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;
  });

  it("selects the next import group after one import finishes", async () => {
    mocks.importRows.mockResolvedValue({
      createdCount: 100,
      existingCount: 0,
      skippedExactCount: 0,
    });

    render(<DashboardCatalogImporter initialDraft={null} />);

    expect(
      screen.getByRole("heading", {
        name: "201 listings are ready to import",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Import up to 100 listings at a time."),
    ).toBeVisible();
    expect(screen.getByText("100 of 100 selected.")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Import 100 listings" }),
    );
    expect(
      screen.getByText(
        "These listings will be added to your catalog. 101 listings will remain.",
      ),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Import listings" }),
    );

    await waitFor(() => {
      expect(mocks.importRows).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByRole("heading", { name: "101 listings remain" }),
    ).toBeVisible();
    expect(screen.getByText("100 listings imported")).toBeVisible();
    expect(screen.getByText("101 listings remain.")).toBeVisible();
    expect(
      screen.getByText("Import up to 100 listings at a time."),
    ).toBeVisible();
    expect(screen.getByText("100 of 100 selected.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import 100 listings" }),
    ).toBeVisible();
  });
});
