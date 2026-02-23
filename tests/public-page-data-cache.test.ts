// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_CACHE_CONFIG } from "@/config/public-cache-config";

const unstableCacheMock = vi.hoisted(() =>
  vi.fn((fn: (...args: unknown[]) => unknown) => fn),
);
const revalidateTagMock = vi.hoisted(() => vi.fn());

const getPublicProfilesMock = vi.hoisted(() => vi.fn());
const getPublicProfileMock = vi.hoisted(() => vi.fn());
const getInitialListingsMock = vi.hoisted(() => vi.fn());
const getPublicProfilePageDataMock = vi.hoisted(() => vi.fn());
const getPublicCultivarPageMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/server/db/getPublicProfiles", () => ({
  getPublicProfiles: getPublicProfilesMock,
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getPublicProfile: getPublicProfileMock,
}));

vi.mock("@/server/db/getPublicListings", () => ({
  getInitialListings: getInitialListingsMock,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_lib/public-profile-route", () => ({
  getPublicProfilePageData: getPublicProfilePageDataMock,
}));

vi.mock("@/server/db/getPublicCultivars", () => ({
  getPublicCultivarPage: getPublicCultivarPageMock,
}));

const EXPECTED_CATALOGS_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.CATALOGS;
const EXPECTED_PROFILE_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.PROFILE;
const EXPECTED_CULTIVAR_REVALIDATE_SECONDS =
  PUBLIC_CACHE_CONFIG.REVALIDATE_SECONDS.PAGE.CULTIVAR;

describe("public page data cache helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps public profiles with shared cache settings", async () => {
    getPublicProfilesMock.mockResolvedValue([{ id: "user-1" }]);

    const { getCachedPublicProfiles } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedPublicProfiles();

    expect(result).toEqual([{ id: "user-1" }]);
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "public-profiles"],
      {
        revalidate: EXPECTED_CATALOGS_REVALIDATE_SECONDS,
        tags: ["public-route:catalogs"],
      },
    );
  });

  it("wraps public profile lookup with slug keying", async () => {
    getPublicProfileMock.mockResolvedValue({ id: "user-2" });

    const { getCachedPublicProfile } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedPublicProfile("alpha-garden");

    expect(result).toEqual({ id: "user-2" });
    expect(getPublicProfileMock).toHaveBeenCalledWith("alpha-garden");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "public-profile", "alpha-garden"],
      {
        revalidate: EXPECTED_PROFILE_REVALIDATE_SECONDS,
        tags: ["public-route:profile:alpha-garden"],
      },
    );
  });

  it("wraps initial listings with slug keying", async () => {
    getInitialListingsMock.mockResolvedValue([{ id: "listing-1" }]);

    const { getCachedInitialListings } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedInitialListings("beta-garden");

    expect(result).toEqual([{ id: "listing-1" }]);
    expect(getInitialListingsMock).toHaveBeenCalledWith("beta-garden");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "initial-listings", "beta-garden"],
      {
        revalidate: EXPECTED_PROFILE_REVALIDATE_SECONDS,
        tags: ["public-route:profile:beta-garden"],
      },
    );
  });

  it("wraps paginated profile page data with slug and page keys", async () => {
    getPublicProfilePageDataMock.mockResolvedValue({ page: 3 });

    const { getCachedPublicProfilePageData } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedPublicProfilePageData("gamma-garden", 3);

    expect(result).toEqual({ page: 3 });
    expect(getPublicProfilePageDataMock).toHaveBeenCalledWith("gamma-garden", 3);
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "public-profile-page-data", "gamma-garden", "3"],
      {
        revalidate: EXPECTED_PROFILE_REVALIDATE_SECONDS,
        tags: ["public-route:profile:gamma-garden"],
      },
    );
  });

  it("wraps cultivar page lookup with segment keying", async () => {
    getPublicCultivarPageMock.mockResolvedValue({ summary: { name: "Coffee Frenzy" } });

    const { getCachedPublicCultivarPage } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedPublicCultivarPage("coffee-frenzy");

    expect(result).toEqual({ summary: { name: "Coffee Frenzy" } });
    expect(getPublicCultivarPageMock).toHaveBeenCalledWith("coffee-frenzy");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "public-cultivar-page", "coffee-frenzy"],
      {
        revalidate: EXPECTED_CULTIVAR_REVALIDATE_SECONDS,
        tags: ["public-route:cultivar:coffee-frenzy"],
      },
    );
  });

  it("normalizes cultivar cache key and fetch argument", async () => {
    getPublicCultivarPageMock.mockResolvedValue({ summary: { name: "Coffee Frenzy" } });

    const { getCachedPublicCultivarPage } = await import(
      "@/server/cache/public-page-data-cache"
    );

    const result = await getCachedPublicCultivarPage("Coffee Frenzy");

    expect(result).toEqual({ summary: { name: "Coffee Frenzy" } });
    expect(getPublicCultivarPageMock).toHaveBeenCalledWith("coffee-frenzy");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-page-data", "public-cultivar-page", "coffee-frenzy"],
      {
        revalidate: EXPECTED_CULTIVAR_REVALIDATE_SECONDS,
        tags: ["public-route:cultivar:coffee-frenzy"],
      },
    );
  });
});
