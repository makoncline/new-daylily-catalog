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
  "DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS",
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
  process.env.RUN_MEMBER_IMAGE_UPLOAD_PROOF === "1" && existsSync(seedPath);
const tempDir = enabled
  ? mkdtempSync(path.join(tmpdir(), "daylily-member-image-upload-"))
  : null;
const databasePath = tempDir ? path.join(tempDir, "member.sqlite") : null;
if (databasePath) copyFileSync(seedPath, databasePath);

const auth = vi.hoisted(() => ({ clerkUserId: "" }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/clerk/client", () => ({
  getClerk: async () => ({
    authenticateRequest: async () => ({
      toAuth: () => ({
        clientId: "member_image_upload_test",
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
  if (value == null) throw new Error("Expected member API response value.");
  return value;
}

describe.skipIf(!enabled)(
  "member API image upload through loopback storage",
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
      process.env.DAYLILY_MEMBER_API_OAUTH_CLIENT_IDS =
        "member_image_upload_test";
      process.env.INTEGRATION_MODE = "1";

      const { db } = await import("@/server/db");
      const { handleMemberHttpRequest } = await import(
        "@/server/api/member-http"
      );
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

      async function call(
        name: "image.prepareUpload" | "image.create",
        args: Record<string, unknown>,
      ) {
        const response = await handleMemberHttpRequest(
          new Request(`http://localhost:3217/api/v1/member/${name}`, {
            method: "POST",
            headers: {
              Authorization: "Bearer loopback-proof",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ json: args }),
          }),
          name,
        );
        const result = (await response.json()) as {
          error?: { json?: { message: string }; message?: string };
          result?: {
            data?: {
              json?: {
                id?: string;
                imageId: string;
                key: string;
                presignedUrl: string;
                url: string;
                r2: { key: string; presignedUrl: string; url: string };
              };
            };
          };
        };
        if (response.ok) {
          memberOperationResultSchemas[name].parse(result.result?.data?.json);
        }
        return {
          ...result,
          error: result.error
            ? { message: result.error.json?.message ?? result.error.message }
            : undefined,
        };
      }

      const imageBytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      );
      const { APP_CONFIG } = await import("@/config/constants");
      const fullProfileUpload = await call("image.prepareUpload", {
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
      for (const target of [
        { type: "listing", referenceId: listing!.id },
        { type: "profile", referenceId: owner!.profile!.id },
      ]) {
        const prepared = await call("image.prepareUpload", {
          ...target,
          contentType: "image/png",
          size: imageBytes.byteLength,
        });
        expect(prepared.error).toBeUndefined();
        const upload = required(prepared.result?.data?.json);
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
        const beforeUpload = await call("image.create", attachment);
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
        const oversizedAttachment = await call("image.create", attachment);
        expect(oversizedAttachment.error?.message).toContain(
          "The uploaded image does not match its upload request",
        );
        expect(
          await db.image.findUnique({ where: { id: upload.imageId } }),
        ).toBeNull();
        uploads.set(`/integration-mcp-images/${upload.key}`, imageBytes);

        const beforeR2Upload = await call("image.create", {
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
        const attached = await call("image.create", completeAttachment);
        expect(attached.error).toBeUndefined();
        expect(attached.result?.data?.json?.id).toBe(upload.imageId);
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
        const retry = await call("image.create", completeAttachment);
        expect(retry.result?.data?.json?.id).toBe(upload.imageId);
        expect(await db.image.count({ where: { id: upload.imageId } })).toBe(1);
        const changedKey = `${owner!.id}/${target.referenceId}/different.png`;
        const changedUpload = await call("image.create", {
          ...completeAttachment,
          key: changedKey,
          url: upload.url.replace(upload.key, changedKey),
        });
        expect(changedUpload.error?.message).toContain(
          "already used for another attachment",
        );
      }
    });
  },
);
