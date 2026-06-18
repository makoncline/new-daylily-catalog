import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt = "",
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", { alt, ...props }),
}));

const reportErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/error-utils", () => ({
  reportError: reportErrorMock,
}));

import { OptimizedImage } from "@/components/optimized-image";

describe("OptimizedImage", () => {
  beforeEach(() => {
    reportErrorMock.mockClear();
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
  });

  it("applies cloudflare transform only for daylily-catalog-images hosts", () => {
    const internalSrc =
      "https://daylily-catalog-images.s3.amazonaws.com/lily/63/ed27a857-1e93-4aa4-add9-15bcb12e2208";
    const externalSrc =
      "https://www.daylilydatabase.org/AHSPhoto/C/ChinaBlushCherylDay_1584735345.jpg";

    const { rerender } = render(
      <OptimizedImage alt="Internal" src={internalSrc} size="full" />,
    );

    const transformedImage = screen.getByRole("img");
    expect(transformedImage).toHaveAttribute(
      "src",
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/lily/63/ed27a857-1e93-4aa4-add9-15bcb12e2208",
    );

    rerender(<OptimizedImage alt="External" src={externalSrc} size="full" />);

    const originalImage = screen.getByRole("img");
    expect(originalImage).toHaveAttribute("src", externalSrc);
  });

  it("falls back to original src after transformed load fails and reports once", () => {
    const src =
      "https://daylily-catalog-images.s3.amazonaws.com/lily/87/de9f9b7f-4e96-41e3-966c-e14062cf0458";
    render(<OptimizedImage alt="Test" src={src} size="full" />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute(
      "src",
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/lily/87/de9f9b7f-4e96-41e3-966c-e14062cf0458",
    );

    fireEvent.error(image);
    expect(image).toHaveAttribute("src", src);
    expect(reportErrorMock).toHaveBeenCalledTimes(0);

    fireEvent.error(image);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);

    fireEvent.error(image);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });

  it("keeps thumbnail transforms size-aware when given a Cloudflare-routed S3 URL", () => {
    const originalSrc =
      "https://daylily-catalog-images.s3.amazonaws.com/lily/63/ed27a857-1e93-4aa4-add9-15bcb12e2208";
    const routedSrc =
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/lily/63/ed27a857-1e93-4aa4-add9-15bcb12e2208";

    render(<OptimizedImage alt="Thumbnail" src={routedSrc} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute(
      "src",
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=200,fit=cover,format=auto,quality=75/https://daylily-catalog-images.s3.amazonaws.com/lily/63/ed27a857-1e93-4aa4-add9-15bcb12e2208",
    );

    fireEvent.error(image);

    expect(image).toHaveAttribute("src", originalSrc);
    expect(reportErrorMock).toHaveBeenCalledTimes(0);
  });

  it("uses ImageAsset variants directly and resets the blur overlay for each source", () => {
    const firstImage = {
      id: "image-1",
      url: "https://legacy.example/image-1.jpg",
      imageAsset: {
        id: "asset-1",
        status: "ready",
        originalUrl: "https://media.example/image-1/original.jpg",
        displayUrl: "https://media.example/image-1/display-800.webp",
        thumbUrl: "https://media.example/image-1/thumb-200.webp",
        blurUrl: "https://media.example/image-1/blur-20.webp",
      },
    };
    const secondImage = {
      id: "image-2",
      url: "https://legacy.example/image-2.jpg",
      imageAsset: {
        id: "asset-2",
        status: "ready",
        originalUrl: "https://media.example/image-2/original.jpg",
        displayUrl: "https://media.example/image-2/display-800.webp",
        thumbUrl: "https://media.example/image-2/thumb-200.webp",
        blurUrl: "https://media.example/image-2/blur-20.webp",
      },
    };

    const { container, rerender } = render(
      <OptimizedImage alt="Asset image" image={firstImage} size="full" />,
    );

    const image = screen.getByRole("img");
    const blurOverlay = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;

    expect(image).toHaveAttribute(
      "src",
      "https://media.example/image-1/display-800.webp",
    );
    expect(blurOverlay.getAttribute("style")).toContain(
      "https://media.example/image-1/blur-20.webp",
    );
    expect(blurOverlay.className).toContain("opacity-100");

    fireEvent.load(image);
    expect(blurOverlay.className).toContain("opacity-0");

    rerender(
      <OptimizedImage alt="Asset image" image={secondImage} size="full" />,
    );

    const nextBlurOverlay = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://media.example/image-2/display-800.webp",
    );
    expect(nextBlurOverlay.getAttribute("style")).toContain(
      "https://media.example/image-2/blur-20.webp",
    );
    expect(nextBlurOverlay.className).toContain("opacity-100");

    rerender(
      <OptimizedImage alt="Asset image" image={secondImage} size="thumbnail" />,
    );

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://media.example/image-2/thumb-200.webp",
    );
  });

  it("does not report external host load failures", () => {
    const externalSrc =
      "https://www.daylilydatabase.org/AHSPhoto/C/ChinaBlushCherylDay_1584735345.jpg";
    render(<OptimizedImage alt="External" src={externalSrc} size="full" />);

    const image = screen.getByRole("img");
    fireEvent.error(image);

    expect(reportErrorMock).not.toHaveBeenCalled();
  });
});
