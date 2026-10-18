import { readFileSync } from "node:fs";
import { withTempE2EDb } from "@/lib/test-utils/e2e-db";
import type { Response } from "@playwright/test";
import { DashboardLists } from "../e2e/pages/dashboard-lists";
import { ManageListPage } from "../e2e/pages/manage-list-page";
import { expect, test } from "./fixtures";

test("first-list dashboard action saves and reopens the list after reload", async ({
  page,
}) => {
  await withTempE2EDb(
    async (db) => {
      const originalLists = await db.list.findMany();
      await db.list.deleteMany();
      try {
        await page.goto("/dashboard");
        const firstList = page.getByRole("link", {
          name: "Create Your First List",
        });
        await firstList.click();
        await expect(page).toHaveURL("/dashboard/lists?creating=true");
        const lists = new DashboardLists(page);
        const createSurface = lists.createSurface();
        await expect(createSurface).toBeVisible();
        await expect(
          createSurface.getByRole("button", { name: "Back to lists" }),
        ).toBeFocused();
        const title = "First Dashboard List";
        await createSurface.getByLabel("Title").fill(title);
        await createSurface
          .getByRole("button", { name: "Save", exact: true })
          .click();
        await expect(lists.editDialog()).toBeVisible();
        const listId = new URL(page.url()).searchParams.get("editing");
        expect(
          await db.list.findMany({ select: { id: true, title: true } }),
        ).toEqual([{ id: listId, title }]);
        await lists.closeEditDialog();
        await page.reload();
        await lists.isReady();
        await expect(lists.listRow(title)).toBeVisible();
        await lists.openFirstVisibleRowActions();
        await lists.chooseRowActionEdit();
        await expect(lists.editTitleInput()).toHaveValue(title);
        await lists.closeEditDialog();
        await page.reload();
        await expect(lists.listRow(title)).toBeVisible();
      } finally {
        await db.list.deleteMany();
        await db.list.createMany({ data: originalLists });
      }
    },
    { clearFirst: false },
  );
});

for (const changedDraft of [false, true]) {
  test(`list creation after lost confirmation uses ${changedDraft ? "a new identity for changed data" : "the same identity for unchanged data"}`, async ({
    page,
  }) => {
    await withTempE2EDb(
      async (db) => {
        const title = `Lost List Confirmation ${changedDraft ? "changed" : "unchanged"}`;
        const retryTitle = changedDraft ? `${title} revised` : title;
        const requests: Array<{ title: string; requestId?: string }> = [];
        page.on("request", (request) => {
          if (request.url().includes("/api/trpc/dashboardV2.list.create")) {
            requests.push(request.postDataJSON()[0].json);
          }
        });
        const savedRows = () =>
          db.list.findMany({
            where: { userId: "integration-user", title: { startsWith: title } },
            select: { id: true, title: true },
            orderBy: { title: "asc" },
          });
        const lists = new DashboardLists(page);
        await lists.goto();
        await lists.isReady();
        await lists.createListButton.click();
        const surface = lists.createSurface();
        await surface.getByLabel("Title").fill(title);
        let committedId: string | undefined;
        await page.route(
          "**/api/trpc/dashboardV2.list.create*",
          async (route) => {
            const response = await route.fetch({
              headers: { ...route.request().headers(), "trpc-accept": "" },
            });
            expect(response.ok()).toBe(true);
            const results = await response.json();
            expect(results[0]).not.toHaveProperty("error");
            committedId = results[0]?.result?.data.json.id;
            expect(await savedRows()).toEqual([{ id: committedId, title }]);
            await route.abort("connectionclosed");
          },
          { times: 1 },
        );
        await surface
          .getByRole("button", { name: "Save", exact: true })
          .click();
        await expect(
          page
            .locator("[data-sonner-toast]")
            .filter({ hasText: "Failed to create list" }),
        ).toBeVisible();
        await expect(surface.getByLabel("Title")).toHaveValue(title);
        const save = surface.getByRole("button", { name: "Save", exact: true });
        await expect(save).toBeEnabled();
        await surface
          .getByLabel("Title")
          .fill(changedDraft ? retryTitle : ` ${title} `);
        await save.click();
        await expect(lists.editDialog()).toBeVisible();
        expect(requests).toHaveLength(2);
        if (changedDraft) {
          expect(requests[1]?.requestId).not.toBe(requests[0]?.requestId);
          expect(await savedRows()).toEqual([
            { id: committedId, title },
            {
              id: new URL(page.url()).searchParams.get("editing"),
              title: retryTitle,
            },
          ]);
        } else {
          expect(await savedRows()).toEqual([{ id: committedId, title }]);
          expect(requests[1]?.requestId).toBe(requests[0]?.requestId);
        }
        expect(requests[0]?.requestId).toBeTruthy();
        await lists.closeEditDialog();
        await page.reload();
        await lists.isReady();
        await lists.setGlobalSearch(title);
        await expect(lists.rows()).toHaveCount(changedDraft ? 2 : 1);
        await lists.setGlobalSearch(retryTitle);
        await expect(lists.rows()).toHaveCount(1);
        await lists.openFirstVisibleRowActions();
        await lists.chooseRowActionEdit();
        await expect(lists.editTitleInput()).toHaveValue(retryTitle);
        if (!changedDraft) {
          await lists.closeEditDialog();
          await lists.createListButton.click();
          await surface.getByLabel("Title").fill(title);
          await surface
            .getByRole("button", { name: "Create List", exact: true })
            .click();
          await expect(lists.editDialog()).toBeVisible();
          expect(requests).toHaveLength(3);
          expect(requests[2]?.requestId).toBeTruthy();
          expect(requests[2]?.requestId).not.toBe(requests[0]?.requestId);
          expect(await savedRows()).toHaveLength(2);
        }
      },
      { clearFirst: false },
    );
  });
}

test("list picker retries a committed create without duplicating the list", async ({
  page,
  editListingDialog,
}) => {
  await withTempE2EDb(
    async (db) => {
      const title = "Picker Retry";
      const requests: Array<{ requestId?: string }> = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/trpc/dashboardV2.list.create")) {
          requests.push(request.postDataJSON()[0].json);
        }
      });
      await page.goto(
        "/dashboard/listings?editing=integration-existing-listing",
      );
      await editListingDialog.isReady();
      await editListingDialog.openListsPicker();
      const picker = page.getByRole("dialog", { name: "Select Lists" });
      await picker.getByPlaceholder("Search lists...").fill(title);
      const create = picker.getByRole("option", {
        name: `Create "${title}"`,
        exact: true,
      });
      let committedId: string | undefined;
      const savedRows = () =>
        db.list.findMany({
          where: { userId: "integration-user", title },
          select: { id: true },
        });
      await page.route(
        "**/api/trpc/dashboardV2.list.create*",
        async (route) => {
          const response = await route.fetch({
            headers: { ...route.request().headers(), "trpc-accept": "" },
          });
          expect(response.ok()).toBe(true);
          const results = await response.json();
          expect(results[0]).not.toHaveProperty("error");
          committedId = results[0]?.result?.data.json.id;
          expect(await savedRows()).toEqual([{ id: committedId }]);
          await route.abort("connectionclosed");
        },
        { times: 1 },
      );
      await create.click();
      await expect(
        page
          .locator("[data-sonner-toast]")
          .filter({ hasText: "Failed to create list" }),
      ).toBeVisible();
      await expect(picker.getByPlaceholder("Search lists...")).toHaveValue(
        title,
      );
      await expect(create).toBeEnabled();
      await create.click();
      await expect(picker).toBeHidden();
      expect(await savedRows()).toEqual([{ id: committedId }]);
      expect(requests).toHaveLength(2);
      expect(requests[0]?.requestId).toBeTruthy();
      expect(requests[1]?.requestId).toBe(requests[0]?.requestId);
      await expect(editListingDialog.listSelectButton).toContainText(title);
      await editListingDialog.clickSaveChanges();
      await expect(editListingDialog.dialog).toBeHidden();
      const listing = await db.listing.findUniqueOrThrow({
        where: { id: "integration-existing-listing" },
        select: { lists: { select: { id: true } } },
      });
      expect(listing.lists).toContainEqual({ id: committedId });
      await page.reload();
      await page.goto(
        "/dashboard/listings?editing=integration-existing-listing",
      );
      await editListingDialog.isReady();
      await expect(editListingDialog.listSelectButton).toContainText(title);
      expect(await savedRows()).toEqual([{ id: committedId }]);
    },
    { clearFirst: false },
  );
});

test("a delayed targeted read cannot replace a later list title save", async ({
  page,
}) => {
  const id = "integration-targeted-read-list";
  const manageList = new ManageListPage(page);
  let release = () => {};
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  let responseHeld = () => {};
  const held = new Promise<void>((resolve) => {
    responseHeld = resolve;
  });
  const requests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (/^\/api\/trpc\/dashboardV2\.list\.(get|update)$/.test(pathname))
      requests.push(pathname);
  });
  await withTempE2EDb(
    (db) =>
      db.list.create({
        data: {
          id,
          userId: "integration-user",
          title: "Before targeted read",
          listings: { connect: { id: "integration-existing-listing" } },
        },
      }),
    { clearFirst: false },
  );
  try {
    await page.route("**/api/trpc/dashboardV2.list.get?*", async (route) => {
      const response = await route.fetch();
      responseHeld();
      await delivery;
      await route.fulfill({ response });
    });
    // A removal review loads the current list and its selected listings.
    await page.goto(
      `/dashboard/lists/${id}?remove=integration-existing-listing`,
    );
    await manageList.isReady();
    await held;
    await manageList.fillTitle("Saved after targeted read");
    await manageList.saveChanges();
    await expect(manageList.saveChangesButton).toBeDisabled();
    expect(requests.some((url) => url.includes("list.update"))).toBe(false);
    release();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Manage List: Saved after targeted read",
      }),
    ).toBeVisible();
    await withTempE2EDb(
      async (db) => {
        expect((await db.list.findUniqueOrThrow({ where: { id } })).title).toBe(
          "Saved after targeted read",
        );
      },
      { clearFirst: false },
    );
    expect(requests).toEqual([
      "/api/trpc/dashboardV2.list.get",
      "/api/trpc/dashboardV2.list.update",
    ]);
    await page.route("**/api/trpc/*dashboardV2.bootstrap.catalog*", (route) =>
      route.abort("failed"),
    );
    await page.goto(`/dashboard/lists/${id}`);
    await manageList.isReady();
    await expect(manageList.titleInput).toHaveValue(
      "Saved after targeted read",
    );
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
    await withTempE2EDb((db) => db.list.deleteMany({ where: { id } }), {
      clearFirst: false,
    });
  }
});

test("an account change cannot redirect queued list commands", async ({
  page,
  context,
  baseURL,
  createListingDialog,
  dashboardListings,
}) => {
  const id = "integration-account-queue-list";
  const manageList = new ManageListPage(page);
  let release = () => {};
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  let responseHeld = () => {};
  const held = new Promise<void>((resolve) => {
    responseHeld = resolve;
  });
  const removed: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("dashboardV2.list.removeListingsFromList"))
      removed.push(request.headers()["x-dashboard-member-id"] ?? "missing");
  });
  await withTempE2EDb(
    async (db) => {
      await db.user.create({
        data: {
          id: "queue-other-member",
          clerkUserId: "user_integration_other",
        },
      });
      await db.list.create({
        data: {
          id,
          userId: "integration-user",
          title: "Account queue list",
          listings: { connect: { id: "integration-existing-listing" } },
        },
      });
    },
    { clearFirst: false },
  );
  try {
    await manageList.goto(id);
    await manageList.isReady();
    await page.route(
      "**/api/trpc/*dashboardV2.list.addListingToList*",
      async (route) => {
        const response = await route.fetch();
        responseHeld();
        await delivery;
        await route.fulfill({ response });
      },
    );
    await manageList.openAddListingsDialog();
    await manageList.searchAddListings("Integration Media Listing");
    await manageList.selectListingToAdd("Integration Media Listing");
    await held;
    await manageList
      .listingRow("Existing Bloom")
      .getByRole("checkbox", { name: "Select row" })
      .click();
    await manageList.clickRemoveSelected();
    await manageList.confirmRemoveSelected();
    expect(removed).toEqual([]);
    // The first request is committed. The next command is still queued.
    await context.addCookies([
      { name: "integration-auth", value: "other-member", url: baseURL! },
    ]);
    release();
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText:
          "Your account changed. Your changes were not saved. Copy any unsaved changes, then reload this page.",
      }),
    ).toBeVisible();
    expect(removed).toEqual(["integration-user"]);
    await withTempE2EDb(
      async (db) => {
        const list = await db.list.findUniqueOrThrow({
          where: { id },
          include: { listings: true },
        });
        expect(list.listings.map((listing) => listing.id).sort()).toEqual([
          "integration-existing-listing",
          "integration-media-listing",
        ]);
        expect(
          await db.list.count({ where: { userId: "queue-other-member" } }),
        ).toBe(0);
        expect(
          await db.listing.count({ where: { userId: "queue-other-member" } }),
        ).toBe(0);
      },
      { clearFirst: false },
    );
    await page.goto("/dashboard/listings?creating=true");
    await createListingDialog.isReady();
    await createListingDialog.titleInput.fill("Other member first bloom");
    await createListingDialog.dialog
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect(createListingDialog.dialog).toBeHidden();
    await withTempE2EDb(
      async (db) => {
        expect(
          await db.listing.count({
            where: {
              userId: "queue-other-member",
              title: "Other member first bloom",
            },
          }),
        ).toBe(1);
      },
      { clearFirst: false },
    );
    await page.goto("/dashboard/listings");
    await expect(
      dashboardListings.listingRow("Other member first bloom"),
    ).toBeVisible();
    await expect(dashboardListings.listingRow("Existing Bloom")).toHaveCount(0);
  } finally {
    release();
    await context.clearCookies();
    await page.unrouteAll({ behavior: "wait" });
    await withTempE2EDb(
      async (db) => {
        await db.list.deleteMany({ where: { id } });
        await db.listing.deleteMany({
          where: { userId: "queue-other-member" },
        });
        await db.user.deleteMany({ where: { id: "queue-other-member" } });
      },
      { clearFirst: false },
    );
  }
});

test("overlapping list changes retain the latest membership after reload", async ({
  page,
}) => {
  const id = "integration-overlapping-list";
  const manageList = new ManageListPage(page);
  let release = () => {};
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  let responseHeld = () => {};
  const held = new Promise<void>((resolve) => {
    responseHeld = resolve;
  });
  await withTempE2EDb(
    (db) =>
      db.list.create({
        data: {
          id,
          title: "Overlapping changes",
          userId: "integration-user",
          listings: { connect: { id: "integration-existing-listing" } },
        },
      }),
    { clearFirst: false },
  );
  try {
    await manageList.goto(id);
    await manageList.isReady();
    // Keep the real server result, but deliver it after a later command.
    await page.route(
      "**/api/trpc/*dashboardV2.list.addListingToList*",
      async (route) => {
        const response = await route.fetch();
        responseHeld();
        await delivery;
        await route.fulfill({ response });
      },
    );
    await manageList.openAddListingsDialog();
    await manageList.searchAddListings("Integration Media Listing");
    await manageList.selectListingToAdd("Integration Media Listing");
    await held;
    await manageList
      .listingRow("Existing Bloom")
      .getByRole("checkbox", { name: "Select row" })
      .click();
    await manageList.clickRemoveSelected();
    const removal = page.waitForResponse((response) =>
      response.url().includes("dashboardV2.list.removeListingsFromList"),
    );
    await manageList.confirmRemoveSelected();
    // Let a concurrent command finish first. A queued command can wait for
    // the held reply instead; the test must permit either correct approach.
    await Promise.race([
      removal.then((response) => response.finished()),
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ]);
    release();
    await removal;
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Listing added to list" }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Listings removed from list" }),
    ).toBeVisible();
    await withTempE2EDb(
      async (db) => {
        const list = await db.list.findUniqueOrThrow({
          where: { id },
          include: { listings: true },
        });
        expect(list.listings.map((listing) => listing.id)).toEqual([
          "integration-media-listing",
        ]);
      },
      { clearFirst: false },
    );
    await expect(
      manageList.listingRow("Integration Media Listing"),
    ).toBeVisible();
    await expect(manageList.listingRow("Existing Bloom")).toHaveCount(0);
    // A fresh server result must not hide a stale persisted browser catalog.
    await page.route("**/api/trpc/*dashboardV2.bootstrap.catalog*", (route) =>
      route.abort("failed"),
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.reload();
    await manageList.isReady();
    await expect(
      manageList.listingRow("Integration Media Listing"),
    ).toBeVisible();
    await expect(manageList.listingRow("Existing Bloom")).toHaveCount(0);
  } finally {
    release();
    await page.unroute("**/api/trpc/*dashboardV2.list.addListingToList*");
    await page.unroute("**/api/trpc/*dashboardV2.bootstrap.catalog*");
    await withTempE2EDb((db) => db.list.deleteMany({ where: { id } }), {
      clearFirst: false,
    });
  }
});

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
    await page.route("**/api/trpc/*dashboardV2.list.update*", (route) =>
      route.abort("failed"),
    );
    await lists.surfaceSaveButton().click();
    await expect(toast("Failed to update list")).toBeVisible();
    await expect(lists.editTitleInput()).toHaveValue(editedTitle);
    await expect(lists.editDescriptionInput()).toHaveValue(description);
    await expect(lists.surfaceSaveButton()).toBeEnabled();
    await page.unroute("**/api/trpc/*dashboardV2.list.update*");
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
      response.url().includes("dashboardV2.list.delete"),
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
        procedure: "dashboardV2.list.delete",
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
      "dashboardV2.bootstrap.catalog",
      "dashboardV2.list.create",
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
        procedure: "dashboardV2.list.delete",
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
      response.url().includes("dashboardV2.list.delete"),
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

test("failed member lookups retain isolated authenticated request identities", async ({
  request,
}) => {
  await withTempE2EDb(
    async (db) => {
      await db.$executeRaw`ALTER TABLE "User" RENAME COLUMN "clerkUserId" TO "unavailableClerkUserId"`;
      try {
        const requests = [
          {
            cookie: "",
            userId: "user_integration_seller",
            code: "INTERNAL_SERVER_ERROR",
          },
          {
            cookie: "integration-auth=other-member",
            userId: "user_integration_other",
            code: "INTERNAL_SERVER_ERROR",
          },
          {
            cookie: "integration-auth=anonymous",
            userId: null,
            code: "UNAUTHORIZED",
          },
        ].map((item) => ({ ...item, correlationId: crypto.randomUUID() }));
        await Promise.all(
          requests.map(async (item) => {
            const response = await request.get(
              "/api/trpc/dashboardV2.bootstrap.catalog",
              {
                headers: {
                  cookie: item.cookie,
                  "x-correlation-id": item.correlationId,
                  "x-clerk-user-id": "untrusted-browser-identity",
                },
              },
            );
            expect((await response.json()).error.json.data.code).toBe(
              item.code,
            );
          }),
        );
        const records = readFileSync(
          "tests/.tmp/integration-server.log",
          "utf8",
        )
          .split("\n")
          .filter((line) => line.startsWith("{"))
          .map((line) => JSON.parse(line) as Record<string, unknown>);
        for (const item of requests) {
          const failure = records.find(
            (record) =>
              record.correlation_id === item.correlationId &&
              (record.event === "application_error" ||
                record.event === "trpc_procedure_rejected"),
          );
          expect(failure).toMatchObject({
            clerk_user_id: item.userId,
            error_code: item.code,
          });
          expect(
            records
              .filter((record) => record.correlation_id === item.correlationId)
              .filter((record) => record.clerk_user_id !== undefined)
              .every((record) => record.clerk_user_id === item.userId),
          ).toBe(true);
        }
      } finally {
        await db.$executeRaw`ALTER TABLE "User" RENAME COLUMN "unavailableClerkUserId" TO "clerkUserId"`;
      }
    },
    { clearFirst: false },
  );
});
