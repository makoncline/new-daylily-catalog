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
  imagePreviewAccepted: false,
  imageUrl: "",
  imageUrlWarning: null,
  linkProvenance: null,
  linkState: "pending",
  match: null,
  outputState: "included",
  price: 22,
  priceWarning: null,
  privateNote: "Holding area",
  rowKind: "listing",
  sourceCultivarReferenceId: "",
  sourceImageUrl: "",
  sourcePrice: "22.00",
  sourceRow: 9,
  sourceTitle: "Vanguard 2",
  suggestedMatch: null,
  title: "Vanguard 2",
};

describe("DashboardImportTable", () => {
  it("shows the original spreadsheet row while editing a listing", async () => {
    const controller = {
      getSourceCellsForRow: () => [
        { column: "A", label: "Name", mapped: true, value: "Vanguard 2" },
        { column: "B", label: "Price", mapped: true, value: "22.00" },
        {
          column: "C",
          label: "Description",
          mapped: true,
          value: "Name needs confirmation",
        },
        {
          column: "D",
          label: "Private Note",
          mapped: true,
          value: "Holding area",
        },
      ],
      matchedRows: [row],
      resetImportRow: vi.fn(),
      setImportRowIncluded: vi.fn(),
      setImportRowsIncluded: vi.fn(),
      updateImportRow: vi.fn(),
    } as unknown as CatalogImporterWorkbenchController;

    render(
      <DashboardImportTable
        controller={controller}
        existingDuplicateCounts={new Map()}
        onReviewRow={vi.fn()}
        view="all"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Vanguard 2" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Edit import row",
    });
    const originalRow = within(dialog).getByLabelText(
      "Uploaded spreadsheet row 9",
    );

    expect(
      within(dialog).getByText("Original spreadsheet row · Spreadsheet row 9"),
    ).toBeInTheDocument();
    expect(within(originalRow).getByText("22.00")).toBeInTheDocument();
    expect(
      within(originalRow).getByText("Name needs confirmation"),
    ).toBeInTheDocument();
    expect(within(originalRow).getByText("Holding area")).toBeInTheDocument();
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
        onReviewRow={vi.fn()}
        view="all"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Include all" }));

    expect(setImportRowsIncluded).toHaveBeenCalledWith(
      excludedRows.slice(0, 50).map((currentRow) => currentRow.id),
      true,
    );
  });
});
