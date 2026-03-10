import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogNav } from "@/app/(public)/[userSlugOrId]/_components/catalog-nav";

const mockPathname = vi.fn();
const mockSearchParamGet = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => ({
    get: mockSearchParamGet,
  }),
}));

describe("CatalogNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/seeded-daylily");
    mockSearchParamGet.mockImplementation(() => null);
  });

  it("links search/filter to search page with page query when page is present", () => {
    mockSearchParamGet.mockImplementation((key: string) =>
      key === "page" ? "3" : null,
    );

    render(<CatalogNav canonicalUserSlug="seeded-daylily" />);

    expect(screen.getByRole("link", { name: "Search/filter" })).toHaveAttribute(
      "href",
      "/seeded-daylily/search?page=3",
    );
  });

  it("links search/filter without page query on page 1", () => {
    mockSearchParamGet.mockImplementation((key: string) =>
      key === "page" ? "1" : null,
    );

    render(<CatalogNav canonicalUserSlug="seeded-daylily" />);

    expect(screen.getByRole("link", { name: "Search/filter" })).toHaveAttribute(
      "href",
      "/seeded-daylily/search",
    );
  });

  it("uses internal paginated pathname as fallback page source", () => {
    mockPathname.mockReturnValue("/seeded-daylily/page/4");
    mockSearchParamGet.mockImplementation(() => null);

    render(<CatalogNav canonicalUserSlug="seeded-daylily" />);

    expect(screen.getByRole("link", { name: "Search/filter" })).toHaveAttribute(
      "href",
      "/seeded-daylily/search?page=4",
    );
  });
});
