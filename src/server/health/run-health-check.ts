import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Prisma } from "@prisma/client";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getClerk } from "@/server/clerk/client";
import { getStripeClient } from "@/server/stripe/client";

export const HEALTH_CHECK_NAMES = [
  "base-url",
  "database",
  "public-data",
  "stripe",
  "s3",
  "clerk",
] as const;

export type HealthCheckName = (typeof HEALTH_CHECK_NAMES)[number];

interface HealthCheckExecution {
  name: HealthCheckName;
  ok: boolean;
}

export interface HealthCheckSummary {
  checkedAt: string;
  failed: HealthCheckName[];
  ok: boolean;
  passed: HealthCheckName[];
}

interface HealthDbClient {
  user: {
    findFirst: (args: {
      select: {
        id: true;
        profile?: {
          select: {
            slug: true;
          };
        };
      };
      where?: {
        listings: {
          some: Prisma.ListingWhereInput;
        };
      };
    }) => Promise<unknown>;
  };
}

const HEALTH_CHECK_TIMEOUT_MS = 5000;

export const healthDependencies = {
  async getDb(): Promise<HealthDbClient> {
    const { db } = await import("@/server/db");
    return db;
  },
  async getPublishedListingWhere(): Promise<Prisma.ListingWhereInput> {
    const { isPublished } = await import("@/server/db/public-visibility/filters");
    return isPublished();
  },
};

function requireProcessEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getHealthError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

async function withTimeout<T>(name: HealthCheckName, task: Promise<T>) {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Health check '${name}' timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms.`,
            ),
          );
        }, HEALTH_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function runNamedCheck(
  name: HealthCheckName,
  check: () => Promise<void>,
): Promise<HealthCheckExecution> {
  try {
    await withTimeout(name, check());
    return {
      name,
      ok: true,
    };
  } catch (error) {
    const healthError = getHealthError(error);
    console.error("[health] check failed", {
      check: name,
      error: healthError,
    });
    return {
      name,
      ok: false,
    };
  }
}

async function checkBaseUrl() {
  const baseUrl = getCanonicalBaseUrl();
  new URL(baseUrl);
}

async function checkDatabase() {
  const db = await healthDependencies.getDb();
  await db.user.findFirst({
    select: {
      id: true,
    },
  });
}

async function checkPublicData() {
  const [db, publishedListingWhere] = await Promise.all([
    healthDependencies.getDb(),
    healthDependencies.getPublishedListingWhere(),
  ]);
  await db.user.findFirst({
    where: {
      listings: {
        some: publishedListingWhere,
      },
    },
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
    },
  });
}

async function checkStripe() {
  const stripe = getStripeClient();
  await stripe.balance.retrieve();
}

async function checkS3() {
  const s3 = new S3Client({
    region: requireProcessEnv("AWS_REGION"),
    credentials: {
      accessKeyId: requireProcessEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireProcessEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: requireProcessEnv("AWS_BUCKET_NAME"),
      Key: "health-check/probe.txt",
      ContentType: "text/plain",
    }),
    { expiresIn: 60 },
  );
}

async function checkClerk() {
  const clerk = await getClerk();
  await clerk.users.getUserList({
    limit: 1,
  });
}

const HEALTH_CHECKS: Record<HealthCheckName, () => Promise<void>> = {
  "base-url": checkBaseUrl,
  database: checkDatabase,
  "public-data": checkPublicData,
  stripe: checkStripe,
  s3: checkS3,
  clerk: checkClerk,
};

export async function runHealthCheck(): Promise<HealthCheckSummary> {
  const results = await Promise.all(
    HEALTH_CHECK_NAMES.map((name) => runNamedCheck(name, HEALTH_CHECKS[name])),
  );

  const passed = results
    .filter((result) => result.ok)
    .map((result) => result.name);
  const failed = results
    .filter((result) => !result.ok)
    .map((result) => result.name);

  return {
    checkedAt: new Date().toISOString(),
    ok: failed.length === 0,
    passed,
    failed,
  };
}
