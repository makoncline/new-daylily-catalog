import { expect, test } from "@playwright/test";

const transparentPixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.route("https://images.daylilycatalog.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: transparentPixel,
    });
  });
});

test("a buyer can search, view a listing, and send a cart inquiry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Hydration failed")
    ) {
      hydrationErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    if (error.message.includes("Hydration failed")) {
      hydrationErrors.push(error.message);
    }
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Rolling Oaks Daylilies" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "From the garden" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Double and white daylily specialists and an AHS Display Garden.",
    ),
  ).toBeVisible();
  await expect(page.getByAltText(/garden view/)).toHaveCount(3);
  const heroImage = page.getByAltText("Rolling Oaks Daylilies garden view 1");
  const secondGardenImage = page.getByAltText(
    "Rolling Oaks Daylilies garden view 2",
  );
  await expect(heroImage).toHaveAttribute("sizes", /646px/);
  await expect(secondGardenImage).toHaveAttribute("sizes", /600px/);
  const heroMetrics = await heroImage.evaluate((image: HTMLImageElement) => ({
    currentSrc: image.currentSrc,
    renderedWidth: image.getBoundingClientRect().width,
  }));
  const optimizedHeroWidth = Number(
    new URL(heroMetrics.currentSrc).searchParams.get("w"),
  );
  expect(optimizedHeroWidth).toBeGreaterThanOrEqual(heroMetrics.renderedWidth);
  expect(optimizedHeroWidth).toBeLessThanOrEqual(
    heroMetrics.renderedWidth * 1.5,
  );

  await page.goto("/catalogs");
  await expect(
    page.getByRole("link", { name: "Display Garden", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse Display Garden catalog" }),
  ).toBeVisible();
  await expect(page.locator('a:has(img[alt=""])')).toHaveCount(0);
  await page.goto("/catalog/search");

  await page.getByLabel("Name").fill("Boundary Twenty");
  await expect(page).toHaveURL(/name=Boundary\+Twenty/);
  await expect(
    page.getByRole("link", { name: "Boundary Twenty", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Alpine Glow", exact: true }),
  ).toHaveCount(0);
  const listingCardImage = page.getByAltText("Boundary Twenty daylily").first();
  await expect(listingCardImage).toHaveAttribute("src", /display-800\.webp$/);

  await page
    .getByRole("link", { name: "Boundary Twenty", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/boundary-twenty$/);
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(structuredData.join("\n")).not.toContain("InStock");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByText("Boundary Twenty was added to your cart."),
  ).toBeVisible();
  await page.goto("/cart");

  await expect(
    page.getByText("$20.00", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("$15.00", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator('img[src*="-thumb-200.webp"]')).toBeVisible();
  await expect
    .poll(() => requestedUrls.some((url) => url.endsWith("-display-800.webp")))
    .toBe(true);
  await expect
    .poll(() => requestedUrls.some((url) => url.endsWith("-thumb-200.webp")))
    .toBe(true);
  await expect
    .poll(() => requestedUrls.some((url) => url.endsWith("-blur-20.webp")))
    .toBe(true);
  expect(
    requestedUrls.filter(
      (url) =>
        url.includes("/_next/image?") &&
        decodeURIComponent(url).includes("images.daylilycatalog.com"),
    ),
  ).toEqual([]);
  await page.getByLabel("Name").fill("Fixture Buyer");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByRole("button", { name: "Send availability request" }).click();
  await expect(page).toHaveURL(/\/thanks\?from=cart$/);
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test("public lists stay isolated and rebloom is independent", async ({
  page,
}) => {
  await page.goto("/catalog/display-garden");
  await expect(
    page.getByRole("heading", { level: 1, name: "Display Garden" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Boundary Fifty", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quiet Snow", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Boundary Twenty", exact: true }),
  ).toHaveCount(0);

  await page.goto("/catalog/search?rebloom=true");
  await expect(
    page.getByRole("link", { name: "Quiet Snow", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Summer Ember", exact: true }),
  ).toHaveCount(0);
});

test("an expired cart inquiry keeps the cart and succeeds after a fresh wait", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/forms", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        headers: { "cache-control": "no-store" },
        body: JSON.stringify({
          code: "form_expired",
          error: "This form expired. Review it and send it again.",
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/boundary-twenty");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByLabel("Name").fill("Fixture Buyer");
  await page.getByLabel("Email").fill("buyer@example.com");
  const submit = page.getByRole("button", {
    name: "Send availability request",
  });

  await submit.click();
  await expect(
    page.getByText(
      "This form expired. Review it, wait a moment, and send it again.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Boundary Twenty", exact: true }),
  ).toBeVisible();

  await page.waitForTimeout(800);
  await submit.click();
  await expect(page).toHaveURL(/\/thanks\?from=cart$/);
  expect(attempts).toBe(2);
});

test("catalog filters are collapsible and labelled on small screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog/search");

  await expect(page.getByLabel("Name")).not.toBeVisible();
  await page.getByRole("button", { name: "Show filters" }).click();

  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hide filters" }),
  ).toHaveAttribute("aria-expanded", "true");
  const rebloom = page.getByRole("checkbox", { name: "Rebloomers only" });
  await expect(rebloom).toHaveAttribute("id", "filter-rebloom");
  await rebloom.click();
  await expect(page).toHaveURL(/rebloom=true/);
});

test("cart removal is immediate on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/boundary-twenty");
  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    )
    .toBe("auto");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/boundary-fifty");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");

  await expect(
    page.getByRole("status", { name: "Cart summary" }),
  ).toContainText("2 plants in cart");

  await page
    .getByRole("button", { name: "Remove one Boundary Twenty" })
    .click();
  await expect(
    page.getByRole("link", { name: "Boundary Twenty", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove one Boundary Fifty" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Empty cart" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cart is empty" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cart is empty" }),
  ).toBeFocused();
});

test("a saved cart hydrates without an empty-cart announcement", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { __sawEmptyCart: false });
    const observer = new MutationObserver(() => {
      const text = document.body?.textContent ?? "";
      if (text.includes("Your cart is empty") || text.includes("Cart empty.")) {
        Object.assign(window, { __sawEmptyCart: true });
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.localStorage.setItem(
      "storefront:rolling-oaks:cart:v1",
      JSON.stringify({
        version: 1,
        lines: [
          {
            id: "listing-boundary-twenty",
            slug: "boundary-twenty",
            title: "Boundary Twenty",
            price: 20,
            imageUrl:
              "https://images.daylilycatalog.com/fixtures/daylily-2-thumb-200.webp",
            isForSale: true,
            quantity: 1,
          },
        ],
      }),
    );
  });

  await page.goto("/cart");
  await expect(
    page.getByRole("link", { name: "Boundary Twenty", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Cart summary" }),
  ).toContainText("1 plant in cart");
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __sawEmptyCart?: boolean }).__sawEmptyCart,
    ),
  ).toBe(false);
});

test("discovery routes exclude transactional pages and missing listings are real 404s", async ({
  page,
  request,
}) => {
  const publicDocument = await request.get(
    "/catalog/search?name=Boundary&page=1",
  );
  expect(publicDocument.headers()["cloudflare-cdn-cache-control"]).toBe(
    "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
  );
  expect(publicDocument.headers()["cache-tag"]).toBe(
    "daylily-storefront-public-html",
  );

  const skill = await request.get(
    "/.well-known/agent-skills/catalog-navigation/SKILL.md",
    { headers: { accept: "text/markdown" } },
  );
  expect(skill.status()).toBe(200);
  expect(skill.headers()["content-type"]).toContain("text/markdown");
  expect(skill.headers()["cloudflare-cdn-cache-control"]).toBe(
    "public, max-age=3600, stale-while-revalidate=86400",
  );

  const cart = await request.get("/cart");
  expect(cart.headers()["cloudflare-cdn-cache-control"]).toBeUndefined();

  const markdown = await request.get("/catalog/display-garden", {
    headers: { accept: "text/markdown" },
  });
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(markdown.headers()["cache-control"]).toBe("no-store");
  expect(markdown.headers().vary).toContain("Accept");
  expect(markdown.headers()["cloudflare-cdn-cache-control"]).toBeUndefined();
  await expect(markdown.text()).resolves.toContain("# Display Garden");

  const rsc = await request.get("/catalog/all?_rsc=browser-proof", {
    headers: { accept: "text/x-component", rsc: "1" },
  });
  expect(rsc.headers()["cloudflare-cdn-cache-control"]).toBe("no-store");
  expect(rsc.headers()["cache-tag"]).toBeUndefined();

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toBe("no-store");
  expect(health.headers()["cloudflare-cdn-cache-control"]).toBeUndefined();
  await expect(health.json()).resolves.toMatchObject({
    ok: true,
    degraded: false,
  });

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("/catalog/display-garden");
  expect(xml).toContain("/catalog/st.-james");
  expect(xml).toContain("/spring.2026");
  expect(xml).toContain("/summer-ember");
  expect(xml).toContain("/blog/dorothy-and-toto");
  expect(xml).not.toContain("/cart</loc>");
  expect(xml).not.toContain("/thanks</loc>");

  const dottedCatalogApi = await request.get("/api/catalog/st.-james");
  expect(dottedCatalogApi.status()).toBe(200);
  await expect(dottedCatalogApi.json()).resolves.toMatchObject({
    catalog: { slug: "st.-james" },
  });
  const dottedListingApi = await request.get("/api/listings/spring.2026");
  expect(dottedListingApi.status()).toBe(200);
  await expect(dottedListingApi.json()).resolves.toMatchObject({
    listing: { slug: "spring.2026" },
  });

  const dottedCatalogPage = await page.goto("/catalog/st.-james");
  expect(dottedCatalogPage?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/catalog\/st\.-james$/,
  );
  const dottedListingPage = await page.goto("/spring.2026");
  expect(dottedListingPage?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/spring\.2026$/,
  );

  const response = await page.goto("/this-listing-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
