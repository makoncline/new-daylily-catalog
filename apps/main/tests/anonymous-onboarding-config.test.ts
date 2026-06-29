import { describe, expect, it } from "vitest";
import {
  EXAMPLE_CULTIVARS,
  LISTING_FALLBACK_IMAGE,
} from "@/app/onboarding/anonymous-onboarding-config";

describe("anonymous onboarding config", () => {
  it("uses real reference images for example cultivars", () => {
    expect(EXAMPLE_CULTIVARS.length).toBeGreaterThan(0);

    expect(
      EXAMPLE_CULTIVARS.every(
        (cultivar) =>
          cultivar.imageUrl.startsWith("https://") &&
          cultivar.imageUrl !== LISTING_FALLBACK_IMAGE,
      ),
    ).toBe(true);
  });
});
