import { describe, expect, it } from "vitest";
import { getSafeAuthReturnTo } from "@/app/auth-error/auth-return-to";

describe("auth error return target", () => {
  it("keeps same-origin app paths including query strings", () => {
    expect(getSafeAuthReturnTo("/dashboard/listings?view=table")).toBe(
      "/dashboard/listings?view=table",
    );
  });

  it("falls back for external or looping targets", () => {
    expect(getSafeAuthReturnTo("https://example.com/dashboard")).toBe(
      "/dashboard",
    );
    expect(getSafeAuthReturnTo("//example.com/dashboard")).toBe("/dashboard");
    expect(getSafeAuthReturnTo("/auth-error?returnTo=/dashboard")).toBe(
      "/dashboard",
    );
  });
});
