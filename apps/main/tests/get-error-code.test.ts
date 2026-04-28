import { describe, expect, it } from "vitest";

import { getErrorCode } from "@/lib/utils";

describe("getErrorCode", () => {
  it("returns raw TRPC error codes without JSON stringification", () => {
    const error = { code: "NOT_FOUND" };

    expect(getErrorCode(error)).toBe("NOT_FOUND");
  });

  it("returns undefined when there is no code", () => {
    expect(getErrorCode({})).toBeUndefined();
  });
});
