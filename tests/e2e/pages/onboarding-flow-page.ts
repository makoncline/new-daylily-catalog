import { expect, type Locator, type Page } from "@playwright/test";

export class OnboardingFlowPage {
  readonly page: Page;
  readonly container: Locator;
  readonly primaryActionButton: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("start-onboarding-page");
    this.primaryActionButton = page.getByTestId("start-onboarding-primary-action");
    this.checkoutButton = page.getByTestId("start-membership-checkout");
  }

  async waitForLoaded() {
    await this.container.waitFor({ state: "visible" });
    await this.primaryActionButton.waitFor({ state: "visible" });
  }

  async waitForProfileReady() {
    await this.page
      .locator('[data-testid="start-onboarding-page"][data-profile-ready="true"]')
      .waitFor({ state: "visible" });
  }

  async expectStep(stepNumber: number, title: string) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();
    await expect(
      this.page.getByText(`Step ${stepNumber} of 6`, { exact: true }),
    ).toBeVisible();
  }

  async fillProfileStep({
    sellerName,
    location,
    description,
  }: {
    sellerName: string;
    location: string;
    description: string;
  }) {
    await this.page.locator("#garden-name").fill(sellerName);
    await this.page.locator("#garden-location").fill(location);
    await this.page.locator("#garden-description").fill(description);
  }

  async expectProfilePreview({
    sellerName,
    location,
    description,
  }: {
    sellerName: string;
    location: string;
    description: string;
  }) {
    await expect(this.page.getByText("Yours", { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText(sellerName, { exact: false }).first()).toBeVisible();
    await expect(this.page.getByText(location, { exact: false }).first()).toBeVisible();
    await expect(this.page.getByText(description, { exact: false }).first()).toBeVisible();
  }

  async expectDefaultCultivarLinked(cultivarName: string) {
    await expect(this.page.locator("#ahs-listing-select")).toContainText(
      cultivarName,
    );
    const selectedCultivarPanel = this.page
      .locator("div")
      .filter({
        has: this.page.getByText("Selected cultivar", { exact: false }).first(),
      })
      .first();
    await expect(selectedCultivarPanel).toBeVisible();
    await expect(selectedCultivarPanel).toContainText(cultivarName);
  }

  async expectListingPreviewUsesLinkedImage() {
    const listingPreviewImage = this.page
      .locator('img[alt="Listing preview"]')
      .first();
    await expect(listingPreviewImage).toBeVisible();
    const previewImageSrc = await listingPreviewImage.getAttribute("src");
    expect(previewImageSrc).toBeTruthy();
    expect(previewImageSrc).not.toContain("cultivar-grid.webp");
  }

  async fillListingStep({
    title,
    price,
    description,
  }: {
    title: string;
    price: string;
    description: string;
  }) {
    await this.page.locator("#listing-title").fill(title);
    await this.page.locator("#listing-price").fill(price);
    await this.page.locator("#listing-description").fill(description);
  }

  async expectListingPreview({
    title,
    price,
    description,
  }: {
    title: string;
    price: string;
    description: string;
  }) {
    await expect(this.page.getByText(title, { exact: false }).first()).toBeVisible();
    await expect(this.page.getByText(`$${price}.00`, { exact: false }).first()).toBeVisible();
    await expect(this.page.getByText(description, { exact: false }).first()).toBeVisible();
  }

  async clickPrimaryAction() {
    await expect(this.primaryActionButton).toBeEnabled();
    await this.primaryActionButton.click();
  }

  async expectBuyerContactStep() {
    await expect(
      this.page.getByRole("heading", { name: "How buyers contact you" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Contact this seller" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Contact Seller (1 cart item)" }),
    ).toBeVisible();
  }

  async expectMembershipStep() {
    await expect(this.page.getByTestId("start-membership-page")).toBeVisible();
    await expect(this.checkoutButton).toBeVisible();
  }
}
