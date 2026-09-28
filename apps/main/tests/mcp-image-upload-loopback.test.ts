// @vitest-environment node

const modifiedEnvNames = [
  "SKIP_ENV_VALIDATION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "AWS_ENDPOINT_URL_S3",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
  "INTEGRATION_R2_ENDPOINT_URL",
  "DATABASE_URL",
  "TURSO_DATABASE_AUTH_TOKEN",
  "TURSO_EMBEDDED_REPLICA_URL",
  "DAYLILY_MCP_OAUTH_CLIENT_ID",
  "INTEGRATION_MODE",
] as const;
const previousEnv = new Map(
  modifiedEnvNames.map((name) => [name, process.env[name]]),
);

process.env.SKIP_ENV_VALIDATION = "1";
process.env.AWS_ACCESS_KEY_ID = "integration-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "integration-secret-key";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_BUCKET_NAME = "integration-mcp-images";
process.env.R2_ACCOUNT_ID = "";
process.env.R2_ACCESS_KEY_ID = "";
process.env.R2_SECRET_ACCESS_KEY = "";
process.env.R2_BUCKET_NAME = "";
process.env.R2_PUBLIC_BASE_URL = "";

import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type * as NextServerModule from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { memberOperationResultSchemas } from "@/lib/member-result-contract";

const seedPath = path.resolve(
  process.cwd(),
  "local/realistic-data/realistic-data.sqlite",
);
const enabled =
  process.env.RUN_MCP_IMAGE_UPLOAD_PROOF === "1" && existsSync(seedPath);
const tempDir = enabled
  ? mkdtempSync(path.join(tmpdir(), "daylily-mcp-image-upload-"))
  : null;
const databasePath = tempDir ? path.join(tempDir, "member.sqlite") : null;
if (databasePath) copyFileSync(seedPath, databasePath);

const auth = vi.hoisted(() => ({ clerkUserId: "" }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        clientId: "mcp_image_upload_test",
        isAuthenticated: true,
        scopes: ["catalog:read", "catalog:write"],
        userId: auth.clerkUserId,
      }),
    }),
  }),
}));
vi.mock("@/server/clerk/sync-user", () => ({
  getClerkUserData: async () => ({ email: "member@example.com" }),
}));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof NextServerModule>("next/server");
  return { ...actual, after: vi.fn() };
});

let storageServer: Server | null = null;
afterAll(async () => {
  if (storageServer?.listening) {
    await new Promise<void>((resolve) => storageServer?.close(() => resolve()));
  }
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  for (const name of modifiedEnvNames) {
    const value = previousEnv.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected MCP response value.");
  return value;
}

describe.skipIf(!enabled)(
  "remote MCP image upload through loopback storage",
  () => {
    it("uploads and processes owned listing and profile images", async () => {
      const uploads = new Map<string, Buffer>();
      storageServer = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (request.method === "GET") {
          const uploaded = uploads.get(url.pathname);
          response
            .writeHead(uploaded ? 200 : 404, {
              ...(uploaded
                ? {
                    "Content-Length": uploaded.byteLength,
                    "Content-Type": url.pathname.endsWith(".webp")
                      ? "image/webp"
                      : "image/png",
                  }
                : {}),
            })
            .end(uploaded);
          return;
        }
        if (request.method === "HEAD") {
          const uploaded = uploads.get(url.pathname);
          response
            .writeHead(uploaded ? 200 : 404, {
              ...(uploaded
                ? {
                    "Content-Length": uploaded.byteLength,
                    "Content-Type": "image/png",
                  }
                : {}),
            })
            .end();
          return;
        }
        if (
          request.method !== "PUT" ||
          !["/integration-mcp-images/", "/integration-r2-images/"].some(
            (prefix) => url.pathname.startsWith(prefix),
          ) ||
          (!url.searchParams.has("X-Amz-Signature") &&
            !request.headers.authorization)
        ) {
          response.writeHead(400).end();
          return;
        }
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          uploads.set(url.pathname, Buffer.concat(chunks));
          response.writeHead(200).end();
        });
      });
      const server = required(storageServer);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      });
      const port = (storageServer.address() as AddressInfo).port;
      process.env.AWS_ENDPOINT_URL_S3 = `http://127.0.0.1:${port}`;
      process.env.INTEGRATION_R2_ENDPOINT_URL = `http://127.0.0.1:${port}`;
      process.env.R2_ACCOUNT_ID = "integration-account";
      process.env.R2_ACCESS_KEY_ID = "integration-r2-access-key";
      process.env.R2_SECRET_ACCESS_KEY = "integration-r2-secret-key";
      process.env.R2_BUCKET_NAME = "integration-r2-images";
      process.env.R2_PUBLIC_BASE_URL = `http://127.0.0.1:${port}/integration-r2-images`;
      process.env.DATABASE_URL = `file:${databasePath}`;
      process.env.TURSO_DATABASE_AUTH_TOKEN = "";
      process.env.TURSO_EMBEDDED_REPLICA_URL = "";
      process.env.DAYLILY_MCP_OAUTH_CLIENT_ID = "mcp_image_upload_test";
      process.env.INTEGRATION_MODE = "1";

      const { db } = await import("@/server/db");
      const { handleMcpRequest } = await import("@/server/mcp/read-only-mcp");
      const { processPendingImageAssetVariants } = await import(
        "@/server/services/image-asset-variant-processor"
      );
      const owner = await db.user.findFirst({
        where: { profile: { is: { slug: "rollingoaksdaylilies" } } },
        select: {
          id: true,
          clerkUserId: true,
          profile: { select: { id: true } },
        },
      });
      expect(owner?.clerkUserId).toBeTruthy();
      expect(owner?.profile?.id).toBeTruthy();
      auth.clerkUserId = owner!.clerkUserId!;
      const listing = await db.listing.findFirst({
        where: { userId: owner!.id, images: { none: {} } },
        select: { id: true },
      });
      expect(listing).toBeTruthy();

      async function call(name: string, args: Record<string, unknown>) {
        const response = await handleMcpRequest(
          new Request("http://localhost:3217/api/mcp/server", {
            method: "POST",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: crypto.randomUUID(),
              method: "tools/call",
              params: { name, arguments: args },
            }),
          }),
        );
        const result = (await response.json()) as {
          error?: { message: string };
          result?: {
            isError?: boolean;
            structuredContent?: {
              error?: { code: string; message: string };
              image?: { id: string };
              upload?: {
                imageId: string;
                key: string;
                presignedUrl: string;
                url: string;
                r2: {
                  key: string;
                  presignedUrl: string;
                  url: string;
                };
              };
            };
          };
        };
        if (result.result && !result.result.isError) {
          if (name === "daylily.prepare_image_upload") {
            memberOperationResultSchemas["image.prepareUpload"].parse(
              result.result.structuredContent?.upload,
            );
          }
          if (
            name === "daylily.upload_image" ||
            name === "daylily.attach_uploaded_image"
          ) {
            memberOperationResultSchemas["image.create"].parse(
              result.result.structuredContent?.image,
            );
          }
        }
        if (result.result?.isError && result.result.structuredContent?.error) {
          return {
            ...result,
            error: { message: result.result.structuredContent.error.message },
          };
        }
        return result;
      }

      const imageBytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      );
      const { APP_CONFIG } = await import("@/config/constants");
      const fullProfileUpload = await call("daylily.prepare_image_upload", {
        type: "profile",
        referenceId: owner!.profile!.id,
        contentType: "image/png",
        size: imageBytes.byteLength,
      });
      expect(fullProfileUpload.error?.message).toContain(
        "maximum number of images",
      );
      await db.imageAsset.deleteMany({
        where: { userProfileId: owner!.profile!.id },
      });
      await db.image.deleteMany({
        where: { userProfileId: owner!.profile!.id },
      });
      const firstImageIds = new Map<string, string>();
      const invalidDirectUpload = await call("daylily.upload_image", {
        type: "listing",
        referenceId: listing!.id,
        contentType: "image/png",
        imageDataUrl: `data:image/png;base64,${Buffer.from("not an image").toString("base64")}`,
        requestId: crypto.randomUUID(),
      });
      expect(invalidDirectUpload.error?.message).toContain(
        "Image data does not match its content type",
      );
      for (const target of [
        { type: "listing", referenceId: listing!.id },
        { type: "profile", referenceId: owner!.profile!.id },
      ]) {
        const prepared = await call("daylily.prepare_image_upload", {
          ...target,
          contentType: "image/png",
          size: imageBytes.byteLength,
        });
        expect(prepared.error).toBeUndefined();
        const upload = required(prepared.result?.structuredContent?.upload);
        firstImageIds.set(target.type, upload.imageId);
        expect(upload.r2).toBeTruthy();
        expect(new URL(upload.presignedUrl).origin).toBe(
          `http://127.0.0.1:${port}`,
        );
        const attachment = {
          ...target,
          imageId: upload.imageId,
          key: upload.key,
          url: upload.url,
        };
        const beforeUpload = await call(
          "daylily.attach_uploaded_image",
          attachment,
        );
        expect(beforeUpload.error?.message).toContain(
          "Upload the image before attaching it",
        );
        expect(
          await db.image.findUnique({ where: { id: upload.imageId } }),
        ).toBeNull();
        const put = await fetch(upload.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/png" },
          body: imageBytes,
        });
        expect(put.status).toBe(200);
        expect(uploads.get(`/integration-mcp-images/${upload.key}`)).toEqual(
          imageBytes,
        );

        uploads.set(
          `/integration-mcp-images/${upload.key}`,
          Buffer.alloc(APP_CONFIG.UPLOAD.MAX_FILE_SIZE + 1),
        );
        const oversizedAttachment = await call(
          "daylily.attach_uploaded_image",
          attachment,
        );
        expect(oversizedAttachment.error?.message).toContain(
          "The uploaded image does not match its upload request",
        );
        expect(
          await db.image.findUnique({ where: { id: upload.imageId } }),
        ).toBeNull();
        uploads.set(`/integration-mcp-images/${upload.key}`, imageBytes);

        const beforeR2Upload = await call("daylily.attach_uploaded_image", {
          ...attachment,
          r2OriginalKey: upload.r2.key,
        });
        expect(beforeR2Upload.error?.message).toContain(
          "Upload the image before attaching it",
        );
        expect(new URL(upload.r2.presignedUrl).origin).toBe(
          `http://127.0.0.1:${port}`,
        );
        const r2Put = await fetch(upload.r2.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/png" },
          body: imageBytes,
        });
        expect(r2Put.status).toBe(200);
        expect(uploads.get(`/integration-r2-images/${upload.r2.key}`)).toEqual(
          imageBytes,
        );

        const completeAttachment = {
          ...attachment,
          r2OriginalKey: upload.r2.key,
        };
        const attached = await call(
          "daylily.attach_uploaded_image",
          completeAttachment,
        );
        expect(attached.error).toBeUndefined();
        expect(attached.result?.structuredContent?.image?.id).toBe(
          upload.imageId,
        );
        expect(
          await db.image.findUnique({ where: { id: upload.imageId } }),
        ).toMatchObject({ id: upload.imageId, url: upload.url });
        expect(
          await db.imageAsset.findUnique({ where: { id: upload.imageId } }),
        ).toMatchObject({
          id: upload.imageId,
          originalKey: upload.r2.key,
        });
        const processing = await processPendingImageAssetVariants({
          db,
          assetId: upload.imageId,
          limit: 1,
        });
        expect(processing).toMatchObject({ processed: 1, failed: 0 });
        const readyAsset = await db.imageAsset.findUnique({
          where: { id: upload.imageId },
        });
        expect(readyAsset?.status).toBe("ready");
        for (const key of [
          readyAsset?.displayKey,
          readyAsset?.thumbKey,
          readyAsset?.blurKey,
        ]) {
          expect(key).toBeTruthy();
          const variant = uploads.get(`/integration-r2-images/${key}`);
          expect(variant?.toString("ascii", 0, 4)).toBe("RIFF");
          expect(variant?.toString("ascii", 8, 12)).toBe("WEBP");
        }
        const publicImage = await fetch(readyAsset!.displayUrl!);
        expect(publicImage.status).toBe(200);
        expect(publicImage.headers.get("Content-Type")).toBe("image/webp");
        const retry = await call(
          "daylily.attach_uploaded_image",
          completeAttachment,
        );
        expect(retry.result?.structuredContent?.image?.id).toBe(upload.imageId);
        expect(await db.image.count({ where: { id: upload.imageId } })).toBe(1);
        const changedKey = `${owner!.id}/${target.referenceId}/different.png`;
        const changedUpload = await call("daylily.attach_uploaded_image", {
          ...completeAttachment,
          key: changedKey,
          url: upload.url.replace(upload.key, changedKey),
        });
        expect(changedUpload.error?.message).toContain(
          "already used for another attachment",
        );
      }

      for (const target of [
        { type: "listing", referenceId: listing!.id },
        { type: "profile", referenceId: owner!.profile!.id },
      ]) {
        const args = {
          ...target,
          contentType: "image/png",
          imageDataUrl: `data:image/png;base64,${imageBytes.toString("base64")}`,
          requestId: crypto.randomUUID(),
        };
        const direct = await call("daylily.upload_image", args);
        expect(direct.error).toBeUndefined();
        const image = required(direct.result?.structuredContent?.image);
        expect(image.id).toBeTruthy();
        const legacyImage = await db.image.findUnique({
          where: { id: image.id },
        });
        expect(legacyImage).toBeTruthy();
        const legacyKey = new URL(legacyImage!.url).pathname.replace(
          /^\/+/,
          "",
        );
        expect(uploads.get(`/integration-mcp-images/${legacyKey}`)).toEqual(
          imageBytes,
        );
        const asset = await db.imageAsset.findUnique({
          where: { id: image.id },
        });
        expect(asset?.originalKey).toBeTruthy();
        expect(
          uploads.get(`/integration-r2-images/${asset!.originalKey}`),
        ).toEqual(imageBytes);

        const retry = await call("daylily.upload_image", args);
        expect(retry.result?.structuredContent?.image?.id).toBe(image.id);
        expect(await db.image.count({ where: { id: image.id } })).toBe(1);

        const firstImageId = firstImageIds.get(target.type);
        expect(firstImageId).toBeTruthy();
        const reordered = await call("daylily.reorder_images", {
          type: target.type,
          referenceId: target.referenceId,
          imageIds: [image.id, firstImageId],
        });
        expect(reordered.error).toBeUndefined();
        const orderedRows = await db.image.findMany({
          where:
            target.type === "listing"
              ? { listingId: target.referenceId }
              : { userProfileId: target.referenceId },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        expect(orderedRows.slice(0, 2).map((row) => row.id)).toEqual([
          image.id,
          firstImageId,
        ]);

        const changedBytes = Buffer.from(imageBytes);
        changedBytes[changedBytes.length - 1] =
          changedBytes[changedBytes.length - 1]! ^ 1;
        const changed = await call("daylily.upload_image", {
          ...args,
          imageDataUrl: `data:image/png;base64,${changedBytes.toString("base64")}`,
        });
        expect(changed.error?.message).toContain(
          "already used for another attachment",
        );
        expect(
          uploads.get(`/integration-r2-images/${asset!.originalKey}`),
        ).toEqual(imageBytes);

        const staleSlot = await call("daylily.prepare_image_upload", {
          ...target,
          contentType: "image/png",
          size: imageBytes.byteLength,
        });
        const staleUpload = required(
          staleSlot.result?.structuredContent?.upload,
        );
        for (let index = 0; index < 2; index += 1) {
          const extra = await call("daylily.upload_image", {
            ...args,
            requestId: crypto.randomUUID(),
          });
          expect(extra.error).toBeUndefined();
        }
        const fullTargetUpload = await call("daylily.prepare_image_upload", {
          ...target,
          contentType: "image/png",
          size: imageBytes.byteLength,
        });
        expect(fullTargetUpload.error?.message).toContain(
          "maximum number of images",
        );
        expect(
          (
            await fetch(staleUpload.presignedUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/png" },
              body: imageBytes,
            })
          ).status,
        ).toBe(200);
        expect(
          (
            await fetch(staleUpload.r2.presignedUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/png" },
              body: imageBytes,
            })
          ).status,
        ).toBe(200);
        const staleAttachment = await call("daylily.attach_uploaded_image", {
          ...target,
          imageId: staleUpload.imageId,
          key: staleUpload.key,
          url: staleUpload.url,
          r2OriginalKey: staleUpload.r2.key,
        });
        expect(staleAttachment.error?.message).toContain(
          "maximum number of images",
        );
        expect(
          await db.image.findUnique({ where: { id: staleUpload.imageId } }),
        ).toBeNull();
        const fullTargetRetry = await call("daylily.upload_image", args);
        expect(fullTargetRetry.result?.structuredContent?.image?.id).toBe(
          image.id,
        );

        await db.imageAsset.deleteMany({ where: { legacyImageId: image.id } });
        await db.image.delete({ where: { id: image.id } });
        const deletedImageRetry = await call("daylily.upload_image", args);
        expect(deletedImageRetry.error?.message).toContain("image was deleted");
        expect(
          await db.image.findUnique({ where: { id: image.id } }),
        ).toBeNull();
      }
    }, 60_000);
  },
);
