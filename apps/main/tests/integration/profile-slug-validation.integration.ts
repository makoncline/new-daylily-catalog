import { expect, test } from "./fixtures";

test("invalid profile URLs are validated before checking availability", async ({
  page,
}) => {
  const availabilityRequests: string[] = [];
  page.on("request", (request) => {
    if (
      decodeURIComponent(request.url()).includes(
        "dashboardDb.userProfile.checkSlug",
      )
    ) {
      availabilityRequests.push(request.url());
    }
  });

  await page.goto("/dashboard/profile");
  const slugInput = page.locator('input[name="slug"]');
  await expect(slugInput).toHaveValue("integration-seller");

  await slugInput.click();
  const warning = page.getByRole("alertdialog", {
    name: "Before You Edit Your URL",
  });
  await warning.getByRole("button", { name: "Unlock URL editing" }).click();

  await slugInput.fill("bad");
  await slugInput.blur();

  await expect(
    page.getByText("URL must be at least 5 characters"),
  ).toBeVisible();
  expect(availabilityRequests).toEqual([]);
  await expect(
    page.getByRole("button", { name: /Open issues overlay/i }),
  ).toHaveCount(0);

  await slugInput.fill("available-profile");
  await expect.poll(() => availabilityRequests.length).toBe(1);

  await slugInput.fill("dashboard");
  await expect(
    page.getByText("This URL is already taken. Please choose another one."),
  ).toBeVisible();
  await slugInput.blur();
  await expect(
    page.getByText("This URL is already taken. Please choose another one."),
  ).toBeVisible();
});
