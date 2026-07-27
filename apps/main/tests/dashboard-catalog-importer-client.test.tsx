import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardCatalogImporterClient } from "@/app/dashboard/imports/_components/dashboard-catalog-importer-client";

const mocks = vi.hoisted(() => ({
  readDraft: vi.fn(),
  usePro: vi.fn(),
}));

vi.mock("@/lib/catalog-importer-draft", () => ({
  readCatalogImporterDraft: mocks.readDraft,
}));

vi.mock("@/hooks/use-pro", () => ({
  usePro: mocks.usePro,
}));

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-import-pro-gate",
  () => ({
    DashboardImportProGate: () => <div>Pro import gate</div>,
  }),
);

vi.mock(
  "@/app/dashboard/imports/_components/dashboard-catalog-importer",
  () => ({
    DashboardCatalogImporter: () => <div>Catalog import workflow</div>,
  }),
);

describe("DashboardCatalogImporterClient", () => {
  it("shows the Pro gate instead of the import workflow for free accounts", async () => {
    mocks.readDraft.mockResolvedValue(null);
    mocks.usePro.mockReturnValue({ isLoading: false, isPro: false });

    render(<DashboardCatalogImporterClient />);

    expect(await screen.findByText("Pro import gate")).toBeVisible();
    expect(
      screen.queryByText("Catalog import workflow"),
    ).not.toBeInTheDocument();
  });

  it("shows the import workflow for Pro accounts", async () => {
    mocks.readDraft.mockResolvedValue(null);
    mocks.usePro.mockReturnValue({ isLoading: false, isPro: true });

    render(<DashboardCatalogImporterClient />);

    expect(await screen.findByText("Catalog import workflow")).toBeVisible();
    expect(screen.queryByText("Pro import gate")).not.toBeInTheDocument();
  });
});
