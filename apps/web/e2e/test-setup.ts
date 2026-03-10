// e2e/test-setup.ts
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    await page.addInitScript(() => {
      const css = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;

      const inject = () => {
        if (document.querySelector("style[data-e2e-no-motion='true']")) return;
        const style = document.createElement("style");
        style.setAttribute("data-e2e-no-motion", "true");
        style.textContent = css;
        document.head.appendChild(style);
      };

      if (document.head) {
        inject();
      } else {
        document.addEventListener("DOMContentLoaded", inject, { once: true });
      }
    });

    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    const baseHost = (() => {
      if (!baseURL) return "";
      try {
        return new URL(baseURL).hostname;
      } catch {
        return "";
      }
    })();

    const shouldBypass =
      !!bypass &&
      (baseHost.endsWith(".vercel.app") ||
        baseHost.endsWith("-preview.daylilycatalog.com"));

    if (shouldBypass) {
      const appHost = new URL(baseURL!).host;

      await page.route("**/*", async (route) => {
        const reqUrl = new URL(route.request().url());

        // Only attach headers to your app's origin. Never attach to Clerk/third parties.
        if (reqUrl.host === appHost) {
          await route.continue({
            headers: {
              ...route.request().headers(),
              "x-vercel-protection-bypass": bypass!,
              "x-vercel-set-bypass-cookie": bypass!,
            },
          });
          return;
        }

        await route.continue();
      });
    }

    await use(page);
  },
});

export { expect };
