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
import { registerWebMcpTools, toolResult, type WebMcpTool } from "@/lib/webmcp";

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
            "Create or update the signed-in seller profile fields used for the public catalog card. Supply updatedAt from a profile read, or null if no profile exists.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["expectedUpdatedAt"],
            properties: {
              expectedUpdatedAt: {
                type: ["string", "null"],
                format: "date-time",
              },
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
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            openWorldHint: true,
          },
          execute: async (input) => {
            const expectedUpdatedAt =
              input.expectedUpdatedAt === null
                ? null
                : asString(input.expectedUpdatedAt);
            if (expectedUpdatedAt === "") {
              throw new Error("expectedUpdatedAt is required.");
            }
            const profile = await client.dashboardDb.userProfile.update.mutate({
              expectedUpdatedAt,
              data: {
                title: asOptionalString(input.title),
                slug: asOptionalString(input.slug),
                description: asOptionalNullableString(input.description),
                location: asOptionalNullableString(input.location),
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
                expectedUpdatedAt: new Date(created.updatedAt).toISOString(),
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
          description: "Update a signed-in user's listing fields.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["listingId", "expectedUpdatedAt"],
            properties: {
              listingId: { type: "string" },
              expectedUpdatedAt: { type: "string", format: "date-time" },
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
            const expectedUpdatedAt = asString(input.expectedUpdatedAt);
            if (!expectedUpdatedAt) {
              throw new Error("expectedUpdatedAt is required.");
            }
            const price =
              input.price === undefined
                ? undefined
                : asNullableNonNegativeNumber(input.price, "price");
            if (
              input.cultivarReferenceId !== undefined ||
              input.syncName !== undefined
            ) {
              throw new Error("Use daylily.link-cultivar for cultivar links.");
            }
            await updateListing({
              id,
              expectedUpdatedAt,
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
          name: "daylily.link-cultivar",
          title: "Link Cultivar",
          description:
            "Link one signed-in user's listing to a cultivar reference. Use daylily.update-listing separately for other fields.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["listingId", "cultivarReferenceId"],
            properties: {
              listingId: { type: "string" },
              cultivarReferenceId: { type: "string" },
              syncName: {
                type: "boolean",
                description:
                  "Set true to rename the listing to the cultivar name.",
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
            const cultivarReferenceId = asString(input.cultivarReferenceId);
            if (!id || !cultivarReferenceId) {
              throw new Error(
                "listingId and cultivarReferenceId are required.",
              );
            }
            const listing = await linkAhs({
              id,
              cultivarReferenceId,
              syncName: input.syncName === true,
            });
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
          name: "daylily.open-image-editor",
          title: "Open Image Editor",
          description:
            "Open the listing or profile image manager. Choose a file through its labelled file input. Drag the square crop, or use daylily.get-image-crop and daylily.set-image-crop while the cropper is open. Then select Upload. This uses the page's resize, moderation, and storage flow. It does not upload on navigation.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["type"],
            properties: {
              type: { type: "string", enum: ["listing", "profile"] },
              listingId: {
                type: "string",
                description:
                  "Owned listing ID. Required only for listing photos.",
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async (input) => {
            const type = asString(input.type);
            const listingId = asString(input.listingId);
            let path: string;
            if (type === "listing" && listingId) {
              await client.dashboardDb.listing.get.query({ id: listingId });
              path = `/dashboard/listings?editing=${encodeURIComponent(listingId)}#listing-images`;
            } else if (type === "profile" && !listingId) {
              path = "/dashboard/profile#profile-images";
            } else {
              throw new Error(
                "Provide type=listing with a listingId, or type=profile without one.",
              );
            }
            router.push(path);
            return toolResult({
              ok: true,
              path,
              nextStep:
                "Choose an image, adjust the square crop, and select Upload.",
            });
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

      void registerWebMcpTools(tools, abortController.signal);
    } catch (error) {
      void error;
    }

    return () => abortController.abort();
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
