import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardImportProGate } from "@/app/dashboard/imports/_components/dashboard-import-pro-gate";
import { createCatalogImportRows } from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

vi.mock("@/components/catalog-builder/membership-actions", () => ({
  CatalogImporterMembershipButton: () => (
    <button>Continue to secure checkout</button>
  ),
  CatalogMembershipOffer: () => <p>$12.99 per month</p>,
}));

function preparedDraft(): CatalogImporterDraft {
  const parsedSpreadsheet = {
    fileName: "garden.csv",
    sheets: [
      {
        name: "Catalog",
        rows: [
          ["name", "price", "description", "private note"],
          ["Garden Bloom", "15", "Rose flower", "West bed"],
        ],
      },
    ],
  };
  const mapping = {
    cultivarReferenceId: null,
    description: 2,
    price: 1,
    privateNote: 3,
    title: 0,
  };
  const matchedRows = createCatalogImportRows({
    rows: parsedSpreadsheet.sheets[0]!.rows,
    headerRowIndex: 0,
    mapping,
  }).map((row) => ({ ...row, linkState: "intentionally-unmatched" as const }));
  return {
    activeReviewRowId: null,
    headerRowIndex: 0,
    mapping,
    matchedRows,
    matchedRowsKey: "ready",
    parsedSpreadsheet,
    projectId: "garden-project",
    selectedSheetIndex: 0,
    version: 3,
  };
}

describe("DashboardImportProGate", () => {
  beforeEach(async () => {
    await clearCatalogImporterDraft();
  });
  it("keeps prepared data and sends the member to the local download source", async () => {
    await writeCatalogImporterDraft(preparedDraft());
    const draft = await readCatalogImporterDraft();
    render(<DashboardImportProGate initialDraft={draft} />);
    expect(
      screen.getByRole("heading", {
        name: "Save 1 listing to your account with Pro",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continue to secure checkout" }),
    ).toBeVisible();
    expect(
      screen.getByText(/After checkout, return in this browser/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to Playground" }),
    ).toHaveAttribute("href", "/playground");
    expect(await readCatalogImporterDraft()).toEqual(draft);
  });
});
