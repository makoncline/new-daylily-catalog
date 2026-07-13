import { setupServer } from "msw/node";
import { integrationStripeHandlers } from "./integration-stripe-handlers.mjs";

if (process.env.HERMETIC_MODE !== "1") {
  throw new Error(
    "Refusing to install integration network boundaries outside hermetic mode.",
  );
}

const server = setupServer(...integrationStripeHandlers);
server.listen({ onUnhandledRequest: "bypass" });

await import("./integration-network-guard.mjs");
