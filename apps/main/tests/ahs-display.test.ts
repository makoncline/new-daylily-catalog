// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getDisplayAhsListing,
  type AhsDisplayListing,
  type V2AhsCultivarDisplaySource,
} from "@/lib/utils/ahs-display";

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
    hybridizer_code_legacy: null,
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
  it("maps V2 cultivar display data", () => {
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: createV2AhsCultivar({
          hybridizer_code_legacy: "Legacy Hybridizer",
          color: null,
          fragrance_names: null,
        }),
      },
    });

    expect(displayAhsListing).toMatchObject({
      id: "v2-1",
      name: "V2 Name",
      ahsImageUrl: "https://example.com/v2.jpg",
      hybridizer: "V2 Hybridizer",
      year: "2024",
      scapeHeight: '36"',
      bloomSize: '7.5"',
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

  it("falls back to the legacy hybridizer code when the V2 primary hybridizer is blank", () => {
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: createV2AhsCultivar({
          primary_hybridizer_name: "   ",
          hybridizer_code_legacy: "Reimer",
          additional_hybridizers_names: null,
        }),
      },
    });

    expect(displayAhsListing?.hybridizer).toBe("Reimer");
  });

  it("HTML-decodes the legacy hybridizer fallback before display", () => {
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: createV2AhsCultivar({
          primary_hybridizer_name: null,
          hybridizer_code_legacy: "Thibault-Lipp&eacute; &amp; Gregory-CJ",
          additional_hybridizers_names: null,
        }),
      },
    });

    expect(displayAhsListing?.hybridizer).toBe("Thibault-Lippé & Gregory-CJ");
  });

  it("falls back to unknown when V2 hybridizer fields are unavailable", () => {
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: createV2AhsCultivar({
          primary_hybridizer_name: null,
          hybridizer_code_legacy: "   ",
          additional_hybridizers_names: "Partner Hybridizer",
        }),
      },
    });

    expect(displayAhsListing?.hybridizer).toBe("unknown");
  });

  it("returns null when V2 data is unavailable", () => {
    const displayAhsListing = getDisplayAhsListing({
      cultivarReference: {
        ahsListing: createLegacyAhsListing(),
        v2AhsCultivar: null,
      },
    });

    expect(displayAhsListing).toBeNull();
  });
});
