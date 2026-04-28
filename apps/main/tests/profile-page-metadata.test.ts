// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPublicProfilePageData = vi.hoisted(() => vi.fn());
const mockGenerateProfileMetadata = vi.hoisted(() => vi.fn());

vi.mock("@/app/(public)/_components/main-content", () => ({
  MainContent: () => null,
}));

vi.mock("@/app/(public)/_components/public-breadcrumbs", () => ({
  PublicBreadcrumbs: () => null,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/catalog-seo-listings", () => ({
  CatalogSeoListings: () => null,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/profile-content", () => ({
  ProfileContent: () => null,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/profile-seo", () => ({
  ProfilePageSEO: () => null,
}));

vi.mock("@/app/(public)/_components/isr-written-at", () => ({
  IsrWrittenAt: () => null,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_lib/public-profile-route", () => ({
  getPublicProfilePageData: mockGetPublicProfilePageData,
  getPublicProfileStaticParams: vi.fn(),
  getPublicProfilePaginatedStaticParams: vi.fn(),
}));

vi.mock("@/app/(public)/[userSlugOrId]/_seo/metadata", () => ({
  generateProfileMetadata: mockGenerateProfileMetadata,
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getBaseUrl: () => "https://daylilycatalog.com",
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

vi.mock("@/lib/utils", () => ({
  tryCatch: async (promise: Promise<unknown>) => {
    try {
      return { data: await promise, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  getErrorCode: vi.fn(),
}));

describe("profile page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateProfileMetadata.mockResolvedValue({
      title: "Top Pro | Daylily Catalog",
    });
    mockGetPublicProfilePageData.mockResolvedValue({
      profile: {
        id: "87",
        slug: "top-pro",
        hasActiveSubscription: true,
      },
      items: [],
      page: 1,
      totalPages: 3,
      totalCount: 24,
      forSaleCount: 11,
    });
  });

  it("marks direct-access id root routes as noindex while keeping the slug canonical", async () => {
    const { generateMetadata } = await import("@/app/(public)/[userSlugOrId]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ userSlugOrId: "87" }),
    });

    expect(metadata.alternates?.canonical).toBe("/top-pro");
    expect(metadata.robots).toBe("noindex, follow");
  });

  it("marks direct-access id paginated routes as noindex while keeping the slug canonical", async () => {
    const { generateMetadata } = await import(
      "@/app/(public)/[userSlugOrId]/page/[page]/page"
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({ userSlugOrId: "87", page: "2" }),
    });

    expect(metadata.alternates?.canonical).toBe("/top-pro/page/2");
    expect(metadata.robots).toBe("noindex, follow");
  });
});
