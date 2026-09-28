import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createCaller } from "@/server/api/root";
import type { McpContext } from "@/server/mcp/read-only-mcp-types";
import { APP_CONFIG } from "@/config/constants";
import { decodeImageDataUrl } from "@/server/api/routers/dashboard-db/image";
import { uploadLegacyImageBuffer } from "@/server/services/legacy-image-storage";
import { uploadR2ImageBuffer } from "@/server/services/image-asset-storage";
import { reportError } from "@/lib/error-utils";
import { profileFormSchema } from "@/types/schemas/profile";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { MAX_MEMBER_PROFILE_CONTENT_CHARS } from "@/server/security/member-profile-content";

const id = z.string().trim().min(1).max(128);
const storageKey = z.string().trim().min(1).max(512);
const maxImageDataUrlLength =
  Math.ceil((APP_CONFIG.UPLOAD.MAX_FILE_SIZE * 4) / 3) + 100;
const title = z.string().trim().min(1).max(200);
const text = z.string().trim().max(10_000).nullable().optional();
const imageType = z.enum(["listing", "profile"]);
const contentType = z.enum(["image/jpeg", "image/png", "image/webp"]);

const createListing = z
  .object({
    requestId: z.uuid(),
    title,
    cultivarReferenceId: id.optional(),
    description: text,
    price: z.number().nonnegative().nullable().optional(),
    privateNote: text,
    hidden: z.boolean(),
  })
  .strict();

const updateListing = createListing
  .omit({ requestId: true, cultivarReferenceId: true })
  .partial()
  .extend({ listingId: id, expectedUpdatedAt: z.iso.datetime() })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "listingId" && key !== "expectedUpdatedAt",
      ),
    { message: "Provide at least one listing field to update." },
  );

const createList = z
  .object({
    requestId: z.uuid(),
    title,
    description: text,
  })
  .strict();

const updateList = z
  .object({
    listId: id,
    expectedUpdatedAt: z.iso.datetime(),
    title: title.optional(),
    description: text,
  })
  .strict()
  .refine(
    (value) => value.title !== undefined || value.description !== undefined,
    {
      message: "Provide a list title or description to update.",
    },
  );
const listMembership = z.object({ listingId: id, listId: id }).strict();
const cultivarLink = z
  .object({
    listingId: id,
    cultivarReferenceId: id,
    syncName: z.boolean().optional(),
  })
  .strict();
const syncCultivarName = z.strictObject({ listingId: id });
const updateProfile = profileFormSchema
  .omit({ slug: true })
  .partial()
  .extend({ expectedUpdatedAt: z.iso.datetime().nullable() })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"),
    {
      message: "Provide at least one profile field to update.",
    },
  );
const appendParagraph = z
  .object({
    paragraph: z.string().trim().min(1).max(4000),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();
const editParagraph = z
  .object({
    blockId: id,
    text: z.string().trim().min(1).max(4000),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();
const updateProfileContent = z.strictObject({
  content: z.string().min(1).max(MAX_MEMBER_PROFILE_CONTENT_CHARS),
  expectedUpdatedAt: z.iso.datetime(),
});
const prepareImage = z
  .object({
    type: imageType,
    referenceId: id,
    contentType,
    size: z.number().int().positive().max(APP_CONFIG.UPLOAD.MAX_FILE_SIZE),
    imageDataUrl: z.string().max(maxImageDataUrlLength).optional(),
  })
  .strict();
const uploadImage = z
  .object({
    type: imageType,
    referenceId: id,
    contentType,
    imageDataUrl: z.string().max(maxImageDataUrlLength),
    requestId: z.uuid(),
  })
  .strict();
const attachImage = z
  .object({
    type: imageType,
    referenceId: id,
    url: z.url(),
    key: storageKey,
    imageId: id,
    r2OriginalKey: storageKey.optional(),
  })
  .strict();
const reorderImages = z
  .object({
    type: imageType,
    referenceId: id,
    imageIds: z.array(id).min(1).max(APP_CONFIG.UPLOAD.MAX_REORDER_IMAGES),
  })
  .strict()
  .refine((value) => new Set(value.imageIds).size === value.imageIds.length, {
    message: "Each image id must occur once.",
  });

export const memberWriteInputSchemas: Record<string, z.ZodType> = {
  "daylily.create_listing": createListing,
  "daylily.update_listing": updateListing,
  "daylily.create_list": createList,
  "daylily.update_list": updateList,
  "daylily.add_listing_to_list": listMembership,
  "daylily.link_listing_to_cultivar": cultivarLink,
  "daylily.sync_listing_cultivar_name": syncCultivarName,
  "daylily.update_profile": updateProfile,
  "daylily.append_profile_paragraph": appendParagraph,
  "daylily.edit_profile_paragraph": editParagraph,
  "daylily.update_profile_content": updateProfileContent,
  "daylily.prepare_image_upload": prepareImage,
  "daylily.upload_image": uploadImage,
  "daylily.attach_uploaded_image": attachImage,
  "daylily.reorder_images": reorderImages,
};

export function validateMemberWriteToolInput(name: string, input: unknown) {
  const schema = memberWriteInputSchemas[name];
  if (!schema) throw new Error("Unknown member write tool.");
  schema.parse(input);
}

function listingUrl(baseUrl: string, id: string) {
  return new URL(
    `/dashboard/listings?editing=${encodeURIComponent(id)}`,
    baseUrl,
  ).toString();
}

function listUrl(baseUrl: string, id: string) {
  return new URL(
    `/dashboard/lists/${encodeURIComponent(id)}`,
    baseUrl,
  ).toString();
}

export async function callMemberWriteTool(
  context: McpContext,
  name: string,
  input: unknown,
  authUser: NonNullable<TRPCInternalContext["_authUser"]>,
  oauthClientId: string,
) {
  const caller = createCaller({
    db: context.memberDb,
    clerkUserId: authUser.clerkUserId,
    headers: context.request.headers,
    requestUrl: context.request.url,
    oauthClientId,
    oauthScope: "catalog:write",
    mcpToolName: name,
    _confirmedActiveMembership: true,
    _authUser: authUser,
  });

  switch (name) {
    case "daylily.create_listing": {
      const data = createListing.parse(input);
      const listing = await caller.dashboardDb.listing.create({
        ...data,
        cultivarReferenceId: data.cultivarReferenceId ?? null,
      });
      return { listing, dashboardUrl: listingUrl(context.baseUrl, listing.id) };
    }
    case "daylily.update_listing": {
      const { listingId, expectedUpdatedAt, hidden, ...fields } =
        updateListing.parse(input);
      const listing = await caller.dashboardDb.listing.update({
        id: listingId,
        expectedUpdatedAt,
        data: {
          ...fields,
          ...(hidden !== undefined ? { status: hidden ? "HIDDEN" : null } : {}),
        },
      });
      return { listing, dashboardUrl: listingUrl(context.baseUrl, listing.id) };
    }
    case "daylily.create_list": {
      const data = createList.parse(input);
      const list = await caller.dashboardDb.list.create({
        title: data.title,
        description: data.description ?? undefined,
        requestId: data.requestId,
      });
      return { list, dashboardUrl: listUrl(context.baseUrl, list.id) };
    }
    case "daylily.update_list": {
      const { listId, expectedUpdatedAt, ...data } = updateList.parse(input);
      const list = await caller.dashboardDb.list.update({
        id: listId,
        expectedUpdatedAt,
        data,
      });
      return { list, dashboardUrl: listUrl(context.baseUrl, listId) };
    }
    case "daylily.add_listing_to_list": {
      const data = listMembership.parse(input);
      const list = await caller.dashboardDb.list.addListingToList(data);
      return {
        listId: list.id,
        listingId: data.listingId,
        dashboardUrl: listUrl(context.baseUrl, list.id),
      };
    }
    case "daylily.link_listing_to_cultivar": {
      const data = cultivarLink.parse(input);
      const listing = await caller.dashboardDb.listing.linkAhs({
        id: data.listingId,
        cultivarReferenceId: data.cultivarReferenceId,
        syncName: data.syncName ?? false,
      });
      return { listing, dashboardUrl: listingUrl(context.baseUrl, listing.id) };
    }
    case "daylily.sync_listing_cultivar_name": {
      const data = syncCultivarName.parse(input);
      const listing = await caller.dashboardDb.listing.syncAhsName({
        id: data.listingId,
      });
      return { listing, dashboardUrl: listingUrl(context.baseUrl, listing.id) };
    }
    case "daylily.update_profile": {
      const { expectedUpdatedAt, ...data } = updateProfile.parse(input);
      const profile = await caller.dashboardDb.userProfile.updateBasic({
        expectedUpdatedAt,
        data,
      });
      return {
        profile,
        dashboardUrl: new URL("/dashboard/profile", context.baseUrl).toString(),
      };
    }
    case "daylily.append_profile_paragraph": {
      const data = appendParagraph.parse(input);
      const profile =
        await caller.dashboardDb.userProfile.appendParagraph(data);
      return {
        profile,
        dashboardUrl: new URL("/dashboard/profile", context.baseUrl).toString(),
      };
    }
    case "daylily.edit_profile_paragraph": {
      const data = editParagraph.parse(input);
      const profile =
        await caller.dashboardDb.userProfile.updateParagraph(data);
      return {
        profile,
        dashboardUrl: new URL("/dashboard/profile", context.baseUrl).toString(),
      };
    }
    case "daylily.update_profile_content": {
      const data = updateProfileContent.parse(input);
      const profile =
        await caller.dashboardDb.userProfile.updateContentPreservingBlocks(
          data,
        );
      return {
        profile,
        dashboardUrl: new URL("/dashboard/profile", context.baseUrl).toString(),
      };
    }
    case "daylily.prepare_image_upload": {
      const data = prepareImage.parse(input);
      return { upload: await caller.dashboardDb.image.getPresignedUrl(data) };
    }
    case "daylily.upload_image": {
      const data = uploadImage.parse(input);
      const imageBytes = decodeImageDataUrl(
        data.imageDataUrl,
        data.contentType,
      );
      try {
        const { default: sharp } = await import("sharp");
        const metadata = await sharp(imageBytes, {
          failOn: "error",
        }).metadata();
        if (metadata.format !== data.contentType.split("/")[1]) {
          throw new Error("Image type does not match the file.");
        }
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image data does not match its content type.",
        });
      }
      const upload = await caller.dashboardDb.image.getPresignedUrl({
        ...data,
        size: imageBytes.byteLength,
      });
      if ("moderationRequired" in upload) {
        throw new Error("Image moderation could not be completed.");
      }
      if (upload.shadowModerationRequested) {
        try {
          await caller.dashboardDb.image.moderateImage({
            type: data.type,
            referenceId: data.referenceId,
            contentType: data.contentType,
            size: imageBytes.byteLength,
            imageDataUrl: data.imageDataUrl,
          });
        } catch (error) {
          reportError({
            error: error instanceof Error ? error : new Error(String(error)),
            level: "warning",
            context: {
              source: "mcp-upload-image",
              step: "shadow-moderation",
              imageType: data.type,
              referenceId: data.referenceId,
            },
          });
        }
      }
      await uploadLegacyImageBuffer({
        body: imageBytes,
        contentType: data.contentType,
        key: upload.key,
      });
      if (upload.r2) {
        await uploadR2ImageBuffer({
          body: imageBytes,
          contentType: data.contentType,
          key: upload.r2.key,
        });
      }
      const image = await caller.dashboardDb.image.create({
        type: data.type,
        referenceId: data.referenceId,
        url: upload.url,
        key: upload.key,
        imageId: upload.imageId,
        ...(upload.r2 ? { r2OriginalKey: upload.r2.key } : {}),
      });
      return { image };
    }
    case "daylily.attach_uploaded_image": {
      const data = attachImage.parse(input);
      return { image: await caller.dashboardDb.image.create(data) };
    }
    case "daylily.reorder_images": {
      const data = reorderImages.parse(input);
      await caller.dashboardDb.image.reorder({
        type: data.type,
        referenceId: data.referenceId,
        images: data.imageIds.map((id, order) => ({ id, order })),
      });
      return { imageIds: data.imageIds };
    }
    default:
      throw new Error("Unknown member write tool.");
  }
}
