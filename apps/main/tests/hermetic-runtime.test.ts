import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getHermeticPersona,
  HERMETIC_PERSONAS,
  isHermeticMode,
  isRealisticDataMode,
  validateHermeticRuntime,
} from "@/lib/hermetic/runtime";

const appRoot = process.cwd();
const safeDatabaseUrl = `file:${path.join(
  appRoot,
  "tests",
  ".tmp",
  "hermetic-runtime.sqlite",
)}`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hermetic runtime safety", () => {
  it("accepts only a local test database without live service credentials", () => {
    expect(() =>
      validateHermeticRuntime({
        nodeEnv: "test",
        databaseUrl: safeDatabaseUrl,
        appBaseUrl: "http://localhost:3200",
        clerkSecretKey: "sk_test_placeholder",
        stripeSecretKey: "sk_test_placeholder",
        appRoot,
      }),
    ).not.toThrow();
    expect(() =>
      validateHermeticRuntime({
        nodeEnv: "test",
        databaseUrl: safeDatabaseUrl,
        appBaseUrl: "http://[::1]:3200",
        clerkSecretKey: "sk_test_placeholder",
        stripeSecretKey: "sk_test_placeholder",
        appRoot,
      }),
    ).not.toThrow();

    for (const unsafe of [
      { nodeEnv: "production" },
      { databaseUrl: "libsql://production-database" },
      { databaseUrl: "file:/tmp/outside-hermetic-root.sqlite" },
      { appBaseUrl: "https://daylilycatalog.com" },
      { clerkSecretKey: "sk_live_clerk" },
      { stripeSecretKey: "sk_live_stripe" },
    ]) {
      expect(() =>
        validateHermeticRuntime({
          nodeEnv: "test",
          databaseUrl: safeDatabaseUrl,
          appBaseUrl: "http://localhost:3200",
          clerkSecretKey: "sk_test_placeholder",
          stripeSecretKey: "sk_test_placeholder",
          appRoot,
          ...unsafe,
        }),
      ).toThrow();
    }
  });

  it("resolves only known local personas", () => {
    expect(getHermeticPersona("pro-primary")).toEqual(
      HERMETIC_PERSONAS["pro-primary"],
    );
    expect(getHermeticPersona("unknown")).toBeNull();
    expect(getHermeticPersona(undefined)).toBeNull();
  });

  it("enforces the safety boundary wherever hermetic mode is consumed", () => {
    vi.stubEnv("HERMETIC_MODE", "1");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "libsql://production-database");
    vi.stubEnv("APP_BASE_URL", "https://daylilycatalog.com");

    expect(() => isHermeticMode()).toThrow(
      "Hermetic mode cannot run in production.",
    );
  });

  it("allows realistic-data adapters only for the validated local runtime", () => {
    vi.stubEnv("REALISTIC_DATA_RUNTIME_ID", "local-realistic-data");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv(
      "DATABASE_URL",
      `file:${path.join(appRoot, "local", "realistic-data", "atlas.sqlite")}`,
    );
    vi.stubEnv("APP_BASE_URL", "http://localhost:3012");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_clerk");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_stripe");
    expect(isRealisticDataMode()).toBe(true);

    vi.stubEnv("DATABASE_URL", "file:/tmp/production-copy.sqlite");
    expect(() => isRealisticDataMode()).toThrow(
      "Realistic-data database must be stored under local/realistic-data.",
    );
  });
});
