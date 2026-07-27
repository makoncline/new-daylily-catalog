import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardImportTable } from "@/app/dashboard/imports/_components/dashboard-import-table";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const row: CatalogImportRow = {
  cultivarReferenceIdWarning: null,
  description: "Name needs confirmation",
  duplicateAccepted: false,
  duplicateOfSourceRow: null,
  id: "source-row-9",
  linkProvenance: null,
  linkState: "pending",
  match: null,
  outputState: "included",
  price: 22,
  priceWarning: null,
  privateNote: "Holding area",
  rowKind: "listing",
  sourceCultivarReferenceId: "",
  sourcePrice: "22.00",
  sourceRow: 9,
  sourceTitle: "Vanguard 2",
  suggestedMatch: null,
  title: "Vanguard 2",
};

describe("DashboardImportTable", () => {
  it("pins Include and Name before the scrollable import fields", () => {
    const controller = {
      matchedRows: [row],
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="all"
      />,
    );

    const pinnedColumns = document.querySelector(
      '[data-slot="data-table-pinned-left"]',
    );
    const scrollableColumns = document.querySelector(
      '[data-slot="data-table-scrollable"]',
    );
    expect(pinnedColumns).not.toBeNull();
    expect(scrollableColumns).not.toBeNull();
    expect(
      within(pinnedColumns as HTMLElement).getByRole("checkbox", {
        name: "Select up to 100 visible listings",
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
    expect(
      within(scrollableColumns as HTMLElement).getByRole("columnheader", {
        name: "Description",
      }),
    ).toBeVisible();
    expect(
      within(scrollableColumns as HTMLElement).getByRole("columnheader", {
        name: "Private note",
      }),
    ).toBeVisible();
    expect(
      within(scrollableColumns as HTMLElement).getByRole("columnheader", {
        name: "Linked cultivar",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Row 9")).not.toBeInTheDocument();
  });

  it("shows the final import name and compact linked cultivar data", () => {
    const linkedRow: CatalogImportRow = {
      ...row,
      linkProvenance: "user-confirmed",
      linkState: "linked",
      match: {
        bloomSizeIn: 7.5,
        bloomSeason: "Midseason",
        color: "Orchid red",
        confidence: 82,
        cultivarReferenceId: "cultivar-vanguard",
        displayName: "Vanguard",
        form: "Single",
        hybridizer: "Stamile",
        imageAsset: null,
        imageUrl: null,
        listingCount: 0,
        normalizedName: "vanguard",
        ploidy: "Tetraploid",
        rebloom: false,
        scapeHeightIn: 37,
        year: 2017,
      },
    };
    const controller = {
      matchedRows: [linkedRow],
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="all"
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Include Vanguard" }),
    ).toBeVisible();
    expect(screen.getAllByText(/Vanguard/)).toHaveLength(2);
    expect(screen.getByText(/Stamile · 2017/)).toBeVisible();
    expect(screen.getByText(/Orchid red/)).toBeVisible();
    expect(
      document.querySelector(
        '[data-slot="catalog-importer-cultivar-summary"]',
      ),
    ).toHaveClass("w-max", "max-w-96");
    expect(screen.queryByText("Vanguard 2")).not.toBeInTheDocument();
  });

  it("includes only the first 100 visible rows", () => {
    const setImportRowsIncluded = vi.fn();
    const excludedRows = Array.from({ length: 101 }, (_, index) => ({
      ...row,
      id: `source-row-${index + 1}`,
      outputState: "removed" as const,
      sourceRow: index + 1,
      sourceTitle: `Listing ${index + 1}`,
      title: `Listing ${index + 1}`,
    }));
    const controller = {
      matchedRows: excludedRows,
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded,
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="all"
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select up to 100 visible listings",
      }),
    );

    expect(setImportRowsIncluded).toHaveBeenCalledWith(
      excludedRows.slice(0, 100).map((currentRow) => currentRow.id),
      true,
    );
  });

  it("keeps dashboard import selection separate from the prepared row", () => {
    const onRowSelectionChange = vi.fn();
    const controller = {
      matchedRows: [row],
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        onRowSelectionChange={onRowSelectionChange}
        rowIds={new Set([row.id])}
        selectionLimit={100}
        selectedRowIds={new Set()}
        view="all"
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include Vanguard 2" }),
    );

    expect(onRowSelectionChange).toHaveBeenCalledWith(row.id, true);
    expect(controller.setImportRowIncluded).not.toHaveBeenCalled();
  });

  it("shows only rows in the selected import view", () => {
    const linkedRow = {
      ...row,
      id: "source-row-10",
      linkState: "linked" as const,
      sourceRow: 10,
      sourceTitle: "Already linked",
      title: "Already linked",
    };
    const controller = {
      matchedRows: [row, linkedRow],
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="review"
      />,
    );

    expect(screen.getByText("Vanguard 2")).toBeVisible();
    expect(screen.queryByText("Already linked")).not.toBeInTheDocument();
  });

  it("appends the next rows with Show more", () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...row,
      id: `source-row-${index + 1}`,
      sourceRow: index + 1,
      sourceTitle: `Listing ${index + 1}`,
      title: `Listing ${index + 1}`,
    }));
    const controller = {
      matchedRows: rows,
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;
    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="all"
      />,
    );

    expect(screen.getByText("Listing 1")).toBeVisible();
    expect(screen.queryByText("Listing 101")).not.toBeInTheDocument();
    const scrollArea = document.querySelector<HTMLDivElement>(
      '[data-slot="dashboard-import-scroll-area"]',
    )!;

    expect(
      within(scrollArea).getByRole("button", { name: "Show 1 more" }),
    ).toBeVisible();
    fireEvent.click(
      within(scrollArea).getByRole("button", { name: "Show 1 more" }),
    );

    expect(screen.getByText("Listing 101")).toBeVisible();
    expect(screen.getByText("Listing 1")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Show 1 more" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the current selection after showing more rows", () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...row,
      id: `source-row-${index + 1}`,
      sourceRow: index + 1,
      sourceTitle: `Listing ${index + 1}`,
      title: `Listing ${index + 1}`,
    }));
    const controller = {
      matchedRows: rows,
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    const { rerender } = render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        selectedRowIds={new Set(rows.slice(0, 100).map((item) => item.id))}
        view="all"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));

    expect(screen.getByRole("checkbox", { name: "Include Listing 1" }))
      .toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Include Listing 101" }))
      .toBeDisabled();

    rerender(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        selectedRowIds={new Set(rows.slice(0, 99).map((item) => item.id))}
        view="all"
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Include Listing 101" }))
      .toBeEnabled();
  });

  it("returns the bounded listing area to the top", () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      ...row,
      id: `source-row-${index + 1}`,
      sourceRow: index + 1,
      sourceTitle: `Listing ${index + 1}`,
      title: `Listing ${index + 1}`,
    }));
    const controller = {
      matchedRows: rows,
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        selectionLimit={100}
        view="all"
      />,
    );

    const scrollArea = document.querySelector<HTMLDivElement>(
      '[data-slot="dashboard-import-scroll-area"]',
    )!;
    scrollArea.scrollTop = 320;
    fireEvent.scroll(scrollArea);

    fireEvent.click(screen.getByRole("button", { name: "Return to top" }));

    expect(scrollArea.scrollTop).toBe(0);
    expect(
      screen.queryByRole("button", { name: "Return to top" }),
    ).not.toBeInTheDocument();
  });
});
