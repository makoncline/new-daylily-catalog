import { describe, expect, test } from "vitest";
import { selectAtlasStories } from "../scripts/agent-atlas-change-map.mjs";

describe("selectAtlasStories", () => {
  test("selects the narrowest useful stories for common product changes", () => {
    expect(
      selectAtlasStories([
        "apps/main/src/app/onboarding/anonymous-onboarding-steps.tsx",
      ]),
    ).toEqual(["onboarding"]);

    expect(
      selectAtlasStories([
        "apps/main/src/app/dashboard/listings/_components/listings-table.tsx",
      ]),
    ).toEqual(["dashboard-base", "dashboard-interactions"]);

    expect(
      selectAtlasStories([
        "apps/main/src/app/(public)/catalogs/page.tsx",
        "apps/main/src/app/dashboard/profile/page.tsx",
      ]),
    ).toEqual(["public", "dashboard-base"]);

    expect(
      selectAtlasStories(["apps/main/src/components/forms/listing-form.tsx"]),
    ).toEqual(["dashboard-base", "dashboard-interactions"]);
    expect(
      selectAtlasStories([
        "apps/main/src/components/public-catalog-search/public-catalog-search-table.tsx",
      ]),
    ).toEqual(["public", "dashboard-base", "dashboard-interactions"]);
    expect(
      selectAtlasStories(["apps/main/src/components/public-nav.tsx"]),
    ).toEqual(["public", "onboarding"]);
  });

  test("uses the full atlas for shared or unknown application changes", () => {
    expect(
      selectAtlasStories(["apps/main/src/components/ui/button.tsx"]),
    ).toEqual(["all"]);
    expect(selectAtlasStories(["apps/main/src/server/db.ts"])).toEqual(["all"]);
  });
});
