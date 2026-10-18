import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import { expect, test } from "./fixtures";

test("seller creates, edits, and reloads a listing through the app", async ({
  page,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  const editedTitle = "Integration Tracer Listing Edited";
  const description = "A hermetic listing saved through the real application.";
  const privateNote = "Integration-only private note";
  const listName = "Integration Favorites";
  const toast = (message: string) =>
    page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

  await dashboardListings.goto();
  await dashboardListings.isReady();

  await dashboardListings.createListingButton.click();
  await createListingDialog.isReady();
  await createListingDialog.searchAndSelectAhsListing(
    "Integration Bloom",
    "Integration Bloom",
  );
  await createListingDialog.changeTitle("Integration Tracer Listing");
  await createListingDialog.createListing();

  await expect(toast("Listing created")).toBeVisible();
  await editListingDialog.isReady();
  await editListingDialog.fillTitle(editedTitle);
  await editListingDialog.fillDescription(description);
  await editListingDialog.fillPrice(37);
  await editListingDialog.fillPrivateNote(privateNote);
  await editListingDialog.setStatusToHidden();
  await editListingDialog.openListsPicker();
  await editListingDialog.toggleListByName(listName);
  await editListingDialog.closeListsPicker();
  await editListingDialog.clickSaveChanges();
  await expect(toast("Changes saved")).toBeVisible();
  await expect(editListingDialog.dialog).toBeHidden();

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(editedTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.globalSearchInput).toHaveValue(editedTitle);
  await expect(dashboardListings.listingRow(editedTitle)).toBeVisible();

  await page
    .locator('[data-testid="listing-row-actions-trigger"]:visible')
    .first()
    .click();
  await page.locator('[data-testid="listing-row-action-edit"]:visible').click();
  await editListingDialog.isReady();
  await expect(editListingDialog.titleInput).toHaveValue(editedTitle);
  await expect(editListingDialog.descriptionInput).toHaveValue(description);
  await expect(editListingDialog.priceInput).toHaveValue("37");
  await expect(editListingDialog.privateNoteInput).toHaveValue(privateNote);
  await expect(editListingDialog.statusSelect).toContainText("Hidden");
  await expect(editListingDialog.listSelectButton).toContainText(
    "Integration Fa",
  );
});

test("seller cannot persist a listing without a name", async ({
  page,
  dashboardListings,
  editListingDialog,
}) => {
  const existingTitle = "Existing Bloom";

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(existingTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow(existingTitle)).toBeVisible();
  await page
    .locator('[data-testid="listing-row-actions-trigger"]:visible')
    .first()
    .click();
  await page.locator('[data-testid="listing-row-action-edit"]:visible').click();
  await editListingDialog.isReady();

  await editListingDialog.titleInput.fill("");
  await editListingDialog.titleInput.blur();
  await editListingDialog.clickSaveChanges();

  await expect(
    editListingDialog.dialog.getByText("Name is required"),
  ).toBeVisible();
  await expect(editListingDialog.dialog).toBeVisible();

  await page.goto(
    `/dashboard/listings?query=${encodeURIComponent(existingTitle)}`,
  );
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow(existingTitle)).toBeVisible();
});

test("listing deletion handoff requires approval and cancel keeps the listing", async ({
  page,
  dashboardListings,
}) => {
  await page.goto(
    "/dashboard/listings?editing=integration-existing-listing&intent=delete",
  );
  const review = page.getByRole("alertdialog", { name: "Delete Listing" });
  await expect(review).toBeVisible({ timeout: 15_000 });
  await expect(review).toContainText("Delete Existing Bloom?");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(review).toBeHidden();
  await page.goto("/dashboard/listings?query=Existing%20Bloom");
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
});

test("catalog keeps existing listings when an idle creation form is submitted", async ({
  page,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  await page.goto("/dashboard/listings?size=100");
  await dashboardListings.isReady();
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  const initialCount = Number(
    (await dashboardListings.filteredCount().innerText()).match(/\d+/)?.[0],
  );
  expect(initialCount).toBeGreaterThanOrEqual(2);

  // Playwright 1.55 gives idle callbacks no execution time. Keep native idle cleanup.
  const idleCallbacks = await page.evaluateHandle(() => ({
    requestIdleCallback: window.requestIdleCallback,
    cancelIdleCallback: window.cancelIdleCallback,
  }));
  await page.clock.install();
  await page.evaluate((native) => {
    window.requestIdleCallback = native.requestIdleCallback;
    window.cancelIdleCallback = native.cancelIdleCallback;
  }, idleCallbacks);

  await dashboardListings.createListingButton.click();
  await createListingDialog.isReady();
  await createListingDialog.changeTitle("Before idle bloom");
  await createListingDialog.createListing();
  await editListingDialog.isReady();
  await editListingDialog.close();
  await dashboardListings.createListingButton.click();
  await createListingDialog.isReady();
  await createListingDialog.changeTitle("Idle catalog bloom");
  await page.clock.runFor(2);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestIdleCallback(() => resolve())),
  );
  await page.clock.fastForward(106 * 60_000);
  await page.clock.runFor(2);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestIdleCallback(() => resolve())),
  );
  await createListingDialog.createListing();
  await editListingDialog.isReady();
  await editListingDialog.close();
  const persisted = await page.request.get(
    "/api/trpc/dashboardV2.bootstrap.catalog",
    { headers: { "x-dashboard-member-id": "integration-user" } },
  );
  expect(persisted.ok()).toBe(true);
  const snapshot = (await persisted.json()).result.data.json;
  expect(snapshot.listings).toHaveLength(initialCount + 2);
  expect(snapshot.listings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: "Existing Bloom" }),
      expect.objectContaining({ title: "Before idle bloom" }),
      expect.objectContaining({ title: "Idle catalog bloom" }),
    ]),
  );

  await expect(dashboardListings.globalSearchInput).toHaveValue("");
  await expect(dashboardListings.filteredCount()).toContainText(
    `${initialCount + 2} result`,
  );
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  await expect(dashboardListings.listingRow("Before idle bloom")).toBeVisible();
  await expect(
    dashboardListings.listingRow("Idle catalog bloom"),
  ).toBeVisible();

  await page.reload();
  await dashboardListings.isReady();
  await expect(dashboardListings.filteredCount()).toContainText(
    `${initialCount + 2} result`,
  );
  await expect(dashboardListings.listingRow("Existing Bloom")).toBeVisible();
  await expect(dashboardListings.listingRow("Before idle bloom")).toBeVisible();
  await expect(
    dashboardListings.listingRow("Idle catalog bloom"),
  ).toBeVisible();
});

test("seller safely retries after a committed create response is lost in the browser", async ({
  page,
  dashboardListings,
  createListingDialog,
  editListingDialog,
}) => {
  const clientErrors: Record<string, unknown>[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("{"))
      clientErrors.push(JSON.parse(message.text()));
  });
  let createRequestId: string | undefined;
  await withTempE2EDb(
    async (db) => {
      const title = "Lost Confirmation Bloom";
      const savedRows = () =>
        db.listing.findMany({
          where: { userId: "integration-user", title },
          select: { id: true },
        });
      expect(await savedRows()).toHaveLength(0);
      await dashboardListings.goto();
      await dashboardListings.isReady();
      await dashboardListings.createListingButton.click();
      await createListingDialog.isReady();
      await createListingDialog.searchAndSelectAhsListing(
        "Integration Bloom",
        "Integration Bloom",
      );
      await createListingDialog.changeTitle(title);

      await page.route(
        "**/api/trpc/dashboardV2.listing.create*",
        async (route) => {
          createRequestId = route.request().postDataJSON()[0].json.requestId;
          expect(createRequestId).toBeTruthy();
          const response = await route.fetch({
            headers: { ...route.request().headers(), "trpc-accept": "" },
          });
          expect(response.ok()).toBe(true);
          const results: Array<{
            result?: { data: { json: { id: string; title: string } } };
          }> = await response.json();
          expect(results[0]).not.toHaveProperty("error");
          const created = results[0]?.result?.data.json;
          expect(created).toMatchObject({ id: expect.any(String), title });
          expect(await savedRows()).toEqual([{ id: created?.id }]);
          await route.abort("connectionclosed");
        },
        { times: 1 },
      );

      await createListingDialog.createListing();
      await expect(
        page
          .locator("[data-sonner-toast]")
          .filter({ hasText: "Could not confirm listing creation" }),
      ).toContainText("Your input is kept. You can retry.");
      await expect
        .poll(() =>
          clientErrors.find(
            (record) =>
              record.event === "application_error" &&
              record.source === "CreateListingDialog",
          ),
        )
        .toMatchObject({ create_request_id: createRequestId });
      await expect(createListingDialog.titleInput).toHaveValue(title);
      await expect(
        createListingDialog.linkedListingHeading("Integration Bloom"),
      ).toBeVisible();
      await expect(createListingDialog.createButton).toBeEnabled();
      expect(await savedRows()).toHaveLength(1);

      await createListingDialog.createListing();
      await editListingDialog.isReady();
      expect(await savedRows()).toHaveLength(1);
      await page.goto(`/dashboard/listings?query=${encodeURIComponent(title)}`);
      await dashboardListings.isReady();
      await expect(dashboardListings.listingRow(title)).toHaveCount(1);
      expect(await savedRows()).toHaveLength(1);
    },
    { clearFirst: false },
  );
});
