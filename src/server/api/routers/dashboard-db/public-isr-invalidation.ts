import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { trackPublicIsrPathInvalidation } from "@/server/analytics/public-isr-posthog";

interface InvalidatePublicIsrForCatalogMutationInput {
  db: PrismaClient;
  userId: string;
  slugCandidates?: Array<string | null | undefined>;
  cultivarNormalizedNames?: Array<string | null | undefined>;
}

interface RevalidatePathInput {
  path: string;
  type?: "page" | "layout";
}

const INTERNAL_REVALIDATE_ROUTE = "/api/internal/public-cache-revalidate";
const PUBLIC_ISR_INVALIDATION_SOURCE = "dashboard-db.catalog-mutation";

function shouldIgnoreMissingStaticGenerationStoreError(
  error: unknown,
): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    error instanceof Error &&
    error.message.includes("static generation store missing")
  );
}

function safeRevalidatePath(path: string, type?: "page" | "layout"): void {
  try {
    if (type) {
      revalidatePath(path, type);
      trackPublicIsrPathInvalidation({
        path,
        sourcePage: "server:dashboard-db.public-isr-invalidation",
        transport: "direct",
        triggerSource: PUBLIC_ISR_INVALIDATION_SOURCE,
        type,
      });
      return;
    }

    revalidatePath(path);
    trackPublicIsrPathInvalidation({
      path,
      sourcePage: "server:dashboard-db.public-isr-invalidation",
      transport: "direct",
      triggerSource: PUBLIC_ISR_INVALIDATION_SOURCE,
    });
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return;
    }

    throw error;
  }
}

function toUniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();

  values.forEach((value) => {
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      unique.add(normalizedValue);
    }
  });

  return Array.from(unique);
}

async function getCanonicalSlug(
  db: PrismaClient,
  userId: string,
): Promise<string> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  return profile?.slug ?? userId;
}

function toCultivarSegments(
  cultivarNormalizedNames: Array<string | null | undefined>,
): string[] {
  const segments = new Set<string>();

  cultivarNormalizedNames.forEach((name) => {
    const segment = toCultivarRouteSegment(name);
    if (segment) {
      segments.add(segment);
    }
  });

  return Array.from(segments);
}

function getTrustedRevalidationOrigin(): string | null {
  // Avoid internal loopback fetches during tests and keep unit tests deterministic.
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  return getBaseUrl();
}

function toUniquePathInputs(
  paths: RevalidatePathInput[],
): RevalidatePathInput[] {
  const byKey = new Map<string, RevalidatePathInput>();

  paths.forEach((entry) => {
    const key = `${entry.type ?? "default"}:${entry.path}`;
    byKey.set(key, entry);
  });

  return Array.from(byKey.values());
}

async function runRouteHandlerRevalidation(args: {
  paths: RevalidatePathInput[];
}): Promise<boolean> {
  const origin = getTrustedRevalidationOrigin();
  if (!origin) {
    return false;
  }

  try {
    const response = await fetch(`${origin}${INTERNAL_REVALIDATE_ROUTE}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CLERK_WEBHOOK_SECRET}`,
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        paths: args.paths,
        source: PUBLIC_ISR_INVALIDATION_SOURCE,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function applyPublicCacheRevalidations(args: {
  paths: RevalidatePathInput[];
}): Promise<void> {
  const uniquePaths = toUniquePathInputs(args.paths);

  const routeHandlerApplied = await runRouteHandlerRevalidation({
    paths: uniquePaths,
  });

  if (routeHandlerApplied) {
    return;
  }

  uniquePaths.forEach((entry) => {
    safeRevalidatePath(entry.path, entry.type);
  });
}

export async function invalidatePublicIsrForCatalogMutation(
  input: InvalidatePublicIsrForCatalogMutationInput,
): Promise<void> {
  const canonicalSlug = await getCanonicalSlug(input.db, input.userId);
  const slugs = toUniqueNonEmpty([
    canonicalSlug,
    ...(input.slugCandidates ?? []),
  ]);
  const cultivarSegments = toCultivarSegments(
    input.cultivarNormalizedNames ?? [],
  );
  const pathsToRevalidate: RevalidatePathInput[] = [{ path: "/catalogs" }];
  slugs.forEach((slug) => {
    pathsToRevalidate.push({ path: `/${slug}` });
  });

  cultivarSegments.forEach((segment) => {
    pathsToRevalidate.push({ path: `/cultivar/${segment}` });
  });

  await applyPublicCacheRevalidations({
    paths: pathsToRevalidate,
  });
}
