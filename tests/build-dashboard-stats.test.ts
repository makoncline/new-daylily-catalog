import { describe, expect, it } from "vitest";
import { buildDashboardStats } from "@/app/dashboard/_lib/build-dashboard-stats";
import type { RouterOutputs } from "@/trpc/react";

type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Image = RouterOutputs["dashboardDb"]["image"]["list"][number];
type UserProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

const now = new Date("2026-02-24T10:00:00.000Z");

describe("buildDashboardStats", () => {
  it("derives dashboard metrics from loaded collections", () => {
    const listings: Listing[] = [
      {
        id: "l1",
        userId: "u1",
        title: "Alpha",
        slug: "alpha",
        price: 4,
        description: null,
        privateNote: null,
        status: null,
        createdAt: now,
        updatedAt: now,
        cultivarReferenceId: "cr1",
      },
      {
        id: "l2",
        userId: "u1",
        title: "Beta",
        slug: "beta",
        price: null,
        description: null,
        privateNote: null,
        status: "HIDDEN",
        createdAt: now,
        updatedAt: now,
        cultivarReferenceId: null,
      },
      {
        id: "l3",
        userId: "u1",
        title: "Gamma",
        slug: "gamma",
        price: 5,
        description: null,
        privateNote: null,
        status: "published",
        createdAt: now,
        updatedAt: now,
        cultivarReferenceId: "cr2",
      },
    ];

    const lists: List[] = [
      {
        id: "list-a",
        userId: "u1",
        title: "For Sale",
        description: null,
        status: null,
        createdAt: now,
        updatedAt: now,
        listings: [{ id: "l1" }, { id: "l2" }],
      },
      {
        id: "list-b",
        userId: "u1",
        title: "Featured",
        description: null,
        status: null,
        createdAt: now,
        updatedAt: now,
        listings: [{ id: "l2" }],
      },
    ];

    const images: Image[] = [
      {
        id: "img-1",
        url: "https://example.com/l1.jpg",
        order: 0,
        listingId: "l1",
        userProfileId: null,
        createdAt: now,
        updatedAt: now,
        status: null,
      },
      {
        id: "img-2",
        url: "https://example.com/l2.jpg",
        order: 0,
        listingId: "l2",
        userProfileId: null,
        createdAt: now,
        updatedAt: now,
        status: null,
      },
      {
        id: "img-3",
        url: "https://example.com/profile.jpg",
        order: 0,
        listingId: null,
        userProfileId: "profile-1",
        createdAt: now,
        updatedAt: now,
        status: null,
      },
    ];

    const profile: UserProfile = {
      id: "profile-1",
      userId: "u1",
      title: "My Garden",
      slug: "my-garden",
      logoUrl: null,
      description: "Family garden",
      content: JSON.stringify({
        time: 1,
        blocks: [{ id: "b1", type: "paragraph", data: { text: "Hello" } }],
        version: "2.0",
      }),
      location: "",
      createdAt: now,
      updatedAt: now,
    };

    const stats = buildDashboardStats({
      listings,
      lists,
      images,
      profile,
    });

    expect(stats.totalListings).toBe(3);
    expect(stats.publishedListings).toBe(2);
    expect(stats.totalLists).toBe(2);
    expect(stats.listingStats.withImages).toBe(2);
    expect(stats.listingStats.withAhsData).toBe(2);
    expect(stats.listingStats.withPrice).toBe(2);
    expect(stats.listingStats.averagePrice).toBe(4.5);
    expect(stats.listingStats.inLists).toBe(3);
    expect(stats.imageStats.total).toBe(3);
    expect(stats.listStats.averageListingsPerList).toBe(1.5);
    expect(stats.profileStats.completionPercentage).toBe(75);
    expect(stats.profileStats.missingFields).toStrictEqual(["location"]);
  });

  it("treats empty profile content as incomplete", () => {
    const stats = buildDashboardStats({
      listings: [],
      lists: [],
      images: [],
      profile: {
        id: "profile-2",
        userId: "u2",
        title: null,
        slug: "u2",
        logoUrl: null,
        description: " ",
        content: JSON.stringify({
          time: 1,
          blocks: [{ id: "b1", type: "paragraph", data: { text: " " } }],
          version: "2.0",
        }),
        location: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    expect(stats.profileStats.completionPercentage).toBe(0);
    expect(stats.profileStats.missingFields).toStrictEqual([
      "hasProfileImage",
      "description",
      "content",
      "location",
    ]);
  });
});
