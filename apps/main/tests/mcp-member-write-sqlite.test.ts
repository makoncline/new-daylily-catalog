// @vitest-environment node

process.env.SKIP_ENV_VALIDATION = "1";
process.env.AWS_BUCKET_NAME = "mcp-local-bucket";
process.env.AWS_REGION = "us-east-1";

import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/constants";
import { memberOperationResultSchemas } from "@/lib/member-result-contract";
import { memberWriteMcpTools } from "@/server/mcp/member-write-mcp-tools";

const snapshotPath = path.resolve(
  process.cwd(),
  "local/realistic-data/realistic-data.sqlite",
);
const auth = vi.hoisted(() => ({
  clientId: "mcp_member_write_test",
  clerkUserId: "",
  scopes: ["catalog:read", "catalog:write"],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        clientId: auth.clientId,
        isAuthenticated: true,
        scopes: auth.scopes,
        userId: auth.clerkUserId,
      }),
    }),
  }),
}));
vi.mock("@/server/clerk/sync-user", () => ({
  getClerkUserData: async () => ({ email: "member@example.com" }),
}));

const enabled =
  process.env.RUN_MCP_MEMBER_WRITE_PROOF === "1" && existsSync(snapshotPath);
const tempDir = enabled
  ? mkdtempSync(path.join(tmpdir(), "daylily-mcp-write-"))
  : null;
const databasePath = tempDir ? path.join(tempDir, "member.sqlite") : null;
if (databasePath) copyFileSync(snapshotPath, databasePath);

afterAll(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected MCP response value.");
  return value;
}

describe.skipIf(!enabled)("remote member MCP with real local SQLite", () => {
  it("enforces write scope and membership, applies safe writes once, and prepares approval links", async () => {
    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.TURSO_DATABASE_AUTH_TOKEN = "";
    process.env.TURSO_EMBEDDED_REPLICA_URL = "";
    process.env.DAYLILY_MCP_OAUTH_CLIENT_ID = auth.clientId;
    process.env.INTEGRATION_MODE = "1";
    process.env.LOCAL_QUERY_PROFILER = "1";
    process.env.LOCAL_QUERY_PROFILER_RESET = "1";
    process.env.LOCAL_QUERY_PROFILER_OUTPUT = path.join(
      tempDir!,
      "queries.jsonl",
    );

    const { db } = await import("@/server/db");
    const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
    const { memberWriteInputSchemas } = await import(
      "@/server/mcp/member-write-mcp"
    );
    const owner = await db.user.findFirst({
      where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
      select: { id: true, clerkUserId: true, stripeCustomerId: true },
    });
    expect(owner?.clerkUserId).toBeTruthy();
    expect(owner?.stripeCustomerId).toBeTruthy();
    auth.clerkUserId = owner!.clerkUserId!;
    expect(new Set(Object.keys(memberWriteInputSchemas))).toEqual(
      new Set(memberWriteMcpTools.map((tool) => tool.name)),
    );
    expect(
      memberWriteMcpTools.find(
        (tool) => tool.name === "daylily.prepare_image_upload",
      ),
    ).toMatchObject({
      inputSchema: {
        properties: {
          size: { maximum: APP_CONFIG.UPLOAD.MAX_FILE_SIZE },
        },
      },
    });
    expect(
      memberWriteMcpTools.find(
        (tool) => tool.name === "daylily.attach_uploaded_image",
      ),
    ).toMatchObject({
      inputSchema: { properties: { key: { maxLength: 512 } } },
    });

    async function readSqlQueries() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const profilerPath = process.env.LOCAL_QUERY_PROFILER_OUTPUT;
      if (!profilerPath || !existsSync(profilerPath)) return [];
      return readFileSync(profilerPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { eventType: string; query: string })
        .filter((event) => event.eventType === "sql")
        .map((event) => event.query);
    }

    async function call(name: string, args: Record<string, unknown>) {
      const response = await handleMcpRequest(
        new Request("https://daylilycatalog.com/api/mcp/server", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        }),
      );
      const body = (await response.json()) as {
        error?: { code: number; message: string };
        result?: {
          isError?: boolean;
          structuredContent?: {
            error?: { code: string; message: string };
            canComplete?: boolean;
            items?: Array<{ id: string; order: number }>;
            nextCursor?: string | null;
            url?: string;
            list?: {
              id: string;
              description: string | null;
              updatedAt: string;
            };
            listing?: {
              id: string;
              updatedAt: string;
              cultivarReferenceId: string | null;
              price: number | null;
              slug: string;
              status: string | null;
              title: string;
            };
            profile?: {
              content: string | null;
              images?: Array<{ id: string; order: number }>;
              location: string | null;
              logoUrl: string | null;
              updatedAt: string;
            };
            image?: { id: string; url: string };
          };
          _meta?: Record<string, string[]>;
        };
      };
      if (body.result && !body.result.isError) {
        const output = body.result.structuredContent;
        if (name === "daylily.create_list" || name === "daylily.update_list") {
          memberOperationResultSchemas["list.create"].parse(output?.list);
        }
        if (
          name === "daylily.create_listing" ||
          name === "daylily.update_listing" ||
          name === "daylily.link_listing_to_cultivar" ||
          name === "daylily.sync_listing_cultivar_name"
        ) {
          memberOperationResultSchemas["listing.create"].parse(output?.listing);
        }
        if (
          name === "daylily.update_profile" ||
          name === "daylily.append_profile_paragraph" ||
          name === "daylily.edit_profile_paragraph" ||
          name === "daylily.update_profile_content"
        ) {
          memberOperationResultSchemas["profile.update"].parse(output?.profile);
        }
        if (name === "daylily.get_profile" && output?.profile) {
          memberOperationResultSchemas["profile.get"].parse(output.profile);
        }
        if (name === "daylily.list_images") {
          memberOperationResultSchemas["image.listForTarget"].parse(output);
        }
      }
      if (body.result?.isError && body.result.structuredContent?.error) {
        const error = body.result.structuredContent.error;
        return {
          ...body,
          error: {
            code:
              error.code === "CONFLICT"
                ? -32009
                : error.code === "INVALID_ARGUMENTS"
                  ? -32602
                  : error.code === "NOT_FOUND"
                    ? -32004
                    : -32003,
            message: error.message,
          },
        };
      }
      return body;
    }

    auth.scopes = ["catalog:read"];
    const noWriteScope = await call("daylily.create_list", {
      requestId: crypto.randomUUID(),
      title: "No write",
    });
    expect(noWriteScope.result?.isError).toBe(true);
    expect(noWriteScope.result?._meta?.["mcp/www_authenticate"]?.[0]).toContain(
      'scope="catalog:write"',
    );
    auth.scopes = ["catalog:read", "catalog:write"];

    const beforeInvalidRead = (await readSqlQueries()).length;
    const invalidRead = await call("daylily.list_listings", { limit: 101 });
    const invalidProfileRead = await call("daylily.get_profile", {
      unsupported: true,
    });
    expect(invalidRead.error?.code).toBe(-32602);
    expect(invalidRead.result?.isError).toBe(true);
    expect(invalidRead.result?.structuredContent?.error?.code).toBe(
      "INVALID_ARGUMENTS",
    );
    expect(invalidProfileRead.error?.code).toBe(-32602);
    expect((await readSqlQueries()).slice(beforeInvalidRead)).toHaveLength(0);

    const beforeInvalidWrite = (await readSqlQueries()).length;
    const invalidWrite = await call("daylily.create_list", {
      requestId: crypto.randomUUID(),
    });
    expect(invalidWrite.error?.code).toBe(-32602);
    expect((await readSqlQueries()).slice(beforeInvalidWrite)).toHaveLength(0);

    const listRequestId = crypto.randomUUID();
    const listArgs = {
      requestId: listRequestId,
      title: "MCP review list",
      description: "Local proof",
    };
    const beforeCreate = (await readSqlQueries()).length;
    const createdList = await call("daylily.create_list", listArgs);
    const createQueries = (await readSqlQueries()).slice(beforeCreate);
    expect(
      createQueries.filter((query) => /FROM `main`\.`User`/i.test(query)),
    ).toHaveLength(1);
    expect(
      createQueries.filter((query) => /FROM `main`\.`KeyValue`/i.test(query)),
    ).toHaveLength(1);
    expect(createQueries.some((query) => /\bCOUNT\s*\(/i.test(query))).toBe(
      false,
    );
    expect(createdList.error).toBeUndefined();
    const listId = required(createdList.result?.structuredContent?.list?.id);
    expect(listId).toMatch(/^mcp_/);
    const retriedList = await call("daylily.create_list", listArgs);
    expect(retriedList.result?.structuredContent?.list?.id).toBe(listId);
    expect(await db.list.findMany({ where: { id: listId } })).toHaveLength(1);
    const reusedRequestId = await call("daylily.create_list", {
      ...listArgs,
      title: "Different title",
    });
    expect(reusedRequestId.error?.message).toContain("different data");
    const deletedListArgs = {
      requestId: crypto.randomUUID(),
      title: "MCP deleted list retry",
    };
    const deletedList = await call("daylily.create_list", deletedListArgs);
    const deletedListId = required(
      deletedList.result?.structuredContent?.list?.id,
    );
    await db.list.delete({ where: { id: deletedListId } });
    const deletedListRetry = await call("daylily.create_list", deletedListArgs);
    expect(deletedListRetry.error?.code).toBe(-32009);
    expect(
      await db.list.findUnique({ where: { id: deletedListId } }),
    ).toBeNull();
    const changedList = await call("daylily.update_list", {
      listId,
      expectedUpdatedAt: required(
        createdList.result?.structuredContent?.list?.updatedAt,
      ),
      description: "Edited through MCP",
    });
    expect(changedList.result?.structuredContent?.list?.description).toBe(
      "Edited through MCP",
    );
    const staleListEdit = await call("daylily.update_list", {
      listId,
      expectedUpdatedAt: required(
        createdList.result?.structuredContent?.list?.updatedAt,
      ),
      description: "Stale overwrite",
    });
    expect(staleListEdit.error?.code).toBe(-32009);

    const listingArgs = {
      requestId: crypto.randomUUID(),
      title: "MCP local proof listing",
      description: "Written through remote MCP",
      price: 12,
      hidden: true,
    };
    const createdListing = await call("daylily.create_listing", listingArgs);
    expect(createdListing.error).toBeUndefined();
    const listingId = required(
      createdListing.result?.structuredContent?.listing?.id,
    );
    expect(
      (await call("daylily.create_listing", listingArgs)).result
        ?.structuredContent?.listing?.id,
    ).toBe(listingId);
    expect(
      await db.listing.findMany({ where: { id: listingId } }),
    ).toHaveLength(1);
    const deletedListingArgs = {
      requestId: crypto.randomUUID(),
      title: "MCP deleted listing retry",
      hidden: true,
    };
    const deletedListing = await call(
      "daylily.create_listing",
      deletedListingArgs,
    );
    const deletedListingId = required(
      deletedListing.result?.structuredContent?.listing?.id,
    );
    await db.listing.delete({ where: { id: deletedListingId } });
    const deletedListingRetry = await call(
      "daylily.create_listing",
      deletedListingArgs,
    );
    expect(deletedListingRetry.error?.code).toBe(-32009);
    expect(
      await db.listing.findUnique({ where: { id: deletedListingId } }),
    ).toBeNull();

    const edited = await call("daylily.update_listing", {
      listingId,
      expectedUpdatedAt: required(
        createdListing.result?.structuredContent?.listing?.updatedAt,
      ),
      price: 15,
      hidden: false,
    });
    expect(edited.result?.structuredContent?.listing).toMatchObject({
      price: 15,
      status: null,
    });
    const staleListingEdit = await call("daylily.update_listing", {
      listingId,
      expectedUpdatedAt: required(
        createdListing.result?.structuredContent?.listing?.updatedAt,
      ),
      price: 10,
    });
    expect(staleListingEdit.error?.code).toBe(-32009);
    expect(
      (await db.listing.findUniqueOrThrow({ where: { id: listingId } })).price,
    ).toBe(15);
    const cultivar = await db.cultivarReference.findFirst({
      where: { v2AhsCultivar: { isNot: null } },
      select: {
        id: true,
        v2AhsCultivar: { select: { post_title: true } },
      },
    });
    expect(cultivar?.v2AhsCultivar?.post_title).toBeTruthy();
    const absentSync = await call("daylily.sync_listing_cultivar_name", {
      listingId,
    });
    expect(absentSync.error).toBeTruthy();
    const absentUnlink = await call("daylily.open_dashboard", {
      destination: "unlink_listing_cultivar",
      id: listingId,
    });
    expect(absentUnlink.error).toBeTruthy();
    const linked = await call("daylily.link_listing_to_cultivar", {
      listingId,
      cultivarReferenceId: cultivar!.id,
    });
    expect(linked.result?.structuredContent?.listing?.cultivarReferenceId).toBe(
      cultivar!.id,
    );
    const syncedName = await call("daylily.sync_listing_cultivar_name", {
      listingId,
    });
    expect(syncedName.result?.structuredContent?.listing?.title).toBe(
      cultivar!.v2AhsCultivar!.post_title,
    );
    expect(syncedName.result?.structuredContent?.listing?.slug).toBeTruthy();
    const unlinkReview = await call("daylily.open_dashboard", {
      destination: "unlink_listing_cultivar",
      id: listingId,
    });
    expect(unlinkReview.result?.structuredContent?.url).toBe(
      `https://daylilycatalog.com/dashboard/listings?editing=${listingId}#listing-cultivar`,
    );

    const membership = await call("daylily.add_listing_to_list", {
      listingId,
      listId,
    });
    expect(membership.error).toBeUndefined();
    expect(
      (await call("daylily.add_listing_to_list", { listingId, listId })).error,
    ).toBeUndefined();
    const review = await call("daylily.open_dashboard", {
      destination: "remove_listings_from_list",
      id: listId,
      listingIds: [listingId],
    });
    expect(review.result?.structuredContent?.url).toContain(
      `/dashboard/lists/${listId}?remove=${listingId}`,
    );
    expect(
      await db.list.findFirst({
        where: { id: listId, listings: { some: { id: listingId } } },
      }),
    ).toBeTruthy();

    const deleteListReview = await call("daylily.open_dashboard", {
      destination: "delete_list",
      id: listId,
    });
    expect(deleteListReview.result?.structuredContent?.canComplete).toBe(false);
    expect(deleteListReview.result?.structuredContent?.url).toContain(
      `/dashboard/lists/${listId}`,
    );

    const listingImage = await db.image.findFirst({
      where: { listing: { userId: owner!.id } },
      select: { id: true, listingId: true },
    });
    expect(listingImage).toBeTruthy();
    const imageReview = await call("daylily.open_dashboard", {
      destination: "remove_listing_image",
      id: listingImage!.listingId,
      imageId: listingImage!.id,
    });
    expect(imageReview.result?.structuredContent?.url).toContain(
      `intent=remove_image&imageId=${listingImage!.id}`,
    );
    expect(
      await db.image.findUnique({ where: { id: listingImage!.id } }),
    ).toBeTruthy();
    const imageOrder = await call("daylily.reorder_images", {
      type: "listing",
      referenceId: listingImage!.listingId,
      imageIds: [listingImage!.id],
    });
    expect(imageOrder.error).toBeUndefined();

    const profileImage = await db.image.findFirst({
      where: { userProfile: { userId: owner!.id } },
      select: { id: true, userProfileId: true },
    });
    expect(profileImage).toBeTruthy();
    const profileImageRead = await call("daylily.get_profile", {});
    const existingProfileImageIds =
      profileImageRead.result?.structuredContent?.profile?.images?.map(
        (image) => image.id,
      );
    expect(existingProfileImageIds).toContain(profileImage!.id);
    const pagedProfileImageIds: string[] = [];
    let imageCursor: string | null = null;
    do {
      const page = await call("daylily.list_images", {
        type: "profile",
        referenceId: required(profileImage!.userProfileId),
        limit: 2,
        ...(imageCursor ? { cursor: imageCursor } : {}),
      });
      expect(page.error).toBeUndefined();
      pagedProfileImageIds.push(
        ...(page.result?.structuredContent?.items ?? []).map(
          (image) => image.id,
        ),
      );
      imageCursor = page.result?.structuredContent?.nextCursor ?? null;
    } while (imageCursor);
    const expectedProfileImages = await db.image.findMany({
      where: { userProfileId: profileImage!.userProfileId },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    expect(pagedProfileImageIds).toEqual(
      expectedProfileImages.map((image) => image.id),
    );
    const profileImageReview = await call("daylily.open_dashboard", {
      destination: "remove_profile_image",
      imageId: required(
        existingProfileImageIds?.find((id) => id === profileImage!.id),
      ),
    });
    expect(profileImageReview.result?.structuredContent?.url).toContain(
      `imageId=${profileImage!.id}`,
    );
    const exactProfileImageRead = await call("daylily.get_image", {
      type: "profile",
      referenceId: required(profileImage!.userProfileId),
      imageId: profileImage!.id,
    });
    expect(exactProfileImageRead.result?.structuredContent?.image?.id).toBe(
      profileImage!.id,
    );
    const wrongImageTarget = await call("daylily.get_image", {
      type: "listing",
      referenceId: listingId,
      imageId: profileImage!.id,
    });
    expect(wrongImageTarget.error).toBeTruthy();

    const profileBeforeEdit = await db.userProfile.findUnique({
      where: { userId: owner!.id },
      select: { updatedAt: true },
    });
    const profileEdit = await call("daylily.update_profile", {
      expectedUpdatedAt: profileBeforeEdit?.updatedAt.toISOString() ?? null,
      location: "Test garden",
      logoUrl: "https://example.invalid/mcp-test-logo.png",
    });
    expect(profileEdit.result?.structuredContent?.profile?.location).toBe(
      "Test garden",
    );
    expect(profileEdit.result?.structuredContent?.profile?.logoUrl).toBe(
      "https://example.invalid/mcp-test-logo.png",
    );
    const staleProfileEdit = await call("daylily.update_profile", {
      expectedUpdatedAt: profileBeforeEdit?.updatedAt.toISOString() ?? null,
      location: "Stale overwrite",
    });
    expect(staleProfileEdit.error?.code).toBe(-32009);
    const directProfileUrlEdit = await call("daylily.update_profile", {
      expectedUpdatedAt: required(
        profileEdit.result?.structuredContent?.profile?.updatedAt,
      ),
      slug: "changed-without-review",
    });
    expect(directProfileUrlEdit.error).toBeTruthy();
    const profileUrlHandoff = await call("daylily.open_dashboard", {
      destination: "edit_profile_url",
    });
    expect(profileUrlHandoff.result?.structuredContent?.url).toBe(
      "https://daylilycatalog.com/dashboard/profile#profile-url",
    );
    expect(
      await db.userProfile.findUnique({
        where: { userId: owner!.id },
        select: { slug: true },
      }),
    ).toMatchObject({ slug: "rollingoaksdaylilies" });

    const profileRead = await call("daylily.get_profile", {});
    const profileImages =
      profileRead.result?.structuredContent?.profile?.images ?? [];
    expect(profileImages.map((image) => image.id)).toContain(profileImage!.id);
    expect(profileImages.map((image) => image.order)).toEqual(
      [...profileImages.map((image) => image.order)].sort((a, b) => a - b),
    );
    const updatedAt = required(
      profileRead.result?.structuredContent?.profile?.updatedAt,
    );
    const originalContent = profileRead.result?.structuredContent?.profile
      ?.content as string | null;
    const changedContent = await call("daylily.append_profile_paragraph", {
      paragraph: "A local MCP test paragraph.",
      expectedUpdatedAt: updatedAt,
    });
    expect(changedContent.error).toBeUndefined();
    const nextContent = required(
      changedContent.result?.structuredContent?.profile?.content,
    );
    type ProfileBlock = {
      id: string;
      data: { text?: string };
    };
    const blocks = (JSON.parse(nextContent) as { blocks: ProfileBlock[] })
      .blocks;
    const originalBlocks = originalContent
      ? (JSON.parse(originalContent) as { blocks: ProfileBlock[] }).blocks
      : [];
    expect(blocks).toHaveLength(originalBlocks.length + 1);
    const paragraphId = blocks.at(-1)?.id;
    expect(paragraphId).toBeTruthy();
    const blockRemovalReview = await call("daylily.open_dashboard", {
      destination: "remove_profile_content_block",
      blockId: paragraphId,
    });
    expect(blockRemovalReview.result?.structuredContent?.url).toBe(
      `https://daylilycatalog.com/dashboard/profile?contentBlock=${paragraphId}#profile-content`,
    );
    expect(
      (
        await call("daylily.open_dashboard", {
          destination: "remove_profile_content_block",
          blockId: "missing-block",
        })
      ).error,
    ).toBeTruthy();
    expect(
      await db.userProfile.findUnique({
        where: { userId: owner!.id },
        select: { content: true },
      }),
    ).toMatchObject({ content: nextContent });
    const editedContent = await call("daylily.edit_profile_paragraph", {
      blockId: paragraphId,
      text: "An edited local MCP test paragraph.",
      expectedUpdatedAt:
        changedContent.result?.structuredContent?.profile?.updatedAt,
    });
    expect(editedContent.error).toBeUndefined();
    const editedBlocks = (
      JSON.parse(
        required(editedContent.result?.structuredContent?.profile?.content),
      ) as { blocks: ProfileBlock[] }
    ).blocks;
    expect(editedBlocks.slice(0, -1)).toEqual(blocks.slice(0, -1));
    expect(editedBlocks.at(-1)?.data.text).toBe(
      "An edited local MCP test paragraph.",
    );
    const richBlocks = [
      ...editedBlocks,
      {
        id: crypto.randomUUID(),
        type: "header",
        data: {
          text: "Garden <script>alert(1)</script><b>story</b>",
          level: 2,
        },
      },
      {
        id: crypto.randomUUID(),
        type: "list",
        data: {
          style: "checklist",
          meta: {},
          items: [
            { content: "Plant divisions", meta: { checked: true }, items: [] },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: "table",
        data: {
          withHeadings: true,
          content: [
            ["Cultivar", "Bloom"],
            ["Example", "June"],
          ],
        },
      },
    ];
    const richEdit = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: richBlocks }),
      expectedUpdatedAt:
        editedContent.result?.structuredContent?.profile?.updatedAt,
    });
    expect(richEdit.error).toBeUndefined();
    const savedRichBlocks = (
      JSON.parse(
        required(richEdit.result?.structuredContent?.profile?.content),
      ) as {
        blocks: Array<{ id: string; type: string }>;
      }
    ).blocks;
    expect(savedRichBlocks.map((block) => block.id)).toEqual(
      richBlocks.map((block) => block.id),
    );
    expect(savedRichBlocks.slice(-3).map((block) => block.type)).toEqual([
      "header",
      "list",
      "table",
    ]);
    expect(
      (savedRichBlocks.at(-3) as { data: { text: string } } | undefined)?.data
        .text,
    ).toBe("Garden <b>story</b>");
    const removedBlock = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: richBlocks.slice(1) }),
      expectedUpdatedAt: richEdit.result?.structuredContent?.profile?.updatedAt,
    });
    expect(removedBlock.error).toBeTruthy();
    const persistedContent = await db.userProfile.findUniqueOrThrow({
      where: { userId: owner!.id },
      select: { content: true },
    });
    const persistedBlocks = (
      JSON.parse(required(persistedContent.content)) as { blocks: unknown[] }
    ).blocks;
    expect(persistedBlocks).toEqual(savedRichBlocks);
    const staleRichEdit = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: richBlocks }),
      expectedUpdatedAt:
        editedContent.result?.structuredContent?.profile?.updatedAt,
    });
    expect(staleRichEdit.error).toBeTruthy();
    const staleEdit = await call("daylily.edit_profile_paragraph", {
      blockId: paragraphId,
      text: "This must not replace the paragraph.",
      expectedUpdatedAt:
        changedContent.result?.structuredContent?.profile?.updatedAt,
    });
    expect(staleEdit.error).toBeTruthy();
    const staleContent = await call("daylily.append_profile_paragraph", {
      paragraph: "This must not overwrite the profile.",
      expectedUpdatedAt: updatedAt,
    });
    expect(staleContent.error).toBeTruthy();

    const legacyHeadingId = crypto.randomUUID();
    await db.userProfile.update({
      where: { userId: owner!.id },
      data: {
        content: JSON.stringify({
          blocks: [
            { type: "paragraph", data: { text: "Older story" } },
            {
              id: legacyHeadingId,
              type: "header",
              data: { text: "Older heading", level: 2 },
            },
          ],
        }),
      },
    });
    const legacyRead = await call("daylily.get_profile", {});
    const legacyUpdatedAt = required(
      legacyRead.result?.structuredContent?.profile?.updatedAt,
    );
    const newStoryId = crypto.randomUUID();
    const legacyBlocks = [
      { type: "paragraph", data: { text: "Edited older story" } },
      {
        id: legacyHeadingId,
        type: "header",
        data: { text: "Older heading", level: 2 },
      },
      {
        id: newStoryId,
        type: "paragraph",
        data: { text: "New story" },
      },
    ];
    const legacyEdit = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: legacyBlocks }),
      expectedUpdatedAt: legacyUpdatedAt,
    });
    expect(legacyEdit.error).toBeUndefined();
    const legacySaved = JSON.parse(
      required(legacyEdit.result?.structuredContent?.profile?.content),
    ) as { blocks: Array<{ id?: string; data: { text: string } }> };
    expect(legacySaved.blocks[0]).toMatchObject({
      data: { text: "Edited older story" },
    });
    expect(legacySaved.blocks[0]?.id).toBeUndefined();
    const movedLegacyBlock = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: legacyBlocks.slice(1) }),
      expectedUpdatedAt:
        legacyEdit.result?.structuredContent?.profile?.updatedAt,
    });
    expect(movedLegacyBlock.error).toBeTruthy();

    const claimedLegacyId = crypto.randomUUID();
    const claimedBlocks = [
      { ...legacyBlocks[0], id: claimedLegacyId },
      ...legacyBlocks.slice(1),
    ];
    const claimedLegacyBlock = await call("daylily.update_profile_content", {
      content: JSON.stringify({ blocks: claimedBlocks }),
      expectedUpdatedAt:
        legacyEdit.result?.structuredContent?.profile?.updatedAt,
    });
    expect(claimedLegacyBlock.error).toBeUndefined();
    const reorderedLegacyBlock = await call("daylily.update_profile_content", {
      content: JSON.stringify({
        blocks: [...claimedBlocks.slice(1), claimedBlocks[0]],
      }),
      expectedUpdatedAt:
        claimedLegacyBlock.result?.structuredContent?.profile?.updatedAt,
    });
    expect(reorderedLegacyBlock.error).toBeUndefined();
    const reorderedBlocks = JSON.parse(
      required(
        reorderedLegacyBlock.result?.structuredContent?.profile?.content,
      ),
    ) as { blocks: Array<{ id: string }> };
    expect(reorderedBlocks.blocks.map((block) => block.id)).toEqual([
      legacyHeadingId,
      newStoryId,
      claimedLegacyId,
    ]);

    const largeParagraphId = crypto.randomUUID();
    const smallParagraphId = crypto.randomUUID();
    const largeContent = JSON.stringify({
      blocks: [
        {
          id: largeParagraphId,
          type: "paragraph",
          data: { text: "x".repeat(39_000) },
        },
        {
          id: smallParagraphId,
          type: "paragraph",
          data: { text: "Short" },
        },
      ],
    });
    const largeProfile = await db.userProfile.update({
      where: { userId: owner!.id },
      data: { content: largeContent },
      select: { updatedAt: true },
    });
    const overLimitAppend = await call("daylily.append_profile_paragraph", {
      paragraph: "y".repeat(2_000),
      expectedUpdatedAt: largeProfile.updatedAt.toISOString(),
    });
    expect(overLimitAppend.error).toBeTruthy();
    const overLimitEdit = await call("daylily.edit_profile_paragraph", {
      blockId: smallParagraphId,
      text: "y".repeat(2_000),
      expectedUpdatedAt: largeProfile.updatedAt.toISOString(),
    });
    expect(overLimitEdit.error).toBeTruthy();
    const unchangedLargeProfile = await db.userProfile.findUniqueOrThrow({
      where: { userId: owner!.id },
      select: { content: true },
    });
    expect(unchangedLargeProfile.content).toBe(largeContent);

    const foreignListing = await db.listing.findFirst({
      where: {
        userId: { not: owner!.id },
        cultivarReferenceId: { not: null },
      },
      select: { id: true, title: true },
    });
    expect(foreignListing).toBeTruthy();
    const foreignEdit = await call("daylily.update_listing", {
      listingId: foreignListing!.id,
      expectedUpdatedAt: new Date(0).toISOString(),
      title: "Denied",
    });
    expect(foreignEdit.error?.message).toContain("Listing not found");
    const foreignSync = await call("daylily.sync_listing_cultivar_name", {
      listingId: foreignListing!.id,
    });
    expect(foreignSync.error).toBeTruthy();
    const oversizedId = await call("daylily.update_listing", {
      listingId: "x".repeat(129),
      expectedUpdatedAt: new Date(0).toISOString(),
      title: "Denied",
    });
    expect(oversizedId.error).toMatchObject({
      code: -32602,
      message: expect.stringContaining("listingId"),
    });
    const oversizedUpload = await call("daylily.prepare_image_upload", {
      type: "listing",
      referenceId: listingId,
      contentType: "image/png",
      size: APP_CONFIG.UPLOAD.MAX_FILE_SIZE + 1,
    });
    expect(oversizedUpload.error?.code).toBe(-32602);
    expect(
      (await db.listing.findUnique({ where: { id: foreignListing!.id } }))
        ?.title,
    ).toBe(foreignListing!.title);

    const { createCaller } = await import("@/server/api/root");
    const dashboardCaller = createCaller({
      db,
      clerkUserId: owner!.clerkUserId,
      headers: new Headers(),
      requestUrl: "https://daylilycatalog.com/dashboard",
    });
    await expect(
      dashboardCaller.dashboardDb.userProfile.updateContent({
        content: JSON.stringify({ blocks: legacyBlocks }),
        expectedUpdatedAt: updatedAt,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const refreshedListings =
      await dashboardCaller.dashboardDb.listing.getByIds({
        ids: [listingId, foreignListing!.id],
      });
    expect(refreshedListings.map((listing) => listing.id)).toEqual([listingId]);
    const refreshedImage = await dashboardCaller.dashboardDb.image.get({
      type: "listing",
      referenceId: listingImage!.listingId!,
      imageId: listingImage!.id,
    });
    expect(refreshedImage.id).toBe(listingImage!.id);
    await expect(
      dashboardCaller.dashboardDb.image.get({
        type: "listing",
        referenceId: foreignListing!.id,
        imageId: listingImage!.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    auth.clientId = "wrong_client";
    expect(
      (
        await call("daylily.update_list", {
          listId,
          expectedUpdatedAt: required(
            changedList.result?.structuredContent?.list?.updatedAt,
          ),
          title: "Denied",
        })
      ).result?.isError,
    ).toBe(true);
    auth.clientId = "mcp_member_write_test";

    await db.keyValue.update({
      where: { key: `stripe:customer:${owner!.stripeCustomerId}` },
      data: { value: JSON.stringify({ status: "none" }) },
    });
    const noMembership = await call("daylily.update_list", {
      listId,
      expectedUpdatedAt: required(
        changedList.result?.structuredContent?.list?.updatedAt,
      ),
      title: "Denied",
    });
    expect(noMembership.error?.message).toContain("active membership");
    expect((await db.list.findUnique({ where: { id: listId } }))?.title).toBe(
      listArgs.title,
    );

    await expect(
      dashboardCaller.dashboardDb.list.delete({ id: listId }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(
      dashboardCaller.dashboardDb.list.removeListingsFromList({
        listId,
        listingIds: [listingId, foreignListing!.id],
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(
      await db.list.findFirst({
        where: { id: listId, listings: { some: { id: listingId } } },
      }),
    ).toBeTruthy();
    await dashboardCaller.dashboardDb.list.removeListingsFromList({
      listId,
      listingIds: [listingId],
    });
    expect(
      await dashboardCaller.dashboardDb.list.delete({ id: listId }),
    ).toEqual({
      id: listId,
    });
  }, 120_000);

  it("keeps concurrent cultivar links from replacing one another", async () => {
    process.env.DATABASE_URL = `file:${databasePath}`;
    process.env.TURSO_DATABASE_AUTH_TOKEN = "";
    process.env.TURSO_EMBEDDED_REPLICA_URL = "";
    process.env.INTEGRATION_MODE = "1";

    const { db } = await import("@/server/db");
    const { callMemberWriteTool } = await import(
      "@/server/mcp/member-write-mcp"
    );
    const { getClerkUserData } = await import("@/server/clerk/sync-user");
    const owner = await db.user.findFirst({
      where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
    });
    const cultivars = await db.cultivarReference.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    });
    expect(owner?.clerkUserId).toBeTruthy();
    expect(cultivars).toHaveLength(2);
    const authUser = {
      ...owner!,
      clerk: await getClerkUserData(owner!.clerkUserId),
    };

    const listingId = crypto.randomUUID();
    await db.listing.create({
      data: {
        id: listingId,
        userId: owner!.id,
        title: "Concurrent link proof",
        slug: listingId,
      },
    });

    let arrivals = 0;
    let releaseReads: (() => void) | undefined;
    const bothRead = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    const guardedDb = db.$extends({
      query: {
        listing: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (
              args.where?.id === listingId &&
              args.select?.cultivarReferenceId === true
            ) {
              arrivals += 1;
              if (arrivals === 2) releaseReads?.();
              await bothRead;
            }
            return row;
          },
        },
      },
    });
    const context = {
      baseUrl: "https://daylilycatalog.com",
      request: new Request("https://daylilycatalog.com/api/mcp/server"),
      publicDb: db,
      memberDb: guardedDb as unknown as typeof db,
      hasLocalPublicReadDb: true,
    };
    const results = await Promise.allSettled(
      cultivars.map((cultivar) =>
        callMemberWriteTool(
          context,
          "daylily.link_listing_to_cultivar",
          { listingId, cultivarReferenceId: cultivar.id },
          authUser,
          "mcp_member_write_test",
        ),
      ),
    );

    expect(arrivals).toBe(2);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.reason).toMatchObject({ code: "PRECONDITION_FAILED" });
    const saved = await db.listing.findUnique({ where: { id: listingId } });
    expect(cultivars.map((cultivar) => cultivar.id)).toContain(
      saved?.cultivarReferenceId,
    );
  }, 30_000);
});
