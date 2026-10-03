import fs from "node:fs/promises";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { expect, test } from "./fixtures";

async function expectFlat(page: Page, surfaces: Locator[]) {
  await expect(
    page.getByRole("main").locator('[data-slot="card"]'),
  ).toHaveCount(0);
  for (const surface of surfaces) {
    const chrome = await surface.evaluate((element) => {
      const style = getComputedStyle(element);
      return { border: style.borderTopWidth, shadow: style.boxShadow };
    });
    expect(chrome).toEqual({ border: "0px", shadow: "none" });
  }
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
}

async function capture(page: Page, name: string) {
  const directory = process.env.LAYOUT_EVIDENCE_DIR;
  if (!directory) return;
  await fs.mkdir(directory, { recursive: true });
  await page.mouse.move(10, 10);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    animations: "disabled",
    // Dialogs use viewport overlays. Full-page captures distort that geometry.
    fullPage: (await page.getByRole("dialog").count()) === 0,
  });
}

for (const [device, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`list and tag surfaces remain usable on ${device}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const lists = new DashboardLists(page);
    const manage = new ManageListPage(page);
    const title = `Flat layout ${device}`;

    await lists.goto();
    await lists.isReady();
    await lists.createListButton.click();
    const create = lists.createSurface();
    await expect(create).toBeVisible();
    await expectFlat(page, [create.locator("form")]);
    await capture(page, `${device}-create`);
    await create.getByLabel("Title").fill(title);
    // Submit by keyboard to retain the newer form behavior.
    await create.getByLabel("Title").press("Enter");
    await expect(lists.editDialog()).toBeVisible();
    const listId = new URL(page.url()).searchParams.get("editing");
    expect(listId).toBeTruthy();
    await expect(lists.editTitleInput()).toHaveValue(title);
    await expectFlat(page, [lists.editDialog().locator("form")]);
    await capture(page, `${device}-edit`);
    await lists.editDescriptionInput().fill("A collection for the garden.");
    await lists.surfaceSaveButton().click();
    await expect(lists.editDialog()).toBeHidden();
    await page.goto(`/dashboard/lists/${listId}`);
    await expect(manage.descriptionInput).toHaveValue(
      "A collection for the garden.",
    );
    await expectFlat(page, [
      page.getByRole("main").locator("form"),
      page.getByRole("region", { name: "Add Listings", exact: true }),
    ]);
    await capture(page, `${device}-manage`);
    await manage.openAddListingsDialog();
    await manage.searchAddListings("Existing Bloom");
    await capture(page, `${device}-add-listings`);
    await manage.selectListingToAdd("Existing Bloom");
    await expect(manage.listingRow("Existing Bloom")).toBeVisible();
    await manage.saveChanges();
    await expect(manage.saveChangesButton).toBeDisabled();
    await page.reload();
    await expect(manage.listingRow("Existing Bloom")).toBeVisible();

    await page.goto("/dashboard/tags");
    await expect(
      page.getByRole("group", { name: "Choose a template" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Make sheet" }),
    ).toBeDisabled();
    await page
      .getByPlaceholder("Filter listings to tag...")
      .fill("Existing Bloom");
    const row = page.getByRole("row", {
      name: "Select row Existing Bloom",
      exact: true,
    });
    await row.getByRole("checkbox", { name: "Select row" }).click();
    await expect(page.getByText("1 selected listing.")).toBeVisible();
    await page.getByRole("radio", { name: /Grower details/i }).click();
    const preview = page.getByRole("main").getByRole("article");
    await expect(preview).toContainText("Existing Bloom");
    await expectFlat(page, [
      page.getByRole("region", { name: "Tag designer", exact: true }),
      page.getByRole("region", { name: "Choose listings", exact: true }),
    ]);
    // The outline still shows the physical tag size. Mobile scrolls it locally.
    expect(
      await preview.evaluate(
        (element) => getComputedStyle(element).borderTopWidth,
      ),
    ).toBe("1px");
    await capture(page, `${device}-tags`);
    if (device === "mobile") {
      const previews = page.getByRole("region", {
        name: "Tag previews",
        exact: true,
      });
      await previews.focus();
      await previews.press("ArrowRight");
      await expect
        .poll(() => previews.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
    }
    await page.getByRole("button", { name: "Make sheet" }).click();
    const sheet = page.getByRole("dialog", { name: "Sheet Creator" });
    await expect(sheet).toContainText(
      "1 label selected, 1 copy of each, 1 total label.",
    );
    await expect(sheet.getByRole("article")).toContainText("Existing Bloom");
    await expect(sheet).toHaveCSS("opacity", "1");
    const sheetBounds = await sheet.boundingBox();
    expect(sheetBounds).not.toBeNull();
    expect(sheetBounds!.x).toBeGreaterThanOrEqual(0);
    expect(sheetBounds!.x + sheetBounds!.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(sheetBounds!.y).toBeGreaterThanOrEqual(0);
    expect(sheetBounds!.y + sheetBounds!.height).toBeLessThanOrEqual(
      viewport.height,
    );
    await capture(page, `${device}-sheet`);
    await sheet.getByRole("button", { name: "Download", exact: true }).click();
    const sheetDownload = page.waitForEvent("download");
    await page
      .getByRole("menuitem", { name: "HTML Sheets (.html)", exact: true })
      .click();
    const sheetFile = await sheetDownload;
    expect(await sheetFile.failure()).toBeNull();
    expect(await fs.readFile((await sheetFile.path())!, "utf8")).toContain(
      "Existing Bloom",
    );
    await sheet.getByRole("button", { name: "Close" }).click();

    for (const [name, extension] of [
      ["Pages (.html)", ".html"],
      ["PDF (.pdf)", ".pdf"],
      ["Images (.zip)", ".zip"],
      ["CSV", ".csv"],
    ] as const) {
      await page.getByRole("button", { name: "Output options" }).click();
      const download = page.waitForEvent("download");
      await page.getByRole("menuitem", { name, exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toContain(extension);
      expect(await file.failure()).toBeNull();
      const downloadedPath = await file.path();
      expect((await fs.stat(downloadedPath!)).size).toBeGreaterThan(0);
      const content = await fs.readFile(downloadedPath!);
      if (extension === ".html" || extension === ".csv") {
        expect(content.toString("utf8")).toContain("Existing Bloom");
      } else if (extension === ".pdf") {
        expect(content.subarray(0, 5).toString()).toBe("%PDF-");
      } else {
        expect(content.subarray(0, 2).toString()).toBe("PK");
      }
    }

    await page.getByRole("button", { name: "Customize this template" }).click();
    await page
      .getByRole("textbox", { name: "Custom template", exact: true })
      .fill("# {{title}}\n- {{unknownField}}");
    await expect(page.getByText(/not an available field/)).toBeVisible();
    await page
      .getByRole("textbox", { name: "Custom template", exact: true })
      .fill("# {{title}}\n- Garden collection");
    await expect(preview).toContainText("Garden collection");
    await page
      .getByRole("textbox", { name: "Template name" })
      .fill(`Garden ${device}`);
    await page
      .getByRole("button", { name: "Save as template", exact: true })
      .click();
    await expect(
      page.getByRole("radio", { name: new RegExp(`Garden ${device}`) }),
    ).toBeChecked();
    await page.reload();
    await expect(
      page.getByRole("radio", { name: new RegExp(`Garden ${device}`) }),
    ).toBeChecked();
    await page
      .getByPlaceholder("Filter listings to tag...")
      .fill("Existing Bloom");
    await row.getByRole("checkbox", { name: "Select row" }).click();
    await page
      .getByPlaceholder("Filter listings to tag...")
      .fill("no-matching-listing");
    await expect(
      page.getByText("No listings found", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Deselect Existing Bloom", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Make sheet" }),
    ).toBeDisabled();
  });
}
