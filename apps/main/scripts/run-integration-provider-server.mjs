import { createServer } from "@mswjs/http-middleware";
import { integrationNetworkHandlers } from "./integration-network-handlers.mjs";

const providerUrl = new URL(
  process.env.INTEGRATION_PROVIDER_URL ?? "http://127.0.0.1:3211",
);
const server = createServer(...integrationNetworkHandlers);

const httpServer = server.listen(Number(providerUrl.port), providerUrl.hostname);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => httpServer.close());
}
