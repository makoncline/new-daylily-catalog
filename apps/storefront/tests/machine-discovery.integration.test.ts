import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  agentSkillNames,
  API_CATALOG_MEDIA_TYPE,
  createAgentSkillDocuments,
  createAgentSkillResponse,
  createAgentSkillsIndexResponse,
  createApiCatalogResponse,
  createLlmsResponse,
  createOpenApiDocument,
  createOpenApiResponse,
  MACHINE_DISCOVERY_CACHE_CONTROL,
  MACHINE_DISCOVERY_CACHE_TAG,
  MACHINE_DISCOVERY_CLOUDFLARE_CACHE_CONTROL,
  OPENAPI_MEDIA_TYPE,
} from "@/server/machine-contract/machine-discovery";

const site = {
  canonicalUrl: "https://rollingoaksdaylilies.com/",
  brand: {
    name: "Rolling Oaks Daylilies",
    shortName: "Rolling Oaks",
    title: "Rolling Oaks Daylilies",
    description: "Public daylily catalog",
    logoPath: null,
    themeColor: "#24412d",
  },
  commerce: {
    minimumOrder: 20,
    shipping: {
      baseRate: 15,
      baseItems: 3,
      additionalItemRate: 1.5,
    },
    orderingCopy: "Confirm availability before payment.",
    shippingCopy:
      "Orders ship by USPS Priority Mail on Monday or Tuesday. Shipping is not available to California or outside the United States.",
    rustNotice: null,
  },
};

function expectMachineDiscoveryCache(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    MACHINE_DISCOVERY_CACHE_CONTROL,
  );
  expect(response.headers.get("cloudflare-cdn-cache-control")).toBe(
    MACHINE_DISCOVERY_CLOUDFLARE_CACHE_CONTROL,
  );
  expect(response.headers.get("cache-tag")).toBe(MACHINE_DISCOVERY_CACHE_TAG);
}

describe("public machine discovery", () => {
  it("publishes linked discovery documents with correct media types and skill digests", async () => {
    const apiCatalogResponse = createApiCatalogResponse(site);
    const openApiResponse = createOpenApiResponse(site);
    const llmsResponse = createLlmsResponse(site);
    const indexResponse = createAgentSkillsIndexResponse(site);

    expect(apiCatalogResponse.headers.get("content-type")).toBe(
      `${API_CATALOG_MEDIA_TYPE}; charset=utf-8`,
    );
    expect(openApiResponse.headers.get("content-type")).toBe(
      `${OPENAPI_MEDIA_TYPE}; charset=utf-8`,
    );
    expect(llmsResponse.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(indexResponse.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    for (const response of [
      apiCatalogResponse,
      openApiResponse,
      llmsResponse,
      indexResponse,
    ]) {
      expectMachineDiscoveryCache(response);
    }

    const apiCatalog = JSON.parse(await apiCatalogResponse.text()) as unknown;
    expect(apiCatalog).toMatchObject({
      linkset: [
        {
          anchor: "https://rollingoaksdaylilies.com/api",
          "service-desc": [
            {
              href: "https://rollingoaksdaylilies.com/openapi.json",
              type: OPENAPI_MEDIA_TYPE,
            },
          ],
          "service-doc": [
            { href: "https://rollingoaksdaylilies.com/llms.txt" },
          ],
          status: [{ href: "https://rollingoaksdaylilies.com/api/health" }],
        },
      ],
    });

    const index = (await indexResponse.json()) as {
      skills: Array<{ name: string; url: string; digest: string }>;
    };
    const documents = createAgentSkillDocuments(site);
    expect(index.skills.map(({ name }) => name)).toEqual(agentSkillNames);

    for (const skill of index.skills) {
      const name = skill.name as keyof typeof documents;
      const expectedDigest = createHash("sha256")
        .update(documents[name])
        .digest("hex");
      expect(skill.url).toBe(`/.well-known/agent-skills/${name}/SKILL.md`);
      expect(skill.digest).toBe(`sha256:${expectedDigest}`);

      const skillResponse = createAgentSkillResponse(site, name);
      expect(skillResponse.headers.get("content-type")).toBe(
        "text/markdown; charset=utf-8",
      );
      expectMachineDiscoveryCache(skillResponse);
      await expect(skillResponse.text()).resolves.toBe(documents[name]);
    }

    const completeContract = [
      JSON.stringify(apiCatalog),
      await createOpenApiResponse(site).text(),
      await createLlmsResponse(site).text(),
      JSON.stringify(index),
      ...Object.values(documents),
    ].join("\n");
    expect(completeContract).not.toContain("/api/api-catalog");
    expect(completeContract).not.toContain("public-snapshot/refresh");
  });

  it("describes rebloom filters and the conditional inquiry rules", () => {
    const document = createOpenApiDocument(site);
    expect(Object.keys(document.paths)).toEqual([
      "/api/catalogs",
      "/api/catalog/{catalog}",
      "/api/listings/{listing}",
      "/api/forms",
      "/api/health",
    ]);

    const catalogParameters =
      document.paths["/api/catalog/{catalog}"].get.parameters;
    expect(
      catalogParameters.find(({ name }) => name === "rebloom"),
    ).toMatchObject({
      in: "query",
      schema: { type: "boolean", default: false },
    });
    expect(
      document.components.schemas.CultivarDetails.properties.rebloom,
    ).toEqual({ type: ["boolean", "null"] });
    expect(
      document.components.schemas.CultivarDetails.properties.seedlingNum,
    ).toEqual({ type: ["string", "null"] });
    expect(document.paths["/api/catalogs"].get.responses["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/CatalogsResponse" },
        },
      },
    });
    expect(
      document.paths["/api/catalog/{catalog}"].get.responses["200"],
    ).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/CatalogResponse" },
        },
      },
    });

    expect(document.paths["/api/forms"].post.requestBody).toMatchObject({
      required: true,
      content: {
        "application/json": {
          schema: {
            oneOf: [
              { $ref: "#/components/schemas/ContactInquiry" },
              { $ref: "#/components/schemas/CartInquiry" },
            ],
            discriminator: { propertyName: "kind" },
          },
        },
      },
    });
    expect(document.components.schemas.ContactInquiry).toMatchObject({
      allOf: [
        { $ref: "#/components/schemas/InquiryPerson" },
        {
          required: ["kind", "message"],
          properties: { kind: { const: "contact" } },
        },
      ],
    });
    expect(document.components.schemas.CartInquiry).toMatchObject({
      allOf: [
        { $ref: "#/components/schemas/InquiryPerson" },
        {
          required: ["kind", "lines", "subtotal", "shipping", "total"],
          properties: {
            kind: { const: "cart" },
            subtotal: { minimum: 0 },
          },
        },
      ],
    });
    expect(JSON.stringify(document.components.schemas.CartInquiry)).toContain(
      "accepts cart inquiries below it",
    );
    const inquiryPerson = document.components.schemas.InquiryPerson;
    expect(inquiryPerson).toMatchObject({
      required: ["name", "email", "openedAt"],
      properties: { openedAt: { format: "date-time" } },
    });
    expect(inquiryPerson.properties.website.description).toContain("Honeypot");
    expect(inquiryPerson.properties.openedAt.description).toContain(
      "750 milliseconds",
    );
    expect(inquiryPerson.properties.message.description).toContain(
      "at most one",
    );
    expect(document.paths["/api/forms"].post.responses).toHaveProperty("202");
    expect(document.paths["/api/forms"].post.responses).toHaveProperty("503");
    expect(
      document.paths["/api/forms"].post.responses["409"].description,
    ).toContain("form expired or cart data changed");
    expect(document.components.schemas.InquiryConflictResponse).toMatchObject({
      additionalProperties: false,
      required: ["code", "error"],
      properties: {
        code: { enum: ["form_expired", "cart_changed"] },
      },
    });
    expect(
      document.paths["/api/forms"].post.responses["409"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/InquiryConflictResponse" });
    expect(document.components.schemas.ContactInquiry).toMatchObject({
      unevaluatedProperties: false,
    });
    expect(document.components.schemas.CartInquiry).toMatchObject({
      unevaluatedProperties: false,
    });
    expect(document.components.schemas.CartLine).toMatchObject({
      additionalProperties: false,
    });
    expect(document.paths["/api/forms"].post.responses["429"]).toMatchObject({
      headers: {
        "Retry-After": {
          description:
            "Optional delay from the inquiry receiver before another request.",
          schema: { type: "string" },
        },
      },
    });
    for (const response of Object.values(
      document.paths["/api/forms"].post.responses,
    )) {
      expect(response).toMatchObject({
        headers: {
          "Cache-Control": {
            schema: { type: "string", const: "no-store" },
          },
        },
      });
    }
    expect(document.paths["/api/forms"].post.responses).not.toHaveProperty(
      "200",
    );
  });
});
