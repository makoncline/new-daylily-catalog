import { readFileSync } from "node:fs";
import type { Response } from "@playwright/test";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { expect, test } from "./fixtures";

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 768 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`seller creates and manages a list on ${device}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const responses: Response[] = [];
    const clientLogs: Record<string, unknown>[] = [];
    page.on("response", (response) => {
      if (new URL(response.url()).pathname.startsWith("/api/trpc/")) {
        responses.push(response);
      }
    });
    page.on("console", (message) => {
      if (message.text().startsWith("{")) {
        clientLogs.push(JSON.parse(message.text()) as Record<string, unknown>);
      }
    });

    const createdTitle = `Integration Created List ${device}`;
    const editedTitle = `Integration Managed List ${device}`;
    const description = "A list saved through the real application.";
    const listingTitle = "Existing Bloom";
    const lists = new DashboardLists(page);
    const manageList = new ManageListPage(page);
    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    await lists.goto();
    await lists.isReady();

    await lists.createListButton.click();
    const createSurface = lists.createSurface();
    await expect(createSurface).toBeVisible();
    await createSurface.getByLabel("Title").fill(createdTitle);
    await createSurface
      .getByRole("button", { name: "Create List", exact: true })
      .click();
    await expect(toast("List created")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/lists\?editing=[^&]+$/);

    const editingId = new URL(page.url()).searchParams.get("editing");
    expect(editingId).toBeTruthy();

    await expect(lists.editDialog()).toBeVisible();
    await lists.editTitleInput().fill("");
    await lists.surfaceSaveButton().click();
    await expect(
      lists.editDialog().getByText("Title is required"),
    ).toBeVisible();
    await lists.editTitleInput().fill(editedTitle);
    await lists.editDescriptionInput().fill(description);
    await page.route("**/api/trpc/*dashboardDb.list.update*", (route) =>
      route.abort("failed"),
    );
    await lists.surfaceSaveButton().click();
    await expect(toast("Failed to update list")).toBeVisible();
    await expect(lists.editTitleInput()).toHaveValue(editedTitle);
    await expect(lists.editDescriptionInput()).toHaveValue(description);
    await expect(lists.surfaceSaveButton()).toBeEnabled();
    await page.unroute("**/api/trpc/*dashboardDb.list.update*");
    await lists.surfaceSaveButton().click();
    await expect(toast("List updated")).toBeVisible();
    await expect(lists.editDialog()).toBeHidden();

    await expect(page).toHaveURL("/dashboard/lists");
    await page.reload();
    await lists.setGlobalSearch(editedTitle);
    await expect(lists.listRow(editedTitle)).toBeVisible();
    await lists.openFirstVisibleRowActions();
    const manageHref = await lists.manageRowActionHref();
    expect(manageHref).toBe(`/dashboard/lists/${editingId}`);

    await page.goto(manageHref!);
    await expect(manageList.heading).toContainText(editedTitle);
    await expect(manageList.titleInput).toHaveValue(editedTitle);
    await expect(manageList.descriptionInput).toHaveValue(description);
    await expect(manageList.addListingsTrigger).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No listings", exact: true }),
    ).toBeVisible();

    await manageList.openAddListingsDialog();
    await manageList.searchAddListings(listingTitle);
    await manageList.selectListingToAdd(listingTitle);
    await expect(manageList.listingRow(listingTitle)).toBeVisible();
    await expect(manageList.saveChangesButton).toBeEnabled();
    await manageList.saveChanges();
    await expect(toast("List updated")).toBeVisible();
    await expect(manageList.saveChangesButton).toBeDisabled();

    await page.reload();
    await manageList.isReady();
    await expect(manageList.heading).toContainText(editedTitle);
    await expect(manageList.titleInput).toHaveValue(editedTitle);
    await expect(manageList.descriptionInput).toHaveValue(description);
    await expect(manageList.listingRow(listingTitle)).toBeVisible();
    // Existing members must not be offered twice. Escape returns keyboard focus.
    await manageList.openAddListingsDialog();
    await manageList.searchAddListings(listingTitle);
    await expect(page.getByRole("option", { name: listingTitle })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(
        "No listings found. Only listings outside this list are shown.",
      ),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(manageList.addListingsTrigger).toBeFocused();

    // Valid drafts save on link navigation. Invalid drafts stay on this route.
    await manageList.fillTitle("");
    await page
      .getByRole("link", { name: "Back to lists", exact: true })
      .click();
    await expect(page).toHaveURL(`/dashboard/lists/${editingId}`);
    await expect(toast("Error saving changes")).toBeVisible();
    const navigatedTitle = `${editedTitle} saved on navigation`;
    await manageList.fillTitle(navigatedTitle);
    await manageList.fillDescription("Saved on navigation");
    await page
      .getByRole("link", { name: "Back to lists", exact: true })
      .click();
    await expect(page).toHaveURL("/dashboard/lists");
    await page.goto(manageHref!);
    await expect(manageList.titleInput).toHaveValue(navigatedTitle);
    await expect(manageList.descriptionInput).toHaveValue(
      "Saved on navigation",
    );
    await page.reload();
    await expect(manageList.titleInput).toHaveValue(navigatedTitle);
    await expect(manageList.descriptionInput).toHaveValue(
      "Saved on navigation",
    );

    // The server rejects populated deletion and restores the optimistic row.
    await page
      .getByRole("link", { name: "Back to lists", exact: true })
      .click();
    await lists.setGlobalSearch(editedTitle);
    await lists.openFirstVisibleRowActions();
    await lists.chooseRowActionDelete();
    const rejectedResponse = page.waitForResponse((response) =>
      response.url().includes("dashboardDb.list.delete"),
    );
    await lists.confirmDelete();
    await expect(toast("Failed to delete list")).toContainText(
      "Cannot delete list with associated listings",
    );
    const rejected = await rejectedResponse;
    const rejectedId = await rejected.headerValue("x-correlation-id");
    await expect
      .poll(() =>
        clientLogs.find(
          (record) =>
            record.event === "trpc_client_failed" &&
            record.correlation_id === rejectedId,
        ),
      )
      .toMatchObject({
        procedure: "dashboardDb.list.delete",
        http_status: 412,
        error_code: "PRECONDITION_FAILED",
      });

    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(lists.listRow(editedTitle)).toBeVisible();
    await page.reload();
    await expect(lists.listRow(editedTitle)).toBeVisible();
    await page.goto(manageHref!);
    await expect(manageList.listingRow(listingTitle)).toBeVisible();

    const observedResponses = responses.slice();
    for (const procedure of [
      "dashboardDb.bootstrap.roots",
      "dashboardDb.list.create",
    ]) {
      const response = observedResponses.find((response) =>
        response.url().includes(procedure),
      );
      expect(response).toBeDefined();
      const correlationId = await response!.headerValue("x-correlation-id");
      expect(clientLogs).toContainEqual(
        expect.objectContaining({
          event: "trpc_client_completed",
          procedure,
          correlation_id: correlationId,
          correlation_scope: "request",
          http_status: 200,
        }),
      );
    }
    const serverLog = readFileSync("tests/.tmp/integration-server.log", "utf8");
    const records = serverLog
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const ids = new Set<string>();
    for (const response of observedResponses) {
      const id = await response.headerValue("x-correlation-id");
      expect(id).toMatch(/^[a-zA-Z0-9_-]{8,80}$/);
      expect(response.request().headers()["x-correlation-id"]).toBe(id);
      ids.add(id!);
      const events = records
        .filter((record) => record.correlation_id === id)
        .map((record) => record.event);
      expect(events).toContain("http_request_started");
      expect(events).toContain("http_response_created");
    }
    expect(observedResponses.length).toBeGreaterThan(4);
    expect(ids.size).toBe(observedResponses.length);
    expect(records).toContainEqual(
      expect.objectContaining({
        event: "trpc_procedure_rejected",
        procedure: "dashboardDb.list.delete",
        error_code: "PRECONDITION_FAILED",
        correlation_id: rejectedId,
        level: "warn",
      }),
    );
    expect(serverLog).not.toContain(description);

    await manageList.selectFirstVisibleRow();
    await manageList.clickRemoveSelected();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(manageList.listingRow(listingTitle)).toBeVisible();
    await manageList.clickRemoveSelected();
    await manageList.confirmRemoveSelected();
    await expect(
      page.getByRole("heading", { name: "No listings", exact: true }),
    ).toBeVisible();
    await manageList.saveChanges();
    await expect(manageList.saveChangesButton).toBeDisabled();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No listings", exact: true }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Back to lists", exact: true })
      .click();
    await lists.setGlobalSearch(editedTitle);
    await expect(lists.rows()).toHaveCount(1);
    await lists.openFirstVisibleRowActions();
    await lists.chooseRowActionDelete();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(lists.listRow(editedTitle)).toBeVisible();
    await lists.openFirstVisibleRowActions();
    await lists.chooseRowActionDelete();
    const deletion = page.waitForResponse((response) =>
      response.url().includes("dashboardDb.list.delete"),
    );
    await lists.confirmDelete();
    await deletion;
    await expect(toast("List deleted")).toBeVisible();
    await page.reload();
    await expect(lists.listRow(editedTitle)).toHaveCount(0);
    await page.goto(manageHref!);
    await expect(
      page.getByRole("heading", { name: "List not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "breadcrumb" }),
    ).toContainText("List not found", { timeout: 15_000 });
    await page.goto("/dashboard/listings");
    await expect(page.getByTestId("listing-table")).toContainText(listingTitle);
  });
}

test("cancelled removal review stays closed after selection and filter changes", async ({
  page,
}) => {
  const titles = ["Existing Bloom", "Integration Media Listing"];
  const lists = new DashboardLists(page);
  const manageList = new ManageListPage(page);
  await lists.goto();
  await lists.isReady();
  await lists.createListButton.click();
  const createSurface = lists.createSurface();
  await createSurface.getByLabel("Title").fill("Integration Removal Review");
  await createSurface
    .getByRole("button", { name: "Create List", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/lists\?editing=[^&]+$/);
  const listId = new URL(page.url()).searchParams.get("editing");
  if (!listId) throw new Error("Expected the created review list ID.");
  await manageList.goto(listId);
  await expect(manageList.addListingsTrigger).toBeVisible();
  for (const title of titles) {
    await manageList.openAddListingsDialog();
    await manageList.searchAddListings(title);
    await manageList.selectListingToAdd(title);
    await expect(manageList.listingRow(title)).toBeVisible();
  }
  await manageList.saveChanges();
  await expect(manageList.saveChangesButton).toBeDisabled();

  await page.goto(
    `/dashboard/lists/${listId}?remove=integration-existing-listing,integration-media-listing`,
  );
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(titles[0]!);
  await expect(dialog).toContainText(titles[1]!);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();

  await manageList
    .listingRow(titles[0]!)
    .getByRole("checkbox", { name: "Select row" })
    .click();
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 1 selected",
  );
  await expect(dialog).toBeHidden();
  await manageList.setGlobalSearch(titles[0]!);
  await expect(manageList.removeSelectedButton()).toHaveCount(0);
  await manageList.setGlobalSearch("");
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 1 selected",
  );
  await expect(dialog).toBeHidden();
  await manageList.listingsTable
    .getByRole("checkbox", { name: "Select all", exact: true })
    .click();
  await expect(manageList.removeSelectedButton()).toHaveText(
    "Remove 2 selected",
  );
  await expect(dialog).toBeHidden();

  await manageList.clickRemoveSelected();
  await expect(dialog).toContainText(titles[0]!);
  await expect(dialog).toContainText(titles[1]!);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await manageList.goto(listId);
  await manageList.isReady();
  for (const title of titles) {
    await expect(manageList.listingRow(title)).toBeVisible();
  }
});
