import { expect, test } from "@playwright/test";
import { prepareAtlasCapture } from "../atlas/atlas-capture-readiness";

test("prepares full-page and component images without changing capture position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  const requestedImages = new Set<string>();
  await page.route("https://atlas.test/**", async (route) => {
    requestedImages.add(route.request().url());
    await route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="gold"/></svg>`,
      contentType: "image/svg+xml",
    });
  });
  await page.setContent(`
    <style>
      body { margin: 0; }
      .spacer { height: 5000px; }
      img { display: block; width: 80px; height: 80px; }
    </style>
    <img src="https://atlas.test/first.svg" loading="lazy" alt="first">
    <div class="spacer"></div>
    <img src="https://atlas.test/second.svg" loading="lazy" alt="second">
    <div class="spacer"></div>
    <img src="https://atlas.test/third.svg" loading="lazy" alt="third">
  `);
  await page.evaluate(() => window.scrollTo(0, 300));

  await prepareAtlasCapture(page);

  expect(await page.evaluate(() => window.scrollY)).toBe(300);
  expect([...requestedImages].sort()).toEqual([
    "https://atlas.test/first.svg",
    "https://atlas.test/second.svg",
    "https://atlas.test/third.svg",
  ]);
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      ),
  ).toBe(true);

  requestedImages.clear();
  await page.setContent(`
    <style>.spacer { height: 5000px; }</style>
    <main data-capture>
      <img src="https://atlas.test/component-top.svg" loading="lazy" alt="component top">
      <div class="spacer"></div>
      <img src="https://atlas.test/component-bottom.svg" loading="lazy" alt="component bottom">
    </main>
    <div class="spacer"></div>
    <img src="https://atlas.test/background.svg" loading="lazy" alt="background">
  `);
  await prepareAtlasCapture(page, page.locator("[data-capture]"));

  expect([...requestedImages].sort()).toEqual([
    "https://atlas.test/component-bottom.svg",
    "https://atlas.test/component-top.svg",
  ]);
  expect(
    await page
      .locator('img[alt^="component"]')
      .evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete,
        ),
      ),
  ).toBe(true);
});
