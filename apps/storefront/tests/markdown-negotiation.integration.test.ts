import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";
import { proxy } from "@/proxy";

function request(path: string, accept = "text/markdown") {
  return new NextRequest(`https://shop.example.test${path}`, {
    headers: { accept },
  });
}

beforeEach(() => {
  vi.stubEnv("STOREFRONT_DATA_SOURCE", "fixture");
});

describe("storefront Markdown negotiation", () => {
  it.each([
    ["/", "Double and white daylily specialists and an AHS Display Garden."],
    ["/catalogs", "# Catalogs"],
    ["/catalog/all", "# All daylilies"],
    ["/catalog/for-sale", "# Daylilies for sale"],
    [
      "/catalog/search?name=Quiet&rebloom=true",
      "### [Quiet Snow](</quiet-snow>)",
    ],
    ["/catalog/display-garden", "# Display Garden"],
    ["/catalog/st.-james", "# St. James"],
    ["/boundary-twenty", "# Boundary Twenty Daylily"],
    ["/spring.2026", "# Spring 2026 Daylily"],
    ["/blog", "# Blog"],
    ["/blog/dorothy-and-toto", "# Dorothy and Toto"],
  ])("returns Markdown for %s", async (path, expectedContent) => {
    const response = await Promise.resolve(proxy(request(path)));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      "no-store",
    );
    expect(response.headers.get("cache-tag")).toBeNull();
    await expect(response.text()).resolves.toContain(expectedContent);
  });

  it.each([
    ["/catalog/not-a-public-list", "# Catalog not found"],
    ["/catalog/display-garden/extra", "# Catalog not found"],
    ["/not-a-listing", "# Daylily not found"],
    ["/blog/not-a-post", "# Blog post not found"],
  ])("keeps an invalid dynamic route as a 404: %s", async (path, title) => {
    const response = await Promise.resolve(proxy(request(path)));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      "no-store",
    );
    await expect(response.text()).resolves.toContain(title);
  });

  it("keeps Markdown outside the public HTML cache representation", async () => {
    const htmlResponse = proxy(request("/catalog/all", "text/html"));
    const markdownResponse = await Promise.resolve(
      proxy(request("/catalog/all")),
    );

    expect(
      htmlResponse.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBe(PUBLIC_CLOUDFLARE_CACHE_CONTROL);
    expect(htmlResponse.headers.get("cache-tag")).toBe(
      PUBLIC_CLOUDFLARE_CACHE_TAG,
    );
    expect(htmlResponse.headers.get("vary")).toContain("Accept");
    expect(
      markdownResponse.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBe("no-store");
    expect(markdownResponse.headers.get("cache-tag")).toBeNull();
    expect(markdownResponse.headers.get("cache-control")).toBe("no-store");
  });

  it("passes canonical agent skill Markdown through to its route cache policy", () => {
    const response = proxy(
      request("/.well-known/agent-skills/catalog-navigation/SKILL.md"),
    );

    expect(response.headers.get("cache-control")).toBeNull();
    expect(
      response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBeNull();
  });

  it("does not render credentialed, prefetch, or RSC Markdown traffic", async () => {
    const credentialed = await Promise.resolve(
      proxy(
        new NextRequest("https://shop.example.test/catalog/all", {
          headers: { accept: "text/markdown", cookie: "__session=private" },
        }),
      ),
    );
    const prefetch = await Promise.resolve(
      proxy(
        new NextRequest("https://shop.example.test/catalog/all", {
          headers: { accept: "text/markdown", purpose: "prefetch" },
        }),
      ),
    );
    const rsc = await Promise.resolve(
      proxy(
        new NextRequest("https://shop.example.test/catalog/all?_rsc=abc", {
          headers: { accept: "text/markdown" },
        }),
      ),
    );

    for (const response of [credentialed, prefetch]) {
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
        "no-store",
      );
      expect(response.headers.get("content-type") ?? "").not.toContain(
        "text/markdown",
      );
    }
    expect(rsc.headers.get("cache-control")).toBe("no-store");
    expect(rsc.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      "no-store",
    );
    expect(rsc.headers.get("content-type") ?? "").not.toContain(
      "text/markdown",
    );
  });
});
