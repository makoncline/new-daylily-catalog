import { storefrontRemoteImageHostnames } from "@daylily-catalog/storefront-contract";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config.js";

describe("storefront image host configuration", () => {
  it("keeps Next Image hosts equal to the snapshot contract allowlist", () => {
    const configuredHostnames = (nextConfig.images?.remotePatterns ?? []).map(
      (pattern) =>
        pattern instanceof URL ? pattern.hostname : pattern.hostname,
    );

    expect(configuredHostnames.sort()).toEqual(
      [...storefrontRemoteImageHostnames].sort(),
    );
  });
});
