import assert from "node:assert/strict";

import {
  isCanonicalStorefrontBearerToken,
  storefrontRemoteImageHostnames,
  storefrontSiteIdentities,
  storefrontSnapshotSchema,
} from "@daylily-catalog/storefront-contract";

assert.equal(typeof storefrontSnapshotSchema.safeParse, "function");
assert.equal(
  isCanonicalStorefrontBearerToken(
    "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
  ),
  true,
);
assert.ok(storefrontRemoteImageHostnames.includes("images.daylilycatalog.com"));
assert.deepEqual(storefrontSiteIdentities, [
  {
    siteKey: "rolling-oaks",
    expectedSellerId: "3",
    canonicalUrl: "https://rollingoaksdaylilies.com",
    hostnames: [
      "rollingoaksdaylilies.com",
      "www.rollingoaksdaylilies.com",
      "rolling-oaks-daylilies.makon.dev",
    ],
  },
]);
