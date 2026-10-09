// e2e/test-setup.ts
import { test as base, expect } from "@playwright/test";
import { preparePreviewAccess } from "./preview-access";

export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await preparePreviewAccess(
      context.request,
      baseURL,
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    );
    await use(context);
  },
  page: async ({ page }, use) => {
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

    await use(page);
  },
});

export { expect };
