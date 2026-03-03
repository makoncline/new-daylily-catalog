import type { PrismaClient } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { env } from "@/env";
import { CACHE_CONFIG } from "@/config/cache-config";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

interface InvalidatePublicIsrForCatalogMutationInput {
  db: PrismaClient;
  userId: string;
  slugCandidates?: Array<string | null | undefined>;
  cultivarNormalizedNames?: Array<string | null | undefined>;
  requestHeaders?: Headers;
  includeForSaleCountTag?: boolean;
  includeCatalogRoutesTag?: boolean;
}

interface RevalidatePathInput {
  path: string;
  type?: "page" | "layout";
}

const INTERNAL_REVALIDATE_ROUTE = "/api/internal/public-cache-revalidate";

function shouldIgnoreMissingStaticGenerationStoreError(error: unknown): boolean {
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
      return;
    }

    revalidatePath(path);
  } catch (error) {
    if (shouldIgnoreMissingStaticGenerationStoreError(error)) {
      return;
    }

    throw error;
  }
}

function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, "max");
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

async function getCanonicalSlug(db: PrismaClient, userId: string): Promise<string> {
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

function toUniquePathInputs(paths: RevalidatePathInput[]): RevalidatePathInput[] {
  const byKey = new Map<string, RevalidatePathInput>();

  paths.forEach((entry) => {
    const key = `${entry.type ?? "default"}:${entry.path}`;
    byKey.set(key, entry);
  });

  return Array.from(byKey.values());
}

async function runRouteHandlerRevalidation(args: {
  requestHeaders?: Headers;
  paths: RevalidatePathInput[];
  tags: string[];
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
        tags: args.tags,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function applyPublicCacheRevalidations(args: {
  requestHeaders?: Headers;
  paths: RevalidatePathInput[];
  tags: string[];
}): Promise<void> {
  const uniquePaths = toUniquePathInputs(args.paths);
  const uniqueTags = Array.from(new Set(args.tags));

  const routeHandlerApplied = await runRouteHandlerRevalidation({
    requestHeaders: args.requestHeaders,
    paths: uniquePaths,
    tags: uniqueTags,
  });

  if (routeHandlerApplied) {
    return;
  }

  uniquePaths.forEach((entry) => {
    safeRevalidatePath(entry.path, entry.type);
  });
  uniqueTags.forEach((tag) => {
    safeRevalidateTag(tag);
  });
}

const REQUIRED_PUBLIC_CACHE_TAGS = [
  CACHE_CONFIG.TAGS.PUBLIC_PROFILE,
  CACHE_CONFIG.TAGS.PUBLIC_PROFILES,
  CACHE_CONFIG.TAGS.PUBLIC_LISTINGS,
  CACHE_CONFIG.TAGS.PUBLIC_LISTING_DETAIL,
  CACHE_CONFIG.TAGS.PUBLIC_LISTINGS_PAGE,
] as const;

const CULTIVAR_CACHE_TAGS = [
  CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_PAGE,
  CACHE_CONFIG.TAGS.PUBLIC_CULTIVAR_SITEMAP,
] as const;

export async function invalidatePublicIsrForCatalogMutation(
  input: InvalidatePublicIsrForCatalogMutationInput,
): Promise<void> {
  const canonicalSlug = await getCanonicalSlug(input.db, input.userId);
  const slugs = toUniqueNonEmpty([canonicalSlug, ...(input.slugCandidates ?? [])]);
  const cultivarSegments = toCultivarSegments(input.cultivarNormalizedNames ?? []);

  const tagsToRevalidate: string[] = [...REQUIRED_PUBLIC_CACHE_TAGS];
  if (input.includeForSaleCountTag ?? true) {
    tagsToRevalidate.push(CACHE_CONFIG.TAGS.PUBLIC_FOR_SALE_COUNT);
  }
  if (input.includeCatalogRoutesTag ?? true) {
    tagsToRevalidate.push(CACHE_CONFIG.TAGS.PUBLIC_CATALOG_ROUTES);
  }
  if (cultivarSegments.length > 0) {
    tagsToRevalidate.push(...CULTIVAR_CACHE_TAGS);
  }

  const pathsToRevalidate: RevalidatePathInput[] = [{ path: "/catalogs" }];
  slugs.forEach((slug) => {
    pathsToRevalidate.push({ path: `/${slug}` });
    pathsToRevalidate.push({ path: `/${slug}/page/[page]`, type: "page" });
  });

  cultivarSegments.forEach((segment) => {
    pathsToRevalidate.push({ path: `/cultivar/${segment}` });
  });

  await applyPublicCacheRevalidations({
    requestHeaders: input.requestHeaders,
    paths: pathsToRevalidate,
    tags: tagsToRevalidate,
  });
}
