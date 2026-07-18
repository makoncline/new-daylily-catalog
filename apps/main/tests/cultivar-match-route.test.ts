// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const matchCultivarNamesMock = vi.hoisted(() => vi.fn());
const publicSearchApiState = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/server/search/cultivar-name-match", () => ({
  matchCultivarNames: matchCultivarNamesMock,
  MAX_CULTIVAR_MATCH_NAME_LENGTH: 160,
  MAX_CULTIVAR_MATCH_NAMES: 250,
}));

vi.mock("@/server/search/public-search-api-platform", () => ({
  getPublicSearchApiDisabledResponse: () =>
    Response.json({ ok: false }, { status: 404 }),
  isPublicSearchApiEnabled: () => publicSearchApiState.enabled,
  toPublicSearchStatus: vi.fn(),
}));

vi.mock("@/server/search/public-search-index", () => ({
  PublicSearchIndexUnavailableError: class PublicSearchIndexUnavailableError extends Error {},
}));

vi.mock("@/lib/error-utils", () => ({
  reportError: vi.fn(),
}));

describe("public cultivar match route", () => {
  beforeEach(() => {
    matchCultivarNamesMock.mockReset();
    publicSearchApiState.enabled = true;
  });

  it("does not expose matching when public cultivar search is disabled", async () => {
    publicSearchApiState.enabled = false;
    const { POST } = await import("@/app/api/v1/cultivars/match/route");
    const response = await POST(
      new Request("https://daylilycatalog.com/api/v1/cultivars/match", {
        body: JSON.stringify({ names: ["Stella de Oro"] }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(matchCultivarNamesMock).not.toHaveBeenCalled();
  });

  it("accepts batched potential-match requests", async () => {
    matchCultivarNamesMock.mockResolvedValue([]);
    const { POST } = await import("@/app/api/v1/cultivars/match/route");
    const response = await POST(
      new Request("https://daylilycatalog.com/api/v1/cultivars/match", {
        body: JSON.stringify({
          includeCandidates: true,
          names: ["First", "Second"],
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(matchCultivarNamesMock).toHaveBeenCalledWith({
      includeCandidates: true,
      names: ["First", "Second"],
    });
  });

  it("accepts saved cultivar reference IDs alongside names", async () => {
    matchCultivarNamesMock.mockResolvedValue([]);
    const { POST } = await import("@/app/api/v1/cultivars/match/route");
    const response = await POST(
      new Request("https://daylilycatalog.com/api/v1/cultivars/match", {
        body: JSON.stringify({
          cultivarReferenceIds: ["cultivar-1", null],
          includeCandidates: true,
          names: ["Seller spelling", "Second"],
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(matchCultivarNamesMock).toHaveBeenCalledWith({
      cultivarReferenceIds: ["cultivar-1", null],
      includeCandidates: true,
      names: ["Seller spelling", "Second"],
    });
  });

  it("returns read-only exact matches without accepting the rest of the file", async () => {
    matchCultivarNamesMock.mockResolvedValue([
      {
        candidates: [],
        exactMatch: {
          confidence: 100,
          cultivarReferenceId: "cultivar-1",
          displayName: "Stella de Oro",
          hybridizer: "Jablonski",
          imageAsset: {
            blurUrl: "https://media.daylilycatalog.com/stella-blur.jpg",
            displayUrl: "https://media.daylilycatalog.com/stella-display.jpg",
            id: "asset-1",
            originalUrl: "https://media.daylilycatalog.com/stella.jpg",
            status: "ready",
            thumbUrl: "https://media.daylilycatalog.com/stella-thumb.jpg",
          },
          normalizedName: "stella de oro",
          year: 1975,
        },
        inputName: "Stella de Oro",
        normalizedInput: "stella de oro",
      },
    ]);
    const { POST } = await import("@/app/api/v1/cultivars/match/route");
    const response = await POST(
      new Request("https://daylilycatalog.com/api/v1/cultivars/match", {
        body: JSON.stringify({ names: [" Stella de Oro "] }),
        method: "POST",
      }),
    );

    expect(matchCultivarNamesMock).toHaveBeenCalledWith({
      includeCandidates: false,
      names: ["Stella de Oro"],
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      results: [
        {
          exactMatch: {
            cultivarReferenceId: "cultivar-1",
            imageAsset: {
              blurUrl: "https://media.daylilycatalog.com/stella-blur.jpg",
              thumbUrl: "https://media.daylilycatalog.com/stella-thumb.jpg",
            },
          },
        },
      ],
    });
  });
});
