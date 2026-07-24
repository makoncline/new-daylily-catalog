import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { DashboardImportExcludedRows } from "@/app/dashboard/imports/_components/dashboard-import-excluded-rows";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const baseRow: CatalogImportRow = {
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

function controller() {
  return {
    getSourceCellsForRow: (row: CatalogImportRow) => [
      { column: "A", label: "Name", mapped: true, value: row.sourceTitle },
      { column: "B", label: "Price", mapped: true, value: row.sourcePrice },
      {
        column: "C",
        label: "Description",
        mapped: true,
        value: row.description,
      },
      {
        column: "D",
        label: "Private note",
        mapped: true,
        value: row.privateNote,
      },
    ],
  } as unknown as CatalogImporterWorkbenchController;
}

describe("DashboardImportExcludedRows", () => {
  it("shows the original review row and highlights its mapped name", () => {
    render(
      <DashboardImportExcludedRows
        controller={controller()}
        kind="review"
        rows={[baseRow]}
      />,
    );

    const pinnedColumns = document.querySelector(
      '[data-slot="data-table-pinned-left"]',
    );
    expect(pinnedColumns).not.toBeNull();
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
    expect(screen.getByText("Cultivar match needs review")).toBeVisible();
    expect(
      within(pinnedColumns as HTMLElement).getByText("Vanguard 2"),
    ).toHaveAttribute("data-issue-highlight", "true");
  });

  it("highlights the invalid source price and explains the exclusion", () => {
    const priceRow = {
      ...baseRow,
      linkState: "linked" as const,
      price: null,
      priceWarning: "trade",
      sourcePrice: "trade",
    };

    render(
      <DashboardImportExcludedRows
        controller={controller()}
        kind="issues"
        rows={[priceRow]}
      />,
    );

    const scrollableColumns = document.querySelector(
      '[data-slot="data-table-scrollable"]',
    );
    expect(scrollableColumns).not.toBeNull();
    expect(
      within(scrollableColumns as HTMLElement).getByText("trade"),
    ).toHaveAttribute("data-issue-highlight", "true");
    expect(screen.getByText("Price needs review")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /save|exclude|review/i }),
    ).not.toBeInTheDocument();
  });
});
