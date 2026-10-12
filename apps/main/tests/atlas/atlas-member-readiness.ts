import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DashboardHome } from "../e2e/pages/dashboard-home";
import { DashboardShell } from "../e2e/pages/dashboard-shell";

export async function publishAtlasMemberState(page: Page, authState: string) {
  await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 30_000 });
  await new DashboardHome(page).waitForLoaded();
  await expect(new DashboardShell(page).refreshButton).toBeEnabled({
    timeout: 30_000,
  });
  await page.waitForLoadState("load");
  mkdirSync(path.dirname(authState), { recursive: true });
  await page.context().storageState({ path: authState });
}
