import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageManager } from "@/components/image-manager";
import type { ImageCollectionItem } from "@/app/dashboard/_lib/dashboard-db/images-collection";

const review = vi.hoisted(() => ({ query: "" }));
const deleteImage = vi.hoisted(() => vi.fn());
const loadImageFromPrimary = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(review.query),
}));

vi.mock("@/app/dashboard/_lib/dashboard-db/images-collection", () => ({
  deleteImage,
  loadImageFromPrimary,
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

  it("opens image removal for review and leaves the image intact on cancel", async () => {
    let completeRefresh: (() => void) | undefined;
    loadImageFromPrimary.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          completeRefresh = resolve;
        }),
    );
    review.query = "intent=remove_image&imageId=second";
    render(
      <ImageManager images={images} referenceId="profile-1" type="profile" />,
    );

    expect(loadImageFromPrimary).toHaveBeenCalledWith({
      type: "profile",
      referenceId: "profile-1",
      imageId: "second",
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    completeRefresh?.();
    expect(await screen.findByRole("alertdialog")).toBeVisible();
    expect(deleteImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteImage).not.toHaveBeenCalled();
    review.query = "";
  });
});
