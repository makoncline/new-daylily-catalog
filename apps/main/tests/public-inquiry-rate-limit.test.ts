// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  createTransactionalPublicInquiryRateLimitStore,
  enforcePublicInquiryRateLimit,
  getPublicInquiryClientId,
  type PublicInquiryRateLimitStore,
  PUBLIC_INQUIRY_RATE_LIMIT,
} from "@/server/services/public-inquiry-rate-limit";

interface MemoryKeyValueDb {
  values: Map<string, string>;
  keyValue: {
    findUnique: (args: {
      where: { key: string };
      select: { value: true };
    }) => Promise<{ value: string } | null>;
    upsert: (args: {
      where: { key: string };
      update: { value: string };
      create: { key: string; value: string };
    }) => Promise<unknown>;
  };
  $transaction: <T>(
    callback: (tx: { keyValue: MemoryKeyValueDb["keyValue"] }) => Promise<T>,
  ) => Promise<T>;
}

function createMemoryKeyValueDb(): MemoryKeyValueDb {
  const db: MemoryKeyValueDb = {
    values: new Map<string, string>(),
    keyValue: {
      async findUnique(args) {
        const value = db.values.get(args.where.key);
        return value ? { value } : null;
      },
      async upsert(args) {
        const nextValue = db.values.has(args.where.key)
          ? args.update.value
          : args.create.value;
        db.values.set(args.where.key, nextValue);
        return {};
      },
    },
    async $transaction(callback) {
      const committedValues = db.values;
      const transactionValues = new Map(committedValues);
      const txKeyValue = {
        async findUnique(args: {
          where: { key: string };
          select: { value: true };
        }) {
          const value = transactionValues.get(args.where.key);
          return value ? { value } : null;
        },
        async upsert(args: {
          where: { key: string };
          update: { value: string };
          create: { key: string; value: string };
        }) {
          const nextValue = transactionValues.has(args.where.key)
            ? args.update.value
            : args.create.value;
          transactionValues.set(args.where.key, nextValue);
          return {};
        },
      };

      const result = await callback({ keyValue: txKeyValue });
      db.values = transactionValues;
      return result;
    },
  };

  return db;
}

function createMemoryStore(): PublicInquiryRateLimitStore {
  const db = createMemoryKeyValueDb();

  return createTransactionalPublicInquiryRateLimitStore(db);
}

function parseBucket(value: string | undefined) {
  return value
    ? ((JSON.parse(value) as { timestamps?: number[] }).timestamps ?? [])
    : [];
}

async function findBucketKey(db: MemoryKeyValueDb, matchCount: number) {
  for (const [key, value] of db.values.entries()) {
    if (parseBucket(value).length === matchCount) {
      return key;
    }
  }

  throw new Error(`No bucket with ${matchCount} entries found`);
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

  it("rolls back earlier bucket writes when a later bucket is over limit", async () => {
    const db = createMemoryKeyValueDb();
    const store = createTransactionalPublicInquiryRateLimitStore(db);
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const input = {
      userId: "seller-1",
      customerEmail: "buyer@example.com",
    };

    await enforcePublicInquiryRateLimit({
      headers,
      input,
      now: 1_000,
      store,
    });
    const ipBucketKey = await findBucketKey(db, 1);

    for (
      let index = 1;
      index < PUBLIC_INQUIRY_RATE_LIMIT.maxRequests;
      index++
    ) {
      await enforcePublicInquiryRateLimit({
        headers: new Headers({ "x-forwarded-for": `203.0.113.${index + 10}` }),
        input,
        now: 1_000,
        store,
      });
    }

    expect(parseBucket(db.values.get(ipBucketKey))).toHaveLength(1);

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
    expect(parseBucket(db.values.get(ipBucketKey))).toHaveLength(1);
  });
});
