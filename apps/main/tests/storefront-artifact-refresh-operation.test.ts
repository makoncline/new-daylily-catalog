// @vitest-environment node

import { Buffer } from "node:buffer";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const scriptPath = path.join(
  process.cwd(),
  "scripts/refresh-public-storefront-artifacts.mjs",
);

interface OperationModule {
  INTERNAL_REFRESH_URL: string;
  runStorefrontArtifactRefreshOperation: (options: {
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
  }) => Promise<unknown>;
}

async function loadOperation() {
  return (await import(pathToFileURL(scriptPath).href)) as OperationModule;
}

const REFRESH_TOKEN = Buffer.alloc(32, 1).toString("base64url");
const API_PURGE_TOKEN = "api-purge-token-000000000000000000000001";

const SITE_TARGET = {
  siteKey: "rolling-oaks",
  sellerId: "3",
  hostname: "rolling-oaks-daylilies.makon.dev",
  zoneId: "11111111111111111111111111111111",
  cachePurgeToken: "site-purge-token-00000000000000000000001",
  cacheTag: "daylily-storefront-public-html",
} as const;
const SITE_TARGETS = [SITE_TARGET] as const;

function createEnvironment(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    PUBLIC_STOREFRONT_SELLER_IDS: "3",
    STOREFRONT_ARTIFACT_REFRESH_TOKEN: REFRESH_TOKEN,
    STOREFRONT_API_CLOUDFLARE_ZONE_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN: API_PURGE_TOKEN,
    STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON: JSON.stringify(SITE_TARGETS),
    ...overrides,
  };
}

function successResponse(body: unknown) {
  return Response.json(body, { status: 200 });
}

describe("storefront artifact refresh operation", () => {
  it("refreshes the exact allowlist, then purges the API and site tags in order", async () => {
    const operation = await loadOperation();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        successResponse({
          generatedAt: "2026-08-29T20:00:00.000Z",
          sellers: ["3"],
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(
          successResponse({ success: true, result: { id: "purge-id" } }),
        ),
      );

    await expect(
      operation.runStorefrontArtifactRefreshOperation({
        env: createEnvironment(),
        fetchImpl,
      }),
    ).resolves.toMatchObject({
      sellers: ["3"],
      purgedSites: ["rolling-oaks"],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const calls = fetchImpl.mock.calls;
    expect(calls[0]?.[0]).toBe(operation.INTERNAL_REFRESH_URL);
    expect(calls[0]?.[1]).toMatchObject({
      method: "POST",
      redirect: "error",
    });
    expect(calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(calls[0]?.[1]?.headers).get("Authorization")).toBe(
      `Bearer ${REFRESH_TOKEN}`,
    );
    expect(calls.slice(1).map(([url]) => url)).toEqual([
      "https://api.cloudflare.com/client/v4/zones/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/purge_cache",
      "https://api.cloudflare.com/client/v4/zones/11111111111111111111111111111111/purge_cache",
    ]);
    expect(
      calls.slice(1).map(([, options]) => {
        if (typeof options?.body !== "string") {
          throw new Error("Expected a JSON request body.");
        }
        return JSON.parse(options.body) as unknown;
      }),
    ).toEqual([
      { tags: ["daylily-storefront-data"] },
      { tags: ["daylily-storefront-public-html"] },
    ]);
    expect(
      calls
        .slice(1)
        .map(([, options]) =>
          new Headers(options?.headers).get("Authorization"),
        ),
    ).toEqual([
      `Bearer ${API_PURGE_TOKEN}`,
      `Bearer ${SITE_TARGET.cachePurgeToken}`,
    ]);
    expect(
      calls
        .slice(1)
        .every(([, options]) => options?.signal instanceof AbortSignal),
    ).toBe(true);
  });

  it("rejects incomplete, extra, or duplicate site configuration before refresh", async () => {
    const operation = await loadOperation();
    const invalidTargets: unknown[] = [
      [],
      [
        SITE_TARGET,
        {
          ...SITE_TARGET,
          zoneId: "22222222222222222222222222222222",
          cachePurgeToken: "site-purge-token-00000000000000000000002",
        },
      ],
      [{ ...SITE_TARGET, cacheTag: "wrong-cache-tag" }],
      [{ ...SITE_TARGET, unexpected: "value" }],
    ];

    for (const targets of invalidTargets) {
      const fetchImpl = vi.fn<typeof fetch>();

      await expect(
        operation.runStorefrontArtifactRefreshOperation({
          env: createEnvironment({
            STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON:
              JSON.stringify(targets),
          }),
          fetchImpl,
        }),
      ).rejects.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("rejects unapproved site, seller, and hostname identities before refresh", async () => {
    const operation = await loadOperation();
    const invalidTargets = [
      {
        target: { ...SITE_TARGET, siteKey: "example-garden" },
        message: /unapproved siteKey/u,
      },
      {
        target: { ...SITE_TARGET, sellerId: "4" },
        message: /sellerId does not match/u,
      },
      {
        target: { ...SITE_TARGET, hostname: "flowers.example.com" },
        message: /hostname does not match/u,
      },
    ];

    for (const { message, target } of invalidTargets) {
      const fetchImpl = vi.fn<typeof fetch>();
      await expect(
        operation.runStorefrontArtifactRefreshOperation({
          env: createEnvironment({
            STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON: JSON.stringify([
              target,
            ]),
          }),
          fetchImpl,
        }),
      ).rejects.toThrow(message);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("rejects invalid or reused credentials before refresh", async () => {
    const operation = await loadOperation();
    const invalidEnvironments = [
      createEnvironment({
        STOREFRONT_ARTIFACT_REFRESH_TOKEN: `${REFRESH_TOKEN}=`,
      }),
      createEnvironment({
        STOREFRONT_API_CLOUDFLARE_CACHE_PURGE_TOKEN: "",
      }),
      createEnvironment({
        STOREFRONT_SITE_CLOUDFLARE_PURGE_TARGETS_JSON: JSON.stringify([
          { ...SITE_TARGET, cachePurgeToken: API_PURGE_TOKEN },
        ]),
      }),
    ];

    for (const env of invalidEnvironments) {
      const fetchImpl = vi.fn<typeof fetch>();
      await expect(
        operation.runStorefrontArtifactRefreshOperation({ env, fetchImpl }),
      ).rejects.toThrow();
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("does not purge when the refresh receipt differs from the allowlist", async () => {
    const operation = await loadOperation();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse({
        generatedAt: "2026-08-29T20:00:00.000Z",
        sellers: ["4"],
      }),
    );

    await expect(
      operation.runStorefrontArtifactRefreshOperation({
        env: createEnvironment(),
        fetchImpl,
      }),
    ).rejects.toThrow(/seller set/u);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not start site purges when the API purge fails", async () => {
    const operation = await loadOperation();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        successResponse({
          generatedAt: "2026-08-29T20:00:00.000Z",
          sellers: ["3"],
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { success: false, errors: [{ message: "denied" }] },
          { status: 200 },
        ),
      );

    await expect(
      operation.runStorefrontArtifactRefreshOperation({
        env: createEnvironment(),
        fetchImpl,
      }),
    ).rejects.toThrow(/Cloudflare purge failed/u);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports a site purge failure after the API purge", async () => {
    const operation = await loadOperation();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        successResponse({
          generatedAt: "2026-08-29T20:00:00.000Z",
          sellers: ["3"],
        }),
      )
      .mockResolvedValueOnce(
        successResponse({ success: true, result: { id: "api-purge" } }),
      )
      .mockResolvedValueOnce(new Response("gateway failure", { status: 502 }));

    await expect(
      operation.runStorefrontArtifactRefreshOperation({
        env: createEnvironment(),
        fetchImpl,
      }),
    ).rejects.toThrow(/Cloudflare purge failed/u);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
