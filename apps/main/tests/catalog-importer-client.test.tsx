import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogImporterClient } from "@/app/(public)/catalog-importer/_components/catalog-importer-client";

const readCatalogImporterDraftMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/catalog-importer-draft", () => ({
  readCatalogImporterDraft: readCatalogImporterDraftMock,
}));

vi.mock(
  "@/app/(public)/catalog-importer/_components/catalog-importer-workbench",
  () => ({
    CatalogImporterWorkbench: ({
      initialDraft,
      showMembershipPrompts,
    }: {
      initialDraft: { parsedSpreadsheet?: { fileName?: string } } | null;
      showMembershipPrompts: boolean;
    }) => (
      <div>
        {initialDraft?.parsedSpreadsheet?.fileName ?? "No restored spreadsheet"}{" "}
        · {showMembershipPrompts ? "Prompts on" : "Prompts off"}
      </div>
    ),
  }),
);

describe("CatalogImporterClient", () => {
  it("reads the current browser draft on every mount", async () => {
    readCatalogImporterDraftMock
      .mockResolvedValueOnce({
        parsedSpreadsheet: { fileName: "first.csv" },
      })
      .mockResolvedValueOnce({
        parsedSpreadsheet: { fileName: "second.csv" },
      });

    const first = render(
      <CatalogImporterClient showMembershipPrompts={false} />,
    );
    expect(await screen.findByText(/first.csv · Prompts off/)).toBeVisible();
    first.unmount();

    render(<CatalogImporterClient />);
    expect(await screen.findByText(/second.csv · Prompts on/)).toBeVisible();
    await waitFor(() =>
      expect(readCatalogImporterDraftMock).toHaveBeenCalledTimes(2),
    );
  });
});
