import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      viewerResolution,
    }: {
      initialDraft: { parsedSpreadsheet?: { fileName?: string } } | null;
      viewerResolution:
        | { status: "checking" | "unavailable" }
        | { status: "ready"; viewerState: string };
    }) => (
      <div>
        {initialDraft?.parsedSpreadsheet?.fileName ?? "No restored spreadsheet"}{" "}
        ·{" "}
        {viewerResolution.status === "ready"
          ? viewerResolution.viewerState
          : viewerResolution.status}
      </div>
    ),
  }),
);

describe("CatalogImporterClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the current browser draft on every mount", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ viewerState: "pro" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ viewerState: "anonymous" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    readCatalogImporterDraftMock
      .mockResolvedValueOnce({
        parsedSpreadsheet: { fileName: "first.csv" },
      })
      .mockResolvedValueOnce({
        parsedSpreadsheet: { fileName: "second.csv" },
      });

    const first = render(<CatalogImporterClient />);
    expect(await screen.findByText(/first.csv · pro/)).toBeVisible();
    first.unmount();

    render(<CatalogImporterClient />);
    expect(await screen.findByText(/second.csv · anonymous/)).toBeVisible();
    await waitFor(() =>
      expect(readCatalogImporterDraftMock).toHaveBeenCalledTimes(2),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an explicit unavailable state when account lookup fails", async () => {
    readCatalogImporterDraftMock.mockResolvedValueOnce(null);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<CatalogImporterClient />);

    expect(
      await screen.findByText(/No restored spreadsheet · unavailable/),
    ).toBeVisible();
  });
});
