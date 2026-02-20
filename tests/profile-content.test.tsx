import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileContent } from "@/app/(public)/[userSlugOrId]/_components/profile-content";
import { type ProfileSectionData } from "@/app/(public)/[userSlugOrId]/_components/profile-section";

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
  CatalogNav: ({ canonicalUserSlug }: { canonicalUserSlug: string }) => (
    <div data-testid="catalog-nav" data-slug={canonicalUserSlug} />
  ),
}));

describe("ProfileContent", () => {
  it("keeps image panel visible in mobile layout classes", () => {
    const profileSection: ProfileSectionData = {
      id: "user-1",
      title: "Seeded Daylily Garden",
      description: null,
      location: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      _count: {
        listings: 0,
      },
      lists: [],
      hasActiveSubscription: false,
    };

    render(
      <ProfileContent
        canonicalUserSlug="seeded-daylily"
        profileSection={profileSection}
        images={[]}
        profileTitle="Seeded Daylily Garden"
        content={null}
      />,
    );

    const imageWrapper = screen.getByTestId("images-section").parentElement;

    expect(imageWrapper).not.toBeNull();
    expect(imageWrapper).toHaveClass("order-3");
    expect(imageWrapper).not.toHaveClass("hidden");
    expect(screen.getAllByTestId("catalog-nav")).toHaveLength(2);
  });
});
