import { expect, test } from "./fixtures";

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 768 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`editor saves recover from rejected writes on ${device}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const toast = (message: string) =>
      page.locator("[data-sonner-toast]").filter({ hasText: message }).first();

    for (const family of ["lists", "listings"] as const) {
      const noun = family === "lists" ? "list" : "listing";
      const createLabel = family === "lists" ? "Create List" : "Create Listing";
      const titleLabel =
        family === "lists" ? "List Title (required)" : "Listing Title";
      const create = page.getByRole("region", {
        name: `Create ${noun}`,
        exact: true,
      });
      const edit = page.getByRole("region", {
        name: `Edit ${noun}`,
        exact: true,
      });
      const createdTitle = `Save recovery ${device} ${noun}`;
      const savedTitle = `${createdTitle} saved`;
      const createRequest = `**/api/trpc/dashboardDb.${noun}.create*`;
      const updateRequest = `**/api/trpc/dashboardDb.${noun}.update*`;
      const field = edit.getByLabel(family === "lists" ? "Title" : "Name", {
        exact: true,
      });

      await page.goto(`/dashboard/${family}`);
      await page
        .getByRole("button", { name: createLabel, exact: true })
        .first()
        .click();
      await expect(create).toBeVisible();
      if (family === "lists") {
        await expect(
          create.getByRole("button", { name: createLabel, exact: true }),
        ).toBeDisabled();
      }
      await create.getByLabel(titleLabel, { exact: true }).fill(createdTitle);
      await page.route(createRequest, (route) => route.abort("failed"));
      await create
        .getByRole("button", { name: createLabel, exact: true })
        .click();
      await expect(toast(`Failed to create ${noun}`)).toBeVisible();
      await expect(create.getByLabel(titleLabel, { exact: true })).toHaveValue(
        createdTitle,
      );
      await expect(
        create.getByRole("button", { name: createLabel, exact: true }),
      ).toBeEnabled();

      await page.unroute(createRequest);
      await create
        .getByRole("button", { name: createLabel, exact: true })
        .click();
      await expect(field).toHaveValue(createdTitle);
      const editorUrl = page.url();
      await edit.getByRole("heading").first().hover();
      await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
      await field.fill("");
      await edit
        .getByRole("button", { name: "Save Changes", exact: true })
        .click();
      await expect(
        edit.getByText(
          family === "lists" ? "Title is required" : "Name is required",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(edit).toBeVisible();

      await field.fill(savedTitle);
      await edit
        .getByLabel("Description", { exact: true })
        .fill("Saved after a rejected write.");
      await page.route(updateRequest, (route) => route.abort("failed"));
      await edit
        .getByRole("button", { name: "Save Changes", exact: true })
        .click();
      await expect(
        toast(
          family === "lists"
            ? "Failed to update list"
            : "Failed to save changes",
        ),
      ).toBeVisible();
      await expect(field).toHaveValue(savedTitle);
      await expect(
        edit.getByRole("button", { name: "Save Changes", exact: true }),
      ).toBeEnabled();
      await expect(page).toHaveURL(editorUrl);

      await page.unroute(updateRequest);
      await edit.getByRole("button", { name: "Save", exact: true }).click();
      await expect(edit).toBeHidden();
      await expect(page).toHaveURL(`/dashboard/${family}`);
      await page.goto(editorUrl);
      await expect(field).toHaveValue(savedTitle);
      await expect(edit.getByLabel("Description", { exact: true })).toHaveValue(
        "Saved after a rejected write.",
      );
      await page.reload();
      await expect(field).toHaveValue(savedTitle);
      await expect(edit.getByLabel("Description", { exact: true })).toHaveValue(
        "Saved after a rejected write.",
      );
    }
  });
}
