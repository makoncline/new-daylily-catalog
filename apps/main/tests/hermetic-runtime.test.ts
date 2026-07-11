import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getHermeticPersona,
  HERMETIC_PERSONAS,
  validateHermeticRuntime,
} from "@/lib/hermetic/runtime";

const appRoot = process.cwd();
const safeDatabaseUrl = `file:${path.join(
  appRoot,
  "tests",
  ".tmp",
  "hermetic-runtime.sqlite",
)}`;

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
});
