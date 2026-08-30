import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { rollingOaksStorefrontFixture } from "@/fixtures/rolling-oaks-storefront";
import {
  StorefrontContractError,
  StorefrontNotFoundError,
  StorefrontUnavailableError,
} from "@/server/storefront/errors";
import { createFixtureStorefrontAdapter } from "@/server/storefront/fixture-storefront-adapter";
import { createHealthHandler } from "@/server/storefront/health-handler";
import { GET as getHealth } from "@/app/api/health/route";
import {
  buildStorefrontEndpoint,
  createRemoteStorefrontAdapter,
} from "@/server/storefront/remote-storefront-adapter";
import { storefrontSnapshotSchema } from "@/types/storefront";
import type { StorefrontSnapshot } from "@/types/storefront";
import {
  filterStorefrontListings,
  findStorefrontListBySlug,
  findStorefrontListingBySlug,
  getStorefrontFilterOptions,
  getStorefrontForSaleListings,
  getStorefrontListingsForList,
  getStorefrontSearchResult,
} from "@/types/storefront-query";

const INQUIRY_TOKEN = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("storefront data integration", () => {
  it("validates the exact v1 contract and rejects private or unknown fields", async () => {
    const adapter = createFixtureStorefrontAdapter({
      snapshot: rollingOaksStorefrontFixture,
      now: () => new Date("2026-08-29T13:00:00.000Z"),
    });

    const result = await adapter.load();
    expect(result).toMatchObject({
      state: "ready",
      degraded: false,
      source: "fixture",
      checkedAt: "2026-08-29T13:00:00.000Z",
    });
    expect(result.snapshot.seller.id).toBe("3");
    expect(result.snapshot.listings).toHaveLength(8);

    const withPrivateField = structuredClone(
      rollingOaksStorefrontFixture,
    ) as unknown as Record<string, unknown>;
    const listings = withPrivateField.listings as Array<
      Record<string, unknown>
    >;
    listings[0]!.privateNote = "must not cross the public interface";
    expect(storefrontSnapshotSchema.safeParse(withPrivateField).success).toBe(
      false,
    );
  });

  it("keeps list reads isolated and keeps unlinked listings in the all and for-sale views", () => {
    const snapshot: StorefrontSnapshot = structuredClone(
      rollingOaksStorefrontFixture,
    );
    const displayGarden = findStorefrontListBySlug(snapshot, "display-garden");
    expect(displayGarden).not.toBeNull();
    displayGarden!.listingIds.push("missing-listing");

    expect(
      getStorefrontListingsForList(snapshot, displayGarden!).map(
        (listing) => listing.id,
      ),
    ).toEqual(["listing-boundary-fifty", "listing-quiet-snow"]);
    expect(
      filterStorefrontListings(
        snapshot.listings,
        { list: "white-and-double" },
        snapshot.lists,
      ).map((listing) => listing.id),
    ).toEqual(["listing-boundary-twenty", "listing-quiet-snow"]);
    expect(
      filterStorefrontListings(
        snapshot.listings,
        { list: "no-list" },
        snapshot.lists,
      ).map((listing) => listing.id),
    ).toContain("listing-boundary-ten");
    expect(snapshot.listings.map((listing) => listing.id)).toContain(
      "listing-boundary-ten",
    );
    expect(
      getStorefrontForSaleListings(snapshot).map((listing) => listing.id),
    ).toContain("listing-boundary-ten");
    expect(findStorefrontListingBySlug(snapshot, "missing-listing")).toBeNull();
    expect(findStorefrontListBySlug(snapshot, "missing-list")).toBeNull();
  });

  it("uses published list slugs and rejects unsafe or ambiguous routes", () => {
    const snapshot: StorefrontSnapshot = structuredClone(
      rollingOaksStorefrontFixture,
    );
    snapshot.lists.push({
      id: "list-general",
      slug: "general-listing-",
      title: "General Listing ",
      description: null,
      listingIds: ["listing-alpine-glow"],
      updatedAt: "2026-08-29T12:00:00.000Z",
    });

    expect(findStorefrontListBySlug(snapshot, "general-listing-")?.id).toBe(
      "list-general",
    );
    expect(
      filterStorefrontListings(
        snapshot.listings,
        { list: "general-listing-" },
        snapshot.lists,
      ).map((listing) => listing.id),
    ).toEqual(["listing-alpine-glow"]);

    const duplicateListSlug = structuredClone(snapshot);
    duplicateListSlug.lists[1]!.slug = duplicateListSlug.lists[0]!.slug;
    expect(storefrontSnapshotSchema.safeParse(duplicateListSlug).success).toBe(
      false,
    );

    const reservedListSlug = structuredClone(snapshot);
    reservedListSlug.lists[0]!.slug = "all";
    expect(storefrontSnapshotSchema.safeParse(reservedListSlug).success).toBe(
      false,
    );

    const unsafeListingSlug = structuredClone(snapshot);
    unsafeListingSlug.listings[0]!.slug = "//external.example";
    expect(storefrontSnapshotSchema.safeParse(unsafeListingSlug).success).toBe(
      false,
    );

    const unsafeImage = structuredClone(snapshot);
    unsafeImage.listings[0]!.images[0]!.url = "javascript:alert(1)";
    expect(storefrontSnapshotSchema.safeParse(unsafeImage).success).toBe(false);
  });

  it("uses continuous price and measurement boundaries and treats rebloom independently", () => {
    const { listings, lists } = rollingOaksStorefrontFixture;
    const ids = (filters: Parameters<typeof filterStorefrontListings>[1]) =>
      filterStorefrontListings(listings, filters, lists).map(
        (listing) => listing.id,
      );

    expect(ids({ price: "under-10" })).toEqual(["listing-alpine-glow"]);
    expect(ids({ price: "10-to-19" })).toEqual([
      "listing-boundary-ten",
      "listing-two-for-tea",
    ]);
    expect(ids({ price: "20-to-29" })).toEqual(["listing-boundary-twenty"]);
    expect(ids({ price: "50-plus" })).toEqual(["listing-boundary-fifty"]);
    expect(ids({ bloomSize: "miniature" })).toContain("listing-alpine-glow");
    expect(ids({ bloomSize: "small" })).toContain("listing-boundary-twenty");
    expect(ids({ bloomSize: "extra-large" })).toContain(
      "listing-boundary-fifty",
    );
    expect(ids({ scapeHeight: "miniature" })).toContain("listing-alpine-glow");
    expect(ids({ scapeHeight: "short" })).toContain("listing-boundary-twenty");
    expect(ids({ scapeHeight: "tall" })).toContain("listing-boundary-fifty");
    expect(ids({ rebloom: true })).toEqual(["listing-quiet-snow"]);
    expect(ids({ bloomSeason: "Early" })).toEqual([
      "listing-quiet-snow",
      "listing-summer-ember",
    ]);
    expect(ids({ bloomSeason: "Midseason", rebloom: true })).toEqual([]);
    expect(ids({ form: "Double" })).toEqual([
      "listing-boundary-twenty",
      "listing-quiet-snow",
    ]);
    expect(ids({ form: "Spider" })).toEqual(["listing-summer-ember"]);
    expect(ids({ form: "Single" })).toContain("listing-summer-ember");
    expect(getStorefrontFilterOptions(listings, lists).forms).toEqual([
      "Double",
      "Single",
      "Spider",
    ]);
  });

  it("clamps invalid and out-of-range catalog pages", () => {
    const { listings, lists } = rollingOaksStorefrontFixture;
    expect(
      getStorefrontSearchResult(listings, {}, lists, Number.NaN, 2).page,
    ).toBe(1);
    const lastPage = getStorefrontSearchResult(listings, {}, lists, 999, 2);
    expect(lastPage.page).toBe(lastPage.pageCount);
    expect(lastPage.listings.length).toBeGreaterThan(0);
  });

  it("uses ETags and serves the last good response in degraded mode", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rollingOaksStorefrontFixture), {
          status: 200,
          headers: { etag: 'W/"fixture-v1"' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    const adapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com/base-that-must-not-leak",
      sellerId: "3",
      fetchImplementation,
      now: () => new Date("2026-08-29T14:00:00.000Z"),
    });

    await expect(adapter.load()).resolves.toMatchObject({
      state: "ready",
      source: "remote",
      etag: 'W/"fixture-v1"',
    });
    await expect(adapter.load()).resolves.toMatchObject({
      state: "ready",
      source: "remote-not-modified",
    });
    await expect(adapter.load()).resolves.toMatchObject({
      state: "degraded",
      degraded: true,
      source: "last-known-good",
      reason: "The storefront API returned HTTP 503.",
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://daylilycatalog.com/api/v1/storefronts/3",
      expect.objectContaining({ method: "GET" }),
    );
    const firstRequestOptions = fetchImplementation.mock.calls[0]![1];
    expect(firstRequestOptions).not.toHaveProperty("cache");
    const firstRequestHeaders = new Headers(firstRequestOptions?.headers);
    expect(firstRequestHeaders.get("cache")).toBeNull();
    expect(firstRequestHeaders.get("pragma")).toBeNull();
    expect(firstRequestHeaders.get("cache-control")).toBeNull();
    const conditionalHeaders = new Headers(
      fetchImplementation.mock.calls[1]![1]?.headers,
    );
    expect(conditionalHeaders.get("if-none-match")).toBe('W/"fixture-v1"');
  });

  it("coalesces concurrent cold and warm loads", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchImplementation = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const adapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "3",
      fetchImplementation,
      now: () => new Date("2026-08-29T14:30:00.000Z"),
    });

    const firstLoad = adapter.load();
    const secondLoad = adapter.load();

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(resolveFetch).toBeTypeOf("function");
    resolveFetch?.(
      new Response(JSON.stringify(rollingOaksStorefrontFixture), {
        status: 200,
        headers: { etag: 'W/"coalesced-v1"' },
      }),
    );

    const [firstResult, secondResult] = await Promise.all([
      firstLoad,
      secondLoad,
    ]);
    expect(firstResult).toMatchObject({
      state: "ready",
      source: "remote",
      etag: 'W/"coalesced-v1"',
    });
    expect(secondResult).toEqual(firstResult);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);

    const firstWarmLoad = adapter.load();
    const secondWarmLoad = adapter.load();
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    resolveFetch?.(new Response(null, { status: 304 }));

    const [firstWarmResult, secondWarmResult] = await Promise.all([
      firstWarmLoad,
      secondWarmLoad,
    ]);
    expect(firstWarmResult).toMatchObject({
      state: "ready",
      source: "remote-not-modified",
      etag: 'W/"coalesced-v1"',
    });
    expect(secondWarmResult).toEqual(firstWarmResult);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("serves the last good snapshot when the upstream request times out", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(rollingOaksStorefrontFixture), {
          status: 200,
        }),
      )
      .mockImplementationOnce((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("Upstream request timed out.")),
            { once: true },
          );
        });
      });
    const adapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "3",
      fetchImplementation,
      timeoutMilliseconds: 5,
    });

    await expect(adapter.load()).resolves.toMatchObject({
      state: "ready",
      source: "remote",
    });
    await expect(adapter.load()).resolves.toMatchObject({
      state: "degraded",
      source: "last-known-good",
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("reports true remote 404s and rejects cross-seller data", async () => {
    const missingAdapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "missing",
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 404 })),
    });
    await expect(missingAdapter.load()).rejects.toBeInstanceOf(
      StorefrontNotFoundError,
    );

    const wrongSellerAdapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "another-seller",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(rollingOaksStorefrontFixture), {
          status: 200,
        }),
      ),
    });
    await expect(wrongSellerAdapter.load()).rejects.toBeInstanceOf(
      StorefrontContractError,
    );
    expect(buildStorefrontEndpoint("https://example.test/root", "a/b")).toBe(
      "https://example.test/api/v1/storefronts/a%2Fb",
    );
  });

  it("does not revive a last-known-good snapshot after an authoritative 404", async () => {
    const adapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "3",
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(rollingOaksStorefrontFixture), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    });

    await expect(adapter.load()).resolves.toMatchObject({ state: "ready" });
    await expect(adapter.load()).rejects.toBeInstanceOf(
      StorefrontNotFoundError,
    );
    await expect(adapter.load()).rejects.toBeInstanceOf(
      StorefrontUnavailableError,
    );
  });

  it("keeps the prior snapshot when upstream generatedAt is too far ahead", async () => {
    const futureSnapshot: StorefrontSnapshot = structuredClone(
      rollingOaksStorefrontFixture,
    );
    futureSnapshot.generatedAt = "2026-08-29T14:05:01.000Z";
    const adapter = createRemoteStorefrontAdapter({
      apiBaseUrl: "https://daylilycatalog.com",
      sellerId: "3",
      now: () => new Date("2026-08-29T14:00:00.000Z"),
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify(rollingOaksStorefrontFixture), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(futureSnapshot), { status: 200 }),
        ),
    });

    await expect(adapter.load()).resolves.toMatchObject({ state: "ready" });
    await expect(adapter.load()).resolves.toMatchObject({
      state: "degraded",
      source: "last-known-good",
      snapshot: { generatedAt: rollingOaksStorefrontFixture.generatedAt },
    });
  });

  it("keeps health successful for a usable degraded snapshot", async () => {
    const degradedResponse = await createHealthHandler(
      async () => ({
        state: "degraded",
        degraded: true,
        source: "last-known-good",
        snapshot: rollingOaksStorefrontFixture,
        checkedAt: "2026-08-29T14:00:00.000Z",
        etag: 'W/"fixture-v1"',
        reason: "The upstream API returned HTTP 503.",
      }),
      () => undefined,
      () => new Date("2026-08-29T15:00:00.000Z"),
    )();
    expect(degradedResponse.status).toBe(200);
    const degradedBody = (await degradedResponse.json()) as Record<
      string,
      unknown
    >;
    expect(degradedBody).toMatchObject({
      ok: true,
      status: "degraded",
      degraded: true,
      source: "last-known-good",
      freshness: "fresh",
      ageSeconds: 10_800,
      generatedAt: "2026-08-29T12:00:00.000Z",
    });
    expect(degradedBody).not.toHaveProperty("sellerId");

    const unavailableResponse = await createHealthHandler(
      async () => {
        throw new Error("No snapshot");
      },
      () => undefined,
      () => new Date("2026-08-29T15:00:00.000Z"),
    )();
    expect(unavailableResponse.status).toBe(503);
    await expect(unavailableResponse.json()).resolves.toEqual({
      ok: false,
      status: "unavailable",
      degraded: false,
      source: "none",
    });
  });

  it("reports a snapshot older than 26 hours as degraded but usable", async () => {
    const response = await createHealthHandler(
      async () => ({
        state: "ready",
        degraded: false,
        source: "remote",
        snapshot: rollingOaksStorefrontFixture,
        checkedAt: "2026-08-30T14:00:01.000Z",
        etag: 'W/"fixture-v1"',
      }),
      () => undefined,
      () => new Date("2026-08-30T14:00:01.000Z"),
    )();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "degraded",
      degraded: true,
      source: "remote",
      version: 1,
      freshness: "stale",
      ageSeconds: 93_601,
      generatedAt: "2026-08-29T12:00:00.000Z",
      checkedAt: "2026-08-30T14:00:01.000Z",
    });
  });

  it("does not age the deterministic local fixture", async () => {
    const response = await createHealthHandler(
      async () => ({
        state: "ready",
        degraded: false,
        source: "fixture",
        snapshot: rollingOaksStorefrontFixture,
        checkedAt: "2030-01-01T00:00:00.000Z",
        etag: null,
      }),
      () => undefined,
      () => new Date("2030-01-01T00:00:00.000Z"),
    )();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "ready",
      degraded: false,
      source: "fixture",
      freshness: "fresh",
      ageSeconds: 0,
    });
  });

  it("rejects a snapshot generated more than five minutes in the future", async () => {
    const futureSnapshot: StorefrontSnapshot = structuredClone(
      rollingOaksStorefrontFixture,
    );
    futureSnapshot.generatedAt = "2026-08-29T12:05:01.000Z";
    const response = await createHealthHandler(
      async () => ({
        state: "ready",
        degraded: false,
        source: "remote",
        snapshot: futureSnapshot,
        checkedAt: "2026-08-29T12:00:00.000Z",
        etag: null,
      }),
      () => undefined,
      () => new Date("2026-08-29T12:00:00.000Z"),
    )();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: "unavailable",
      degraded: false,
      source: "none",
    });
  });

  it("reports unavailable when inquiry delivery is not safe for production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_SITE_KEY", "rolling-oaks");
    vi.stubEnv("STOREFRONT_SELLER_ID", "3");
    vi.stubEnv("STOREFRONT_DATA_SOURCE", "fixture");
    vi.stubEnv("STOREFRONT_INQUIRY_ADAPTER", "stub");

    const response = await getHealth();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body: unknown = await response.json();
    expect(body).toEqual({
      ok: false,
      status: "unavailable",
      degraded: false,
      source: "none",
    });
    expect(body).not.toHaveProperty("sellerId");

    vi.stubEnv("STOREFRONT_INQUIRY_ADAPTER", "remote");
    vi.stubEnv("STOREFRONT_INQUIRY_TOKEN", INQUIRY_TOKEN);
    vi.stubEnv("NODE_ENV", "development");

    const readyResponse = await getHealth();

    expect(readyResponse.status).toBe(200);
    await expect(readyResponse.json()).resolves.toMatchObject({
      ok: true,
      status: "ready",
      degraded: false,
      source: "fixture",
    });

    vi.stubEnv("STOREFRONT_API_BASE_URL", "http://127.0.0.1:4010");

    const localReadyResponse = await getHealth();

    expect(localReadyResponse.status).toBe(200);
  });

  it("selects the brand by deployment hostname and keeps the seller override in server config", () => {
    vi.stubEnv("STOREFRONT_SITE_KEY", "");
    vi.stubEnv("STOREFRONT_HOSTNAME", "www.rollingoaksdaylilies.com:443");
    vi.stubEnv("STOREFRONT_SELLER_ID", "seller-from-deployment");
    vi.stubEnv("STOREFRONT_DATA_SOURCE", "fixture");

    expect(getStorefrontSiteConfig()).toMatchObject({
      key: "rolling-oaks",
      sellerId: "seller-from-deployment",
      brand: { name: "Rolling Oaks Daylilies" },
      source: { kind: "fixture" },
    });

    vi.stubEnv("STOREFRONT_DATA_SOURCE", "remote");
    vi.stubEnv("STOREFRONT_SELLER_ID", "");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_SELLER_ID is required in production and for the remote storefront source.",
    );

    vi.stubEnv("STOREFRONT_SITE_KEY", "rolling-oaks");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STOREFRONT_DATA_SOURCE", "fixture");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "The fixture storefront source is available only in local development and tests.",
    );

    vi.stubEnv("STOREFRONT_DATA_SOURCE", "remote");
    vi.stubEnv("STOREFRONT_SELLER_ID", "another-approved-seller");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_SELLER_ID does not match the approved seller for rolling-oaks.",
    );

    vi.stubEnv("STOREFRONT_SELLER_ID", "3");
    vi.stubEnv("STOREFRONT_API_BASE_URL", "http://catalog.example.test");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_API_BASE_URL must use HTTPS in production.",
    );

    vi.stubEnv("STOREFRONT_API_BASE_URL", "https://catalog.example.test");
    expect(getStorefrontSiteConfig()).toMatchObject({
      key: "rolling-oaks",
      sellerId: "3",
      source: { kind: "remote" },
    });

    vi.stubEnv("STOREFRONT_SITE_KEY", "");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_SITE_KEY is required in production.",
    );
    vi.stubEnv("STOREFRONT_SITE_KEY", "rolling-oaks");
    vi.stubEnv("STOREFRONT_HOSTNAME", "");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_HOSTNAME is required in production.",
    );
    vi.stubEnv("STOREFRONT_HOSTNAME", "other.example.test");
    expect(() => getStorefrontSiteConfig()).toThrow(
      "STOREFRONT_HOSTNAME does not match the approved host for rolling-oaks.",
    );
    vi.stubEnv("STOREFRONT_HOSTNAME", "rolling-oaks-daylilies.makon.dev");
    expect(getStorefrontSiteConfig()).toMatchObject({
      key: "rolling-oaks",
      sellerId: "3",
    });

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STOREFRONT_API_BASE_URL", "http://127.0.0.1:4010");
    expect(getStorefrontSiteConfig()).toMatchObject({
      source: { kind: "remote", apiBaseUrl: "http://127.0.0.1:4010" },
    });
  });
});
