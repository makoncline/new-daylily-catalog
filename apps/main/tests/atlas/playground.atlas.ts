import { captureAtlasState, expect, test } from "./atlas-test";

const linkedName = "A Little Bit Famous";
const unlinkedName = "Atlas Back Border Seedling";

test("Build and download a Playground catalog", async ({ page }) => {
  await page.goto("/playground");
  const input = page.getByRole("region", { name: "Add flowers", exact: true });
  for (const name of ["Single search", "Paste names", "Spreadsheet"]) {
    await expect(input.getByRole("tab", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Search cultivars")).toBeEnabled();
  await captureAtlasState(page, "playground-input");

  await input.getByRole("tab", { name: "Paste names", exact: true }).click();
  await input
    .getByLabel("Cultivar names")
    .fill(`${linkedName}\n${unlinkedName}`);
  await input.getByRole("button", { name: "Check names", exact: true }).click();
  const review = page.getByRole("region", { name: "Verify names" });
  const addReady = review.getByRole("button", {
    name: "Add ready",
    exact: true,
  });
  const keepUnlinked = review.getByRole("button", { name: "Keep unlinked" });
  await expect(review.getByRole("button", { name: "Ready (1)" })).toBeVisible();
  await expect(keepUnlinked).toBeEnabled();
  await captureAtlasState(page, "playground-review");

  await keepUnlinked.click();
  await addReady.click();
  await page.reload();
  const catalog = page.getByRole("region", {
    name: "Your catalog",
    exact: true,
  });
  await expect(
    catalog.getByRole("heading", { name: "Your catalog (2)" }),
  ).toBeVisible();
  await catalog.getByRole("tab", { name: "Cards", exact: true }).click();
  await expect(
    catalog.getByRole("button", { name: `Edit ${unlinkedName}` }),
  ).toBeEnabled();
  await captureAtlasState(page, "playground-catalog");

  await catalog.getByRole("tab", { name: "Spreadsheet", exact: true }).click();
  const download = page.waitForEvent("download");
  const downloadButton = catalog.getByRole("button", {
    name: "Download spreadsheet",
    exact: true,
  });
  await downloadButton.click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  await expect(downloadButton).toBeEnabled();
  await expect(
    catalog.getByRole("link", { name: "import it in your dashboard" }),
  ).toHaveAttribute("href", "/dashboard/imports");
  await captureAtlasState(page, "playground-download");
});
