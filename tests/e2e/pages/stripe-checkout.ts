import type { Page } from "@playwright/test";

export class StripeCheckout {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Verifies that we've successfully navigated to Stripe checkout
   * We don't interact with the Stripe UI - just verify we landed there
   */
  async isReady() {
    // Wait for Stripe checkout page to load
    await this.page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
    // Wait for the page to be fully loaded
    await this.page.waitForLoadState("domcontentloaded");
  }
}
