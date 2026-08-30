import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

import { GET } from "@/app/sitemap.xml/route";
import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";

describe("storefront sitemap", () => {
  it("publishes all public routes with the dedicated edge cache policy", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      "public, max-age=86400",
    );
    expect(response.headers.get("cache-tag")).toBe(PUBLIC_CLOUDFLARE_CACHE_TAG);
    expect(body).toContain("/catalog/display-garden");
    expect(body).toContain("/catalog/st.-james");
    expect(body).toContain("/spring.2026");
    expect(body).toContain("/summer-ember");
    expect(body).toContain("/blog/dorothy-and-toto");
    expect(body).not.toContain("/cart</loc>");
    expect(body).not.toContain("/thanks</loc>");
  });
});
