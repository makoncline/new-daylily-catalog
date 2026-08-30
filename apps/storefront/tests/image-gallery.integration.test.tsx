// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { ImageGallery } from "@/components/catalog/image-gallery";
import type { StorefrontImage } from "@/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const images: StorefrontImage[] = [
  {
    id: "image-two",
    url: "/images/two.jpg",
    thumbUrl: "/images/two-thumb.jpg",
    blurUrl: null,
    order: 2,
  },
  {
    id: "image-one",
    url: "/images/one.jpg",
    thumbUrl: "/images/one-thumb.jpg",
    blurUrl: null,
    order: 1,
  },
];

describe("listing image gallery", () => {
  it("keeps the selected thumbnail visible to assistive technology and styling", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => root.render(<ImageGallery images={images} title="Test bloom" />));
    const buttons = Array.from(container.querySelectorAll("button"));

    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("false");
    expect(buttons[0]?.className).toContain("aria-pressed:ring-2");

    act(() => buttons[1]?.click());

    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");

    act(() => root.unmount());
  });
});
