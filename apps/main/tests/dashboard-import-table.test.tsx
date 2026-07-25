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
  it("pins Include and Name before the scrollable listing fields", () => {
    const controller = {
      matchedRows: [row],
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
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
      within(pinnedColumns as HTMLElement).getByRole("columnheader", {
        name: "Include",
      }),
    ).toBeVisible();
    expect(
      within(pinnedColumns as HTMLElement).getByRole("columnheader", {
        name: "Name",
      }),
    ).toBeVisible();
    expect(
      within(scrollableColumns as HTMLElement).getByRole("columnheader", {
        name: "Cultivar",
      }),
    ).toBeVisible();
  });

  it("includes only the rows shown in the current batch", () => {
    const setImportRowsIncluded = vi.fn();
    const excludedRows = Array.from({ length: 51 }, (_, index) => ({
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
        view="all"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Include all" }));

    expect(setImportRowsIncluded).toHaveBeenCalledWith(
      excludedRows.slice(0, 50).map((currentRow) => currentRow.id),
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
        view="review"
      />,
    );

    expect(screen.getByText("Vanguard 2")).toBeVisible();
    expect(screen.queryByText("Already linked")).not.toBeInTheDocument();
  });

  it("returns to the table after changing pages", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
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
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    try {
      render(
        <DashboardImportTable
          controller={controller}
          existingDuplicateCounts={new Map()}
          view="all"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      expect(screen.getByText("2 of 2")).toBeVisible();
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(
          Element.prototype,
          "scrollIntoView",
          originalScrollIntoView,
        );
      } else {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
      vi.unstubAllGlobals();
    }
  });
});
