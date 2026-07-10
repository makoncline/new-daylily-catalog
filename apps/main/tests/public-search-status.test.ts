// @vitest-environment node

import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

it("removes filesystem paths from public search status", async () => {
  const { toPublicSearchStatus } = await import(
    "@/server/search/public-search-api-platform"
  );

  expect(
    toPublicSearchStatus({
      path: "/data/search/public-search.sqlite",
      sourcePath: "/data/search/source.sqlite",
      status: "fresh",
    }),
  ).toEqual({ status: "fresh" });
});
