import { expect, test } from "@playwright/test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { publishAtlasMemberState } from "../atlas/atlas-member-readiness";

test("publishes member state only after the dashboard workspace loads", async ({
  page,
}) => {
  const directory = mkdtempSync(path.join(tmpdir(), "atlas-member-test-"));
  const authState = path.join(directory, ".auth/member.json");
  try {
    page.setDefaultTimeout(500);
    await page.route("http://atlas.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<h1 data-testid="dashboard-heading">Dashboard</h1>',
      }),
    );
    await page.goto("http://atlas.test/dashboard");

    await expect(publishAtlasMemberState(page, authState)).rejects.toThrow();
    expect(existsSync(authState)).toBe(false);

    await page.evaluate(() => {
      localStorage.setItem("workspace", "loaded");
      document.body.insertAdjacentHTML(
        "beforeend",
        '<main data-testid="dashboard-content">Catalog loaded</main><button data-testid="dashboard-refresh" disabled>Refresh dashboard data</button>',
      );
    });
    const publication = publishAtlasMemberState(page, authState);
    await page.waitForTimeout(100);
    expect(existsSync(authState)).toBe(false);
    await page
      .getByTestId("dashboard-refresh")
      .evaluate((button) => button.removeAttribute("disabled"));
    await publication;
    expect(JSON.parse(readFileSync(authState, "utf8"))).toMatchObject({
      origins: [{ localStorage: [{ name: "workspace", value: "loaded" }] }],
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
