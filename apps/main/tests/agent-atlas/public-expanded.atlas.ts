import { captureCheckpoint, expect, test } from "./atlas-test";

const hermetic = process.env.HERMETIC_MODE === "1";

const publicRoutes = [
  [
    "home-page",
    "/",
    "The daylily you want. From the grower who has it.",
    "Public home and catalog discovery entry point.",
  ],
  [
    "start-membership",
    "/start-membership",
    "Your whole daylily catalog. One link buyers can browse.",
    "Grower acquisition page with benefits, examples, pricing, and FAQ.",
  ],
  ["support-page", "/support", "Support", "Public help and contact surface."],
  ["privacy-page", "/privacy", "Privacy", "Public privacy information."],
  ["terms-page", "/terms", "Terms", "Public terms of service."],
  [
    "sign-in-page",
    "/sign-in",
    hermetic ? "Choose a local test persona" : "Sign in",
    hermetic
      ? "Offline persona entry state."
      : "Clerk-powered account entry state.",
  ],
] as const;

for (const [name, route, heading, description] of publicRoutes) {
  test(name, async ({ page }, testInfo) => {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: heading }).first(),
    ).toBeVisible();
    await captureCheckpoint(page, testInfo, name, description);
  });
}

test("catalog search results", async ({ page }, testInfo) => {
  await page.goto(
    hermetic
      ? "/hermetic-pro-garden/search?query=Daylily"
      : "/rollingoaksdaylilies/search?query=blue",
  );
  await expect(page.locator("main")).toContainText(
    hermetic ? /Daylily/i : /blue/i,
  );
  await captureCheckpoint(
    page,
    testInfo,
    "catalog-search-results",
    "Public catalog search with an active query and filtered listing results.",
  );
});
