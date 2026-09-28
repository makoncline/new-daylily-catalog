// @vitest-environment node

import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  isCatalogImporterDiscoveryEnabled,
  isImageModerationEnforced,
  isPublicCultivarSearchEnabled,
} from "@/config/feature-flags";
import {
  getDaylilyCatalogSkill,
  getHomeMarkdown,
  getLlmsTxt,
  getOpenApiDocument,
} from "@/lib/agent-readiness";
import {
  MEMBER_CREATE_ID_FIELDS,
  MEMBER_MANAGE_OPERATIONS,
  MEMBER_READ_OPERATIONS,
  MEMBER_WRITE_OPERATIONS,
} from "@/lib/member-api-contract";
import { memberOperationResultSchemas } from "@/lib/member-result-contract";

const originalRuntimeFlagsPath = process.env.RUNTIME_FEATURE_FLAGS_PATH;
const originalVercel = process.env.VERCEL;
const baseUrl = "https://daylilycatalog.com";
const runtimeFlagsPath = join(
  tmpdir(),
  `daylily-public-feature-flags-${process.pid}.json`,
);

describe("runtime feature flags", () => {
  beforeEach(() => {
    process.env.RUNTIME_FEATURE_FLAGS_PATH = runtimeFlagsPath;
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":false}');
    delete process.env.VERCEL;
  });

  afterAll(() => {
    if (originalRuntimeFlagsPath === undefined) {
      delete process.env.RUNTIME_FEATURE_FLAGS_PATH;
    } else {
      process.env.RUNTIME_FEATURE_FLAGS_PATH = originalRuntimeFlagsPath;
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
    rmSync(runtimeFlagsPath, { force: true });
  });

  it("defaults off without a runtime file", async () => {
    rmSync(runtimeFlagsPath, { force: true });
    const paths = (await getOpenApiDocument(baseUrl)).paths;

    expect(isCatalogImporterDiscoveryEnabled()).toBe(false);
    expect(isPublicCultivarSearchEnabled()).toBe(false);
    expect(getLlmsTxt(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(paths).not.toHaveProperty("/api/v1/cultivars/search");
    expect(paths).toHaveProperty("/api/v1/public/listings");
    expect(paths).toHaveProperty(
      "/api/v1/public/profiles/{slugOrId}/listings/{listingSlugOrId}",
    );
    expect(paths).toHaveProperty("/api/v1/public/profiles");
    expect(paths).toHaveProperty("/api/v1/public/profiles/{slugOrId}");
    expect(paths).toHaveProperty("/api/v1/public/cultivars");
  });

  it("documents separate safe and managed member API procedures", async () => {
    const document = await getOpenApiDocument(baseUrl);
    const paths: Record<string, unknown> = document.paths;
    expect(Object.keys(memberOperationResultSchemas).sort()).toEqual(
      [
        ...MEMBER_READ_OPERATIONS,
        ...MEMBER_WRITE_OPERATIONS,
        ...MEMBER_MANAGE_OPERATIONS,
      ]
        .map(([name]) => name)
        .sort(),
    );
    expect(paths["/api/v1/member/listing.page"]).toHaveProperty(
      "get.responses.200.content.application/json.schema.properties.result.properties.data.properties.json.properties.items.items.properties.id.type",
      "string",
    );
    expect(paths["/api/v1/member/list.create"]).toHaveProperty(
      "post.responses.200.content.application/json.schema.properties.result.properties.data.properties.json.properties.title.type",
      "string",
    );
    expect(document.components.securitySchemes.memberOAuthBearer).toMatchObject(
      {
        type: "http",
        scheme: "bearer",
      },
    );
    for (const [name] of MEMBER_READ_OPERATIONS) {
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty("get");
      expect(paths[`/api/v1/member/${name}`]).not.toHaveProperty("post");
    }
    for (const [name] of MEMBER_WRITE_OPERATIONS) {
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty("post");
      expect(paths[`/api/v1/member/${name}`]).not.toHaveProperty("get");
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty(
        "post.requestBody.content.application/json.schema.properties.json.properties",
      );
    }
    for (const [name] of MEMBER_MANAGE_OPERATIONS) {
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty("post");
      expect(paths[`/api/v1/member/${name}`]).not.toHaveProperty("get");
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty(
        "post.description",
        expect.stringContaining("catalog:manage"),
      );
    }
    expect(paths["/api/v1/member/listing.create"]).toHaveProperty(
      "post.requestBody.content.application/json.schema.properties.json.properties.requestId",
    );
    for (const [name, field] of Object.entries(MEMBER_CREATE_ID_FIELDS)) {
      expect(paths[`/api/v1/member/${name}`]).toHaveProperty(
        "post.requestBody.content.application/json.schema.properties.json.required",
        expect.arrayContaining([field]),
      );
    }
    expect(paths["/api/v1/member/listing.get"]).toHaveProperty(
      "get.parameters.0.content.application/json.schema.properties.json.properties.id",
    );
    expect(paths["/api/v1/member/profile.get"]).not.toHaveProperty(
      "get.parameters",
    );
  });

  it("controls importer discovery without controlling importer availability", () => {
    writeFileSync(
      runtimeFlagsPath,
      '{"catalogImporterDiscovery":true,"publicCultivarSearch":false}',
    );

    expect(isCatalogImporterDiscoveryEnabled()).toBe(true);
    expect(isPublicCultivarSearchEnabled()).toBe(false);
  });

  it("restores search discovery only from the runtime file", async () => {
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":true}');

    expect(isPublicCultivarSearchEnabled()).toBe(true);
    expect(getLlmsTxt(baseUrl)).toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).toContain("/api/v1/cultivars/search");
    const document = await getOpenApiDocument(baseUrl);
    expect(document.paths).toHaveProperty("/api/v1/cultivars/search");
    const searchOperation = document.paths["/api/v1/cultivars/search"].get;
    expect(searchOperation.parameters).toContainEqual({
      in: "query",
      name: "rebloom",
      schema: { type: "boolean" },
    });
    expect(getDaylilyCatalogSkill(baseUrl)).toContain(
      "bloomSeason, rebloom, flowerShow",
    );

    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":false}');
    expect(isPublicCultivarSearchEnabled()).toBe(false);
  });

  it("enforces image moderation only from the runtime file", () => {
    writeFileSync(runtimeFlagsPath, '{"imageModerationEnforced":true}');
    expect(isImageModerationEnforced()).toBe(true);

    writeFileSync(runtimeFlagsPath, '{"imageModerationEnforced":false}');
    expect(isImageModerationEnforced()).toBe(false);
  });

  it("keeps cultivar search disabled on unsupported deployments", async () => {
    writeFileSync(
      runtimeFlagsPath,
      '{"catalogImporterDiscovery":true,"publicCultivarSearch":true}',
    );
    process.env.VERCEL = "1";

    expect(isCatalogImporterDiscoveryEnabled()).toBe(true);
    expect(isPublicCultivarSearchEnabled()).toBe(false);
    expect(getLlmsTxt(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect((await getOpenApiDocument(baseUrl)).paths).not.toHaveProperty(
      "/api/v1/cultivars/search",
    );
  });
});
