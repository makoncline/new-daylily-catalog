import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogSearchHeader } from "@/app/(public)/[userSlugOrId]/_components/catalog-search-header";

vi.mock("@/components/floating-cart-button", () => ({
  FloatingCartButton: ({
    showTopButton,
    userName,
  }: {
    showTopButton?: boolean;
    userName?: string;
  }) => (
    <button type="button">
      {showTopButton ? `Contact Seller ${userName ?? ""}`.trim() : "Cart"}
    </button>
  ),
}));

describe("CatalogSearchHeader", () => {
  it("renders garden name, search subheading, and top contact CTA", () => {
    render(
      <CatalogSearchHeader
        profile={{
          id: "user-1",
          title: "Seeded Daylily Garden",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Seeded Daylily Garden" }),
    ).toBeVisible();
    expect(
      screen.getByText("Search and filter listings from this garden."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Contact Seller/i }),
    ).toBeVisible();
  });
});
