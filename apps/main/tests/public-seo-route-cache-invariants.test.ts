// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const appDir = join(testDir, "..");

const publicSeoCdnCachedRouteFiles = [
  "src/app/(public)/page.tsx",
  "src/app/(public)/catalogs/page.tsx",
  "src/app/(public)/[userSlugOrId]/page.tsx",
  "src/app/(public)/[userSlugOrId]/page/[page]/page.tsx",
  "src/app/(public)/[userSlugOrId]/[listingSlugOrId]/page.tsx",
  "src/app/(public)/cultivar/[cultivarNormalizedName]/page.tsx",
] as const;

describe("public SEO CDN-cached route cache invariants", () => {
  it("keeps public SEO HTML routes dynamic and out of ISR", () => {
    for (const routeFile of publicSeoCdnCachedRouteFiles) {
      const source = readFileSync(join(appDir, routeFile), "utf8");

      expect(source, routeFile).toContain(
        'export const dynamic = "force-dynamic"',
      );
      expect(source, routeFile).not.toMatch(/export\s+const\s+revalidate\b/);
      expect(source, routeFile).not.toContain('"force-static"');
      expect(source, routeFile).not.toMatch(
        /export\s+const\s+dynamicParams\b/,
      );
    }
  });

  it("tracks origin render pressure for listing details", () => {
    const routeFile =
      "src/app/(public)/[userSlugOrId]/[listingSlugOrId]/page.tsx";
    const source = readFileSync(join(appDir, routeFile), "utf8");

    expect(source).toContain("trackPublicHtmlOriginRendered");
    expect(source).toContain('routeType: "listing_page"');
  });
});
