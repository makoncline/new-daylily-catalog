import { describe, expect, it } from "vitest";
import { getPublicSeoRouteType } from "@/lib/public-seo-routes";

describe("public SEO route classifier", () => {
  it("classifies only public SEO HTML route shapes", () => {
    expect(getPublicSeoRouteType("/")).toBe("home");
    expect(getPublicSeoRouteType("/catalogs")).toBe("catalogs_index");
    expect(getPublicSeoRouteType("/rollingoaksdaylilies")).toBe(
      "profile_page",
    );
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/page/2")).toBe(
      "profile_page_paginated",
    );
    expect(getPublicSeoRouteType("/cultivar/Happy-Returns")).toBe(
      "cultivar_page",
    );
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/timber-man")).toBe(
      "listing_page",
    );
  });

  it("rejects reserved, ambiguous, and non-public route shapes", () => {
    expect(getPublicSeoRouteType("/start-membership")).toBeNull();
    expect(getPublicSeoRouteType("/catalog/listing-1")).toBeNull();
    expect(getPublicSeoRouteType("/users/user-1")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/search")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/page")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/page/two")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/a/b")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/%2F")).toBeNull();
    expect(getPublicSeoRouteType("/rollingoaksdaylilies/..")).toBeNull();
    expect(getPublicSeoRouteType("/robots.txt")).toBeNull();
  });
});
