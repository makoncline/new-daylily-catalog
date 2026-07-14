import { captureCheckpoint, expect, test } from "./atlas-test";

test.skip(
  process.env.HERMETIC_MODE === "1",
  "Canonical cultivar flows use the production-derived realistic snapshot.",
);

test("research a cultivar and compare real offers", async ({
  page,
}, testInfo) => {
  await page.goto("/cultivar/coffee-frenzy");
  await expect(
    page.getByRole("heading", { name: "Coffee Frenzy" }),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "cultivar-overview",
    "Cultivar research page with registry identity, imagery, and quick facts.",
  );

  await page.locator("#cultivar-metadata").scrollIntoViewIfNeeded();
  await captureCheckpoint(
    page,
    testInfo,
    "cultivar-facts",
    "Cultivar facts and source context lower on the research page.",
  );

  const offers = page.getByTestId("cultivar-offer-garden-card");
  await expect(offers).not.toHaveCount(0);
  await offers.first().scrollIntoViewIfNeeded();
  await captureCheckpoint(
    page,
    testInfo,
    "cultivar-grower-offers",
    "Real Coffee Frenzy offers grouped by grower for comparison.",
  );

  await offers
    .first()
    .getByRole("link", { name: "View Details" })
    .first()
    .click();
  await expect(page).toHaveURL(/\?viewing=/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "cultivar-selected-offer",
    "A selected cultivar offer opened in its grower's public catalog.",
  );
});

test("cultivar with no published offers", async ({ page }, testInfo) => {
  await page.goto("/cultivar/carolidoll");
  await expect(page.getByRole("heading", { name: "Carolidoll" })).toBeVisible();
  await expect(
    page.getByText("No offers match the selected filters."),
  ).toBeVisible();
  await captureCheckpoint(
    page,
    testInfo,
    "cultivar-no-offers",
    "Cultivar research remains useful when no member currently offers it.",
  );
});
