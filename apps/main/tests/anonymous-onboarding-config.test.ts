import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_ONBOARDING_STEPS,
  ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
} from "@/app/onboarding/anonymous-onboarding-config";

describe("anonymous onboarding config", () => {
  it("keeps the curated cultivar reference order stable", () => {
    expect(ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS).toEqual([
      "cr-ahs-176320",
      "cr-ahs-170157",
      "cr-ahs-8527",
    ]);
  });

  it("defines the complete persuasion-first journey in order", () => {
    expect(ANONYMOUS_ONBOARDING_STEPS.map((step) => step.id)).toEqual([
      "workflow",
      "buyer-need",
      "problem",
      "search-tour",
      "proof",
      "personalize",
      "email",
      "checkout",
    ]);
  });
});
