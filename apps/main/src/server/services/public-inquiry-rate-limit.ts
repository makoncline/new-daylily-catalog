import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { kvStore as appKvStore, type KVStore } from "@/server/db/kvStore";

export const PUBLIC_INQUIRY_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
} as const;

interface RateLimitBucket {
  timestamps: number[];
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

async function consumeRateLimitBucket(args: {
  key: string;
  maxRequests: number;
  now: number;
  store: KVStore;
  windowMs: number;
}) {
  const bucket = (await args.store.get<RateLimitBucket>(args.key)) ?? {
    timestamps: [],
  };
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
  await args.store.set(args.key, { timestamps });
}

export async function enforcePublicInquiryRateLimit(args: {
  headers?: Headers;
  input: PublicInquiryRateLimitInput;
  now?: number;
  store?: KVStore;
}) {
  const now = args.now ?? Date.now();
  const store = args.store ?? appKvStore;
  const clientId = getPublicInquiryClientId(args.headers);
  const customerEmail = args.input.customerEmail.trim().toLowerCase();
  const bucketInputs = [
    ["ip", clientId, args.input.userId],
    ["email", customerEmail, args.input.userId],
  ];

  for (const bucketInput of bucketInputs) {
    await consumeRateLimitBucket({
      key: `public-inquiry:${hashRateLimitKey(bucketInput)}`,
      maxRequests: PUBLIC_INQUIRY_RATE_LIMIT.maxRequests,
      now,
      store,
      windowMs: PUBLIC_INQUIRY_RATE_LIMIT.windowMs,
    });
  }
}
