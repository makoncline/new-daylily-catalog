import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type RouterOutputs } from "@/trpc/react";
import { ProfileContent } from "@/app/(public)/[userSlugOrId]/_components/profile-content";

vi.mock("@/app/(public)/[userSlugOrId]/_components/profile-section", () => ({
  ProfileSection: () => <div data-testid="profile-section" />,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/images-section", () => ({
  ImagesSection: () => <div data-testid="images-section" />,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/content-section", () => ({
  ContentSection: () => <div data-testid="content-section" />,
}));

vi.mock("@/app/(public)/[userSlugOrId]/_components/catalog-nav", () => ({
  CatalogNav: ({
    canonicalUserSlug,
    currentPage,
  }: {
    canonicalUserSlug: string;
    currentPage: number;
  }) => (
    <nav
      data-testid="catalog-nav"
      data-slug={canonicalUserSlug}
      data-page={currentPage}
    />
  ),
}));

describe("ProfileContent", () => {
  it("renders the catalog section navigation", () => {
    const profile: RouterOutputs["public"]["getProfile"] = {
      id: "user-1",
      slug: "seeded-daylily",
      title: "Seeded Daylily Garden",
      description: null,
      location: null,
      images: [],
      listingCount: 0,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      _count: {
        listings: 0,
      },
      listCount: 0,
      lists: [],
      hasActiveSubscription: false,
      content: null,
    };

    render(<ProfileContent initialProfile={profile} currentPage={3} />);

    expect(screen.getByTestId("images-section")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-nav")).toHaveAttribute(
      "data-slug",
      "seeded-daylily",
    );
    expect(screen.getByTestId("catalog-nav")).toHaveAttribute("data-page", "3");
  });
});
