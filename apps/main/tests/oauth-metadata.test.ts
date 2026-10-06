import { afterEach, describe, expect, test } from "vitest";
import {
  getOAuthAuthorizationServerMetadata,
  getOAuthProtectedResourceMetadata,
} from "@/lib/agent-readiness";
import { GET as getOAuthAuthorizationServer } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as getOAuthProtectedResource } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as getMcpOAuthProtectedResource } from "@/app/.well-known/oauth-protected-resource/api/mcp/server/route";

const ORIGINAL_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const TEST_CLERK_HOST = "agent-ready-test.clerk.accounts.dev";
const TEST_PUBLISHABLE_KEY = `pk_test_${Buffer.from(`${TEST_CLERK_HOST}$`).toString("base64")}`;

describe("OAuth metadata", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = ORIGINAL_PUBLISHABLE_KEY;
  });

  test("builds OAuth authorization server metadata from Clerk publishable key", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = TEST_PUBLISHABLE_KEY;

    expect(
      getOAuthAuthorizationServerMetadata("https://daylilycatalog.com"),
    ).toMatchObject({
      issuer: `https://${TEST_CLERK_HOST}`,
      authorization_endpoint: `https://${TEST_CLERK_HOST}/oauth/authorize`,
      token_endpoint: `https://${TEST_CLERK_HOST}/oauth/token`,
      jwks_uri: `https://${TEST_CLERK_HOST}/.well-known/jwks.json`,
      grant_types_supported: ["authorization_code", "refresh_token"],
      response_types_supported: ["code"],
      scopes_supported: [
        "email",
        "offline_access",
        "profile",
        "catalog:read",
        "catalog:write",
        "catalog:manage",
      ],
    });
  });

  test("builds protected resource metadata for this site", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = TEST_PUBLISHABLE_KEY;

    expect(
      getOAuthProtectedResourceMetadata("https://daylilycatalog.com"),
    ).toMatchObject({
      resource: "https://daylilycatalog.com",
      authorization_servers: [`https://${TEST_CLERK_HOST}`],
      scopes_supported: ["catalog:read", "catalog:write", "catalog:manage"],
    });
  });

  test("serves OAuth discovery JSON from well-known routes", async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = TEST_PUBLISHABLE_KEY;

    const authorizationResponse = getOAuthAuthorizationServer(
      new Request(
        "https://daylilycatalog.com/.well-known/openid-configuration",
      ),
    );
    const protectedResourceResponse = getOAuthProtectedResource(
      new Request(
        "https://daylilycatalog.com/.well-known/oauth-protected-resource",
      ),
    );

    await expect(authorizationResponse.json()).resolves.toMatchObject({
      issuer: `https://${TEST_CLERK_HOST}`,
      token_endpoint: `https://${TEST_CLERK_HOST}/oauth/token`,
    });
    await expect(protectedResourceResponse.json()).resolves.toMatchObject({
      resource: "https://daylilycatalog.com",
      authorization_servers: [`https://${TEST_CLERK_HOST}`],
    });
  });

  test("serves MCP metadata with the endpoint identity and only its tool scopes", async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = TEST_PUBLISHABLE_KEY;
    const response = getMcpOAuthProtectedResource(
      new Request(
        "https://daylilycatalog.com/.well-known/oauth-protected-resource/api/mcp/server",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      resource: "https://daylilycatalog.com/api/mcp/server",
      authorization_servers: [`https://${TEST_CLERK_HOST}`],
      scopes_supported: ["catalog:read", "catalog:write"],
      bearer_methods_supported: ["header"],
      resource_documentation: "https://daylilycatalog.com/llms-full.txt",
    });
  });
});
