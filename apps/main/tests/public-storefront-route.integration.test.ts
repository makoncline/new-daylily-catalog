// @vitest-environment node

import { execFile } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/public-storefront-route.sqlite";

const execFileAsync = promisify(execFile);
const buildScriptPath = path.join(
  process.cwd(),
  "scripts/build-public-storefront-artifacts.mjs",
);

interface PublishedStorefrontManifest {
  formatVersion: 1;
  generatedAt: string;
  sellers: Array<{
    id: string;
    artifact: string;
    byteLength: number;
    etag: string;
  }>;
}

async function runBuilder(args: {
  outputRoot: string;
  sellerIds: string[];
  sellerIdsFromEnv?: boolean;
  sourceUrl: string;
}) {
  const sourcePath = args.sourceUrl.replace(/^file:/, "");
  const sellerArgs = args.sellerIdsFromEnv
    ? []
    : args.sellerIds.flatMap((sellerId) => ["--seller-id", sellerId]);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_CLOUDFLARE_URL: "https://images.daylilycatalog.com",
  };
  delete childEnv.PUBLIC_STOREFRONT_SELLER_IDS;
  if (args.sellerIdsFromEnv) {
    childEnv.PUBLIC_STOREFRONT_SELLER_IDS = args.sellerIds.join(",");
  }

  return execFileAsync(
    process.execPath,
    [
      buildScriptPath,
      "--source",
      sourcePath,
      "--output",
      args.outputRoot,
      ...sellerArgs,
    ],
    {
      cwd: process.cwd(),
      env: childEnv,
      maxBuffer: 1024 * 1024,
    },
  );
}

async function readManifest(outputRoot: string) {
  const manifestPath = path.join(outputRoot, "current", "manifest.json");
  const contents = await readFile(manifestPath, "utf8");

  return {
    contents,
    manifest: JSON.parse(contents) as PublishedStorefrontManifest,
    path: manifestPath,
  };
}

afterEach(() => {
  vi.doUnmock("@/server/db");
  delete process.env.PUBLIC_STOREFRONT_ARTIFACT_ROOT;
});

describe("public storefront artifacts", () => {
  it("builds and serves a production-scale isolated snapshot without a request-time database", async () => {
    const outputRoot = await mkdtemp(
      path.join(tmpdir(), "public-storefront-artifacts-"),
    );

    try {
      await withTempAppDb(async ({ user }) => {
        const sourceUrl = process.env.DATABASE_URL!;
        const { db } = await import("@/server/db");
        const otherSeller = await db.user.create({ data: {} });

        await db.userProfile.create({
          data: {
            userId: user.id,
            slug: "rolling-oaks",
            title: "Rolling Oaks Daylilies",
            description: "A public garden catalog.",
            location: "Denver, Colorado",
            content: JSON.stringify({
              time: 123,
              blocks: [
                {
                  id: "welcome",
                  type: "paragraph",
                  data: {
                    text: "Welcome<script>private()</script><strong>friend</strong>",
                  },
                },
              ],
              version: "2.30.0",
            }),
            images: {
              create: [
                {
                  id: "unsafe-profile-image",
                  url: "https://unsafe.example/profile.jpg",
                  order: 1,
                },
                {
                  id: "profile-image",
                  url: "https://legacy.example/profile.jpg",
                  order: 2,
                },
              ],
            },
            imageAssets: {
              create: [
                {
                  id: "profile-image-asset",
                  legacyImageId: "profile-image",
                  kind: "profile",
                  status: "ready",
                  order: 8,
                  originalUrl: "https://private.example/profile-original.jpg",
                  displayUrl: "https://media.daylilycatalog.com/profile.jpg",
                  thumbUrl:
                    "https://media.daylilycatalog.com/profile-thumb.jpg",
                  blurUrl: "https://media.daylilycatalog.com/profile-blur.jpg",
                },
                {
                  id: "profile-direct-asset",
                  kind: "profile",
                  status: "ready",
                  order: 3,
                  displayUrl:
                    "https://media.daylilycatalog.com/profile-direct.jpg",
                  thumbUrl:
                    "https://media.daylilycatalog.com/profile-direct-thumb.jpg",
                },
                {
                  id: "profile-pending-asset",
                  kind: "profile",
                  status: "pending",
                  order: 0,
                  displayUrl:
                    "https://media.daylilycatalog.com/profile-pending.jpg",
                },
              ],
            },
          },
        });
        await db.v2AhsCultivar.create({
          data: {
            id: "ahs-cultivar",
            post_title: "Public Cultivar",
            primary_hybridizer_name: "Hybridizer",
            additional_hybridizers_names: "Partner Hybridizer",
            introduction_date: "2024-01-01",
            seedling_number: "RO-2024-7",
            bloom_season_names: "Midseason",
            flower_form_names: "Single",
            unusual_forms_names: "Crispate",
            rebloom: 1,
            image_url: "https://example.com/cultivar.jpg",
          },
        });
        await db.cultivarReference.create({
          data: {
            id: "cultivar-reference",
            normalizedName: "public cultivar",
            v2AhsCultivarId: "ahs-cultivar",
          },
        });
        await db.imageAsset.create({
          data: {
            id: "generated-cultivar-asset",
            cultivarReferenceId: "cultivar-reference",
            kind: "cultivar",
            status: "ready",
            order: 7,
            displayUrl:
              "https://media.daylilycatalog.com/generated-cultivar.jpg",
            thumbUrl:
              "https://media.daylilycatalog.com/generated-cultivar-thumb.jpg",
            blurUrl:
              "https://media.daylilycatalog.com/generated-cultivar-blur.jpg",
          },
        });

        const linkedListing = await db.listing.create({
          data: {
            id: "linked-listing",
            userId: user.id,
            title: "Public Cultivar",
            slug: "public-cultivar",
            description: "A public description.",
            privateNote: "do not expose this note",
            price: 20,
            cultivarReferenceId: "cultivar-reference",
            images: {
              create: [
                {
                  id: "unsafe-listing-image",
                  url: "https://unsafe.example/listing.jpg",
                  order: 1,
                },
                {
                  id: "listing-image",
                  url: "https://legacy.example/listing.jpg",
                  order: 2,
                },
              ],
            },
            imageAssets: {
              create: [
                {
                  id: "listing-image-asset",
                  legacyImageId: "listing-image",
                  kind: "listing",
                  status: "ready",
                  order: 9,
                  originalUrl: "https://private.example/listing-original.jpg",
                  displayUrl: "https://media.daylilycatalog.com/listing.jpg",
                  thumbUrl:
                    "https://media.daylilycatalog.com/listing-thumb.jpg",
                  blurUrl: "https://media.daylilycatalog.com/listing-blur.jpg",
                },
                {
                  id: "listing-direct-asset",
                  kind: "listing",
                  status: "ready",
                  order: 3,
                  displayUrl:
                    "https://media.daylilycatalog.com/listing-direct.jpg",
                },
                {
                  id: "listing-pending-asset",
                  kind: "listing",
                  status: "pending",
                  order: 0,
                  displayUrl:
                    "https://media.daylilycatalog.com/listing-pending.jpg",
                },
              ],
            },
          },
        });
        await db.listing.create({
          data: {
            id: "unlinked-listing",
            userId: user.id,
            title: "Unlinked Seedling",
            slug: "unlinked-seedling",
            cultivarReferenceId: null,
          },
        });
        await db.v2AhsCultivar.create({
          data: {
            id: "ahs-only-cultivar",
            post_title: "AHS Fallback Cultivar",
            image_url: "https://example.com/ahs-only.jpg",
          },
        });
        await db.cultivarReference.create({
          data: {
            id: "ahs-only-cultivar-reference",
            normalizedName: "ahs fallback cultivar",
            v2AhsCultivarId: "ahs-only-cultivar",
          },
        });
        await db.listing.create({
          data: {
            id: "ahs-fallback-listing",
            userId: user.id,
            title: "AHS Fallback Cultivar",
            slug: "ahs-fallback-cultivar",
            cultivarReferenceId: "ahs-only-cultivar-reference",
          },
        });
        await db.listing.create({
          data: {
            id: "cultivar-fallback-listing",
            userId: user.id,
            title: "Cultivar Fallback",
            slug: "cultivar-fallback",
            cultivarReferenceId: "cultivar-reference",
          },
        });
        await db.ahsListing.create({
          data: {
            id: "legacy-ahs-cultivar",
            name: "Legacy Cultivar",
            hybridizer: "Legacy Hybridizer",
            year: "1999",
            seedlingNum: "LEG-99",
            form: "Double",
            flower: "Double",
            ahsImageUrl: "https://example.com/legacy-ahs.jpg",
          },
        });
        await db.cultivarReference.create({
          data: {
            id: "legacy-cultivar-reference",
            normalizedName: "legacy cultivar",
            ahsId: "legacy-ahs-cultivar",
          },
        });
        await db.listing.create({
          data: {
            id: "legacy-cultivar-listing",
            userId: user.id,
            title: "Legacy Cultivar",
            slug: "legacy-cultivar",
            cultivarReferenceId: "legacy-cultivar-reference",
          },
        });

        const scaleListingCount = 1_000;
        const scaleListings = Array.from(
          { length: scaleListingCount },
          (_, index) => ({
            id: `scale-listing-${index.toString().padStart(4, "0")}`,
            userId: user.id,
            title: `Scale Listing ${index.toString().padStart(4, "0")}`,
            slug: `scale-listing-${index.toString().padStart(4, "0")}`,
          }),
        );
        for (let offset = 0; offset < scaleListings.length; offset += 100) {
          await db.listing.createMany({
            data: scaleListings.slice(offset, offset + 100),
          });
        }

        const hiddenListing = await db.listing.create({
          data: {
            id: "hidden-listing",
            userId: user.id,
            title: "Hidden Cultivar",
            slug: "hidden-cultivar",
            status: "HIDDEN",
          },
        });
        const otherListing = await db.listing.create({
          data: {
            id: "other-listing",
            userId: otherSeller.id,
            title: "Other Seller Cultivar",
            slug: "other-seller-cultivar",
          },
        });
        await db.list.create({
          data: {
            id: "public-list",
            userId: user.id,
            title: "Available Plants",
            listings: {
              connect: [
                { id: linkedListing.id },
                { id: hiddenListing.id },
                { id: otherListing.id },
              ],
            },
          },
        });
        await db.list.create({
          data: {
            id: "hidden-list",
            userId: user.id,
            title: "Private Collection",
            status: "HIDDEN",
            listings: {
              connect: { id: linkedListing.id },
            },
          },
        });
        await db.list.createMany({
          data: [
            {
              id: "general-list",
              userId: user.id,
              title: "General Listing ",
            },
            {
              id: "introductions-list",
              userId: user.id,
              title: "Kay Cline's Introductions",
            },
          ],
        });

        const configuredSellerIds = [user.id, otherSeller.id];
        const initialBuild = await runBuilder({
          outputRoot,
          sellerIds: configuredSellerIds,
          sellerIdsFromEnv: true,
          sourceUrl,
        });
        const initialResult: unknown = JSON.parse(initialBuild.stdout);
        expect(initialResult).toMatchObject({
          ready: true,
          sellers: [{ id: user.id }, { id: otherSeller.id }],
          warnings: [],
        });

        const published = await readManifest(outputRoot);
        expect(published.manifest).toMatchObject({
          formatVersion: 1,
          generatedAt: expect.any(String),
        });
        expect(published.manifest.sellers).toHaveLength(2);
        expect(published.manifest.sellers[0]).toMatchObject({
          id: user.id,
          artifact: expect.stringMatching(/^[a-f0-9]{64}\.json$/),
          byteLength: expect.any(Number),
          etag: expect.stringMatching(/^W\/"[A-Za-z0-9_-]+"$/),
        });
        const artifactEntry = published.manifest.sellers[0]!;
        const artifactPath = path.join(
          outputRoot,
          "artifacts",
          artifactEntry.artifact,
        );
        expect((await stat(artifactPath)).size).toBe(artifactEntry.byteLength);

        process.env.PUBLIC_STOREFRONT_ARTIFACT_ROOT = outputRoot;
        vi.resetModules();
        vi.doMock("@/server/db", () => {
          throw new Error(
            "The storefront request path must not import the DB.",
          );
        });
        const { GET } = await import(
          "@/app/api/v1/storefronts/[sellerId]/route"
        );
        const routeContext = {
          params: Promise.resolve({ sellerId: user.id }),
        };
        const response = await GET(
          new Request(
            `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
            { headers: new Headers({ Cookie: "theme=dark; analytics=yes" }) },
          ),
          routeContext,
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe(
          "public, max-age=0, must-revalidate",
        );
        expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
          "public, max-age=86400, stale-while-revalidate=604800, stale-if-error=86400",
        );
        expect(response.headers.get("Cache-Tag")).toBe(
          "daylily-storefront-data",
        );
        expect(response.headers.get("ETag")).toBe(artifactEntry.etag);
        expect(response.headers.get("Content-Length")).toBe(
          String(artifactEntry.byteLength),
        );
        expect(response.headers.get("Last-Modified")).toBeNull();
        const responseText = await response.text();
        expect(responseText).toBe(await readFile(artifactPath, "utf8"));

        const body = JSON.parse(responseText) as {
          version: number;
          generatedAt: string;
          seller: {
            id: string;
            profile: {
              content: { blocks: Array<{ data: { text: string } }> } | null;
              images: Array<{
                id: string;
                url: string;
                thumbUrl: string | null;
                blurUrl: string | null;
                order: number;
              }>;
            } | null;
          };
          lists: Array<{ id: string; listingIds: string[] }>;
          listings: Array<{
            id: string;
            title: string;
            cultivar: {
              details: {
                ahsImageUrl: string | null;
                flower: string | null;
                form: string | null;
                hybridizer: string | null;
                rebloom: boolean | null;
                seedlingNum: string | null;
              } | null;
            } | null;
            images: Array<{
              id: string;
              url: string;
              thumbUrl: string | null;
              blurUrl: string | null;
              order: number;
            }>;
          }>;
        };
        expect(body.version).toBe(1);
        expect(body.generatedAt).toBe(published.manifest.generatedAt);
        expect(body.seller.id).toBe(user.id);
        expect(body.seller.profile?.content?.blocks[0]?.data.text).toBe(
          "Welcome<strong>friend</strong>",
        );
        expect(body.seller.profile?.images).toEqual([
          {
            id: "profile-image",
            url: "https://media.daylilycatalog.com/profile.jpg",
            thumbUrl: "https://media.daylilycatalog.com/profile-thumb.jpg",
            blurUrl: "https://media.daylilycatalog.com/profile-blur.jpg",
            order: 2,
          },
          {
            id: "profile-direct-asset",
            url: "https://media.daylilycatalog.com/profile-direct.jpg",
            thumbUrl:
              "https://media.daylilycatalog.com/profile-direct-thumb.jpg",
            blurUrl: null,
            order: 3,
          },
        ]);
        expect(body.lists).toEqual([
          {
            id: "public-list",
            slug: "available-plants",
            title: "Available Plants",
            description: null,
            listingIds: ["linked-listing"],
            updatedAt: expect.any(String),
          },
          {
            id: "general-list",
            slug: "general-listing-",
            title: "General Listing ",
            description: null,
            listingIds: [],
            updatedAt: expect.any(String),
          },
          {
            id: "introductions-list",
            slug: "kay-cline's-introductions",
            title: "Kay Cline's Introductions",
            description: null,
            listingIds: [],
            updatedAt: expect.any(String),
          },
        ]);
        expect(body.listings).toHaveLength(scaleListingCount + 5);
        expect(
          body.listings.find(({ id }) => id === "linked-listing"),
        ).toMatchObject({
          id: "linked-listing",
          title: "Public Cultivar",
          images: [
            {
              id: "listing-image",
              url: "https://media.daylilycatalog.com/listing.jpg",
              thumbUrl: "https://media.daylilycatalog.com/listing-thumb.jpg",
              blurUrl: "https://media.daylilycatalog.com/listing-blur.jpg",
              order: 2,
            },
            {
              id: "listing-direct-asset",
              url: "https://media.daylilycatalog.com/listing-direct.jpg",
              thumbUrl: "https://media.daylilycatalog.com/listing-direct.jpg",
              blurUrl: null,
              order: 3,
            },
          ],
          cultivar: {
            details: {
              ahsImageUrl: "https://example.com/cultivar.jpg",
              flower: "Single",
              form: "Crispate",
              hybridizer: "Hybridizer, Partner Hybridizer",
              rebloom: true,
              seedlingNum: "RO-2024-7",
            },
          },
        });
        expect(
          body.listings.find(({ id }) => id === "unlinked-listing"),
        ).toMatchObject({ cultivar: null, images: [] });
        expect(
          body.listings.find(({ id }) => id === "cultivar-fallback-listing"),
        ).toMatchObject({
          images: [
            {
              id: "generated-cultivar-asset",
              url: "https://media.daylilycatalog.com/generated-cultivar.jpg",
              thumbUrl:
                "https://media.daylilycatalog.com/generated-cultivar-thumb.jpg",
              blurUrl:
                "https://media.daylilycatalog.com/generated-cultivar-blur.jpg",
              order: 0,
            },
          ],
        });
        expect(
          body.listings.find(({ id }) => id === "ahs-fallback-listing"),
        ).toMatchObject({
          images: [
            {
              id: "ahs-fallback-listing:cultivar-fallback",
              url: "https://example.com/ahs-only.jpg",
              thumbUrl: null,
              blurUrl: null,
              order: 0,
            },
          ],
        });
        expect(
          body.listings.find(({ id }) => id === "legacy-cultivar-listing"),
        ).toMatchObject({
          cultivar: {
            details: {
              id: "legacy-ahs-cultivar",
              name: "Legacy Cultivar",
              hybridizer: "Legacy Hybridizer",
              year: "1999",
              seedlingNum: "LEG-99",
              form: "Double",
              flower: "Double",
              rebloom: null,
            },
          },
          images: [
            {
              id: "legacy-cultivar-listing:cultivar-fallback",
              url: "https://example.com/legacy-ahs.jpg",
              thumbUrl: null,
              blurUrl: null,
              order: 0,
            },
          ],
        });
        expect(responseText).not.toContain("do not expose this note");
        expect(responseText).not.toContain("hidden-listing");
        expect(responseText).not.toContain("hidden-list");
        expect(responseText).not.toContain("other-listing");
        expect(responseText).not.toContain("unsafe.example");
        expect(responseText).not.toContain("pending-asset");
        expect(responseText).not.toContain("private.example");
        expect(responseText).not.toContain("/cdn-cgi/image/");

        const notModified = await GET(
          new Request(
            `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
            {
              headers: new Headers({
                "If-None-Match": artifactEntry.etag.replace(/^W\//, ""),
              }),
            },
          ),
          routeContext,
        );
        expect(notModified.status).toBe(304);
        expect(await notModified.text()).toBe("");
        expect(notModified.headers.get("ETag")).toBe(artifactEntry.etag);
        expect(notModified.headers.get("Cache-Tag")).toBe(
          "daylily-storefront-data",
        );

        const unknownResponse = await GET(
          new Request(
            "https://daylilycatalog.com/api/v1/storefronts/unknown-seller",
          ),
          { params: Promise.resolve({ sellerId: "../../private" }) },
        );
        expect(unknownResponse.status).toBe(404);
        expect(unknownResponse.headers.get("Cache-Control")).toBe("no-store");
        expect(
          unknownResponse.headers.get("Cloudflare-CDN-Cache-Control"),
        ).toBeNull();
        await expect(unknownResponse.json()).resolves.toEqual({
          error: "storefront_not_found",
          message: "Storefront not found.",
        });

        const otherArtifactEntry = published.manifest.sellers.find(
          ({ id }) => id === otherSeller.id,
        )!;
        const substitutedManifest = structuredClone(published.manifest);
        Object.assign(substitutedManifest.sellers[0]!, {
          artifact: otherArtifactEntry.artifact,
          byteLength: otherArtifactEntry.byteLength,
          etag: otherArtifactEntry.etag,
        });
        await writeFile(
          published.path,
          `${JSON.stringify(substitutedManifest)}\n`,
          "utf8",
        );
        const substitutedArtifactResponse = await GET(
          new Request(
            `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
          ),
          routeContext,
        );
        expect(substitutedArtifactResponse.status).toBe(503);
        expect(
          substitutedArtifactResponse.headers.get(
            "Cloudflare-CDN-Cache-Control",
          ),
        ).toBeNull();
        await writeFile(published.path, published.contents, "utf8");

        await unlink(artifactPath);
        const missingArtifactResponse = await GET(
          new Request(
            `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
            {
              headers: new Headers({ "If-None-Match": artifactEntry.etag }),
            },
          ),
          routeContext,
        );
        expect(missingArtifactResponse.status).toBe(503);
        expect(missingArtifactResponse.headers.get("Cache-Control")).toBe(
          "no-store",
        );
        expect(missingArtifactResponse.headers.get("Retry-After")).toBe("30");
        await expect(missingArtifactResponse.json()).resolves.toEqual({
          error: "storefront_unavailable",
          message: "Storefront data is temporarily unavailable.",
        });
        await runBuilder({
          outputRoot,
          sellerIds: configuredSellerIds,
          sourceUrl,
        });

        const movedManifestPath = `${published.path}.missing`;
        await rename(published.path, movedManifestPath);
        const missingManifestResponse = await GET(
          new Request(
            `https://daylilycatalog.com/api/v1/storefronts/${user.id}`,
          ),
          routeContext,
        );
        expect(missingManifestResponse.status).toBe(503);
        expect(missingManifestResponse.headers.get("Cache-Control")).toBe(
          "no-store",
        );
        expect(missingManifestResponse.headers.get("Retry-After")).toBe("30");
        await rename(movedManifestPath, published.path);

        const beforeFailedPublish = await readManifest(outputRoot);
        const oldArtifactEntry = beforeFailedPublish.manifest.sellers[0]!;
        const oldArtifact = await readFile(
          path.join(outputRoot, "artifacts", oldArtifactEntry.artifact),
          "utf8",
        );
        await db.listing.update({
          where: { id: linkedListing.id },
          data: { title: "Updated Public Cultivar" },
        });
        const currentDirectory = path.join(outputRoot, "current");
        await chmod(currentDirectory, 0o555);
        try {
          await expect(
            runBuilder({
              outputRoot,
              sellerIds: configuredSellerIds,
              sourceUrl,
            }),
          ).rejects.toMatchObject({ code: expect.any(Number) });
        } finally {
          await chmod(currentDirectory, 0o755);
        }
        expect((await readManifest(outputRoot)).contents).toBe(
          beforeFailedPublish.contents,
        );
        expect(
          await readFile(
            path.join(outputRoot, "artifacts", oldArtifactEntry.artifact),
            "utf8",
          ),
        ).toBe(oldArtifact);

        const oldOrphanPath = path.join(
          outputRoot,
          "artifacts",
          `${"a".repeat(64)}.json`,
        );
        const recentOrphanPath = path.join(
          outputRoot,
          "artifacts",
          `${"b".repeat(64)}.json`,
        );
        await writeFile(oldOrphanPath, "old orphan", "utf8");
        await writeFile(recentOrphanPath, "recent orphan", "utf8");
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1_000);
        await utimes(oldOrphanPath, eightDaysAgo, eightDaysAgo);
        const previouslyReferencedArtifactPath = path.join(
          outputRoot,
          "artifacts",
          oldArtifactEntry.artifact,
        );
        await utimes(
          previouslyReferencedArtifactPath,
          eightDaysAgo,
          eightDaysAgo,
        );

        await runBuilder({
          outputRoot,
          sellerIds: configuredSellerIds,
          sourceUrl,
        });
        const afterSuccessfulPublish = await readManifest(outputRoot);
        expect(afterSuccessfulPublish.contents).not.toBe(
          beforeFailedPublish.contents,
        );
        await expect(stat(oldOrphanPath)).rejects.toMatchObject({
          code: "ENOENT",
        });
        await expect(stat(recentOrphanPath)).resolves.toBeDefined();
        await expect(
          stat(previouslyReferencedArtifactPath),
        ).resolves.toBeDefined();
        expect(
          (await readdir(path.join(outputRoot, "current"))).filter((name) =>
            name.includes(".tmp"),
          ),
        ).toEqual([]);
      });
    } finally {
      await rm(outputRoot, { force: true, recursive: true });
    }
  }, 30_000);

  it("rejects duplicate, reserved, and unsafe public list slugs before publication", async () => {
    const outputRoot = await mkdtemp(
      path.join(tmpdir(), "public-storefront-slug-collision-"),
    );

    try {
      await withTempAppDb(async ({ user }) => {
        const { db } = await import("@/server/db");
        await db.list.createMany({
          data: [
            {
              id: "first-collision-list",
              userId: user.id,
              title: "Duplicate List",
            },
            {
              id: "second-collision-list",
              userId: user.id,
              title: "duplicate   list",
            },
          ],
        });

        await expect(
          runBuilder({
            outputRoot,
            sellerIds: [user.id],
            sourceUrl: process.env.DATABASE_URL!,
          }),
        ).rejects.toMatchObject({
          stderr: expect.stringContaining(
            `Duplicate public list slug "duplicate-list" for seller "${user.id}".`,
          ),
        });

        await db.list.delete({ where: { id: "second-collision-list" } });
        await db.list.update({
          where: { id: "first-collision-list" },
          data: { title: "All" },
        });
        await expect(
          runBuilder({
            outputRoot,
            sellerIds: [user.id],
            sourceUrl: process.env.DATABASE_URL!,
          }),
        ).rejects.toMatchObject({
          stderr: expect.stringContaining(
            `Reserved public list slug "all" for seller "${user.id}".`,
          ),
        });

        await db.list.update({
          where: { id: "first-collision-list" },
          data: { title: "Bad/Path" },
        });
        await expect(
          runBuilder({
            outputRoot,
            sellerIds: [user.id],
            sourceUrl: process.env.DATABASE_URL!,
          }),
        ).rejects.toMatchObject({
          stderr: expect.stringContaining(
            `Unsafe public list slug "bad/path" for seller "${user.id}".`,
          ),
        });
        await expect(
          stat(path.join(outputRoot, "current", "manifest.json")),
        ).rejects.toMatchObject({ code: "ENOENT" });
      });
    } finally {
      await rm(outputRoot, { force: true, recursive: true });
    }
  });

  it("keeps a committed manifest active when post-publication housekeeping fails", async () => {
    await withTempAppDb(async ({ user }) => {
      const { buildPublicStorefrontArtifacts } = await import(
        pathToFileURL(buildScriptPath).href
      );
      const housekeepingLabels = [
        "Artifact retention cleanup failed",
        "Prisma disconnect failed",
        "Build lock release failed",
      ];

      for (const failedLabel of housekeepingLabels) {
        const outputRoot = await mkdtemp(
          path.join(tmpdir(), "public-storefront-housekeeping-"),
        );

        try {
          const result = await buildPublicStorefrontArtifacts(
            {
              output: outputRoot,
              sellerIds: [user.id],
              source: process.env.DATABASE_URL!,
            },
            {
              executeHousekeepingOperation: async (
                label: string,
                operation: () => Promise<unknown>,
              ) => {
                const value = await operation();
                if (label === failedLabel) {
                  throw new Error("simulated housekeeping failure");
                }
                return value;
              },
            },
          );

          expect(result.warnings).toEqual([
            `${failedLabel}: simulated housekeeping failure`,
          ]);
          const published = await readManifest(outputRoot);
          expect(published.manifest.sellers).toHaveLength(1);
          expect(published.manifest.sellers[0]?.id).toBe(user.id);
        } finally {
          await rm(outputRoot, { force: true, recursive: true });
        }
      }
    });
  });

  it.each([
    {
      name: "query parameters",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id?preview=1",
      headers: undefined,
      message: "Query parameters are not supported.",
    },
    {
      name: "authorization",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ Authorization: "Bearer private-token" }),
      message: "Credentials are not supported.",
    },
    {
      name: "Clerk session cookies",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({
        Cookie: "theme=dark; __session_storefront=private-session",
      }),
      message: "Credentials are not supported.",
    },
    {
      name: "no-cache",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ "Cache-Control": "no-cache" }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "no-store",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ "Cache-Control": "no-store" }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "max-age zero",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ "Cache-Control": "max-age=0" }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "max-age zero with leading zeros",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({
        "Cache-Control": "public, MAX-AGE = 00, must-revalidate",
      }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "quoted max-age zero",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ "Cache-Control": 'public, max-age="0"' }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "qualified no-cache",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({
        "Cache-Control": 'public, No-Cache="Set-Cookie"',
      }),
      message: "Cache bypass directives are not supported.",
    },
    {
      name: "legacy no-cache",
      url: "https://daylilycatalog.com/api/v1/storefronts/seller-id",
      headers: new Headers({ Pragma: "no-cache" }),
      message: "Cache bypass directives are not supported.",
    },
  ])(
    "rejects $name before the artifact read",
    async ({ url, headers, message }) => {
      const { createPublicStorefrontHandler } = await import(
        "@/server/storefront/public-storefront-route-handler"
      );
      const loadArtifact = vi.fn(async () => ({
        status: "not_found" as const,
      }));
      const handler = createPublicStorefrontHandler(loadArtifact);
      const response = await handler(new Request(url, { headers }), {
        params: Promise.resolve({ sellerId: "seller-id" }),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBeNull();
      await expect(response.json()).resolves.toEqual({
        error: "invalid_storefront_request",
        message,
      });
      expect(loadArtifact).not.toHaveBeenCalled();
    },
  );
});
