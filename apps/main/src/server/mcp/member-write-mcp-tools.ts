import type { McpTool } from "@/server/mcp/read-only-mcp-types";
import { APP_CONFIG } from "@/config/constants";
import { MAX_MEMBER_PROFILE_CONTENT_CHARS } from "@/server/security/member-profile-content";
import { memberOperationJsonSchema } from "@/lib/member-result-contract";

const securitySchemes = [
  { type: "oauth2", scopes: ["catalog:write"] },
] satisfies McpTool["securitySchemes"];
const listingOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    listing: memberOperationJsonSchema("listing.create"),
    dashboardUrl: { type: "string", format: "uri" },
  },
  required: ["listing", "dashboardUrl"],
};
const listOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    list: memberOperationJsonSchema("list.create"),
    dashboardUrl: { type: "string", format: "uri" },
  },
  required: ["list", "dashboardUrl"],
};
const profileOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    profile: memberOperationJsonSchema("profile.update"),
    dashboardUrl: { type: "string", format: "uri" },
  },
  required: ["profile", "dashboardUrl"],
};
const imageOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { image: memberOperationJsonSchema("image.create") },
  required: ["image"],
};
const outputSchemas = {
  create_listing: listingOutputSchema,
  update_listing: listingOutputSchema,
  create_list: listOutputSchema,
  update_list: listOutputSchema,
  add_listing_to_list: {
    type: "object",
    additionalProperties: false,
    properties: {
      listId: { type: "string" },
      listingId: { type: "string" },
      dashboardUrl: { type: "string", format: "uri" },
    },
    required: ["listId", "listingId", "dashboardUrl"],
  },
  link_listing_to_cultivar: listingOutputSchema,
  sync_listing_cultivar_name: listingOutputSchema,
  update_profile: profileOutputSchema,
  append_profile_paragraph: profileOutputSchema,
  edit_profile_paragraph: profileOutputSchema,
  update_profile_content: profileOutputSchema,
  prepare_image_upload: {
    type: "object",
    additionalProperties: false,
    properties: { upload: memberOperationJsonSchema("image.prepareUpload") },
    required: ["upload"],
  },
  upload_image: imageOutputSchema,
  attach_uploaded_image: imageOutputSchema,
  reorder_images: {
    type: "object",
    additionalProperties: false,
    properties: { imageIds: { type: "array", items: { type: "string" } } },
    required: ["imageIds"],
  },
} as const;

function tool(
  name: keyof typeof outputSchemas,
  title: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
  idempotent = true,
): McpTool {
  return {
    name: `daylily.${name}`,
    title,
    description: `${description} Requires an active membership and the catalog:write OAuth scope.`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties,
      required,
    },
    outputSchema: outputSchemas[name],
    securitySchemes: [...securitySchemes],
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint:
        name === "prepare_image_upload" ||
        name === "attach_uploaded_image" ||
        name === "upload_image",
      idempotentHint: idempotent,
    },
    _meta: { securitySchemes: [...securitySchemes] },
  };
}

const id = { type: "string", minLength: 1, maxLength: 128 };
const expectedUpdatedAt = { type: "string", format: "date-time" };
const storageKey = { type: "string", minLength: 1, maxLength: 512 };
const maxImageDataUrlLength =
  Math.ceil((APP_CONFIG.UPLOAD.MAX_FILE_SIZE * 4) / 3) + 100;
const title = { type: "string", minLength: 1, maxLength: 200 };
const optionalText = { type: ["string", "null"], maxLength: 10000 };

export const memberWriteMcpTools: McpTool[] = [
  tool(
    "create_listing",
    "Create Listing",
    "Create one listing. Set hidden=true to keep it private or hidden=false to publish it. Supply a unique requestId and reuse it when retrying the same creation.",
    {
      requestId: { type: "string", format: "uuid" },
      title,
      cultivarReferenceId: id,
      description: optionalText,
      price: { type: ["number", "null"], minimum: 0 },
      privateNote: optionalText,
      hidden: { type: "boolean" },
    },
    ["requestId", "title", "hidden"],
  ),
  tool(
    "update_listing",
    "Update Listing",
    "Edit one owned listing. Supply the updatedAt value from the listing read. Omitted fields remain unchanged; null clears an optional field.",
    {
      listingId: id,
      expectedUpdatedAt,
      title,
      description: optionalText,
      price: { type: ["number", "null"], minimum: 0 },
      privateNote: optionalText,
      hidden: { type: "boolean" },
    },
    ["listingId", "expectedUpdatedAt"],
  ),
  tool(
    "create_list",
    "Create List",
    "Create one list. Supply a unique requestId and reuse it when retrying the same creation.",
    {
      requestId: { type: "string", format: "uuid" },
      title,
      description: optionalText,
    },
    ["requestId", "title"],
  ),
  tool(
    "update_list",
    "Update List",
    "Edit the title or description of one owned list. Supply the updatedAt value from the list read.",
    { listId: id, expectedUpdatedAt, title, description: optionalText },
    ["listId", "expectedUpdatedAt"],
  ),
  tool(
    "add_listing_to_list",
    "Add Listing to List",
    "Add one owned listing to one owned list. Repeating this call leaves the membership in place.",
    { listingId: id, listId: id },
    ["listingId", "listId"],
  ),
  tool(
    "link_listing_to_cultivar",
    "Link Listing to Cultivar",
    "Link one listing to a cultivar reference. An existing different link must be reviewed in the dashboard before replacement.",
    {
      listingId: id,
      cultivarReferenceId: id,
      syncName: { type: "boolean" },
    },
    ["listingId", "cultivarReferenceId"],
  ),
  tool(
    "sync_listing_cultivar_name",
    "Sync Listing Cultivar Name",
    "Set one owned listing's title and URL slug to the name of its linked cultivar reference. Read the listing again if the link changes.",
    { listingId: id },
    ["listingId"],
  ),
  tool(
    "update_profile",
    "Update Profile",
    "Edit basic fields of the member's public profile, including its logo URL. Supply updatedAt from the profile read, or null if no profile exists. Use the image tools for profile photos. Open the dashboard for profile URL changes.",
    {
      expectedUpdatedAt: { type: ["string", "null"], format: "date-time" },
      title: { type: ["string", "null"], maxLength: 200 },
      description: optionalText,
      location: { type: ["string", "null"], maxLength: 200 },
      logoUrl: { type: ["string", "null"], maxLength: 2_048 },
    },
    ["expectedUpdatedAt"],
  ),
  tool(
    "append_profile_paragraph",
    "Append Profile Paragraph",
    "Add one plain paragraph to the end of the profile story. The saved story must stay within 40,000 characters. Supply the updatedAt value from get_profile so a concurrent edit cannot be lost.",
    {
      paragraph: { type: "string", minLength: 1, maxLength: 4000 },
      expectedUpdatedAt: { type: "string", format: "date-time" },
    },
    ["paragraph", "expectedUpdatedAt"],
    false,
  ),
  tool(
    "edit_profile_paragraph",
    "Edit Profile Paragraph",
    "Edit one existing paragraph in the member's profile story. The saved story must stay within 40,000 characters. Use the paragraph block id and updatedAt from get_profile. Other blocks remain unchanged. A stale updatedAt is rejected. Use update_profile_content for other rich blocks.",
    {
      blockId: id,
      text: { type: "string", minLength: 1, maxLength: 4000 },
      expectedUpdatedAt: { type: "string", format: "date-time" },
    },
    ["blockId", "text", "expectedUpdatedAt"],
    false,
  ),
  tool(
    "update_profile_content",
    "Update Profile Content",
    "Edit, append, or reorder profile story blocks through EditorJS JSON. Use the content and updatedAt from get_profile. Keep every existing block ID and type; use a new unique ID for each added block. An older block without an ID can receive a new unique ID while it stays in place; save that change before reordering it. Supported types are paragraph, header, list, and table. Removing a block requires the dashboard editor.",
    {
      content: {
        type: "string",
        minLength: 1,
        maxLength: MAX_MEMBER_PROFILE_CONTENT_CHARS,
      },
      expectedUpdatedAt: { type: "string", format: "date-time" },
    },
    ["content", "expectedUpdatedAt"],
    false,
  ),
  tool(
    "upload_image",
    "Upload Image",
    "Upload one image to an owned listing or profile directly through MCP. Supply a data URL and a unique requestId; reuse the same requestId and data when retrying.",
    {
      type: { type: "string", enum: ["listing", "profile"] },
      referenceId: id,
      contentType: {
        type: "string",
        enum: ["image/jpeg", "image/png", "image/webp"],
      },
      imageDataUrl: {
        type: "string",
        format: "uri",
        maxLength: maxImageDataUrlLength,
      },
      requestId: { type: "string", format: "uuid" },
    },
    ["type", "referenceId", "contentType", "imageDataUrl", "requestId"],
  ),
  tool(
    "prepare_image_upload",
    "Prepare Image Upload",
    "Prepare a signed image upload for one owned listing or profile. Upload the exact file to each returned signed URL before attaching it. If moderationRequired is returned, retry with imageDataUrl. If contentMd5 is returned, send that value as the Content-MD5 header with each PUT.",
    {
      type: { type: "string", enum: ["listing", "profile"] },
      referenceId: id,
      contentType: {
        type: "string",
        enum: ["image/jpeg", "image/png", "image/webp"],
      },
      size: {
        type: "integer",
        minimum: 1,
        maximum: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
      },
      imageDataUrl: { type: "string", maxLength: maxImageDataUrlLength },
    },
    ["type", "referenceId", "contentType", "size"],
    false,
  ),
  tool(
    "attach_uploaded_image",
    "Attach Uploaded Image",
    "Attach one uploaded image after its signed upload completes. Use upload.url, upload.key, and upload.imageId from prepare_image_upload. The server checks that the uploaded object exists. Repeating the same attachment returns the existing image. If upload.r2 exists, upload to upload.r2.presignedUrl and pass upload.r2.key as r2OriginalKey too.",
    {
      type: { type: "string", enum: ["listing", "profile"] },
      referenceId: id,
      url: { type: "string", format: "uri" },
      key: storageKey,
      imageId: id,
      r2OriginalKey: storageKey,
    },
    ["type", "referenceId", "url", "key", "imageId"],
  ),
  tool(
    "reorder_images",
    "Reorder Images",
    "Place selected images first in the given order on one owned listing or profile. Other images keep their relative order.",
    {
      type: { type: "string", enum: ["listing", "profile"] },
      referenceId: id,
      imageIds: {
        type: "array",
        minItems: 1,
        maxItems: APP_CONFIG.UPLOAD.MAX_REORDER_IMAGES,
        uniqueItems: true,
        items: id,
      },
    },
    ["type", "referenceId", "imageIds"],
  ),
];

export const memberWriteMcpToolNames = new Set(
  memberWriteMcpTools.map((item) => item.name),
);
