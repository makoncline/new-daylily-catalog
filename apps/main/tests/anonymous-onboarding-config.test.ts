import { afterEach, describe, expect, it } from "vitest";
import { buildOnboardingExampleCultivars } from "@/app/onboarding/anonymous-onboarding-example-cultivar-builder";
import {
  ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS,
  getListingPreview,
  getProfilePreview,
} from "@/app/onboarding/anonymous-onboarding-config";
import { createAnonymousOnboardingDraft } from "@/app/onboarding/anonymous-onboarding-draft";

const originalUseImageAssets = process.env.USE_IMAGE_ASSETS;

describe("anonymous onboarding config", () => {
  afterEach(() => {
    if (originalUseImageAssets === undefined) {
      delete process.env.USE_IMAGE_ASSETS;
    } else {
      process.env.USE_IMAGE_ASSETS = originalUseImageAssets;
    }
  });

  it("builds ordered example cultivars from cultivar reference ids", () => {
    const examples = buildOnboardingExampleCultivars(
      [
        {
          id: "cr-second",
          ahsListing: null,
          imageAssets: [],
          v2AhsCultivar: {
            id: "v2-second",
            post_title: "Second Bloom",
            introduction_date: "2020-01-01",
            primary_hybridizer_name: "Second Hybridizer",
            hybridizer_code_legacy: null,
            additional_hybridizers_names: null,
            bloom_season_names: null,
            fragrance_names: null,
            bloom_habit_names: null,
            foliage_names: null,
            ploidy_names: null,
            scape_height_in: null,
            bloom_size_in: null,
            bud_count: null,
            branches: null,
            color: null,
            flower_form_names: null,
            unusual_forms_names: null,
            parentage: null,
            image_url: "https://example.com/second.jpg",
          },
        },
        {
          id: "cr-first",
          ahsListing: null,
          imageAssets: [],
          v2AhsCultivar: {
            id: "v2-first",
            post_title: "First Bloom",
            introduction_date: "2021-01-01",
            primary_hybridizer_name: "First Hybridizer",
            hybridizer_code_legacy: null,
            additional_hybridizers_names: null,
            bloom_season_names: null,
            fragrance_names: null,
            bloom_habit_names: null,
            foliage_names: null,
            ploidy_names: null,
            scape_height_in: null,
            bloom_size_in: null,
            bud_count: null,
            branches: null,
            color: null,
            flower_form_names: null,
            unusual_forms_names: null,
            parentage: null,
            image_url: "https://example.com/first.jpg",
          },
        },
      ],
      ["cr-first", "cr-second"],
    );

    expect(examples).toEqual([
      {
        key: "cr-first",
        name: "First Bloom",
        hybridizerYear: "First Hybridizer, 2021",
        imageUrl: "https://example.com/first.jpg",
      },
      {
        key: "cr-second",
        name: "Second Bloom",
        hybridizerYear: "Second Hybridizer, 2020",
        imageUrl: "https://example.com/second.jpg",
      },
    ]);
  });

  it("uses cultivar image asset URLs when image assets are enabled", () => {
    process.env.USE_IMAGE_ASSETS = "true";

    const examples = buildOnboardingExampleCultivars(
      [
        {
          id: "cr-first",
          ahsListing: null,
          imageAssets: [
            {
              id: "asset-first",
              legacyImageId: null,
              status: "ready",
              originalUrl: "https://example.com/generated-original.jpg",
              displayUrl: "https://example.com/generated-display.jpg",
              thumbUrl: null,
              blurUrl: null,
            },
          ],
          v2AhsCultivar: {
            id: "v2-first",
            post_title: "First Bloom",
            introduction_date: "2021-01-01",
            primary_hybridizer_name: "First Hybridizer",
            hybridizer_code_legacy: null,
            additional_hybridizers_names: null,
            bloom_season_names: null,
            fragrance_names: null,
            bloom_habit_names: null,
            foliage_names: null,
            ploidy_names: null,
            scape_height_in: null,
            bloom_size_in: null,
            bud_count: null,
            branches: null,
            color: null,
            flower_form_names: null,
            unusual_forms_names: null,
            parentage: null,
            image_url: "https://example.com/source.jpg",
          },
        },
      ],
      ["cr-first"],
    );

    expect(examples[0]?.imageUrl).toBe(
      "https://example.com/generated-display.jpg",
    );
  });

  it("requires configured example cultivars before building a listing preview", () => {
    expect(ONBOARDING_EXAMPLE_CULTIVAR_REFERENCE_IDS).toEqual([
      "cr-v2-ahs-77248",
      "cr-v2-ahs-71522",
      "cr-v2-ahs-7847",
    ]);

    expect(() =>
      getListingPreview(createAnonymousOnboardingDraft(), []),
    ).toThrow("Onboarding example cultivars are not configured.");
  });

  it("does not add a fallback image to an empty profile preview", () => {
    expect(getProfilePreview(createAnonymousOnboardingDraft()).imageUrl).toBe(
      null,
    );
  });
});
