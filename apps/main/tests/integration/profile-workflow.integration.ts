import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";
import { DashboardProfile } from "../e2e/pages/dashboard-profile";
import { ImageManager } from "../e2e/pages/image-manager";
import { expect, test as base } from "./fixtures";
import { APP_CONFIG } from "../../src/config/constants";
import SuperJSON from "superjson";
import { jsonlStreamProducer } from "@trpc/server/unstable-core-do-not-import";

const test = base.extend<{ profileDiagnostics: void }>({
  profileDiagnostics: [
    async ({ page }, use, testInfo) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: Array<{ path: string; error: string | undefined }> =
        [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning")
          consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) =>
        failedRequests.push({
          path: new URL(request.url()).pathname,
          error: request.failure()?.errorText,
        }),
      );
      await use();
      const root = process.env.PROFILE_EVIDENCE_DIR;
      if (root) {
        await mkdir(root, { recursive: true });
        await writeFile(
          path.join(
            root,
            `${testInfo.title.replaceAll(/[^a-zA-Z0-9]+/g, "-")}-diagnostics.json`,
          ),
          JSON.stringify(
            {
              browser: await page.context().browser()?.version(),
              pageErrors,
              consoleErrors,
              failedRequests,
            },
            null,
            2,
          ),
        );
      }
      expect(pageErrors, "uncaught Profile browser errors").toEqual([]);
    },
    { auto: true },
  ],
});

const profileRecord = () =>
  db.userProfile.findUniqueOrThrow({ where: { id: "integration-profile" } });

const db = new PrismaClient({
  adapter: new PrismaLibSql(
    { url: process.env.DATABASE_URL! },
    { timestampFormat: "unixepoch-ms" },
  ),
});
const content = JSON.stringify({
  blocks: [
    {
      id: "intro",
      type: "header",
      data: { text: "Visit our garden", level: 2 },
    },
    {
      id: "details",
      type: "paragraph",
      data: { text: "A disposable garden for Profile checks." },
    },
  ],
});

test.beforeEach(async () => {
  await db.keyValue.update({
    where: { key: "stripe:customer:cus_integration_seller" },
    data: {
      value: JSON.stringify({
        status: "active",
        subscriptionId: "sub_integration_seller",
        priceId: "price_integration",
        cancelAtPeriodEnd: false,
      }),
    },
  });
  await db.userProfile.update({
    where: { id: "integration-profile" },
    data: {
      title: "Reference Garden",
      slug: "integration-seller",
      description: "Daylilies grown with care.",
      location: "Denver, Colorado",
      content,
    },
  });
  await db.image.deleteMany({
    where: { userProfileId: "integration-profile" },
  });
  await db.image.createMany({
    data: [1, 2, 3].map((order) => ({
      id: `profile-image-${order}`,
      userProfileId: "integration-profile",
      order,
      url: `/assets/bouquet.png?profile=${order}`,
    })),
  });
});
test.afterAll(async () => db.$disconnect());

async function capture(page: Page, name: string) {
  const root = process.env.PROFILE_EVIDENCE_DIR;
  if (!root) return;
  await mkdir(root, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) {
      if (image.complete && image.naturalWidth) await image.decode();
    }
  });
  if (name.endsWith("save-error"))
    await expect(
      page.getByText("Failed to save changes", { exact: true }),
    ).toBeHidden({ timeout: 10_000 });
  await page.screenshot({
    path: path.join(root, `${name}.png`),
    fullPage: true,
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden; }",
  });
}

test("Profile retains drafts across refresh and fast failed navigation", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const profile = new DashboardProfile(page);
  await page.goto("/dashboard/profile");
  await profile.isReady();
  await db.userProfile.update({
    where: { id: "integration-profile" },
    data: {
      title: "Refreshed Garden",
      content: JSON.stringify({
        blocks: [
          {
            id: "fresh",
            type: "paragraph",
            data: { text: "Refreshed content" },
          },
        ],
      }),
    },
  });
  await page.getByRole("button", { name: "Refresh dashboard data" }).click();
  await expect(profile.gardenNameInput).toHaveValue("Refreshed Garden");
  await expect(profile.contentEditor).toContainText("Refreshed content");
  await expect(profile.saveChangesButton).toBeDisabled();

  await profile.gardenNameInput.fill("Retained draft");
  const paragraph = profile.contentEditor
    .locator('.ce-paragraph[contenteditable="true"]')
    .first();
  await paragraph.fill("Typed before refresh");
  await db.userProfile.update({
    where: { id: "integration-profile" },
    data: { title: "External title", content },
  });
  await page.getByRole("button", { name: "Refresh dashboard data" }).click();
  await expect(
    page.getByText("Dashboard refreshed", { exact: true }).last(),
  ).toBeVisible();
  await expect(profile.gardenNameInput).toHaveValue("Retained draft");
  await expect(paragraph).toHaveText("Typed before refresh");
  await capture(page, "desktop-retained-draft");

  await page.route(
    "**/api/trpc/dashboardDb.userProfile.updateContent?*",
    (route) => route.abort("failed"),
  );
  await paragraph.fill("Fast navigation content");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/dashboard/profile");
  await expect(
    page.getByText("Error saving changes. Please fix errors and try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(paragraph).toHaveText("Fast navigation content");
  await expect(profile.gardenNameInput).toHaveValue("Retained draft");
  await page.unroute("**/api/trpc/dashboardDb.userProfile.updateContent?*");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/dashboard/profile");
  await expect(paragraph).toHaveText("Fast navigation content");
  expect((await profileRecord()).title).toBe("External title");
  expect((await profileRecord()).content).toBe(content);
  await page
    .getByRole("button", {
      name: "Discard this draft and load the latest story",
    })
    .click();
  await page
    .getByRole("button", {
      name: "Discard unsaved profile fields and load the latest profile",
    })
    .click();
  await expect(profile.gardenNameInput).toHaveValue("External title");
  await profile.gardenNameInput.fill("Retained draft");
  await paragraph.fill("Fast navigation content");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/integration-seller");
  await expect(
    page.getByText("Fast navigation content", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/profile");
  await expect(profile.gardenNameInput).toHaveValue("Retained draft");
  await expect(profile.saveChangesButton).toBeDisabled();

  await profile.slugInput.click();
  await page.getByRole("button", { name: "Unlock URL editing" }).click();
  await profile.slugInput.fill("bad");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/dashboard/profile");
  await expect(profile.slugInput).toBeFocused();
  await expect(
    page.getByText("URL must be at least 5 characters"),
  ).toBeVisible();
  await profile.slugInput.fill("integration-seller");
  await profile.locationInput.fill("Parent retry draft");
  await page.route("**/api/trpc/dashboardDb.userProfile.update?*", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/dashboard/profile");
  await expect(profile.locationInput).toHaveValue("Parent retry draft");
  await expect(profile.saveChangesButton).toBeEnabled();
  await page.unroute("**/api/trpc/dashboardDb.userProfile.update?*");
  await profile.saveChangesButton.click();
  await expect(profile.saveChangesButton).toBeDisabled();
  await page.reload();
  await expect(profile.locationInput).toHaveValue("Parent retry draft");

  let releaseParent!: () => void;
  const parentResponse = new Promise<void>((resolve) => {
    releaseParent = resolve;
  });
  let parentWritten!: () => void;
  const parentWrite = new Promise<void>((resolve) => {
    parentWritten = resolve;
  });
  await page.route(
    "**/api/trpc/dashboardDb.userProfile.update?*",
    async (route) => {
      const response = await route.fetch();
      parentWritten();
      await parentResponse;
      await route.fulfill({ response });
    },
  );
  await profile.locationInput.fill("Held parent response");
  await profile.saveChangesButton.click();
  await parentWrite;
  const liveParagraph = profile.contentEditor
    .locator('.ce-paragraph[contenteditable="true"]')
    .first();
  await liveParagraph.fill("New content during parent save");
  const contentConflict = page.waitForResponse((response) =>
    response.url().includes("dashboardDb.userProfile.updateContent"),
  );
  await page.getByRole("heading", { name: "Profile", exact: true }).click();
  await contentConflict;
  await expect(
    page
      .getByText(
        "Profile changed. Read it again before replacing its content.",
        { exact: true },
      )
      .last(),
  ).toBeVisible();
  await expect(liveParagraph).toHaveText("New content during parent save");
  expect((await profileRecord()).content).not.toContain(
    "New content during parent save",
  );
  releaseParent();
  await expect(profile.saveChangesButton).toBeEnabled();
  await expect(liveParagraph).toHaveText("New content during parent save");
  await page.unroute("**/api/trpc/dashboardDb.userProfile.update?*");
  await profile.saveChangesButton.click();
  await expect(profile.saveChangesButton).toBeDisabled();
  await page.reload();
  await expect(profile.contentEditor).toContainText(
    "New content during parent save",
  );
  await expect(profile.locationInput).toHaveValue("Held parent response");
});

test("Profile URL checks ignore late results and preserve eligibility", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const profile = new DashboardProfile(page);
  await page.goto("/dashboard/profile");
  await profile.isReady();
  await profile.slugInput.focus();
  const warning = page.getByRole("alertdialog", {
    name: "Before You Edit Your URL",
  });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Cancel" }).click();
  await expect(profile.slugInput).toBeFocused();
  await expect(warning).toBeHidden();
  await profile.gardenNameInput.focus();
  await profile.slugInput.focus();
  await warning.getByRole("button", { name: "Unlock URL editing" }).click();
  await expect(profile.slugInput).toBeFocused();

  let releaseLate!: () => void;
  const late = new Promise<void>((resolve) => {
    releaseLate = resolve;
  });
  let lateStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    lateStarted = resolve;
  });
  await page.route(
    "**/api/trpc/dashboardDb.userProfile.checkSlug?*",
    async (route) => {
      if (
        decodeURIComponent(route.request().url()).includes('"slug":"dashboard"')
      ) {
        lateStarted();
        await late;
      }
      await route.continue();
    },
  );
  await profile.slugInput.fill("dashboard");
  await started;
  await expect(
    page.getByRole("status", { name: "Checking profile URL" }),
  ).toBeVisible();
  await capture(page, "desktop-url-checking");
  const availableResponse = page.waitForResponse((response) =>
    decodeURIComponent(response.url()).includes('"slug":"available-garden"'),
  );
  await profile.slugInput.fill("available-garden");
  await availableResponse;
  const lateResponse = page.waitForResponse((response) =>
    decodeURIComponent(response.url()).includes('"slug":"dashboard"'),
  );
  releaseLate();
  await lateResponse;
  await expect(
    page.getByText("This URL is already taken. Please choose another one."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Checking profile URL" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/available-garden");
  await page.goto("/dashboard/profile");
  await expect(profile.saveChangesButton).toBeDisabled();
  await page.reload();
  await expect(profile.slugInput).toHaveValue("available-garden");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(page).toHaveURL("/available-garden");
  await expect(
    page.getByText("Reference Garden", { exact: true }).first(),
  ).toBeVisible();

  await db.keyValue.update({
    where: { key: "stripe:customer:cus_integration_seller" },
    data: { value: JSON.stringify({ status: "canceled" }) },
  });
  await page.evaluate(() => localStorage.clear());
  await page.goto("/dashboard/profile");
  await expect(profile.slugInput).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Upgrade to Pro to customize your profile URL",
    }),
  ).toBeVisible();
  await capture(page, "desktop-non-pro");
  await page.route("**/api/trpc/stripe.generateCheckout?*", (route) =>
    route.abort("failed"),
  );
  await page
    .getByRole("button", {
      name: "Upgrade to Pro to customize your profile URL",
    })
    .click();
  await expect(
    page.getByText("Checkout did not open. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL("/dashboard/profile");
  expect((await profileRecord()).slug).toBe("available-garden");
});

test("Profile loading, empty images, crop recovery and image limits", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 402, height: 874 });
  await db.image.deleteMany({
    where: { userProfileId: "integration-profile" },
  });
  await db.userProfile.update({
    where: { id: "integration-profile" },
    data: { content: null },
  });
  let releaseLoad!: () => void;
  const load = new Promise<void>((resolve) => {
    releaseLoad = resolve;
  });
  let rejectLoad = true;
  await page.route("**/api/trpc/*userProfile.get*", async (route) => {
    await load;
    if (!rejectLoad) {
      await route.continue();
      return;
    }
    // Reject only Profile. Other calls in the same streamed batch still use the server.
    const response = await route.fetch({
      headers: { ...route.request().headers(), "trpc-accept": "" },
    });
    const results: Array<{
      result?: { data: ReturnType<typeof SuperJSON.serialize> };
      error?: ReturnType<typeof SuperJSON.serialize>;
    }> = await response.json();
    const calls = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!
      .split(",");
    const stream = jsonlStreamProducer({
      maxDepth: Infinity,
      serialize: SuperJSON.serialize,
      data: results.map((result, index) =>
        Promise.resolve(
          calls[index] === "dashboardDb.userProfile.get"
            ? {
                error: {
                  message: "Profile read rejected for integration test.",
                  code: -32603,
                  data: {
                    code: "INTERNAL_SERVER_ERROR",
                    httpStatus: 500,
                    path: calls[index],
                  },
                },
              }
            : result.result
              ? {
                  result: Promise.resolve({
                    data: Promise.resolve(
                      SuperJSON.deserialize(result.result.data),
                    ),
                  }),
                }
              : { error: SuperJSON.deserialize(result.error!) },
        ),
      ),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: await new Response(stream).text(),
    });
  });
  await page.goto("/dashboard/profile");
  await expect(
    page.getByText("Fetching your catalog...", { exact: true }),
  ).toBeVisible();
  await capture(page, "mobile-loading");
  releaseLoad();
  await expect(
    page.getByText("Profile could not load", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await capture(page, "mobile-load-error");
  rejectLoad = false;
  await page.unroute("**/api/trpc/*userProfile.get*");
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(
    page.getByText("Profile could not load", { exact: true }),
  ).toBeHidden();
  const profile = new DashboardProfile(page);
  await profile.isReady();
  await expect(
    page.getByText("No profile images", { exact: true }),
  ).toBeVisible();
  await expect(profile.saveChangesButton).toBeDisabled();
  await capture(page, "mobile-empty");
  await page
    .locator("#image-upload-input")
    .setInputFiles(path.resolve("public/assets/bouquet.png"));
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await capture(page, "mobile-crop");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("img", { name: "Crop preview" })).toHaveCount(0);
  await expect(profile.saveChangesButton).toBeDisabled();
  await page
    .locator("#image-upload-input")
    .setInputFiles(path.resolve("public/assets/bouquet.png"));
  await page.route("**/api/trpc/dashboardDb.image.getPresignedUrl?*", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    page.getByText("Failed to get upload URL", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Crop preview" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeEnabled();
  await capture(page, "mobile-upload-error");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await db.image.count({ where: { userProfileId: "integration-profile" } }),
  ).toBe(0);
  await db.image.createMany({
    data: Array.from(
      { length: APP_CONFIG.UPLOAD.MAX_IMAGES_PER_PROFILE },
      (_, index) => index + 1,
    ).map((order) => ({
      id: `profile-limit-${order}`,
      userProfileId: "integration-profile",
      order,
      url: `/assets/bouquet.png?limit=${order}`,
    })),
  });
  await page.getByRole("button", { name: "Refresh dashboard data" }).click();
  await expect(page.getByTestId("image-item")).toHaveCount(
    APP_CONFIG.UPLOAD.MAX_IMAGES_PER_PROFILE,
  );
  await expect(page.locator("#image-upload-input")).toHaveCount(0);
  await capture(page, "mobile-image-limit");
});

test("Profile content types keep edits, order and removal after a parent commit", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await db.userProfile.update({
    where: { id: "integration-profile" },
    data: {
      content: JSON.stringify({
        blocks: [
          {
            id: "heading",
            type: "header",
            data: { text: "Garden sections", level: 2 },
          },
          {
            id: "list",
            type: "list",
            data: {
              style: "unordered",
              meta: {},
              items: [{ content: "Red daylilies", meta: {}, items: [] }],
            },
          },
          {
            id: "table",
            type: "table",
            data: {
              withHeadings: true,
              content: [
                ["Cultivar", "Bloom"],
                ["Garden Rose", "Midseason"],
              ],
            },
          },
          {
            id: "remove",
            type: "paragraph",
            data: { text: "Remove this section" },
          },
        ],
      }),
    },
  });
  const profile = new DashboardProfile(page);
  await page.goto("/dashboard/profile");
  await profile.isReady();
  await expect(page.locator(".tc-cell")).toHaveCount(4);
  await page
    .locator('.ce-header[contenteditable="true"]')
    .fill("Updated sections");
  await page.locator(".cdx-list__item-content").first().fill("Gold daylilies");
  await page.locator(".tc-cell").nth(3).fill("Late season");
  await page.locator(".ce-header").click();
  await page.locator(".ce-toolbar__settings-btn").click();
  await page.locator('[data-item-name="move-down"]').click();
  await expect(
    profile.contentEditor.locator(".ce-block").first(),
  ).toContainText("Gold daylilies");
  await page
    .locator(".ce-paragraph")
    .filter({ hasText: "Remove this section" })
    .click();
  await page.locator(".ce-toolbar__settings-btn").click();
  await page.locator('[data-item-name="delete"]').click();
  await page.locator('[data-item-name="delete"]').click();
  await expect(profile.contentEditor).not.toContainText("Remove this section");
  await capture(page, "desktop-content-types");
  await profile.saveChangesButton.click();
  await expect(profile.saveChangesButton).toBeDisabled();
  await page.reload();
  await expect(
    profile.contentEditor.locator(".ce-block").first(),
  ).toContainText("Gold daylilies");
  await expect(page.locator(".ce-header")).toHaveText("Updated sections");
  await expect(page.locator(".tc-cell").nth(3)).toHaveText("Late season");
  await expect(profile.contentEditor).not.toContainText("Remove this section");
  await page.getByRole("link", { name: "View Public Profile" }).click();
  await expect(
    page.getByText("Updated sections", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Gold daylilies", { exact: true })).toBeVisible();
  await expect(page.getByText("Late season", { exact: true })).toBeVisible();
});

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 768 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`Profile fields, content, media and parent commits on ${device}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const profile = new DashboardProfile(page);
    const images = new ImageManager(page);
    const saved = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Changes saved" })
      .first();
    await page.goto("/dashboard/profile");
    await profile.isReady();
    await expect(profile.saveChangesButton).toBeDisabled();
    await expect(images.imageItems()).toHaveCount(3);
    await expect(page.locator(".ce-header")).toHaveText("Visit our garden");
    await capture(page, `${device}-populated`);

    await profile.slugInput.click();
    const warning = page.getByRole("alertdialog", {
      name: "Before You Edit Your URL",
    });
    await expect(warning).toBeVisible();
    await capture(page, `${device}-url-warning`);
    await warning.getByRole("button", { name: "Cancel" }).click();
    await expect(profile.slugInput).toHaveAttribute("readonly", "");
    await profile.slugInput.click();
    await warning.getByRole("button", { name: "Unlock URL editing" }).click();
    await expect(profile.slugInput).toBeFocused();
    await profile.slugInput.fill("bad");
    await profile.slugInput.blur();
    await expect(
      page.getByText("URL must be at least 5 characters"),
    ).toBeVisible();
    await capture(page, `${device}-url-invalid`);
    await profile.slugInput.fill("integration-seller");
    await profile.gardenNameInput.fill(`Reference Garden ${device}`);
    await profile.descriptionInput.fill("Saved garden description.");
    await profile.locationInput.fill("Colorado");
    await page.route("**/api/trpc/dashboardDb.userProfile.update?*", (route) =>
      route.abort("failed"),
    );
    await profile.saveChangesButton.click();
    await expect(
      page.getByText("Failed to save changes", { exact: true }),
    ).toBeVisible();
    await expect(profile.gardenNameInput).toHaveValue(
      `Reference Garden ${device}`,
    );
    await expect(profile.saveChangesButton).toBeEnabled();
    await capture(page, `${device}-save-error`);
    await page.unroute("**/api/trpc/dashboardDb.userProfile.update?*");
    await profile.saveChangesButton.click();
    await expect(saved).toBeVisible();
    await expect(profile.saveChangesButton).toBeDisabled();
    await page.reload();
    await expect(profile.gardenNameInput).toHaveValue(
      `Reference Garden ${device}`,
    );
    await expect(profile.descriptionInput).toHaveValue(
      "Saved garden description.",
    );
    await expect(profile.locationInput).toHaveValue("Colorado");

    await images.openImagePreviewById("profile-image-1");
    await expect(
      page.getByRole("img", { name: "Gallery image" }),
    ).toBeVisible();
    await capture(page, `${device}-image-preview`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("img", { name: "Gallery image" })).toHaveCount(
      0,
    );
    await images.imageItemById("profile-image-1").scrollIntoViewIfNeeded();
    for (const id of ["profile-image-1", "profile-image-2"]) {
      await expect
        .poll(async () => {
          const box = await images.imageItemById(id).boundingBox();
          return Boolean(
            box && box.y >= 0 && box.y + box.height <= viewport.height,
          );
        })
        .toBe(true);
    }
    await images.imageDragHandleById("profile-image-1").focus();
    await expect(images.imageDragHandleById("profile-image-1")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(images.imageDragHandleById("profile-image-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "was moved over droppable area profile-image-1" }),
    ).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "was moved over droppable area profile-image-2" }),
    ).toBeVisible();
    await page.keyboard.press("Space");
    await expect
      .poll(() => images.imageOrderIds())
      .toEqual(["profile-image-2", "profile-image-1", "profile-image-3"]);
    await expect(profile.saveChangesButton).toBeEnabled();
    await profile.saveChangesButton.click();
    await expect(profile.saveChangesButton).toBeDisabled();
    await page.reload();
    await expect
      .poll(() => images.imageOrderIds())
      .toEqual(["profile-image-2", "profile-image-1", "profile-image-3"]);
    await images.imageDeleteButtonById("profile-image-3").click();
    await images.confirmImageDelete();
    await expect(images.imageItems()).toHaveCount(2);
    await expect(profile.saveChangesButton).toBeEnabled();
    await profile.saveChangesButton.click();
    await expect(profile.saveChangesButton).toBeDisabled();
    await profile.fillContent(`Saved content ${device}`);
    await expect(profile.saveChangesButton).toBeEnabled();
    await profile.gardenNameInput.click();
    await expect
      .poll(
        async () =>
          (
            await db.userProfile.findUniqueOrThrow({
              where: { id: "integration-profile" },
            })
          ).content,
      )
      .toContain(`Saved content ${device}`);
    await expect(profile.saveChangesButton).toBeEnabled();
    await profile.saveChangesButton.click();
    await expect(profile.saveChangesButton).toBeDisabled();
    await page.reload();
    await expect(profile.contentEditor).toContainText(
      `Saved content ${device}`,
    );
    await expect(images.imageItems()).toHaveCount(2);

    await profile.locationInput.fill(`Navigation ${device}`);
    await page.getByRole("link", { name: "View Public Profile" }).click();
    await expect(page).toHaveURL("/integration-seller");
    await expect(
      page.getByText(`Navigation ${device}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`Saved content ${device}`, { exact: true }),
    ).toBeVisible();
    await capture(page, `${device}-public`);
    await page.goto("/dashboard/profile");
    await expect(profile.locationInput).toHaveValue(`Navigation ${device}`);
    await expect(profile.saveChangesButton).toBeDisabled();
  });
}
