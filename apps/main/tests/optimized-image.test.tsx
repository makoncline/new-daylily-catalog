import type React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
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

  it("does not report external host load failures", () => {
    const externalSrc =
      "https://www.daylilydatabase.org/AHSPhoto/C/ChinaBlushCherylDay_1584735345.jpg";
    render(<OptimizedImage alt="External" src={externalSrc} size="full" />);

    const image = screen.getByRole("img");
    fireEvent.error(image);

    expect(reportErrorMock).not.toHaveBeenCalled();
  });
});
