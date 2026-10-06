import { z } from "zod";
import { createCaller } from "@/server/api/root";
import type { McpContext } from "@/server/mcp/read-only-mcp-types";
import { APP_CONFIG } from "@/config/constants";
import { profileFormSchema } from "@/types/schemas/profile";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { serializeMemberMcpWriteResult } from "@/server/mcp/member-mcp-result-contract";

const id = z.string().trim().min(1).max(128);
const title = z.string().trim().min(1).max(200);
const text = z.string().trim().max(10_000).nullable().optional();
const imageType = z.enum(["listing", "profile"]);

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
  .omit({ slug: true, logoUrl: true })
  .partial()
  .extend({ expectedUpdatedAt: z.iso.datetime().nullable() })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"),
    {
      message: "Provide at least one profile field to update.",
    },
  );
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
      return {
        listing: serializeMemberMcpWriteResult("listing", listing),
        dashboardUrl: listingUrl(context.baseUrl, listing.id),
      };
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
      return {
        listing: serializeMemberMcpWriteResult("listing", listing),
        dashboardUrl: listingUrl(context.baseUrl, listing.id),
      };
    }
    case "daylily.create_list": {
      const data = createList.parse(input);
      const list = await caller.dashboardDb.list.create({
        title: data.title,
        description: data.description ?? undefined,
        requestId: data.requestId,
      });
      return {
        list: serializeMemberMcpWriteResult("list", list),
        dashboardUrl: listUrl(context.baseUrl, list.id),
      };
    }
    case "daylily.update_list": {
      const { listId, expectedUpdatedAt, ...data } = updateList.parse(input);
      const list = await caller.dashboardDb.list.update({
        id: listId,
        expectedUpdatedAt,
        data,
      });
      return {
        list: serializeMemberMcpWriteResult("list", list),
        dashboardUrl: listUrl(context.baseUrl, listId),
      };
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
      return {
        listing: serializeMemberMcpWriteResult("listing", listing),
        dashboardUrl: listingUrl(context.baseUrl, listing.id),
      };
    }
    case "daylily.sync_listing_cultivar_name": {
      const data = syncCultivarName.parse(input);
      const listing = await caller.dashboardDb.listing.syncAhsName({
        id: data.listingId,
      });
      return {
        listing: serializeMemberMcpWriteResult("listing", listing),
        dashboardUrl: listingUrl(context.baseUrl, listing.id),
      };
    }
    case "daylily.update_profile": {
      const { expectedUpdatedAt, ...data } = updateProfile.parse(input);
      const profile = await caller.dashboardDb.userProfile.updateBasic({
        expectedUpdatedAt,
        data,
      });
      return {
        profile: serializeMemberMcpWriteResult("profile", profile),
        dashboardUrl: new URL("/dashboard/profile", context.baseUrl).toString(),
      };
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
