import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "@/env";

const contentAddressedArtifactPattern = /^[a-f0-9]{64}\.json$/;
const weakSha256EtagPattern = /^W\/"[A-Za-z0-9_-]{43}"$/;

const publicStorefrontManifestSchema = z
  .object({
    formatVersion: z.literal(1),
    generatedAt: z.string().min(1),
    sellers: z
      .array(
        z
          .object({
            id: z.string().min(1),
            artifact: z.string().regex(contentAddressedArtifactPattern),
            byteLength: z.number().int().positive(),
            etag: z.string().regex(weakSha256EtagPattern),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const sellerIds = new Set<string>();
    for (const seller of manifest.sellers) {
      if (sellerIds.has(seller.id)) {
        context.addIssue({
          code: "custom",
          message: "Seller IDs must be unique.",
          path: ["sellers"],
        });
      }
      sellerIds.add(seller.id);
    }
  });

export type PublicStorefrontArtifactLoadResult =
  | {
      status: "ready";
      body: string;
      byteLength: number;
      etag: string;
    }
  | { status: "not_found" }
  | { status: "unavailable" };

function getArtifactRoot() {
  const configuredRoot = env.PUBLIC_STOREFRONT_ARTIFACT_ROOT;
  if (configuredRoot) {
    return path.resolve(configuredRoot);
  }

  return process.env.NODE_ENV === "production"
    ? "/data/storefronts"
    : path.join(process.cwd(), ".tmp", "storefronts");
}

function getRepresentationDigest(body: string, sellerId: string) {
  const bodyDigest = createHash("sha256").update(body).digest();
  const artifactDigest = createHash("sha256")
    .update(sellerId)
    .update("\0")
    .update(body)
    .digest("hex");

  return {
    artifact: `${artifactDigest}.json`,
    etag: `W/"${bodyDigest.toString("base64url")}"`,
  };
}

export async function loadPublicStorefrontArtifact(
  sellerId: string,
): Promise<PublicStorefrontArtifactLoadResult> {
  const artifactRoot = getArtifactRoot();
  const manifestPath = path.join(artifactRoot, "current", "manifest.json");
  let manifestContents: string;

  try {
    manifestContents = await readFile(manifestPath, "utf8");
  } catch {
    return { status: "unavailable" };
  }

  const parsedManifest = publicStorefrontManifestSchema.safeParse(
    (() => {
      try {
        return JSON.parse(manifestContents) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (!parsedManifest.success) {
    return { status: "unavailable" };
  }

  const seller = parsedManifest.data.sellers.find(
    (entry) => entry.id === sellerId,
  );
  if (!seller) {
    return { status: "not_found" };
  }

  const artifactPath = path.join(artifactRoot, "artifacts", seller.artifact);

  try {
    const artifactStat = await stat(artifactPath);
    if (!artifactStat.isFile() || artifactStat.size !== seller.byteLength) {
      return { status: "unavailable" };
    }

    const body = await readFile(artifactPath, "utf8");
    if (Buffer.byteLength(body) !== seller.byteLength) {
      return { status: "unavailable" };
    }

    const digest = getRepresentationDigest(body, sellerId);
    if (digest.artifact !== seller.artifact || digest.etag !== seller.etag) {
      return { status: "unavailable" };
    }

    return {
      status: "ready",
      body,
      byteLength: seller.byteLength,
      etag: seller.etag,
    };
  } catch {
    return { status: "unavailable" };
  }
}
