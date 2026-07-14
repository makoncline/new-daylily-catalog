import net from "node:net";
import path from "node:path";

function assertSafeRuntime() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const appBaseUrl = new URL(process.env.APP_BASE_URL ?? "");
  const databasePath = databaseUrl.startsWith("file:")
    ? path.resolve(databaseUrl.slice("file:".length))
    : "";
  const safeDatabaseRoot = path.resolve(process.cwd(), "tests", ".tmp");
  const loopback = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  if (
    process.env.HERMETIC_MODE !== "1" ||
    process.env.NODE_ENV === "production" ||
    !databasePath.startsWith(`${safeDatabaseRoot}${path.sep}`) ||
    appBaseUrl.protocol !== "http:" ||
    !loopback.has(appBaseUrl.hostname) ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
    !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
  ) {
    throw new Error(
      "Refusing to install the integration network guard outside the safe local test runtime.",
    );
  }
}

function isLoopback(hostname) {
  const normalized = String(hostname)
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("::ffff:127.")
  );
}

function connectionHost(args) {
  const first = args[0];
  if (typeof first === "object" && first !== null) {
    if ("path" in first && first.path) return null;
    return first.host ?? first.hostname ?? "localhost";
  }
  if (typeof first === "string") return null;
  if (typeof first === "number") {
    return typeof args[1] === "string" ? args[1] : "localhost";
  }
  return "localhost";
}

assertSafeRuntime();

function assertLoopback(args) {
  const hostname = connectionHost(args);
  if (hostname !== null && !isLoopback(hostname)) {
    throw new Error(
      `[integration-network-guard] Blocked outbound connection to ${hostname}. Add an MSW/local service boundary instead of reaching the network.`,
    );
  }
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  assertLoopback(args);
  return originalConnect.apply(this, args);
};

for (const method of ["connect", "createConnection"]) {
  const original = net[method];
  net[method] = function guardedConnection(...args) {
    assertLoopback(args);
    return original.apply(this, args);
  };
}
