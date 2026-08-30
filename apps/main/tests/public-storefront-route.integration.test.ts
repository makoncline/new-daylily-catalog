// @vitest-environment node

import { describe, expect, it } from "vitest";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/public-storefront-route.sqlite";

describe("public storefront route", () => {
  it("returns one isolated public seller snapshot and supports ETag validation", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const otherSeller = await db.user.create({ data: {} });

      await db.userProfile.create({
        data: {
          userId: user.id,
          slug: "rolling-oaks",
          title: "Rolling Oaks Daylilies",
          description: "A public garden catalog.",
          location: "Denver, Colorado",
          content: JSON.stringify({
            time: 123,
            blocks: [
              {
                id: "welcome",
                type: "paragraph",
                data: {
                  text: "Welcome<script>private()</script><strong>friend</strong>",
                },
              },
            ],
            version: "2.30.0",
          }),
          images: {
            create: {
              id: "profile-image",
              url: "https://example.com/profile.jpg",
            },
          },
          imageAssets: {
            create: {
              id: "profile-image-asset",
              legacyImageId: "profile-image",
              kind: "profile",
              status: "ready",
              displayUrl: "https://example.com/profile.jpg",
            },
          },
        },
      });

      await db.v2AhsCultivar.create({
        data: {
          id: "ahs-cultivar",
          post_title: "Public Cultivar",
          primary_hybridizer_name: "Hybridizer",
          introduction_date: "2024-01-01",
          bloom_season_names: "Midseason",
          rebloom: 1,
          image_url: "https://example.com/cultivar.jpg",
        },
      });
      await db.cultivarReference.create({
        data: {
          id: "cultivar-reference",
          normalizedName: "public cultivar",
          v2AhsCultivarId: "ahs-cultivar",
        },
      });

      const linkedListing = await db.listing.create({
        data: {
          id: "linked-listing",
          userId: user.id,
          title: "Public Cultivar",
          slug: "public-cultivar",
          description: "A public description.",
          privateNote: "do not expose this note",
          price: 20,
          cultivarReferenceId: "cultivar-reference",
          images: {
            create: {
              id: "listing-image",
              url: "https://example.com/listing.jpg",
            },
          },
          imageAssets: {
            create: {
              id: "listing-image-asset",
              legacyImageId: "listing-image",
              kind: "listing",
              status: "ready",
              displayUrl: "https://example.com/listing.jpg",
            },
          },
        },
      });
      await db.listing.create({
        data: {
          id: "unlinked-listing",
          userId: user.id,
          title: "Unlinked Seedling",
          slug: "unlinked-seedling",
          cultivarReferenceId: "cultivar-reference",
        },
      });
      const hiddenListing = await db.listing.create({
        data: {
          id: "hidden-listing",
          userId: user.id,
          title: "Hidden Cultivar",
          slug: "hidden-cultivar",
          status: "HIDDEN",
        },
      });
      const otherListing = await db.listing.create({
        data: {
          id: "other-listing",
          userId: otherSeller.id,
          title: "Other Seller Cultivar",
          slug: "other-seller-cultivar",
        },
      });

      await db.list.create({
        data: {
          id: "public-list",
          userId: user.id,
          title: "Available Plants",
          listings: {
            connect: [
              { id: linkedListing.id },
              { id: hiddenListing.id },
              { id: otherListing.id },
            ],
          },
        },
      });
      await db.list.create({
        data: {
          id: "hidden-list",
          userId: user.id,
          title: "Private Collection",
          status: "HIDDEN",
          listings: {
            connect: { id: linkedListing.id },
          },
        },
      });

      const { GET } = await import("@/app/api/v1/storefronts/[sellerId]/route");
      const routeContext = {
        params: Promise.resolve({ sellerId: user.id }),
      };
      const response = await GET(
        new Request(`https://daylilycatalog.com/api/v1/storefronts/${user.id}`),
        routeContext,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=0, must-revalidate",
      );
      expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
        "public, max-age=86400",
      );
      expect(response.headers.get("ETag")).toMatch(/^W\/"[A-Za-z0-9_-]+"$/);
      expect(response.headers.get("Last-Modified")).toBeNull();

      const body = (await response.json()) as {
        version: number;
        seller: {
          id: string;
          profile: {
            slug: string | null;
            title: string | null;
            content: {
              blocks: Array<{ data: { text: string } }>;
            } | null;
            images: Array<{ id: string; url: string }>;
          } | null;
        };
        lists: Array<{
          id: string;
          listingIds: string[];
        }>;
        listings: Array<{
          id: string;
          cultivar: {
            id: string;
            normalizedName: string | null;
            details: {
              name: string | null;
              ahsImageUrl: string | null;
              hybridizer: string | null;
              year: string | null;
              rebloom: boolean | null;
            } | null;
          } | null;
          images: Array<{ id: string; url: string }>;
        }>;
      };

      expect(body.version).toBe(1);
      expect(body.seller).toMatchObject({
        id: user.id,
        profile: {
          slug: "rolling-oaks",
          title: "Rolling Oaks Daylilies",
          images: [
            {
              id: "profile-image",
              url: "https://example.com/profile.jpg",
            },
          ],
        },
      });
      expect(body.seller.profile?.content?.blocks[0]?.data.text).toBe(
        "Welcome<strong>friend</strong>",
      );
      expect(body.lists).toEqual([
        {
          id: "public-list",
          title: "Available Plants",
          description: null,
          listingIds: ["linked-listing"],
          updatedAt: expect.any(String),
        },
      ]);
      expect(body.listings.map(({ id }) => id)).toEqual([
        "linked-listing",
        "unlinked-listing",
      ]);
      expect(body.listings[0]).toMatchObject({
        id: "linked-listing",
        slug: "public-cultivar",
        title: "Public Cultivar",
        description: "A public description.",
        price: 20,
        images: [
          {
            id: "listing-image",
            url: "https://example.com/listing.jpg",
          },
        ],
        cultivar: {
          id: "cultivar-reference",
          normalizedName: "public cultivar",
          details: {
            name: "Public Cultivar",
            ahsImageUrl: "https://example.com/cultivar.jpg",
            hybridizer: "Hybridizer",
            year: "2024",
            rebloom: true,
          },
        },
        updatedAt: expect.any(String),
      });
      expect(body.listings[1]).toMatchObject({
        id: "unlinked-listing",
        images: [
          {
            id: "ahs-unlinked-listing",
            url: "https://example.com/cultivar.jpg",
          },
        ],
      });
      expect(JSON.stringify(body)).not.toContain("do not expose this note");
      expect(JSON.stringify(body)).not.toContain("hidden-listing");
      expect(JSON.stringify(body)).not.toContain("hidden-list");
      expect(JSON.stringify(body)).not.toContain("other-listing");

      const etag = response.headers.get("ETag")!;
      const notModified = await GET(
        new Request(
          `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
          {
            headers: {
              "If-None-Match": etag.replace(/^W\//, ""),
            },
          },
        ),
        routeContext,
      );

      expect(notModified.status).toBe(304);
      expect(await notModified.text()).toBe("");
      expect(notModified.headers.get("ETag")).toBe(etag);
      expect(notModified.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
        "public, max-age=86400",
      );

      const missingResponse = await GET(
        new Request(
          "https://daylilycatalog.com/api/v1/storefronts/missing-seller",
        ),
        {
          params: Promise.resolve({ sellerId: "missing-seller" }),
        },
      );

      expect(missingResponse.status).toBe(404);
      expect(missingResponse.headers.get("Cache-Control")).toBe("no-store");
      expect(
        missingResponse.headers.get("Cloudflare-CDN-Cache-Control"),
      ).toBeNull();
      await expect(missingResponse.json()).resolves.toEqual({
        error: "storefront_not_found",
        message: "Storefront not found.",
      });
    });
  });
});
