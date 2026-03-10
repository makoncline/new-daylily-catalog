// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const getListingOwnerWithSlugsMock = vi.hoisted(() => vi.fn());
const permanentRedirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/getLegacyMappings", () => ({
  getListingOwnerWithSlugs: getListingOwnerWithSlugsMock,
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: permanentRedirectMock,
}));

describe("catalog legacy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /catalog/:listingId directly to the canonical public listing URL", async () => {
    getListingOwnerWithSlugsMock.mockResolvedValue({
      userId: "user-1",
      userSlug: "garden",
      listingSlug: "happy-returns",
    });

    const { default: CatalogLegacyRoutePage } = await import(
      "@/app/catalog/[listingId]/page"
    );

    await CatalogLegacyRoutePage({
      params: Promise.resolve({
        listingId: "listing-1",
      }),
    });

    expect(getListingOwnerWithSlugsMock).toHaveBeenCalledWith("listing-1");
    expect(permanentRedirectMock).toHaveBeenCalledWith(
      "/garden/happy-returns",
    );
  });

  it("redirects unresolved legacy listing ids to /catalogs", async () => {
    getListingOwnerWithSlugsMock.mockResolvedValue(null);

    const { default: CatalogLegacyRoutePage } = await import(
      "@/app/catalog/[listingId]/page"
    );

    await CatalogLegacyRoutePage({
      params: Promise.resolve({
        listingId: "missing-listing",
      }),
    });

    expect(permanentRedirectMock).toHaveBeenCalledWith("/catalogs");
  });
});
