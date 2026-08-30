import type { OutputData } from "@editorjs/editorjs";
import type { Prisma } from "@prisma/client";
import { getCloudflareUrlForDaylilyS3Image } from "@/lib/utils/cloudflareLoader";
import {
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
  type AhsDisplayListing,
} from "@/lib/utils/ahs-display";
import { replicaDb } from "@/server/db";
import {
  isPublicList,
  isPublished,
} from "@/server/db/public-visibility/filters";
import { parseAndSanitizeEditorJsContent } from "@/server/security/editor-js-content";
import { resolveCultivarReferenceImage } from "@/server/services/cultivar-reference-image-read-model";
import {
  imageAssetUrlSelect,
  type ImageAssetUrlRow,
  resolveLegacyImagesWithAssets,
} from "@/server/services/image-asset-read-model";

export interface PublicStorefrontImage {
  id: string;
  url: string;
}

export interface PublicStorefrontProfile {
  slug: string | null;
  title: string | null;
  description: string | null;
  content: OutputData | null;
  location: string | null;
  images: PublicStorefrontImage[];
  updatedAt: string;
}

export interface PublicStorefrontList {
  id: string;
  title: string;
  description: string | null;
  listingIds: string[];
  updatedAt: string;
}

export interface PublicStorefrontCultivar {
  id: string;
  normalizedName: string | null;
  details: (AhsDisplayListing & { rebloom: boolean | null }) | null;
}

export interface PublicStorefrontListing {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  images: PublicStorefrontImage[];
  cultivar: PublicStorefrontCultivar | null;
  updatedAt: string;
}

export interface PublicStorefrontSnapshot {
  version: 1;
  seller: {
    id: string;
    profile: PublicStorefrontProfile | null;
  };
  lists: PublicStorefrontList[];
  listings: PublicStorefrontListing[];
}

const publicImageAssetInclude = {
  select: imageAssetUrlSelect,
  orderBy: [{ order: "asc" }, { id: "asc" }],
} satisfies Prisma.ImageAssetFindManyArgs;

const publicCultivarImageAssetInclude = {
  where: {
    kind: "cultivar" as const,
    status: "ready" as const,
  },
  select: imageAssetUrlSelect,
  orderBy: [{ order: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  take: 1,
} satisfies Prisma.ImageAssetFindManyArgs;

function getPublicStorefrontSelect(sellerId: string) {
  return {
    id: true,
    profile: {
      select: {
        slug: true,
        title: true,
        description: true,
        content: true,
        location: true,
        updatedAt: true,
        images: {
          select: {
            id: true,
            url: true,
          },
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
        imageAssets: publicImageAssetInclude,
      },
    },
    lists: {
      where: {
        userId: sellerId,
        ...isPublicList(),
      },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        listings: {
          where: {
            userId: sellerId,
            ...isPublished(),
          },
          select: {
            id: true,
          },
          orderBy: [{ title: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    },
    listings: {
      where: {
        userId: sellerId,
        ...isPublished(),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        price: true,
        updatedAt: true,
        images: {
          select: {
            id: true,
            url: true,
          },
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
        imageAssets: publicImageAssetInclude,
        cultivarReference: {
          select: {
            id: true,
            normalizedName: true,
            v2AhsCultivar: {
              select: {
                ...v2AhsCultivarDisplaySelect,
                rebloom: true,
              },
            },
            imageAssets: publicCultivarImageAssetInclude,
          },
        },
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    },
  } satisfies Prisma.UserSelect;
}

type PublicStorefrontRow = Prisma.UserGetPayload<{
  select: ReturnType<typeof getPublicStorefrontSelect>;
}>;

function hasStoredEditorJsShape(content: string) {
  try {
    const parsed = JSON.parse(content) as { blocks?: unknown } | null;
    return Boolean(parsed && Array.isArray(parsed.blocks));
  } catch {
    return false;
  }
}

function getPublicProfileContent(
  content: string | null,
  updatedAt: Date,
): OutputData | null {
  const parsed = parseAndSanitizeEditorJsContent(content);
  if (!parsed || !content || hasStoredEditorJsShape(content)) {
    return parsed;
  }

  // The shared legacy parser uses the current time. Use a stored timestamp so
  // the same database state always produces the same ETag.
  return {
    ...parsed,
    time: updatedAt.getTime(),
  };
}

function toPublicImages(args: {
  images: ReadonlyArray<{ id: string; url: string }>;
  imageAssets: readonly ImageAssetUrlRow[];
}): PublicStorefrontImage[] {
  return resolveLegacyImagesWithAssets({
    images: args.images,
    imageAssets: args.imageAssets,
    variant: "display",
  }).map((image) => ({
    id: image.id,
    url: getCloudflareUrlForDaylilyS3Image(image.url),
  }));
}

function toPublicListing(
  listing: PublicStorefrontRow["listings"][number],
): PublicStorefrontListing {
  const displayDetails = getDisplayAhsListing(listing);
  const storedRebloom = listing.cultivarReference?.v2AhsCultivar?.rebloom;
  const details = displayDetails
    ? {
        ...displayDetails,
        rebloom: storedRebloom === null ? null : Boolean(storedRebloom),
      }
    : null;
  const cultivarImage = listing.cultivarReference
    ? resolveCultivarReferenceImage({
        id: `ahs-${listing.id}`,
        fallbackImageUrl: details?.ahsImageUrl,
        imageAssets: listing.cultivarReference.imageAssets,
      })
    : null;
  const listingImages = toPublicImages({
    images: listing.images,
    imageAssets: listing.imageAssets,
  });
  const images =
    listingImages.length > 0 || !cultivarImage
      ? listingImages
      : [
          {
            id: cultivarImage.id,
            url: getCloudflareUrlForDaylilyS3Image(cultivarImage.url),
          },
        ];

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    images,
    cultivar: listing.cultivarReference
      ? {
          id: listing.cultivarReference.id,
          normalizedName: listing.cultivarReference.normalizedName,
          details,
        }
      : null,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function toPublicStorefrontSnapshot(
  row: PublicStorefrontRow,
): PublicStorefrontSnapshot {
  const profile = row.profile;

  return {
    version: 1,
    seller: {
      id: row.id,
      profile: profile
        ? {
            slug: profile.slug,
            title: profile.title,
            description: profile.description,
            content: getPublicProfileContent(
              profile.content,
              profile.updatedAt,
            ),
            location: profile.location,
            images: toPublicImages({
              images: profile.images,
              imageAssets: profile.imageAssets,
            }),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
    },
    lists: row.lists.map((list) => ({
      id: list.id,
      title: list.title,
      description: list.description,
      listingIds: list.listings.map((listing) => listing.id),
      updatedAt: list.updatedAt.toISOString(),
    })),
    listings: row.listings.map(toPublicListing),
  };
}

export async function getPublicStorefrontSnapshot(
  sellerId: string,
  database: typeof replicaDb = replicaDb,
): Promise<PublicStorefrontSnapshot | null> {
  const row = await database.user.findUnique({
    where: {
      id: sellerId,
    },
    select: getPublicStorefrontSelect(sellerId),
  });

  return row ? toPublicStorefrontSnapshot(row) : null;
}
