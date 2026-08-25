import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPreviewPage, {
  generateMetadata,
} from "@/app/(public)/catalog-preview/page";
import type {
  CultivarMatchCandidate,
  CultivarNameMatchResult,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

const capturePosthogEventMock = vi.hoisted(() => vi.fn());
const requestCultivarMatchesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics/posthog", () => ({
  capturePosthogEvent: capturePosthogEventMock,
}));

vi.mock("@/lib/catalog-importer-match-client", () => ({
  requestCultivarMatches: requestCultivarMatchesMock,
}));

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function candidate(displayName: string): CultivarMatchCandidate {
  return {
    awardNames: null,
    bloomSizeIn: 6,
    bloomSeason: "Midseason",
    color: "Purple",
    confidence: 100,
    cultivarReferenceId: `cultivar-${displayName.toLowerCase()}`,
    displayName,
    form: "Single",
    hybridizer: "Example",
    imageAsset: null,
    imageUrl: null,
    listingCount: 1,
    normalizedName: displayName.toLowerCase(),
    ploidy: "Tetraploid",
    rebloom: false,
    scapeHeightIn: 30,
    year: 2020,
  };
}

const existingDraft: CatalogImporterDraft = {
  activeReviewRowId: null,
  headerRowIndex: 0,
  mapping: {
    cultivarReferenceId: null,
    description: null,
    price: null,
    privateNote: null,
    title: 0,
  },
  matchedRows: null,
  matchedRowsKey: null,
  parsedSpreadsheet: {
    fileName: "visitor-draft.csv",
    sheets: [{ name: "CSV", rows: [["name"], ["Keep Me"]] }],
  },
  selectedSheetIndex: 0,
  version: 3,
};

describe("public Google Sheet catalog preview", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        disconnect() {}
        observe(target: Element) {
          this.callback(
            [
              {
                contentRect: { height: 224, width: 800 },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        }
        unobserve() {}
      },
    );
    await clearCatalogImporterDraft();
  });

  afterEach(async () => {
    await clearCatalogImporterDraft();
  });

  it("loads a preamble sheet into the read-only preview without replacing the visitor draft", async () => {
    const csv = readFileSync(
      join(process.cwd(), "tests/fixtures/wds-public-catalog.csv"),
      "utf8",
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(csv));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(File.prototype, "text", {
      configurable: true,
      value: vi.fn().mockResolvedValue(csv),
    });
    requestCultivarMatchesMock.mockImplementation(
      ({ names }: { names: string[] }): Promise<CultivarNameMatchResult[]> =>
        Promise.resolve(
          names.map((name) => {
            const match = candidate(name);
            return {
              candidates: [match],
              exactMatch: match,
              inputName: name,
              normalizedInput: name.toLowerCase(),
            };
          }),
        ),
    );
    await writeCatalogImporterDraft(existingDraft);

    render(
      await CatalogPreviewPage({
        searchParams: Promise.resolve({
          gid: "123456",
          sheet: "1VLk9aOw7w7T8vegrA667LKlS05sBfKSEc7dzAPg30wU",
          title: "WDS Spring Catalog",
        }),
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Vanguard" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "WDS Spring Catalog" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "A.W. Shucks" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Try your own catalog" }),
    ).toHaveAttribute("href", "/catalog-importer");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://docs.google.com/spreadsheets/d/1VLk9aOw7w7T8vegrA667LKlS05sBfKSEc7dzAPg30wU/export?format=csv&gid=123456",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View details for Vanguard" }),
    );
    expect(
      screen.queryByRole("button", { name: "Change cultivar match" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Continue to review|Continue to finish/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/private note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/download/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();

    await expect(readCatalogImporterDraft()).resolves.toMatchObject(
      existingDraft,
    );
  });

  it("rejects unsafe sheet parameters before any remote request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      await CatalogPreviewPage({
        searchParams: Promise.resolve({
          gid: "not-a-tab",
          sheet: "https://example.com/private.csv",
        }),
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "This catalog preview link is invalid",
      }),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("always tells search engines not to index or follow shared previews", () => {
    expect(generateMetadata().robots).toEqual({
      follow: false,
      index: false,
    });
  });
});
