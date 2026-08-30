import assert from "node:assert/strict";

import {
  storefrontRemoteImageHostnames,
  storefrontSnapshotSchema,
} from "@daylily-catalog/storefront-contract";

assert.equal(typeof storefrontSnapshotSchema.safeParse, "function");
assert.ok(storefrontRemoteImageHostnames.includes("images.daylilycatalog.com"));
