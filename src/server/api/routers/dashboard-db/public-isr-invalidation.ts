import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { isPublished } from "@/server/db/public-visibility/filters";

interface InvalidatePublicIsrForCatalogMutationInput {
  db: PrismaClient;
  userId: string;
  slugCandidates?: Array<string | null | undefined>;
  cultivarNormalizedNames?: Array<string | null | undefined>;
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

function revalidateCatalogPathsForSlug(slug: string): void {
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/page/[page]`, "page");
  revalidatePath(`/${slug}/search`);
}

async function getCanonicalSlug(db: PrismaClient, userId: string): Promise<string> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  return profile?.slug ?? userId;
}

async function getPublishedCultivarNormalizedNamesForUser(
  db: PrismaClient,
  userId: string,
): Promise<string[]> {
  const rows = await db.listing.findMany({
    where: {
      userId,
      cultivarReferenceId: { not: null },
      ...isPublished(),
    },
    select: {
      cultivarReference: {
        select: {
          normalizedName: true,
        },
      },
    },
  });

  return rows
    .map((row) => row.cultivarReference?.normalizedName ?? null)
    .filter((normalizedName): normalizedName is string => normalizedName !== null);
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

export async function invalidatePublicIsrForCatalogMutation(
  input: InvalidatePublicIsrForCatalogMutationInput,
): Promise<void> {
  const canonicalSlug = await getCanonicalSlug(input.db, input.userId);
  const slugs = toUniqueNonEmpty([canonicalSlug, ...(input.slugCandidates ?? [])]);

  slugs.forEach((slug) => {
    revalidateCatalogPathsForSlug(slug);
  });

  revalidatePath("/catalogs");

  const cultivarNormalizedNames =
    input.cultivarNormalizedNames ??
    (await getPublishedCultivarNormalizedNamesForUser(input.db, input.userId));
  const cultivarSegments = toCultivarSegments(cultivarNormalizedNames);

  cultivarSegments.forEach((segment) => {
    revalidatePath(`/cultivar/${segment}`);
  });
}
