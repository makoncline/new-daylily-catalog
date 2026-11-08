import { devices } from "@playwright/test";
import { expect, test } from "./fixtures";

test.use(devices["Pixel 7"]);

test("leaving a cultivar works after translation replaces the offer sort text", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/cultivar/integration-bloom");
  const sort = page.getByRole("combobox", { name: "Sort offers" });
  await expect(sort).toHaveText("Best Match");
  await sort.click();
  await page.getByRole("option", { name: "Price: Low to High" }).click();
  await expect(page).toHaveURL(/offerSort=price-asc$/);
  await expect(sort).toHaveText("Price: Low to High");

  // Chrome Translate replaces the original text node with nested elements.
  await sort.evaluate((trigger) => {
    const text = document
      .createTreeWalker(trigger, NodeFilter.SHOW_TEXT)
      .nextNode();
    if (!(text instanceof Text)) throw new Error("The sort label has no text node.");
    const wrapper = document.createElement("font");
    const translation = document.createElement("font");
    translation.textContent = "Preis: aufsteigend";
    wrapper.append(translation);
    text.replaceWith(wrapper);
  });
  await expect(sort).toHaveText("Preis: aufsteigend");

  const navigation = page.getByTestId("mobile-public-nav");
  await navigation.locator("summary").click();
  await navigation.getByRole("link", { name: "Browse catalogs" }).click();
  await expect(page).toHaveURL(/\/catalogs$/);
  await expect(
    page.getByRole("heading", { name: "Daylily Catalogs", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
