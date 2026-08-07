import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardImportProGate } from "@/app/dashboard/imports/_components/dashboard-import-pro-gate";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

const mocks = vi.hoisted(() => ({
  controller: {
    downloadError: null,
    downloadingResults: null,
    downloadResults: vi.fn(),
    matchedRows: [
      { id: "1", outputState: "included", rowKind: "listing" },
      { id: "2", outputState: "included", rowKind: "listing" },
      { id: "3", outputState: "included", rowKind: "listing" },
    ],
    remainingIssueCount: 0,
    reviewRows: [],
  },
}));

vi.mock(
  "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench",
  () => ({
    useCatalogImporterWorkbench: () =>
      mocks.controller as unknown as CatalogImporterWorkbenchController,
  }),
);

vi.mock("@/components/pro-membership-action", () => ({
  ProMembershipAction: () => <button type="button">Upgrade to Pro</button>,
}));

describe("DashboardImportProGate", () => {
  it("keeps prepared downloads available while gating listing creation", () => {
    render(<DashboardImportProGate initialDraft={null} />);

    expect(screen.getByText("Pro required")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Create 3 prepared listings",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Or download your files" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Download catalog preview spreadsheet",
      }),
    );
    expect(mocks.controller.downloadResults).toHaveBeenCalledWith("clean");
  });
});
