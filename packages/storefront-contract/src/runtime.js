import { z } from "zod";

const isoDateTimeSchema = z.iso.datetime();
const nonEmptyStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, "Must not be blank.");

export const storefrontRemoteImageHostnames = [
  "daylilycatalog.com",
  "images.daylilycatalog.com",
  "media.daylilycatalog.com",
  "daylily-catalog-images.s3.amazonaws.com",
  "daylily-catalog-images-stage.s3.amazonaws.com",
  "www.daylilies.org",
  "daylily-wordpress-dev.s3.us-east-2.amazonaws.com",
  "www.daylilydatabase.org",
];

const remoteImageHostnames = new Set(storefrontRemoteImageHostnames);

const reservedListingSlugs = new Set([
  ".well-known",
  "_next",
  "api",
  "blog",
  "brands",
  "cart",
  "catalog",
  "catalogs",
  "contact",
  "favicon.ico",
  "icon",
  "icon.svg",
  "llms.txt",
  "openapi.json",
  "robots.txt",
  "sitemap.xml",
  "thanks",
]);

const reservedListSlugs = new Set(["all", "for-sale", "search"]);

export const storefrontPathSegmentSchema = z
  .string()
  .min(1)
  .max(240)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N}._~!$&'()*+,;=:@-]*$/u,
    "Must be one safe URL path segment.",
  );

/** @param {string} value */
export function isAllowedStorefrontImageUrl(value) {
  if (value.startsWith("/")) {
    try {
      const url = new URL(value, "https://storefront.invalid");
      return (
        value.startsWith("/brands/") &&
        !value.includes("//") &&
        !value.includes("\\") &&
        url.pathname === value &&
        url.search === "" &&
        url.hash === ""
      );
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      remoteImageHostnames.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export const storefrontImageUrlSchema = z
  .string()
  .refine(isAllowedStorefrontImageUrl, {
    message: "Must be a safe local image path or an approved HTTPS image URL.",
  });

export const storefrontImageSchema = z
  .object({
    id: nonEmptyStringSchema,
    url: storefrontImageUrlSchema,
    thumbUrl: storefrontImageUrlSchema.nullable(),
    blurUrl: storefrontImageUrlSchema.nullable(),
    order: z.number().int().min(0),
  })
  .strict();

const editorBlockSchema = z
  .object({
    id: z.string().optional(),
    type: z.string(),
    data: z.record(z.string(), z.unknown()),
    tunes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const editorOutputDataSchema = z
  .object({
    time: z.number().finite().optional(),
    blocks: z.array(editorBlockSchema),
    version: z.string().optional(),
  })
  .strict();

export const storefrontCultivarDetailsSchema = z
  .object({
    id: nonEmptyStringSchema,
    name: z.string().nullable(),
    ahsImageUrl: storefrontImageUrlSchema.nullable(),
    hybridizer: z.string().nullable(),
    year: z.string().nullable(),
    seedlingNum: z.string().nullable(),
    scapeHeight: z.string().nullable(),
    bloomSize: z.string().nullable(),
    bloomSeason: z.string().nullable(),
    rebloom: z.boolean().nullable(),
    ploidy: z.string().nullable(),
    foliageType: z.string().nullable(),
    bloomHabit: z.string().nullable(),
    color: z.string().nullable(),
    form: z.string().nullable(),
    parentage: z.string().nullable(),
    fragrance: z.string().nullable(),
    budcount: z.string().nullable(),
    branches: z.string().nullable(),
    sculpting: z.string().nullable(),
    foliage: z.string().nullable(),
    flower: z.string().nullable(),
  })
  .strict();

export const storefrontCultivarSchema = z
  .object({
    id: nonEmptyStringSchema,
    normalizedName: z.string().nullable(),
    details: storefrontCultivarDetailsSchema.nullable(),
  })
  .strict();

export const storefrontListingSchema = z
  .object({
    id: nonEmptyStringSchema,
    slug: storefrontPathSegmentSchema,
    title: nonEmptyStringSchema,
    description: z.string().nullable(),
    price: z.number().finite().nonnegative().nullable(),
    images: z.array(storefrontImageSchema),
    cultivar: storefrontCultivarSchema.nullable(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const storefrontListSchema = z
  .object({
    id: nonEmptyStringSchema,
    slug: storefrontPathSegmentSchema,
    title: nonEmptyStringSchema,
    description: z.string().nullable(),
    listingIds: z.array(z.string()),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const storefrontSellerProfileSchema = z
  .object({
    slug: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    content: editorOutputDataSchema.nullable(),
    location: z.string().nullable(),
    images: z.array(storefrontImageSchema),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const storefrontSellerSchema = z
  .object({
    id: nonEmptyStringSchema,
    profile: storefrontSellerProfileSchema.nullable(),
  })
  .strict();

/**
 * @param {ReadonlyArray<{id: string, order: number}>} images
 * @param {ReadonlyArray<string | number>} path
 * @param {z.RefinementCtx} context
 */
function addImageIntegrityIssues(images, path, context) {
  const imageIds = new Set();
  const imageOrders = new Set();

  images.forEach((image, index) => {
    if (imageIds.has(image.id)) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "id"],
        message: "Image IDs must be unique within an image collection.",
      });
    }
    if (imageOrders.has(image.order)) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "order"],
        message:
          "Image order values must be unique within an image collection.",
      });
    }
    imageIds.add(image.id);
    imageOrders.add(image.order);
  });
}

export const storefrontSnapshotSchema = z
  .object({
    version: z.literal(1),
    generatedAt: isoDateTimeSchema,
    seller: storefrontSellerSchema,
    lists: z.array(storefrontListSchema),
    listings: z.array(storefrontListingSchema),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const listingIds = new Set();
    const listingSlugs = new Set();
    const listIds = new Set();
    const listSlugs = new Set();

    if (snapshot.seller.profile) {
      addImageIntegrityIssues(
        snapshot.seller.profile.images,
        ["seller", "profile", "images"],
        context,
      );
    }

    snapshot.listings.forEach((listing, index) => {
      const slug = listing.slug.toLowerCase();
      if (listingIds.has(listing.id)) {
        context.addIssue({
          code: "custom",
          path: ["listings", index, "id"],
          message: "Listing IDs must be unique.",
        });
      }
      if (reservedListingSlugs.has(slug)) {
        context.addIssue({
          code: "custom",
          path: ["listings", index, "slug"],
          message: "Listing slugs must not use app routes.",
        });
      } else if (listingSlugs.has(slug)) {
        context.addIssue({
          code: "custom",
          path: ["listings", index, "slug"],
          message: "Listing slugs must be unique.",
        });
      }

      addImageIntegrityIssues(
        listing.images,
        ["listings", index, "images"],
        context,
      );
      listingIds.add(listing.id);
      listingSlugs.add(slug);
    });

    snapshot.lists.forEach((list, index) => {
      const slug = list.slug.toLowerCase();
      if (listIds.has(list.id)) {
        context.addIssue({
          code: "custom",
          path: ["lists", index, "id"],
          message: "List IDs must be unique.",
        });
      }
      if (reservedListSlugs.has(slug)) {
        context.addIssue({
          code: "custom",
          path: ["lists", index, "slug"],
          message: "List slugs must not use built-in catalogs.",
        });
      } else if (listSlugs.has(slug)) {
        context.addIssue({
          code: "custom",
          path: ["lists", index, "slug"],
          message: "List slugs must be unique.",
        });
      }
      listIds.add(list.id);
      listSlugs.add(slug);

      const referencedListingIds = new Set();
      list.listingIds.forEach((listingId, listingIndex) => {
        if (referencedListingIds.has(listingId)) {
          context.addIssue({
            code: "custom",
            path: ["lists", index, "listingIds", listingIndex],
            message: "List listing IDs must be unique.",
          });
        } else if (!listingIds.has(listingId)) {
          context.addIssue({
            code: "custom",
            path: ["lists", index, "listingIds", listingIndex],
            message: "List listing IDs must reference public listings.",
          });
        }
        referencedListingIds.add(listingId);
      });
    });
  });

const inquiryPersonShape = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  website: z.string().max(500).optional().default(""),
  openedAt: z.iso.datetime({ offset: true }),
};

export const inquiryCartLineSchema = z
  .object({
    listingId: z.string().min(1).max(100),
    slug: z.string().min(1).max(200),
    title: z.string().min(1).max(300),
    quantity: z.number().int().positive().max(100),
    unitPrice: z.number().positive(),
  })
  .strict();

export const contactInquirySchema = z
  .object({
    ...inquiryPersonShape,
    kind: z.literal("contact"),
    message: z.string().trim().min(1).max(5_000),
  })
  .strict();

export const cartInquirySchema = z
  .object({
    ...inquiryPersonShape,
    kind: z.literal("cart"),
    message: z.string().trim().max(5_000).optional().default(""),
    lines: z.array(inquiryCartLineSchema).min(1).max(100),
    subtotal: z.number().nonnegative(),
    shipping: z.number().nonnegative(),
    total: z.number().positive(),
  })
  .strict();

export const inquirySchema = z.discriminatedUnion("kind", [
  contactInquirySchema,
  cartInquirySchema,
]);

export const inquiryReceiptSchema = z
  .object({
    id: z.string().min(1),
    acceptedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
