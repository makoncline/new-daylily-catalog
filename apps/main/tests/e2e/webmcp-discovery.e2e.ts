import { clerk } from "@clerk/testing/playwright";
import { TEST_USER } from "../../src/lib/test-utils/e2e-users";
import { test, expect } from "./fixtures/app-fixtures";

test.describe("WebMCP discovery", () => {
  test("registers dashboard tools for signed-in dashboard pages when the browser exposes WebMCP", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const registeredTools: Array<{
        name: string;
        description: string;
        inputSchema: unknown;
      }> = [];

      Object.defineProperty(window.navigator, "modelContext", {
        configurable: true,
        value: {
          registerTool(tool: {
            name: string;
            description: string;
            inputSchema: unknown;
          }, options?: { signal?: AbortSignal }) {
            const registration = {
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            };
            registeredTools.push(registration);
            options?.signal?.addEventListener(
              "abort",
              () => {
                const index = registeredTools.indexOf(registration);
                if (index >= 0) registeredTools.splice(index, 1);
              },
              { once: true },
            );
          },
        },
      });

      Object.defineProperty(window, "__webMcpRegisteredTools", {
        configurable: true,
        value: registeredTools,
      });
    });

    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_USER.email });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          (
            window as Window & {
              __webMcpRegisteredTools?: Array<{ name: string }>;
            }
          ).__webMcpRegisteredTools?.map((tool) => tool.name),
        ),
      )
      .toEqual([
        "daylily.navigate",
        "daylily.dashboard-state",
        "daylily.search-cultivars",
        "daylily.update-profile",
        "daylily.update-profile-content",
        "daylily.create-listing",
        "daylily.update-listing",
        "daylily.create-list",
        "daylily.prepare-image-upload",
        "daylily.attach-uploaded-image",
        "daylily.add-listing-to-list",
      ]);
  });
});
