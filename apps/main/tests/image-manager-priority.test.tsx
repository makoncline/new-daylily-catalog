import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageManager } from "@/components/image-manager";
import type { ImageCollectionItem } from "@/app/dashboard/_lib/dashboard-db/images-collection";

vi.mock("@/app/dashboard/_lib/dashboard-db/images-collection", () => ({
  deleteImage: vi.fn(),
  reorderImages: vi.fn(),
}));

const images: ImageCollectionItem[] = ["first", "second"].map((id, order) => ({
  id,
  url: `/assets/${id}.webp`,
  order,
  listingId: null,
  userProfileId: "profile-1",
  status: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}));

describe("ImageManager image priority", () => {
  it("loads every managed image eagerly when the gallery opts in", () => {
    render(
      <ImageManager
        images={images}
        referenceId="profile-1"
        type="profile"
        prioritizeImages
      />,
    );

    for (const image of screen.getAllByRole("img", {
      name: "Daylily image",
    })) {
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("fetchpriority", "high");
    }
  });
});
