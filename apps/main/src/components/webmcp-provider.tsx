"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import {
  insertListing,
  updateListing,
  linkAhs,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  addListingToList,
  insertList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { createImage } from "@/app/dashboard/_lib/dashboard-db/images-collection";

type JsonSchema = Record<string, unknown>;

interface WebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
  annotations?: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
    idempotentHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

interface WebMcpModelContext {
  registerTool?: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void;
  provideContext?: (options: {
    tools: WebMcpTool[];
    signal?: AbortSignal;
  }) => void;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const text = asString(value);
  return text ? text : undefined;
}

function asOptionalNullableString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return asNullableString(value);
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text ? text : null;
}

function asNullableNonNegativeNumber(value: unknown, fieldName = "value") {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
  if (parsed < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }
  return parsed;
}

function toEditorJsParagraphContent(text: string) {
  return JSON.stringify({
    time: Date.now(),
    blocks: text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({
        id: crypto.randomUUID(),
        type: "paragraph",
        data: { text: paragraph },
      })),
    version: "2.30.8",
  });
}

function toolResult(payload: unknown) {
  const text = JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent: payload,
  };
}

function getModelContext(): WebMcpModelContext | null {
  const maybeNavigator = navigator as Navigator & {
    modelContext?: WebMcpModelContext;
  };
  return maybeNavigator.modelContext ?? null;
}

const emptyObjectSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

export function WebMcpProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    const abortController = new AbortController();

    try {
      if (!pathname.startsWith("/dashboard")) return;
      if (!isLoaded || !isSignedIn) return;

      const modelContext = getModelContext();
      if (!modelContext) return;

      const client = getTrpcClient();
      const queryClient = getQueryClient();

      const tools: WebMcpTool[] = [
        {
          name: "daylily.navigate",
          title: "Navigate Daylily Catalog",
          description:
            "Navigate to a safe Daylily Catalog route such as /, /start-membership, /onboarding, /dashboard, /dashboard/profile, /dashboard/listings, or /dashboard/lists.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["path"],
            properties: {
              path: {
                type: "string",
                description:
                  "A same-origin path beginning with /. External URLs are rejected.",
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async (input) => {
            const path = asString(input.path);
            if (!path.startsWith("/") || path.startsWith("//")) {
              throw new Error("Path must be a same-origin route.");
            }
            router.push(path);
            return toolResult({ ok: true, path });
          },
        },
        {
          name: "daylily.dashboard-state",
          title: "Read Dashboard State",
          description:
            "Read the signed-in user's dashboard profile, listings, and lists. If the user is not signed in, returns sign-in guidance instead of mutating anything.",
          inputSchema: emptyObjectSchema,
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async () => {
            try {
              const [profile, listings, lists] = await Promise.all([
                client.dashboardDb.userProfile.get.query(),
                client.dashboardDb.listing.list.query(),
                client.dashboardDb.list.list.query(),
              ]);
              return toolResult({
                ok: true,
                pathname,
                profile,
                listings,
                lists,
              });
            } catch (error) {
              return toolResult({
                ok: false,
                pathname,
                needsSignIn: true,
                message:
                  "The dashboard tools need the user to sign in or finish account creation first.",
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
        },
        {
          name: "daylily.search-cultivars",
          title: "Search Cultivars",
          description:
            "Search AHS cultivar references that can be linked to dashboard listings.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["query"],
            properties: {
              query: {
                type: "string",
                minLength: 1,
                description:
                  "Cultivar name prefix, for example Coffee or Stella.",
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async (input) => {
            const query = asString(input.query);
            const results = await client.dashboardDb.ahs.search.query({
              query,
            });
            return toolResult({ ok: true, query, results });
          },
        },
        {
          name: "daylily.update-profile",
          title: "Update Seller Profile",
          description:
            "Create or update the signed-in seller profile fields used for the public catalog card.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: {
                type: "string",
                description: "Garden or business name.",
              },
              slug: {
                type: "string",
                description: "Optional public URL slug.",
              },
              description: {
                type: ["string", "null"],
                description:
                  "Short public catalog description. Use null to clear.",
              },
              location: {
                type: ["string", "null"],
                description: "Public location label. Use null to clear.",
              },
              logoUrl: {
                type: ["string", "null"],
                description: "Optional profile image URL. Use null to clear.",
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: true,
          },
          execute: async (input) => {
            const profile = await client.dashboardDb.userProfile.update.mutate({
              data: {
                title: asOptionalString(input.title),
                slug: asOptionalString(input.slug),
                description: asOptionalNullableString(input.description),
                location: asOptionalNullableString(input.location),
                logoUrl: asOptionalNullableString(input.logoUrl),
              },
            });
            queryClient.setQueryData(
              [["dashboardDb", "userProfile", "get"], { type: "query" }],
              profile,
            );
            void queryClient.invalidateQueries();
            return toolResult({ ok: true, profile });
          },
        },
        {
          name: "daylily.update-profile-content",
          title: "Update Seller Profile Content",
          description:
            "Update the signed-in seller profile's long-form public story/content from plain paragraphs.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["content"],
            properties: {
              content: {
                type: "string",
                description:
                  "Plain-text public profile content. Blank lines become paragraph breaks.",
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: true,
          },
          execute: async (input) => {
            const content = asString(input.content);
            const profile =
              await client.dashboardDb.userProfile.updateContent.mutate({
                content: content ? toEditorJsParagraphContent(content) : null,
              });
            void queryClient.invalidateQueries();
            return toolResult({ ok: true, profile });
          },
        },
        {
          name: "daylily.create-listing",
          title: "Create Listing",
          description:
            "Create a dashboard listing, optionally linked to a cultivar reference, then optionally fill public details and a private note.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["title"],
            properties: {
              title: { type: "string", minLength: 1 },
              cultivarReferenceId: {
                type: "string",
                description:
                  "Optional cultivarReferenceId returned by daylily.search-cultivars.",
              },
              description: {
                type: ["string", "null"],
                description: "Public listing description. Use null to clear.",
              },
              price: {
                type: ["number", "null"],
                minimum: 0,
                description: "Public price. Use null to clear.",
              },
              privateNote: {
                type: ["string", "null"],
                description: "Private dashboard note. Use null to clear.",
              },
              hidden: {
                type: "boolean",
                description:
                  "Set true to keep the listing hidden from public pages.",
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: true,
            idempotentHint: false,
          },
          execute: async (input) => {
            const title = asString(input.title);
            if (!title) throw new Error("title is required.");
            const price =
              input.price === undefined
                ? undefined
                : asNullableNonNegativeNumber(input.price, "price");
            const created = await insertListing({
              title,
              cultivarReferenceId: asNullableString(input.cultivarReferenceId),
            });
            const shouldUpdate =
              input.description !== undefined ||
              input.price !== undefined ||
              input.privateNote !== undefined ||
              input.hidden !== undefined;
            if (shouldUpdate) {
              await updateListing({
                id: created.id,
                data: {
                  description: asNullableString(input.description),
                  price,
                  privateNote: asNullableString(input.privateNote),
                  status: input.hidden === true ? "HIDDEN" : null,
                },
              });
            }
            const listing = await client.dashboardDb.listing.get.query({
              id: created.id,
            });
            return toolResult({ ok: true, listing });
          },
        },
        {
          name: "daylily.update-listing",
          title: "Update Listing",
          description:
            "Update a signed-in user's listing fields and optionally link it to a cultivar reference.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["listingId"],
            properties: {
              listingId: { type: "string" },
              title: { type: "string" },
              description: {
                type: ["string", "null"],
                description: "Public listing description. Use null to clear.",
              },
              price: {
                type: ["number", "null"],
                minimum: 0,
                description: "Public price. Use null to clear.",
              },
              privateNote: {
                type: ["string", "null"],
                description: "Private dashboard note. Use null to clear.",
              },
              hidden: { type: "boolean" },
              cultivarReferenceId: { type: "string" },
              syncName: {
                type: "boolean",
                description:
                  "When linking a cultivar, set true to rename the listing to the cultivar name.",
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: true,
          },
          execute: async (input) => {
            const id = asString(input.listingId);
            if (!id) throw new Error("listingId is required.");
            const price =
              input.price === undefined
                ? undefined
                : asNullableNonNegativeNumber(input.price, "price");
            if (input.cultivarReferenceId) {
              await linkAhs({
                id,
                cultivarReferenceId: asString(input.cultivarReferenceId),
                syncName: input.syncName === true,
              });
            }
            await updateListing({
              id,
              data: {
                title: asOptionalString(input.title),
                description:
                  input.description === undefined
                    ? undefined
                    : asNullableString(input.description),
                price,
                privateNote:
                  input.privateNote === undefined
                    ? undefined
                    : asNullableString(input.privateNote),
                status:
                  input.hidden === undefined
                    ? undefined
                    : input.hidden
                      ? "HIDDEN"
                      : null,
              },
            });
            const listing = await client.dashboardDb.listing.get.query({ id });
            return toolResult({ ok: true, listing });
          },
        },
        {
          name: "daylily.create-list",
          title: "Create List",
          description:
            "Create a dashboard list that can group listings on the public catalog.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["title"],
            properties: {
              title: { type: "string", minLength: 1 },
              description: { type: "string" },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: true,
            idempotentHint: false,
          },
          execute: async (input) => {
            const title = asString(input.title);
            if (!title) throw new Error("title is required.");
            const list = await insertList({
              title,
              description: asOptionalString(input.description),
            });
            return toolResult({ ok: true, list });
          },
        },
        {
          name: "daylily.prepare-image-upload",
          title: "Prepare Image Upload",
          description:
            "Create a signed upload URL for a profile or listing image. Upload the file to the returned presignedUrl, then call daylily.attach-uploaded-image with the returned key and url.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: [
              "type",
              "referenceId",
              "fileName",
              "contentType",
              "size",
            ],
            properties: {
              type: { type: "string", enum: ["profile", "listing"] },
              referenceId: {
                type: "string",
                description:
                  "Profile id or listing id that will own the image.",
              },
              fileName: { type: "string" },
              contentType: {
                type: "string",
                enum: ["image/jpeg", "image/png", "image/webp"],
              },
              size: {
                type: "integer",
                minimum: 1,
                description: "Image file size in bytes.",
              },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false,
            idempotentHint: false,
          },
          execute: async (input) => {
            const type = asString(input.type);
            if (type !== "profile" && type !== "listing") {
              throw new Error("type must be profile or listing.");
            }
            const referenceId = asString(input.referenceId);
            const fileName = asString(input.fileName);
            const contentType = asString(input.contentType);
            const size =
              typeof input.size === "number" ? Math.trunc(input.size) : 0;
            if (
              !referenceId ||
              !fileName ||
              !["image/jpeg", "image/png", "image/webp"].includes(
                contentType,
              ) ||
              size < 1
            ) {
              throw new Error(
                "referenceId, fileName, supported contentType, and positive size are required.",
              );
            }
            const upload =
              await client.dashboardDb.image.getPresignedUrl.mutate({
                type,
                referenceId,
                fileName,
                contentType: contentType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp",
                size,
              });
            return toolResult({ ok: true, upload });
          },
        },
        {
          name: "daylily.attach-uploaded-image",
          title: "Attach Uploaded Image",
          description:
            "Attach an image to a profile or listing after it has been uploaded to a Daylily Catalog signed upload URL.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["type", "referenceId", "url", "key"],
            properties: {
              type: { type: "string", enum: ["profile", "listing"] },
              referenceId: {
                type: "string",
                description: "Profile id or listing id that owns the image.",
              },
              url: { type: "string" },
              key: { type: "string" },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: true,
            idempotentHint: false,
          },
          execute: async (input) => {
            const type = asString(input.type);
            if (type !== "profile" && type !== "listing") {
              throw new Error("type must be profile or listing.");
            }
            const referenceId = asString(input.referenceId);
            const url = asString(input.url);
            const key = asString(input.key);
            if (!referenceId || !url || !key) {
              throw new Error("referenceId, url, and key are required.");
            }
            const image = await createImage({ type, referenceId, url, key });
            return toolResult({ ok: true, image });
          },
        },
        {
          name: "daylily.add-listing-to-list",
          title: "Add Listing To List",
          description: "Add an existing dashboard listing to an existing list.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["listingId", "listId"],
            properties: {
              listingId: { type: "string" },
              listId: { type: "string" },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: true,
            idempotentHint: false,
          },
          execute: async (input) => {
            const listingId = asString(input.listingId);
            const listId = asString(input.listId);
            if (!listingId || !listId) {
              throw new Error("listingId and listId are required.");
            }
            await addListingToList({ listingId, listId });
            const list = await client.dashboardDb.list.get.query({
              id: listId,
            });
            return toolResult({ ok: true, list });
          },
        },
      ];

      if (typeof modelContext.registerTool === "function") {
        for (const tool of tools) {
          try {
            modelContext.registerTool(tool, { signal: abortController.signal });
          } catch (error) {
            void error;
          }
        }
      } else if (typeof modelContext.provideContext === "function") {
        try {
          modelContext.provideContext({
            tools,
            signal: abortController.signal,
          });
        } catch (error) {
          void error;
        }
      }
    } catch (error) {
      void error;
    }

    return () => abortController.abort();
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
