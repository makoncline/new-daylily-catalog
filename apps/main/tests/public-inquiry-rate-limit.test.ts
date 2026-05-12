// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { KVStore } from "@/server/db/kvStore";
import {
  enforcePublicInquiryRateLimit,
  getPublicInquiryClientId,
  PUBLIC_INQUIRY_RATE_LIMIT,
} from "@/server/services/public-inquiry-rate-limit";

function createMemoryStore(): KVStore {
  const values = new Map<string, unknown>();

  return {
    async get<T>(key: string) {
      return (values.get(key) as T | undefined) ?? null;
    },
    async set<T>(key: string, value: T) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
  };
}

describe("public inquiry rate limiting", () => {
  it("uses the first forwarded IP as the client identity", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
    });

    expect(getPublicInquiryClientId(headers)).toBe("203.0.113.10");
  });

  it("rejects repeated inquiries for the same seller and client window", async () => {
    const store = createMemoryStore();
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const input = {
      userId: "seller-1",
      customerEmail: "buyer@example.com",
    };

    for (
      let index = 0;
      index < PUBLIC_INQUIRY_RATE_LIMIT.maxRequests;
      index++
    ) {
      await expect(
        enforcePublicInquiryRateLimit({
          headers,
          input,
          now: 1_000,
          store,
        }),
      ).resolves.toBeUndefined();
    }

    await expect(
      enforcePublicInquiryRateLimit({
        headers,
        input,
        now: 1_000,
        store,
      }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("allows requests after the rate limit window expires", async () => {
    const store = createMemoryStore();
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const input = {
      userId: "seller-1",
      customerEmail: "buyer@example.com",
    };

    for (
      let index = 0;
      index < PUBLIC_INQUIRY_RATE_LIMIT.maxRequests;
      index++
    ) {
      await enforcePublicInquiryRateLimit({
        headers,
        input,
        now: 1_000,
        store,
      });
    }

    await expect(
      enforcePublicInquiryRateLimit({
        headers,
        input,
        now: 1_000 + PUBLIC_INQUIRY_RATE_LIMIT.windowMs + 1,
        store,
      }),
    ).resolves.toBeUndefined();
  });
});
