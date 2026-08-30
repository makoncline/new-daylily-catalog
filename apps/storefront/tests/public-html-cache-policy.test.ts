import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  PUBLIC_CLOUDFLARE_CACHE_CONTROL,
  PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER,
  PUBLIC_CLOUDFLARE_ERROR_STATUS_TTL,
  PUBLIC_CLOUDFLARE_CACHE_TAG,
} from "@/lib/public-cache-policy";
import { proxy } from "@/proxy";

type NextRequestInit = NonNullable<
  ConstructorParameters<typeof NextRequest>[1]
>;

function request(
  path: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
) {
  return new NextRequest(`https://shop.example.test${path}`, init);
}

const privateRequestCases: NextRequestInit[] = [
  { method: "POST" },
  { headers: { authorization: "Bearer private" } },
  { headers: { cookie: "__session=private" } },
  { headers: { purpose: "prefetch" } },
];

const rscRequestCases: Array<{ path: string; init: NextRequestInit }> = [
  { path: "/catalog/all?_rsc=abc", init: {} },
  { path: "/catalog/all", init: { headers: { rsc: "1" } } },
  {
    path: "/catalog/all",
    init: { headers: { accept: "text/x-component" } },
  },
];

describe("public HTML cache policy", () => {
  it("requires the edge to reject every error status", () => {
    expect(PUBLIC_CLOUDFLARE_ERROR_STATUS_TTL).toEqual({
      from: 400,
      to: 599,
      mode: "no-store",
      value: -1,
    });
  });

  it.each([
    "/",
    "/catalogs",
    "/catalog/search?name=Boundary&page=2",
    "/catalog/display-garden",
    "/catalog/spring.2026",
    "/boundary-twenty",
    "/spring.2026",
    "/contact",
  ])("marks an anonymous document request for Cloudflare: %s", (path) => {
    const response = proxy(
      request(path, {
        headers: {
          accept: "text/html",
          cookie: "_ga=analytics-only",
        },
      }),
    );

    expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
      PUBLIC_CLOUDFLARE_CACHE_CONTROL,
    );
    expect(response.headers.get("cache-tag")).toBe(PUBLIC_CLOUDFLARE_CACHE_TAG);
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it.each([
    "/cart",
    "/thanks?from=cart",
    "/api/catalogs",
    "/api/health",
    "/openapi.json",
    "/sitemap.xml",
    "/brands/rolling-oaks/logo.svg",
  ])("does not apply the HTML policy to another route class: %s", (path) => {
    const response = proxy(request(path));

    expect(
      response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
    ).toBeNull();
    expect(response.headers.get("cache-tag")).toBeNull();
  });

  it.each(privateRequestCases)(
    "does not mark a private or non-document request",
    (init) => {
      const response = proxy(request("/catalog/all", init));

      expect(
        response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER),
      ).toBeNull();
      expect(response.headers.get("cache-tag")).toBeNull();
    },
  );

  it.each(rscRequestCases)(
    "makes React Server Component traffic explicitly private",
    ({ path, init }) => {
      const response = proxy(request(path, init));

      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get(PUBLIC_CLOUDFLARE_CACHE_CONTROL_HEADER)).toBe(
        "no-store",
      );
      expect(response.headers.get("cache-tag")).toBeNull();
    },
  );
});
