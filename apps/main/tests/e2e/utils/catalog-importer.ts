import type { Page } from "@playwright/test";

interface MatchRequest {
  names: string[];
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function candidate(name: string, confidence: number) {
  const normalizedName = normalizeName(name);
  const featuredFacetValues = normalizedName === "daylily 1";

  return {
    awardNames: featuredFacetValues ? "Stout Medal" : "Honorable Mention",
    bloomHabit: "Reblooms",
    bloomSizeIn: 5,
    bloomSeason: "Midseason",
    branches: 4,
    budCount: 18,
    color: "Golden yellow with a deep raspberry eye and matching picotee edge",
    confidence,
    cultivarReferenceId: `cultivar-${normalizedName}`,
    displayName: name,
    foliageType: "Dormant",
    flowerShow: featuredFacetValues ? "Large" : "Small",
    form: "Single, unusual form cascade",
    fragrance: "Fragrant",
    hybridizer: featuredFacetValues
      ? "Featured Hybridizer"
      : "Example Hybridizer",
    imageAsset: {
      blurUrl: "https://media.example.com/blur-20.webp",
      displayUrl: "https://media.example.com/display-800.webp",
      id: `image-${normalizedName}`,
      originalUrl: "https://media.example.com/original.jpg",
      status: "READY",
      thumbUrl: "https://media.example.com/thumb-200.webp",
    },
    imageUrl: "https://media.example.com/original.jpg",
    listingCount: 0,
    normalizedName,
    parentage: "Seedling x Example Parent",
    ploidy: "Diploid",
    rebloom: true,
    scapeHeightIn: 24,
    sculptedTypes: featuredFacetValues ? "Pleated" : "Relief",
    year: 2020,
  };
}

export async function mockCultivarMatches(page: Page) {
  await page.route("**/api/v1/cultivars/match", async (route) => {
    const request = route.request().postDataJSON() as MatchRequest;
    const results = request.names.map((name) => {
      if (name.toLowerCase().includes("mystery")) {
        return {
          candidates: [candidate("Mystery Daylily", 82)],
          exactMatch: null,
          inputName: name,
          normalizedInput: normalizeName(name),
        };
      }
      if (name.toLowerCase().includes("alternate")) {
        return {
          candidates: [
            candidate("Alternate Bloom", 88),
            candidate("Alternate Star", 76),
            candidate("Alternate Glow", 64),
            candidate("Alternate Dream", 52),
            candidate("Alternate Sky", 40),
          ],
          exactMatch: null,
          inputName: name,
          normalizedInput: normalizeName(name),
        };
      }
      if (name.toLowerCase().includes("vanguard")) {
        return {
          candidates: [
            candidate("Vanguard", 82),
            candidate("Van Wade", 50),
            candidate("Vanguard Star", 45),
            candidate("Vanguard Glow", 40),
            candidate("Vanguard Dream", 35),
          ],
          exactMatch: null,
          inputName: name,
          normalizedInput: normalizeName(name),
        };
      }

      const exact = candidate(name, 100);
      return {
        candidates: [exact],
        exactMatch: exact,
        inputName: name,
        normalizedInput: normalizeName(name),
      };
    });

    await route.fulfill({
      body: JSON.stringify({ results }),
      contentType: "application/json",
      status: 200,
    });
  });
}
