import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogNav } from "@/app/(public)/[userSlugOrId]/_components/catalog-nav";

describe("CatalogNav", () => {
  it("links search/filter to search page with page query on paginated routes", () => {
    render(<CatalogNav canonicalUserSlug="seeded-daylily" currentPage={3} />);

    expect(screen.getByRole("link", { name: "Search/filter" })).toHaveAttribute(
      "href",
      "/seeded-daylily/search?page=3",
    );
  });

  it("links search/filter without page query on page 1", () => {
    render(<CatalogNav canonicalUserSlug="seeded-daylily" currentPage={1} />);

    expect(screen.getByRole("link", { name: "Search/filter" })).toHaveAttribute(
      "href",
      "/seeded-daylily/search",
    );
  });
});
