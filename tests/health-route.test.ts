// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/health-route.sqlite";
process.env.CLERK_SECRET_KEY ??= "sk_test_clerk";
process.env.CLERK_WEBHOOK_SECRET ??= "whsec_test_clerk";
process.env.STRIPE_SECRET_KEY ??= "sk_test_stripe";
process.env.STRIPE_PRICE_ID ??= "price_test_123";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_BUCKET_NAME ??= "test-bucket";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_clerk";
process.env.NEXT_PUBLIC_CLOUDFLARE_URL ??= "https://example.com";

const healthDependencyMocks = vi.hoisted(() => ({
  baseUrl: vi.fn(),
  clerkGetUserList: vi.fn(),
  dbFindFirst: vi.fn(),
  getClerk: vi.fn(),
  getProUserIds: vi.fn(),
  getPublicProfilesBase: vi.fn(),
  s3Send: vi.fn(),
  stripePriceRetrieve: vi.fn(),
}));

const routeHealthCheckMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: healthDependencyMocks.baseUrl,
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findFirst: healthDependencyMocks.dbFindFirst,
    },
  },
}));

vi.mock("@/server/db/getCachedProUserIds", () => ({
  getProUserIds: healthDependencyMocks.getProUserIds,
}));

vi.mock("@/server/db/getPublicProfiles", () => ({
  getPublicProfilesBase: healthDependencyMocks.getPublicProfilesBase,
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    prices: {
      retrieve: healthDependencyMocks.stripePriceRetrieve,
    },
  }),
}));

vi.mock("@/server/clerk/client", () => ({
  getClerk: healthDependencyMocks.getClerk,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  HeadBucketCommand: class {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  },
  S3Client: vi.fn(() => ({
    send: healthDependencyMocks.s3Send,
  })),
}));

describe("runHealthCheck", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    healthDependencyMocks.baseUrl.mockReturnValue("https://daylilycatalog.com");
    healthDependencyMocks.dbFindFirst.mockResolvedValue(null);
    healthDependencyMocks.getProUserIds.mockResolvedValue(["user-1"]);
    healthDependencyMocks.getPublicProfilesBase.mockResolvedValue([]);
    healthDependencyMocks.stripePriceRetrieve.mockResolvedValue({
      id: process.env.STRIPE_PRICE_ID,
    });
    healthDependencyMocks.s3Send.mockResolvedValue({});
    healthDependencyMocks.clerkGetUserList.mockResolvedValue({
      data: [],
    });
    healthDependencyMocks.getClerk.mockResolvedValue({
      users: {
        getUserList: healthDependencyMocks.clerkGetUserList,
      },
    });
  });

  it("returns success when all checks pass", async () => {
    const { HEALTH_CHECK_NAMES, runHealthCheck } = await import(
      "@/server/health/run-health-check"
    );

    const result = await runHealthCheck();

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.passed).toEqual([...HEALTH_CHECK_NAMES]);
    expect(result.checkedAt).toEqual(expect.any(String));
  });

  it.each([
    [
      "database",
      () =>
        healthDependencyMocks.dbFindFirst.mockRejectedValue(
          new Error("database unreachable"),
        ),
    ],
    [
      "public-data",
      () =>
        healthDependencyMocks.getPublicProfilesBase.mockRejectedValue(
          new Error("public data broken"),
        ),
    ],
    [
      "stripe",
      () =>
        healthDependencyMocks.stripePriceRetrieve.mockRejectedValue(
          new Error("stripe failed"),
        ),
    ],
    [
      "s3",
      () => healthDependencyMocks.s3Send.mockRejectedValue(new Error("s3 failed")),
    ],
    [
      "clerk",
      () =>
        healthDependencyMocks.clerkGetUserList.mockRejectedValue(
          new Error("clerk failed"),
        ),
    ],
  ])("fails when the %s probe fails", async (failedCheck, setupFailure) => {
    setupFailure();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { runHealthCheck } = await import("@/server/health/run-health-check");

    try {
      const result = await runHealthCheck();

      expect(result.ok).toBe(false);
      expect(result.failed).toContain(failedCheck);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe("/api/health route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns a minimal success payload with no-store caching disabled", async () => {
    routeHealthCheckMock.mockResolvedValue({
      checkedAt: "2026-03-13T12:00:00.000Z",
      failed: [],
      ok: true,
      passed: ["base-url", "database", "public-data", "stripe", "s3", "clerk"],
    });
    vi.doMock("@/server/health/run-health-check", () => ({
      runHealthCheck: routeHealthCheckMock,
    }));
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      checkedAt: "2026-03-13T12:00:00.000Z",
      checks: ["base-url", "database", "public-data", "stripe", "s3", "clerk"],
    });
  });

  it("returns a minimal failure payload without leaking raw error details", async () => {
    routeHealthCheckMock.mockResolvedValue({
      checkedAt: "2026-03-13T12:00:00.000Z",
      failed: ["database"],
      ok: false,
      passed: ["base-url"],
    });
    vi.doMock("@/server/health/run-health-check", () => ({
      runHealthCheck: routeHealthCheckMock,
    }));
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: false,
      checkedAt: "2026-03-13T12:00:00.000Z",
      failed: ["database"],
    });
    expect(JSON.stringify(payload)).not.toContain("error");
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("returns an empty HEAD response with the same failing status", async () => {
    routeHealthCheckMock.mockResolvedValue({
      checkedAt: "2026-03-13T12:00:00.000Z",
      failed: ["stripe"],
      ok: false,
      passed: ["base-url", "database", "public-data"],
    });
    vi.doMock("@/server/health/run-health-check", () => ({
      runHealthCheck: routeHealthCheckMock,
    }));
    const { HEAD } = await import("@/app/api/health/route");

    const response = await HEAD();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });
});
