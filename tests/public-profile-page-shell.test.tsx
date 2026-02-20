import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicProfilePageShell } from "@/app/(public)/[userSlugOrId]/_components/public-profile-page-shell";
import { type PublicProfilePageViewModel } from "@/app/(public)/[userSlugOrId]/_components/public-profile-page-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/seeded-daylily",
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/floating-cart-button", () => ({
  FloatingCartButton: ({ showTopButton }: { showTopButton?: boolean }) => (
    <button type="button">
      {showTopButton ? "Contact Seller" : "Open Contact Dialog"}
    </button>
  ),
}));

vi.mock(
  "@/app/(public)/[userSlugOrId]/_components/catalog-search-prefetch",
  () => ({
    CatalogSearchPrefetch: () => (
      <div data-testid="catalog-search-prefetch">prefetch</div>
    ),
  }),
);

vi.mock("@/app/(public)/[userSlugOrId]/_components/profile-seo", () => ({
  ProfilePageSEO: () => <div data-testid="profile-page-seo">seo</div>,
}));

vi.mock("@/app/(public)/_components/public-breadcrumbs", () => ({
  PublicBreadcrumbs: ({ profile }: { profile: { title: string | null } }) => (
    <div data-testid="public-breadcrumbs">{profile.title ?? "Untitled"}</div>
  ),
}));

describe("PublicProfilePageShell", () => {
  it("renders profile header, lists/listings sections, and both pagination controls", () => {
    const profile = {
      id: "user-1",
      slug: "seeded-daylily",
      title: "Seeded Daylily Garden",
      description: "Beautiful daylily catalog",
      content: null,
      location: "Snohomish, WA",
      images: [],
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      _count: {
        listings: 234,
      },
      lists: [
        {
          id: "general",
          title: "General Listing",
          description: "Main catalog list",
          listingCount: 120,
        },
      ],
      hasActiveSubscription: true,
    };

    const model: PublicProfilePageViewModel = {
      canonicalUserSlug: "seeded-daylily",
      seo: {
        profile,
        listings: [],
        metadata: {
          url: "https://example.com",
          title: "Seeded Daylily Garden | Daylily Catalog",
          description: "Beautiful daylily catalog",
          imageUrl: "/assets/catalog-blooms.webp",
          pageUrl: "https://example.com/seeded-daylily",
          robots: "index, follow, max-image-preview:large",
          openGraph: {
            title: "Seeded Daylily Garden | Daylily Catalog",
            description: "Beautiful daylily catalog",
            siteName: "Daylily Catalog",
            locale: "en_US",
          },
        },
        baseUrl: "https://example.com",
      },
      profileContent: {
        canonicalUserSlug: "seeded-daylily",
        profileSection: {
          id: "user-1",
          title: "Seeded Daylily Garden",
          description: "Beautiful daylily catalog",
          location: "Snohomish, WA",
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-02T00:00:00.000Z"),
          hasActiveSubscription: true,
          _count: {
            listings: 234,
          },
          lists: [
            {
              id: "general",
              title: "General Listing",
              listingCount: 120,
            },
          ],
        },
        images: [],
        profileTitle: "Seeded Daylily Garden",
        content: null,
      },
      listings: {
        listsSection: {
          lists: [
            {
              id: "general",
              title: "General Listing",
              description: "Main catalog list",
              listingCount: 120,
              listingCountLabel: "120 listings",
              href: "/seeded-daylily/search?lists=general",
            },
          ],
          forSaleCount: 17,
          forSaleCountLabel: "17 listings",
          forSaleHref: "/seeded-daylily/search?price=true",
        },
        listingsSection: {
          canonicalUserSlug: "seeded-daylily",
          listings: [],
          page: 3,
          totalPages: 5,
          totalCount: 234,
          totalCountLabel: "234 total",
          searchHref: "/seeded-daylily/search?page=3",
        },
      },
      searchPrefetch: {
        userId: "user-1",
        userSlugOrId: "seeded-daylily",
      },
      breadcrumbProfile: profile,
    };

    render(<PublicProfilePageShell model={model} />);

    expect(
      screen.getByRole("heading", { name: "Seeded Daylily Garden" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Search and filter listings" }),
    ).toHaveAttribute("href", "/seeded-daylily/search?page=3");

    expect(
      screen.getByRole("heading", { name: "Lists", level: 2 }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /for sale/i })).toHaveAttribute(
      "href",
      "/seeded-daylily/search?price=true",
    );

    expect(screen.getByTestId("legacy-top-page-go-to")).toBeVisible();
    expect(screen.getByTestId("legacy-page-go-to")).toBeVisible();
    expect(screen.getByTestId("legacy-top-page-prev")).toHaveAttribute(
      "href",
      "/seeded-daylily?page=2#listings",
    );
    expect(screen.getByTestId("legacy-page-next")).toHaveAttribute(
      "href",
      "/seeded-daylily?page=4#listings",
    );
  });
});
