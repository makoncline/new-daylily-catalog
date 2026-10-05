// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

vi.mock("server-only", () => ({}));

describe("dashboard image deletion with SQLite", () => {
  it("renumbers only the owned target and keeps linked asset order", async () => {
    await withTempAppDb(async ({ user }) => {
      const { db } = await import("@/server/db");
      const { dashboardDbImageRouter } = await import(
        "@/server/api/routers/dashboard-db/image"
      );
      const listing = await db.listing.create({
        data: { userId: user.id, title: "Owned", slug: "owned" },
      });
      const profile = await db.userProfile.create({
        data: { userId: user.id },
      });
      const otherUser = await db.user.create({ data: {} });
      const otherListing = await db.listing.create({
        data: { userId: otherUser.id, title: "Other", slug: "other" },
      });
      await db.image.createMany({
        data: [
          { id: "listing-a", listingId: listing.id, url: "a", order: 4 },
          { id: "listing-b", listingId: listing.id, url: "b", order: 9 },
          { id: "listing-c", listingId: listing.id, url: "c", order: 9 },
          { id: "listing-d", listingId: listing.id, url: "d", order: 20 },
          { id: "profile-a", userProfileId: profile.id, url: "a", order: 7 },
          { id: "profile-b", userProfileId: profile.id, url: "b", order: 12 },
          { id: "profile-c", userProfileId: profile.id, url: "c", order: 24 },
          {
            id: "other-image",
            listingId: otherListing.id,
            url: "other",
            order: 7,
          },
          ...Array.from({ length: 101 }, (_, index) => ({
            id: `old-listing-${index}`,
            listingId: listing.id,
            url: "old",
            order: 30 + index,
          })),
        ],
      });
      await db.imageAsset.createMany({
        data: [
          {
            id: "asset-listing-a",
            legacyImageId: "listing-a",
            listingId: listing.id,
            kind: "listing",
            order: 4,
          },
          {
            id: "asset-listing-b",
            legacyImageId: "listing-b",
            listingId: listing.id,
            kind: "listing",
            order: 9,
          },
          {
            id: "asset-listing-d",
            legacyImageId: "listing-d",
            listingId: listing.id,
            kind: "listing",
            order: 20,
          },
          {
            id: "asset-profile-c",
            legacyImageId: "profile-c",
            userProfileId: profile.id,
            kind: "profile",
            order: 24,
          },
        ],
      });

      const caller = dashboardDbImageRouter.createCaller({
        db,
        headers: new Headers(),
        _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
      });
      await expect(
        caller.delete({
          type: "listing",
          referenceId: listing.id,
          imageId: "other-image",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await caller.delete({
        type: "listing",
        referenceId: listing.id,
        imageId: "listing-a",
      });
      const libsqlDb = new PrismaClient({
        adapter: new PrismaLibSql(
          { url: process.env.DATABASE_URL! },
          { timestampFormat: "unixepoch-ms" },
        ),
      });
      try {
        const libsqlCaller = dashboardDbImageRouter.createCaller({
          db: libsqlDb,
          headers: new Headers(),
          _authUser: { id: user.id } as TRPCInternalContext["_authUser"],
        });
        await libsqlCaller.delete({
          type: "profile",
          referenceId: profile.id,
          imageId: "profile-a",
        });
      } finally {
        await libsqlDb.$disconnect();
      }

      const images = await db.image.findMany({
        where: {
          id: {
            in: [
              "listing-b",
              "listing-c",
              "listing-d",
              "profile-b",
              "profile-c",
              "other-image",
            ],
          },
        },
        select: { id: true, order: true },
      });
      expect(
        Object.fromEntries(images.map((image) => [image.id, image.order])),
      ).toEqual({
        "listing-b": 0,
        "listing-c": 1,
        "listing-d": 2,
        "profile-b": 0,
        "profile-c": 1,
        "other-image": 7,
      });
      const allOwnedListingImages = await db.image.findMany({
        where: { listingId: listing.id },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { order: true },
      });
      expect(allOwnedListingImages).toHaveLength(104);
      expect(allOwnedListingImages.map((image) => image.order)).toEqual(
        Array.from({ length: 104 }, (_, index) => index),
      );
      const assets = await db.imageAsset.findMany({
        select: { id: true, order: true },
      });
      expect(
        Object.fromEntries(assets.map((asset) => [asset.id, asset.order])),
      ).toEqual({
        "asset-listing-b": 0,
        "asset-listing-d": 2,
        "asset-profile-c": 1,
      });
    });
  });
});
