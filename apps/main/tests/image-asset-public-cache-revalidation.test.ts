import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildPublicCacheRevalidationPayloadForAsset,
  postPublicCacheRevalidation,
} from "../scripts/image-assets/public-cache-revalidation.mjs";

const originalAppBaseUrl = process.env.APP_BASE_URL;
const originalClerkWebhookSecret = process.env.CLERK_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.APP_BASE_URL = "https://daylilycatalog.com";
  process.env.CLERK_WEBHOOK_SECRET = "test-secret";
});

afterEach(() => {
  if (originalAppBaseUrl === undefined) {
    delete process.env.APP_BASE_URL;
  } else {
    process.env.APP_BASE_URL = originalAppBaseUrl;
  }

  if (originalClerkWebhookSecret === undefined) {
    delete process.env.CLERK_WEBHOOK_SECRET;
  } else {
    process.env.CLERK_WEBHOOK_SECRET = originalClerkWebhookSecret;
  }

  vi.restoreAllMocks();
});

describe("image asset public cache revalidation", () => {
  it("builds listing cache targets for generated variants", async () => {
    const db = {
      listing: {
        findUnique: vi.fn(async () => ({
          id: "listing-1",
          userId: "user-1",
          cultivarReference: {
            normalizedName: "It's Just a Memory",
          },
          user: {
            profile: {
              slug: "garden-slug",
            },
          },
        })),
      },
    };

    const payload = await buildPublicCacheRevalidationPayloadForAsset({
      asset: {
        id: "asset-1",
        listingId: "listing-1",
        userProfileId: null,
      },
      db,
    });

    expect(payload).toEqual({
      source: "image-assets.variants",
      paths: [
        { path: "/garden-slug" },
        { path: "/cultivar/it~27s-just-a-memory" },
      ],
      tags: [
        { tag: "public:listings:card:listing-1" },
        { tag: "public:cultivar:page:it~27s-just-a-memory" },
      ],
    });
  });

  it("builds profile, catalog, and cultivar cache targets for profile variants", async () => {
    const db = {
      userProfile: {
        findUnique: vi.fn(async () => ({
          userId: "user-1",
          slug: null,
        })),
      },
      listing: {
        findMany: vi.fn(async () => [
          {
            cultivarReference: {
              normalizedName: "Alpha One",
            },
          },
          {
            cultivarReference: {
              normalizedName: "Alpha One",
            },
          },
        ]),
      },
    };

    const payload = await buildPublicCacheRevalidationPayloadForAsset({
      asset: {
        id: "asset-1",
        listingId: null,
        userProfileId: "profile-1",
      },
      db,
    });

    expect(payload.paths).toEqual([
      { path: "/user-1" },
      { path: "/catalogs" },
      { path: "/cultivar/alpha-one" },
    ]);
    expect(payload.tags).toEqual([
      { tag: "public:profile:user-1" },
      { tag: "public:profile:content:user-1" },
      { tag: "public:profile:lists:user-1" },
      { tag: "public:listings:page:user-1" },
      { tag: "public:listings:for-sale-count:user-1" },
      { tag: "public:profiles" },
      { tag: "public:cultivar:page:alpha-one" },
    ]);
  });

  it("posts the revalidation payload to the internal route", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const payload = {
      source: "image-assets.variants",
      paths: [{ path: "/garden-slug" }],
      tags: [{ tag: "public:listings:card:listing-1" }],
    };

    await expect(
      postPublicCacheRevalidation({ fetchImpl, payload }),
    ).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "/api/internal/public-cache-revalidate",
        "https://daylilycatalog.com",
      ),
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(payload),
      }),
    );
  });
});
