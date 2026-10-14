import { createClient } from "@libsql/client";
import { expect, test } from "./fixtures";

test("seller safely retries after a database socket closes after commit", async ({
  page,
  request,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  const databaseUrl = process.env.DATABASE_URL!;
  const controlUrl = databaseUrl.replace("libsql:", "http:");
  const database = createClient({ url: databaseUrl });
  const title = "Socket Recovery Bloom";
  const savedRows = () =>
    database.execute({
      sql: "SELECT id FROM Listing WHERE userId = ? AND title = ?",
      args: ["integration-user", title],
    });

  try {
    await database.execute("UPDATE Listing SET cultivarReferenceId = NULL");
    await dashboardListings.goto();
    await dashboardListings.isReady();
    await dashboardListings.createListingButton.click();
    await createListingDialog.isReady();
    await createListingDialog.changeTitle(title);
    const armed = await request.post(
      new URL("/__drop-commit", controlUrl).href,
    );
    expect(armed.ok()).toBe(true);
    await createListingDialog.createListing();

    const error = page
      .locator('[data-sonner-toast][data-type="error"]')
      .first();
    await expect(error).toBeVisible();
    const errorText = await error.innerText();
    await expect(createListingDialog.titleInput).toHaveValue(title);
    await expect(createListingDialog.createButton).toBeEnabled();
    const fault = await request.get(new URL("/__fault-state", controlUrl).href);
    expect(await fault.json()).toEqual({ dropped: 1 });
    expect((await savedRows()).rows).toHaveLength(1);

    await createListingDialog.createListing();
    await editListingDialog.isReady();
    expect((await savedRows()).rows).toHaveLength(1);
    expect(errorText).toContain("Your input is kept. You can retry.");
    await page.goto(`/dashboard/listings?query=${encodeURIComponent(title)}`);
    await dashboardListings.isReady();
    await expect(dashboardListings.listingRow(title)).toHaveCount(1);
  } finally {
    database.close();
  }
});
