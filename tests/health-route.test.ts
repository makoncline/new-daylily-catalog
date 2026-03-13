// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/health-route.sqlite";
process.env.CLERK_SECRET_KEY ??= "sk_test_clerk";
process.env.STRIPE_SECRET_KEY ??= "sk_test_stripe";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_BUCKET_NAME ??= "test-bucket";

const healthDependencyMocks = vi.hoisted(() => ({
  baseUrl: vi.fn(),
  clerkGetUserList: vi.fn(),
  dbFindFirst: vi.fn(),
  getClerk: vi.fn(),
  s3Send: vi.fn(),
  stripeBalanceRetrieve: vi.fn(),
}));

const routeHealthCheckMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: healthDependencyMocks.baseUrl,
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    balance: {
      retrieve: healthDependencyMocks.stripeBalanceRetrieve,
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

async function loadHealthModule() {
  const module = await import("@/server/health/run-health-check");

  module.healthDependencies.getDb = async () => ({
    user: {
      findFirst: healthDependencyMocks.dbFindFirst,
    },
  });
  module.healthDependencies.getPublishedListingWhere = async () => ({});

  return module;
}

describe("runHealthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    healthDependencyMocks.baseUrl.mockReturnValue("https://daylilycatalog.com");
    healthDependencyMocks.dbFindFirst.mockResolvedValue(null);
    healthDependencyMocks.stripeBalanceRetrieve.mockResolvedValue({});
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
    const { HEALTH_CHECK_NAMES, runHealthCheck } = await loadHealthModule();

    const result = await runHealthCheck();

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.passed).toEqual([...HEALTH_CHECK_NAMES]);
    expect(result.checkedAt).toEqual(expect.any(String));
  });

  it.each([
    [
      "database",
      () => {
        healthDependencyMocks.dbFindFirst.mockImplementation(async (args) => {
          if (!args.where) {
            throw new Error("database unreachable");
          }

          return null;
        });
      },
    ],
    [
      "public-data",
      () => {
        healthDependencyMocks.dbFindFirst.mockImplementation(async (args) => {
          if (args.where) {
            throw new Error("public data broken");
          }

          return null;
        });
      },
    ],
    [
      "stripe",
      () =>
        healthDependencyMocks.stripeBalanceRetrieve.mockRejectedValue(
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
    const { runHealthCheck } = await loadHealthModule();

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
