// @vitest-environment node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  allowedProductionRequest,
  authFailureCategory,
  blockedRequestLabel,
  productionOrigin,
  productionSmokeConfig,
  productionSmokePassword,
} from "../scripts/production-smoke-config.mjs";

const inputs = {
  DAYLILY_SMOKE_EMAIL: "smoke@example.test",
  DAYLILY_SMOKE_CLERK_USER_ID: "user_existing",
  DAYLILY_SMOKE_PROFILE_SLUG: "existing-garden",
  DAYLILY_SMOKE_RELEASE: "a".repeat(40),
};

describe("production browser smoke boundary", () => {
  it("rejects other targets, short releases, debug output, and missing existing-account facts", () => {
    expect(productionSmokeConfig(inputs)).toMatchObject({
      release: inputs.DAYLILY_SMOKE_RELEASE,
    });
    for (const override of [
      { BASE_URL: "http://localhost:3000" },
      { DAYLILY_SMOKE_RELEASE: "aaaaaaa" },
      { DEBUG: "pw:api" },
      { npm_config_pwdebug: "1" },
      { npm_package_config_pwdebug: "console" },
      { DAYLILY_SMOKE_CLERK_USER_ID: "" },
    ]) {
      expect(() => productionSmokeConfig({ ...inputs, ...override })).toThrow();
    }
  });

  it("stops the actual entry before browser import when the secret is missing, and does not echo inputs", () => {
    const result = spawnSync(
      process.execPath,
      [path.resolve("scripts/run-production-smoke.mjs")],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, NODE_ENV: "test", ...inputs },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Set a private DAYLILY_SMOKE_PASSWORD");
    expect(result.stderr).not.toContain(inputs.DAYLILY_SMOKE_EMAIL);
    const argumentRun = spawnSync(
      process.execPath,
      [
        path.resolve("scripts/run-production-smoke.mjs"),
        "private-password-sentinel",
      ],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, NODE_ENV: "test", ...inputs },
      },
    );
    expect(argumentRun.status).toBe(1);
    expect(argumentRun.stderr).not.toContain("private-password-sentinel");
  });

  it("reads only the confirmed exact Keychain item and suppresses lookup output on failure", () => {
    const read = vi.fn(() => ({
      status: 1,
      stdout: "secret-sentinel",
      stderr: "private-diagnostic-sentinel",
    }));
    expect(
      productionSmokePassword(
        { ...inputs, DAYLILY_SMOKE_PASSWORD: "runtime-secret" },
        read,
      ),
    ).toBe("runtime-secret");
    expect(read).not.toHaveBeenCalled();
    expect(() => productionSmokePassword(inputs, read)).toThrow(
      "Set a private",
    );
    expect(read).not.toHaveBeenCalled();
    if (process.platform !== "darwin") return;
    expect(() =>
      productionSmokePassword(
        { ...inputs, DAYLILY_SMOKE_USE_KEYCHAIN: "1" },
        read,
      ),
    ).toThrow("exact production smoke Keychain item");
    expect(read).toHaveBeenCalledWith(
      "/usr/bin/security",
      [
        "find-generic-password",
        "-s",
        "daylily-production-smoke",
        "-a",
        inputs.DAYLILY_SMOKE_EMAIL,
        "-w",
      ],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("permits audited dashboard reads only after account verification and blocks writes in mixed batches", () => {
    const request = (names: string, method = "GET", verified = true) =>
      allowedProductionRequest(
        `${productionOrigin}/api/trpc/${names}?batch=1`,
        method,
        verified,
      );
    expect(request("public.getProfile", "GET", false)).toBe(true);
    expect(request("dashboardDb.userProfile.get", "GET", false)).toBe(false);
    expect(request("user.getCurrentUser,dashboardDb.userProfile.get")).toBe(
      true,
    );
    expect(
      request(
        "dashboardDb.image.listByListingIds,dashboardDb.cultivarReference.getByIdsBatchReplica",
        "POST",
      ),
    ).toBe(true);
    for (const name of [
      "dashboardDb.userProfile.update",
      "dashboardDb.listing.create",
      "dashboardDb.list.delete",
      "dashboardDb.image.getPresignedUrl",
      "stripe.generateCheckout",
      "unknown.get",
    ]) {
      expect(request(name)).toBe(false);
      expect(
        request(`dashboardDb.image.listByListingIds,${name}`, "POST"),
      ).toBe(false);
    }
    for (const route of [
      "/api/status",
      "/api/v1/status",
      "/api/mcp",
      "/api/upload",
    ])
      expect(
        allowedProductionRequest(`${productionOrigin}${route}`, "GET", true),
      ).toBe(false);
    expect(
      allowedProductionRequest(`${productionOrigin}/dashboard`, "GET", false),
    ).toBe(false);
    expect(
      allowedProductionRequest(`${productionOrigin}/dashboard`, "POST", true),
    ).toBe(false);
  });

  it("reports only fixed auth categories and bounded paths without private request inputs", () => {
    const sentinel = "private-password-sentinel";
    expect(
      blockedRequestLabel(
        `${productionOrigin}/api/trpc/dashboardDb.userProfile.update?input=${sentinel}`,
      ),
    ).toBe("/api/trpc/dashboardDb.userProfile.update");
    expect(
      blockedRequestLabel(`${productionOrigin}/api/upload/${sentinel}`),
    ).toBe("unlisted-app-request");
    expect(authFailureCategory(`Incorrect password: ${sentinel}`)).toBe(
      "credential-or-input-error",
    );
    expect(
      authFailureCategory(`Enter a verification code for ${sentinel}`),
    ).toBe("additional-verification");
    expect(authFailureCategory("Continue")).toBe("unresolved-auth-timeout");
  });
});
