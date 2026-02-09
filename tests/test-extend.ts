import { worker } from "../src/mocks/browser";
import { test as testBase } from "vitest";

export const test = testBase.extend<{ worker: typeof worker }>({
  worker: [
    async ({}, use) => {
      await worker.start({
        quiet: true,
        serviceWorker: { url: "/mockServiceWorker.js" },
        onUnhandledRequest(request, print) {
          const url = new URL(request.url);

          if (
            url.origin === location.origin &&
            url.pathname.startsWith("/api")
          ) {
            print.error();
            throw new Error(
              `Unhandled API request: ${request.method} ${request.url}`,
            );
          }
        },
      });
      await use(worker);
      worker.resetHandlers();
      worker.stop();
    },
    { auto: true },
  ],
});
