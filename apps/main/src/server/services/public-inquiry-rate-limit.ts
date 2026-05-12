import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { db as appDb } from "@/server/db";

export const PUBLIC_INQUIRY_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
} as const;

interface RateLimitBucket {
  timestamps: number[];
}

interface RateLimitKeyValueDelegate {
  findUnique: (args: {
    where: { key: string };
    select: { value: true };
  }) => Promise<{ value: string } | null>;
  upsert: (args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }) => Promise<unknown>;
}

interface TransactionalRateLimitDb {
  $transaction: <T>(
    callback: (tx: { keyValue: RateLimitKeyValueDelegate }) => Promise<T>,
  ) => Promise<T>;
}

export interface PublicInquiryRateLimitStore {
  consumeBuckets: (args: {
    keys: string[];
    maxRequests: number;
    now: number;
    windowMs: number;
  }) => Promise<void>;
}

export interface PublicInquiryRateLimitInput {
  userId: string;
  customerEmail: string;
}

function getHeader(headers: Headers | undefined, name: string) {
  return headers?.get(name)?.trim() ?? "";
}

export function getPublicInquiryClientId(headers: Headers | undefined) {
  const forwardedFor = getHeader(headers, "x-forwarded-for");
  const forwardedIp = forwardedFor
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return (
    forwardedIp ||
    getHeader(headers, "x-real-ip") ||
    getHeader(headers, "cf-connecting-ip") ||
    "unknown"
  );
}

function hashRateLimitKey(parts: string[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

function parseRateLimitBucket(value: string | null): RateLimitBucket {
  if (!value) {
    return { timestamps: [] };
  }

  try {
    const parsed = JSON.parse(value) as Partial<RateLimitBucket>;
    return {
      timestamps: Array.isArray(parsed.timestamps)
        ? parsed.timestamps.filter((timestamp) => typeof timestamp === "number")
        : [],
    };
  } catch {
    return { timestamps: [] };
  }
}

async function consumeRateLimitBucket(args: {
  keyValue: RateLimitKeyValueDelegate;
  key: string;
  maxRequests: number;
  now: number;
  windowMs: number;
}) {
  const record = await args.keyValue.findUnique({
    where: { key: args.key },
    select: { value: true },
  });
  const bucket = parseRateLimitBucket(record?.value ?? null);
  const windowStart = args.now - args.windowMs;
  const timestamps = bucket.timestamps.filter(
    (timestamp) => timestamp > windowStart,
  );

  if (timestamps.length >= args.maxRequests) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many inquiries. Please try again later.",
    });
  }

  timestamps.push(args.now);
  await args.keyValue.upsert({
    where: { key: args.key },
    update: { value: JSON.stringify({ timestamps }) },
    create: { key: args.key, value: JSON.stringify({ timestamps }) },
  });
}

export function createTransactionalPublicInquiryRateLimitStore(
  db: TransactionalRateLimitDb,
): PublicInquiryRateLimitStore {
  return {
    async consumeBuckets(args) {
      await db.$transaction(async (tx) => {
        for (const key of args.keys) {
          await consumeRateLimitBucket({
            keyValue: tx.keyValue,
            key,
            maxRequests: args.maxRequests,
            now: args.now,
            windowMs: args.windowMs,
          });
        }
      });
    },
  };
}

const defaultRateLimitStore =
  createTransactionalPublicInquiryRateLimitStore(appDb);

export async function enforcePublicInquiryRateLimit(args: {
  headers?: Headers;
  input: PublicInquiryRateLimitInput;
  now?: number;
  store?: PublicInquiryRateLimitStore;
}) {
  const now = args.now ?? Date.now();
  const store = args.store ?? defaultRateLimitStore;
  const clientId = getPublicInquiryClientId(args.headers);
  const customerEmail = args.input.customerEmail.trim().toLowerCase();
  const bucketInputs = [
    ["ip", clientId, args.input.userId],
    ["email", customerEmail, args.input.userId],
  ];

  await store.consumeBuckets({
    keys: bucketInputs.map(
      (bucketInput) => `public-inquiry:${hashRateLimitKey(bucketInput)}`,
    ),
    maxRequests: PUBLIC_INQUIRY_RATE_LIMIT.maxRequests,
    now,
    windowMs: PUBLIC_INQUIRY_RATE_LIMIT.windowMs,
  });
}
