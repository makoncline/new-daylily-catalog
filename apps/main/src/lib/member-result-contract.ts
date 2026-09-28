import { z } from "zod";

const dateTime = z.iso.datetime();
const nullableText = z.string().nullable();

export const memberListingResultSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  price: z.number().nullable(),
  status: nullableText,
  cultivarReferenceId: nullableText,
  updatedAt: dateTime,
});

export const memberListResultSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  description: nullableText,
  status: nullableText,
  updatedAt: dateTime,
});

export const memberImageResultSchema = z.looseObject({
  id: z.string(),
  url: z.string(),
  order: z.number(),
  status: nullableText,
});

export const memberProfileResultSchema = z.looseObject({
  id: z.string(),
  title: nullableText,
  slug: nullableText,
  description: nullableText,
  content: nullableText,
  location: nullableText,
  logoUrl: nullableText,
  updatedAt: dateTime,
});

const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: nullableText });
const idResult = z.object({ id: z.string() });
const successResult = z.object({ success: z.literal(true) });
const cultivarSearchItem = z.looseObject({
  id: z.string(),
  name: z.string(),
  cultivarReferenceId: z.string(),
});

export const memberOperationResultSchemas = {
  "handoff.get": z.looseObject({
    dashboardPath: z.string(),
    destination: z.string(),
    title: nullableText,
    canComplete: z.boolean(),
    nextStep: z.string(),
  }),
  "listing.page": page(
    memberListingResultSchema.extend({ hasPhoto: z.boolean() }),
  ),
  "listing.get": memberListingResultSchema.extend({
    description: nullableText,
    privateNote: nullableText,
    images: z.array(memberImageResultSchema),
    imagesHasMore: z.boolean(),
    lists: z.array(z.object({ id: z.string(), title: z.string() })),
    listsNextCursor: nullableText,
  }),
  "listing.create": memberListingResultSchema,
  "listing.update": memberListingResultSchema,
  "listing.linkCultivar": memberListingResultSchema,
  "listing.syncCultivarName": memberListingResultSchema,
  "listing.unlinkCultivar": memberListingResultSchema,
  "listing.delete": idResult,
  "list.page": page(memberListResultSchema),
  "list.get": memberListResultSchema.extend({ hasMembers: z.boolean() }),
  "list.create": memberListResultSchema,
  "list.update": memberListResultSchema,
  "list.addListing": memberListResultSchema,
  "list.removeListing": memberListResultSchema,
  "list.removeListings": memberListResultSchema,
  "list.delete": idResult,
  "profile.get": memberProfileResultSchema
    .extend({
      images: z.array(memberImageResultSchema),
      imagesHasMore: z.boolean(),
    })
    .nullable(),
  "profile.update": memberProfileResultSchema,
  "profile.updateContent": memberProfileResultSchema,
  "profile.appendParagraph": memberProfileResultSchema,
  "profile.updateParagraph": memberProfileResultSchema,
  "profile.updateWithUrl": memberProfileResultSchema,
  "profile.replaceContent": memberProfileResultSchema,
  "image.listForTarget": page(memberImageResultSchema),
  "image.get": memberImageResultSchema,
  "image.prepareUpload": z.union([
    z.object({ moderationRequired: z.literal(true) }),
    z.looseObject({
      imageId: z.string(),
      presignedUrl: z.string(),
      key: z.string(),
      url: z.string(),
    }),
  ]),
  "image.create": memberImageResultSchema,
  "image.reorder": successResult,
  "image.delete": successResult,
  "cultivar.search": z.array(cultivarSearchItem),
  "cultivar.get": z.looseObject({ id: z.string() }),
} as const;

export type MemberOperationName = keyof typeof memberOperationResultSchemas;

export function memberOperationJsonSchema(name: MemberOperationName) {
  return z.toJSONSchema(memberOperationResultSchemas[name]);
}
