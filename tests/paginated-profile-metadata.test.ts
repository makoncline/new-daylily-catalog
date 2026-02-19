import { type Metadata } from "next";
import { describe, expect, it } from "vitest";
import { generatePaginatedProfileMetadata } from "@/app/(public)/[userSlugOrId]/_seo/paginated-metadata";

describe("paginated profile metadata", () => {
  it("uses base canonical for page 1 and index robots", () => {
    const metadata = generatePaginatedProfileMetadata({
      baseMetadata: {
        title: "Alpha Garden | Daylily Catalog",
      } as Metadata,
      profileSlug: "alpha-garden",
      page: 1,
      hasNonPageStateParams: false,
    });

    expect(metadata.alternates?.canonical).toBe("/alpha-garden");
    expect(metadata.robots).toBe("index, follow, max-image-preview:large");
  });

  it("uses page canonical and noindex when non-page params exist", () => {
    const metadata = generatePaginatedProfileMetadata({
      baseMetadata: {
        title: "Alpha Garden | Daylily Catalog",
      } as Metadata,
      profileSlug: "alpha-garden",
      page: 4,
      hasNonPageStateParams: true,
    });

    expect(metadata.alternates?.canonical).toBe("/alpha-garden?page=4");
    expect(metadata.robots).toBe("noindex, nofollow");
    expect(metadata.title).toContain("Page 4");
  });
});
