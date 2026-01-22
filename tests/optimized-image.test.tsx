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

  it("falls back to original src after optimized load fails and reports once", () => {
    const src = "https://example.com/images/witches poison apple.jpg";
    render(<OptimizedImage alt="Test" src={src} size="full" />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute(
      "src",
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://example.com/images/witches%20poison%20apple.jpg",
    );

    fireEvent.error(image);
    expect(image).toHaveAttribute("src", src);
    expect(reportErrorMock).toHaveBeenCalledTimes(0);

    fireEvent.error(image);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);

    fireEvent.error(image);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });
});
