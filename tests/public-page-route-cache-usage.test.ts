// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readRouteFile(routePath: string) {
  return fs.readFileSync(path.join(process.cwd(), routePath), "utf8");
}

describe("public route cache helper usage", () => {
  it("uses shared helper in /catalogs page", () => {
    const file = readRouteFile("src/app/(public)/catalogs/page.tsx");

    expect(file).toContain("getCachedPublicProfiles");
    expect(file).not.toContain("unstable_cache(");
  });

  it("uses shared helper in /{slug} page", () => {
    const file = readRouteFile("src/app/(public)/[userSlugOrId]/page.tsx");

    expect(file).toContain("getCachedPublicProfilePageData");
    expect(file).not.toContain("unstable_cache(");
  });

  it("uses shared helper in /{slug}/page/[page] page", () => {
    const file = readRouteFile(
      "src/app/(public)/[userSlugOrId]/page/[page]/page.tsx",
    );

    expect(file).toContain("getCachedPublicProfilePageData");
    expect(file).not.toContain("unstable_cache(");
  });

  it("uses shared helpers in /{slug}/search page", () => {
    const file = readRouteFile("src/app/(public)/[userSlugOrId]/search/page.tsx");

    expect(file).toContain("getCachedPublicProfile");
    expect(file).toContain("getCachedInitialListings");
    expect(file).not.toContain("unstable_cache(");
  });

  it("uses shared helper in /cultivar/{slug} page", () => {
    const file = readRouteFile(
      "src/app/(public)/cultivar/[cultivarNormalizedName]/page.tsx",
    );

    expect(file).toContain("getCachedPublicCultivarPage");
    expect(file).not.toContain("unstable_cache(");
  });
});
