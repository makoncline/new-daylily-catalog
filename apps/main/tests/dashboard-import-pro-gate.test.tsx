import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardImportProGate } from "@/app/dashboard/imports/_components/dashboard-import-pro-gate";
import { createCatalogImportRows } from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

const downloadFile = vi.hoisted(() => vi.fn());
vi.mock("@/lib/catalog-importer-file", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/catalog-importer-file")>()),
  downloadCatalogImportFile: downloadFile,
}));
vi.mock("@/components/pro-membership-action", () => ({
  ProMembershipAction: () => <button type="button">Upgrade to Pro</button>,
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
    downloadFile.mockReset();
    downloadFile.mockResolvedValue(undefined);
  });
  it("restores prepared downloads without loading the public builder or changing the draft", async () => {
    const draft = preparedDraft();
    await writeCatalogImporterDraft(draft);
    const restoredDraft = await readCatalogImporterDraft();
    render(<DashboardImportProGate initialDraft={restoredDraft} />);
    expect(screen.getByText("Pro required")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Create 1 prepared listing" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeVisible();
    for (const [name, fileName] of [
      ["Download prepared import file", "garden-prepared-import.csv"],
      ["Download enhanced original", "garden-enhanced-original.csv"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
      await waitFor(() =>
        expect(downloadFile).toHaveBeenLastCalledWith(
          expect.objectContaining({ fileName }),
        ),
      );
    }
    expect(JSON.stringify(downloadFile.mock.lastCall)).toContain("Rose flower");
    expect(JSON.stringify(downloadFile.mock.lastCall)).toContain("West bed");
    expect(await readCatalogImporterDraft()).toEqual(restoredDraft);
  });
  it("keeps a failed download available for retry", async () => {
    downloadFile.mockRejectedValueOnce(new Error("Download blocked"));
    render(<DashboardImportProGate initialDraft={preparedDraft()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Download prepared import file" }),
    );
    expect(await screen.findByText(/Download blocked/)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Download prepared import file" }),
    );
    await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText(/Download blocked/)).not.toBeInTheDocument(),
    );
  });
});
