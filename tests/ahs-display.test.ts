// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import {
  getDisplayAhsListing,
  type AhsDisplayListing,
  type V2AhsCultivarDisplaySource,
} from "@/lib/utils/ahs-display";

const originalV2DisplayFlag =
  process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;

afterEach(() => {
  if (originalV2DisplayFlag === undefined) {
    delete process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;
    return;
  }

  process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = originalV2DisplayFlag;
});

function createLegacyAhsListing(
  overrides: Partial<AhsDisplayListing> = {},
): AhsDisplayListing {
  return {
    id: "ahs-1",
    name: "Legacy Name",
    ahsImageUrl: "https://example.com/legacy.jpg",
    hybridizer: "Legacy Hybridizer",
    year: "2011",
    scapeHeight: "30 inches",
    bloomSize: "6 inches",
    bloomSeason: "Midseason",
    ploidy: "Tetraploid",
    foliageType: "Dormant",
    bloomHabit: "Diurnal",
    color: "Legacy color",
    form: "Single",
    parentage: "(Legacy A x Legacy B)",
    fragrance: "Light",
    budcount: "20",
    branches: "4",
    sculpting: "Ruffled",
    foliage: "Green",
    flower: "Lavender",
    ...overrides,
  };
}

function createV2AhsCultivar(
  overrides: Partial<V2AhsCultivarDisplaySource> = {},
): V2AhsCultivarDisplaySource {
  return {
    id: "v2-1",
    post_title: "V2 Name",
    introduction_date: "2024-09-15",
    primary_hybridizer_name: "V2 Hybridizer",
    additional_hybridizers_names: "Partner Hybridizer",
    bloom_season_names: "Late",
    fragrance_names: "Heavy",
    bloom_habit_names: "Extended",
    foliage_names: "Evergreen",
    ploidy_names: "Diploid",
    scape_height_in: 36,
    bloom_size_in: 7.5,
    bud_count: 28,
    branches: 5,
    color: "V2 color",
    flower_form_names: "Double",
    unusual_forms_names: "Crispate",
    parentage: "(V2 A x V2 B)",
    image_url: "https://example.com/v2.jpg",
    ...overrides,
  };
}

describe("getDisplayAhsListing", () => {
  it("keeps the legacy AHS payload when the feature flag is off", () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "false";

    const legacyAhsListing = createLegacyAhsListing();
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: legacyAhsListing,
        v2AhsCultivar: createV2AhsCultivar(),
      },
    });

    expect(displayAhsListing).toEqual(legacyAhsListing);
  });

  it("maps V2 fields without mixing legacy display fields when the feature flag is on", () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: createV2AhsCultivar({
          color: null,
          fragrance_names: null,
        }),
      },
    });

    expect(displayAhsListing).toMatchObject({
      id: "v2-1",
      displayDataSource: "v2",
      name: "V2 Name",
      ahsImageUrl: "https://example.com/v2.jpg",
      hybridizer: "V2 Hybridizer, Partner Hybridizer",
      year: "2024",
      scapeHeight: "36 inches",
      bloomSize: "7.5 inches",
      bloomSeason: "Late",
      ploidy: "Diploid",
      foliageType: "Evergreen",
      bloomHabit: "Extended",
      form: "Double, Crispate",
      budcount: "28",
      branches: "5",
      parentage: "(V2 A x V2 B)",
      color: null,
      fragrance: null,
    });
  });

  it("falls back to the legacy AHS payload when V2 data is unavailable", () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const legacyAhsListing = createLegacyAhsListing();
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: legacyAhsListing,
        v2AhsCultivar: null,
      },
    });

    expect(displayAhsListing).toEqual(legacyAhsListing);
  });
});
