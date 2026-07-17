import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt = "",
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) =>
    React.createElement("img", { alt, ...props }),
}));

import { TableImagePreview } from "@/components/data-table/table-image-preview";

describe("TableImagePreview", () => {
  it("paints the asset blur URL inside a fully sized table preview", () => {
    const { container } = render(
      <TableImagePreview
        images={[
          {
            id: "image-1",
            url: "https://media.example/image-1/thumb-200.webp",
            imageAsset: {
              id: "asset-1",
              status: "ready",
              originalUrl: "https://media.example/image-1/original.jpg",
              displayUrl: "https://media.example/image-1/display-800.webp",
              thumbUrl: "https://media.example/image-1/thumb-200.webp",
              blurUrl: "https://media.example/image-1/blur-20.webp",
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Image preview" })).toHaveAttribute(
      "src",
      "https://media.example/image-1/thumb-200.webp",
    );
    expect(
      container.querySelector('[aria-hidden="true"]')?.getAttribute("style"),
    ).toContain("https://media.example/image-1/blur-20.webp");
    const image = screen.getByRole("img", { name: "Image preview" });
    expect(image.parentElement).toHaveClass("size-full");
    expect(image.parentElement?.parentElement).toHaveClass("inset-0");
    expect(screen.getByRole("button")).toHaveClass("size-16");
  });

  it("opens the display asset with the same blur-up placeholder", () => {
    render(
      <TableImagePreview
        images={[
          {
            id: "image-1",
            url: "https://media.example/image-1/display-800.webp",
            imageAsset: {
              id: "asset-1",
              status: "ready",
              originalUrl: "https://media.example/image-1/original.jpg",
              displayUrl: "https://media.example/image-1/display-800.webp",
              thumbUrl: "https://media.example/image-1/thumb-200.webp",
              blurUrl: "https://media.example/image-1/blur-20.webp",
            },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const galleryImage = screen.getByRole("img", { name: "Gallery image" });
    expect(galleryImage).toHaveAttribute(
      "src",
      "https://media.example/image-1/display-800.webp",
    );
    expect(
      galleryImage.parentElement
        ?.querySelector('[aria-hidden="true"]')
        ?.getAttribute("style"),
    ).toContain("https://media.example/image-1/blur-20.webp");
  });
});
