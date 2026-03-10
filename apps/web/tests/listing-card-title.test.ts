import { describe, expect, it } from "vitest";
import {
  formatListingCardTitle,
  getListingCardTitleSizeClass,
} from "@/components/listing-card-title";

describe("listing-card-title", () => {
  it("keeps shorter titles intact", () => {
    const title = "Prairie Glow";

    expect(formatListingCardTitle(title)).toBe(title);
  });

  it("middle-truncates very long titles", () => {
    const longTitle =
      "Sunset Reflections Over River Stone With Crimson Halo And Gold Ruffled Edge Collector Introduction 2026";
    const formatted = formatListingCardTitle(longTitle);

    expect(formatted).toContain("\u2026");
    expect(formatted.length).toBeLessThanOrEqual(96);
    expect(formatted.startsWith("Sunset Reflections")).toBe(true);
    expect(formatted.endsWith("Collector Introduction 2026")).toBe(true);
  });

  it("shrinks font size as title length increases", () => {
    expect(getListingCardTitleSizeClass(20)).toBe("text-xl leading-tight");
    expect(getListingCardTitleSizeClass(48)).toBe("text-lg leading-tight");
    expect(getListingCardTitleSizeClass(64)).toBe("text-base leading-snug");
    expect(getListingCardTitleSizeClass(88)).toBe("text-sm leading-snug");
  });
});
