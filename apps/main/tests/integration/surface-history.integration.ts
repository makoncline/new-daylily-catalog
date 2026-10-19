import { errors } from "@playwright/test";
import { expect, test } from "./fixtures";

for (const [device, viewport] of [
  ["desktop", { width: 1024, height: 768 }],
  ["mobile", { width: 402, height: 874 }],
] as const) {
  test(`list and listing drafts survive canceled browser history on ${device}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    let discard = false;
    page.on("dialog", (dialog) =>
      discard ? dialog.accept() : dialog.dismiss(),
    );

    const traverse = async (
      direction: "goBack" | "goForward",
      confirm: boolean,
    ) => {
      discard = confirm;
      const dialog = page.waitForEvent("dialog");
      const navigation = page[direction]({
        timeout: confirm ? 30_000 : 1_500,
        waitUntil: "commit",
      }).catch((error: unknown) => {
        // A canceled traversal returns to its source before the route settles.
        if (confirm || !(error instanceof errors.TimeoutError)) throw error;
      });
      await dialog;
      await navigation;
    };

    for (const family of ["lists", "listings"] as const) {
      for (const mode of ["edit", "create"] as const) {
        discard = false;
        await page.goto(`/dashboard/${family}`);
        const trigger =
          mode === "edit"
            ? page
                .getByTestId(
                  family === "lists"
                    ? "list-row-actions-trigger"
                    : "listing-row-actions-trigger",
                )
                .first()
            : page
                .getByRole("button", {
                  name: family === "lists" ? "Create List" : "Create Listing",
                  exact: true,
                })
                .first();
        await trigger.click();
        if (mode === "edit") {
          await page
            .getByTestId(
              family === "lists"
                ? "list-row-action-edit"
                : "listing-row-action-edit",
            )
            .click();
        }
        const surface = page.getByRole("region", {
          name: `${mode === "edit" ? "Edit" : "Create"} ${family === "lists" ? "list" : "listing"}`,
        });
        await expect(surface).toBeVisible();
        await expect(page).toHaveURL(
          mode === "edit" ? /editing=/ : /creating=true/,
        );
        const editorUrl = page.url();
        const title = surface.getByLabel(
          mode === "edit"
            ? family === "lists"
              ? "Title"
              : "Name"
            : family === "lists"
              ? "List Title (required)"
              : "Listing Title",
          { exact: true },
        );
        const initial = await title.inputValue();
        await title.fill("Unsaved history draft");
        await expect(
          page.getByText(
            family === "lists" ? "Unsaved list" : "Unsaved listing",
            { exact: true },
          ),
        ).toBeVisible();
        const source = await page.evaluate(() => ({
          entry: history.state.__daylilyDashboardEntry,
          length: history.length,
        }));
        for (let attempt = 0; attempt < 3; attempt++) {
          await traverse("goBack", false);
          await expect(page).toHaveURL(editorUrl);
          await expect(title).toHaveValue("Unsaved history draft");
          await expect(title).toBeFocused();
          expect(
            await page.evaluate(() => ({
              entry: history.state.__daylilyDashboardEntry,
              length: history.length,
            })),
          ).toEqual(source);
        }
        await traverse("goBack", true);
        await expect(page).toHaveURL(`/dashboard/${family}`);
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
        await page.goForward();
        await expect(title).toHaveValue(initial);

        const nextFamily = family === "lists" ? "listings" : "lists";
        const nextLink = page
          .locator(`a[href="/dashboard/${nextFamily}"]`)
          .first();
        if (!(await nextLink.isVisible())) {
          await page.getByRole("button", { name: "Toggle Sidebar" }).click();
        }
        await nextLink.click();
        await expect(page).toHaveURL(`/dashboard/${nextFamily}`);
        await page.goBack();
        await expect(page).toHaveURL(editorUrl);
        await expect(title).toHaveValue(initial);
        await title.fill("Unsaved forward draft");
        await expect(
          page.getByText(
            family === "lists" ? "Unsaved list" : "Unsaved listing",
            { exact: true },
          ),
        ).toBeVisible();
        await traverse("goForward", false);
        await expect(page).toHaveURL(editorUrl);
        await expect(title).toHaveValue("Unsaved forward draft");
        await traverse("goForward", true);
        await expect(page).toHaveURL(`/dashboard/${nextFamily}`);
      }
    }
  });
}
